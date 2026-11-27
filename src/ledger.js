import { roundMoney } from './analytics.js';

export function walletChanges(tx) {
  const amount = Number(tx.amount);
  const changes = [[tx.wallet_id, tx.type === 'income' ? amount : -amount]];
  if (tx.type === 'transfer' && tx.to_wallet_id) changes.push([tx.to_wallet_id, amount]);
  return changes.filter(([id]) => id);
}

export function applyChanges(wallets, changes) {
  return wallets.map((wallet) => {
    const delta = changes.get(wallet.id);
    return delta ? { ...wallet, balance: roundMoney(Number(wallet.balance) + delta) } : wallet;
  });
}

export function withPendingEntries(wallets, transactions, queue) {
  const received = new Set(transactions.map((tx) => tx.id));
  const pending = queue.filter((item) => !received.has(item.payload.id));
  const changes = new Map();
  for (const { payload } of pending) {
    for (const [id, delta] of walletChanges(payload)) {
      changes.set(id, (changes.get(id) || 0) + delta);
    }
  }
  return {
    wallets: applyChanges(wallets, changes),
    transactions: [
      ...transactions,
      ...pending.map(({ tempId, payload }) => ({ ...payload, id: tempId, pendingSync: true }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  };
}

async function readBalances(db, changes) {
  const ids = [...changes].map(([id]) => id);
  if (!ids.length) return {};
  const { data, error } = await db.from('wallets').select('id,balance').in('id', ids);
  if (error) throw error;
  if (data.length !== ids.length) throw new Error('An account on this entry is no longer available.');
  return Object.fromEntries(data.map((w) => [w.id, w.balance]));
}

async function finishBalances(db, before, changes) {
  for (const [id, delta] of changes) {
    const balance = before[id];
    const query = db.from('wallets').update({ balance: roundMoney(Number(balance) + delta) }).eq('id', id);
    const result = await (balance == null ? query.is('balance', null) : query.eq('balance', balance));
    if (result.error) throw result.error;
  }
}

export async function writeTransactionChange(db, changes, write) {
  const deltas = [...changes].filter(([, delta]) => delta);
  const before = await readBalances(db, deltas);
  const { error } = await write().select('id').single();
  if (error) throw error;
  try {
    await finishBalances(db, before, deltas);
    return true;
  } catch {
    return false;
  }
}

// The original app supports databases both with and without an insert balance trigger.
// Keep the pre-insert balances with the queued UUID so a retry can finish either transfer leg.
export async function sendQueuedEntry(db, item, checkpoint) {
  const payload = { ...item.payload, id: item.payload.id || crypto.randomUUID() };
  const changes = walletChanges(payload);
  let before = item.balancesBefore;
  if (!before) {
    before = await readBalances(db, changes);
    checkpoint({ ...item, payload, balancesBefore: before });
  }

  const { data: inserted, error } = await db.from('transactions')
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: true }).select().maybeSingle();
  if (error) {
    // A definite database rejection leaves a draft editable. A lost response needs the same checkpoint.
    if (/^[0-9A-Z]{5}$/.test(error.code || '')) checkpoint({ ...item, payload, balancesBefore: null });
    throw error;
  }
  let row = inserted;
  if (!row) {
    const existing = await db.from('transactions').select('*').eq('id', payload.id).single();
    if (existing.error) throw existing.error;
    row = existing.data;
  }
  await finishBalances(db, before, changes);
  return row;
}
