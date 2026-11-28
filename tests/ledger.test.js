import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { sendQueuedEntry, withPendingEntries, writeTransactionChange } from '../src/ledger.js';

globalThis.crypto ??= webcrypto;

// Only the PostgREST operations used by the ledger. Keep server rows across simulated lost replies.
function database({ trigger = false, loseInsertReply = false, failDestination = false } = {}) {
  const balances = new Map([['cash', 100], ['bank', 20]]);
  const transactions = new Map();
  const db = {
    from(table) {
      if (table === 'wallets') return {
        select: () => ({ in: (_, ids) => ({
          data: ids.filter((id) => balances.has(id)).map((id) => ({ id, balance: balances.get(id) }))
        }) }),
        update: ({ balance }) => ({ eq: (_, id) => ({ eq: (_, previous) => {
          if (id === 'bank' && failDestination) {
            failDestination = false;
            return { error: new Error('Connection lost') };
          }
          if (balances.get(id) === previous) balances.set(id, balance);
          return {};
        } }) })
      };
      assert.equal(table, 'transactions');
      return {
        upsert: (row, options) => ({ select: () => ({ maybeSingle: () => {
          assert.deepEqual(options, { onConflict: 'id', ignoreDuplicates: true });
          if (transactions.has(row.id)) return { data: null };
          transactions.set(row.id, row);
          if (trigger) {
            balances.set('cash', balances.get('cash') - row.amount);
            balances.set('bank', balances.get('bank') + row.amount);
          }
          if (loseInsertReply) {
            loseInsertReply = false;
            return { error: new Error('Connection lost') };
          }
          return { data: row };
        } }) }),
        select: () => ({ eq: (_, id) => ({ single: () => ({ data: transactions.get(id) }) }) })
      };
    }
  };
  return { db, balances, transactions };
}

const payload = {
  id: 'entry-id', user_id: 'owner', type: 'transfer', amount: 12.5,
  wallet_id: 'cash', to_wallet_id: 'bank', created_at: '2026-11-01T10:00:00Z'
};
const draft = { action: 'insert_tx', tempId: 'temp-local', payload };

for (const trigger of [false, true]) {
  test(`retry after lost insert reply with wallet trigger ${trigger}`, async () => {
    const { db, balances, transactions } = database({ trigger, loseInsertReply: true });
    let stored = draft;
    const checkpoint = (next) => { stored = next; };
    await assert.rejects(sendQueuedEntry(db, stored, checkpoint), /Connection lost/);
    const confirmed = await sendQueuedEntry(db, stored, checkpoint);
    assert.equal(confirmed.id, payload.id);
    assert.equal(transactions.size, 1);
    assert.deepEqual([...balances.values()], [87.5, 32.5]);
  });
}

test('a retry finishes an interrupted transfer without applying the first leg again', async () => {
  const { db, balances, transactions } = database({ failDestination: true });
  let stored = draft;
  const checkpoint = (next) => { stored = next; };
  await assert.rejects(sendQueuedEntry(db, stored, checkpoint), /Connection lost/);
  assert.deepEqual([...balances.values()], [87.5, 20]);
  // Another device can bring the source back to its original balance before reconnection.
  balances.set('cash', 100);
  await sendQueuedEntry(db, stored, checkpoint);
  assert.equal(transactions.size, 1);
  assert.deepEqual([...balances.values()], [100, 32.5]);
});

test('legacy queued entries acquire an id before their first send', async () => {
  const { db, transactions } = database();
  const { id: _id, ...legacyPayload } = payload;
  let persistedId;
  const row = await sendQueuedEntry(db, { ...draft, payload: legacyPayload }, (next) => {
    if (!persistedId) assert.equal(transactions.size, 0);
    persistedId = next.payload.id;
  });
  assert.ok(persistedId);
  assert.equal(row.id, persistedId);
});

test('refresh overlays only entries the server has not returned', () => {
  const wallets = [{ id: 'cash', balance: 100 }, { id: 'bank', balance: 20 }];
  const pending = withPendingEntries(wallets, [], [draft]);
  assert.equal(pending.transactions[0].id, draft.tempId);
  assert.deepEqual(pending.wallets.map((w) => w.balance), [87.5, 32.5]);
  const received = withPendingEntries(pending.wallets, [payload], [draft]);
  assert.deepEqual(received.transactions, [payload]);
  assert.deepEqual(received.wallets, pending.wallets);
});

test('a rejected edit or delete leaves balances intact', async () => {
  const { db, balances } = database();
  const write = () => ({ select: () => ({ single: () => ({ error: new Error('Save failed') }) }) });
  await assert.rejects(writeTransactionChange(db, new Map([['cash', -15]]), write), /Save failed/);
  assert.equal(balances.get('cash'), 100);
});
