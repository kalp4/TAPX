import React from 'react';
import { WALLET_COLORS } from '../constants/theme';
import { formatTimeOnly, getCategoryAccentColor } from '../utils/formatters';

export default function AccountsTab({
  ui,
  isDark,
  tabAnimClass,
  wallets,
  currencySymbol,
  activityWalletFilter,
  setActivityWalletFilter,
  activitySearch,
  setActivitySearch,
  activityTypeFilter,
  setActivityTypeFilter,
  groupedTransactions,
  resolveTxCategory,
  openEditWallet,
  onOpenNewWallet,
  openEditTransaction,
  handleDeleteTransaction
}) {
  return (
    <div className={`flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden ${tabAnimClass}`}>
      {/* Cartoon Sticker Account Cards */}
      <div className="shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className={`text-xs font-cartoon font-bold uppercase tracking-wider ${ui.textSecondary}`}>
            Your Accounts ({wallets.length})
          </h3>
          {activityWalletFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActivityWalletFilter('all')}
              className="text-[11px] text-[#F4B942] font-cartoon font-bold key-press"
            >
              Show All
            </button>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
          {wallets.map((w, idx) => {
            const isFiltered = activityWalletFilter === w.id;
            const cardAccent = w.color || WALLET_COLORS[idx % WALLET_COLORS.length];
            return (
              <div
                key={w.id}
                onClick={() =>
                  setActivityWalletFilter((prev) => (prev === w.id ? 'all' : w.id))
                }
                style={{
                  backgroundColor: isFiltered ? cardAccent : isDark ? '#282825' : '#FAF6EE'
                }}
                className="min-w-[164px] p-3.5 rounded-2xl border-2 border-[#111110] shadow-[0_4px_0_#111110] flex flex-col justify-between cursor-pointer transition-all shrink-0 relative overflow-hidden key-press"
              >
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-8 h-8 rounded-xl border-2 border-[#111110] flex items-center justify-center text-sm shrink-0"
                      style={{
                        backgroundColor: isFiltered ? '#FAF6EE' : cardAccent
                      }}
                    >
                      {w.icon}
                    </span>
                    <span
                      className={`font-cartoon font-bold text-xs truncate ${
                        isFiltered ? 'text-[#1e1e1c]' : ui.textPrimary
                      }`}
                    >
                      {w.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditWallet(w);
                    }}
                    className={`px-2 py-0.5 rounded-lg border-2 border-[#111110] text-[10px] font-cartoon font-bold ${
                      isFiltered ? 'bg-[#1e1e1c] text-[#D8CBB3]' : 'bg-[#D8CBB3] text-[#1e1e1c]'
                    }`}
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-3 relative z-10 flex items-baseline justify-between gap-2">
                  <div>
                    <p
                      className={`font-cartoon font-bold text-sm tabular-nums ${
                        isFiltered ? 'text-[#1e1e1c]' : ui.textPrimary
                      }`}
                    >
                      {currencySymbol}
                      {Number(w.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p
                      className={`text-[10px] font-semibold ${
                        isFiltered ? 'text-[#1e1e1c]/75' : ui.textMuted
                      }`}
                    >
                      {w.type}
                    </p>
                  </div>
                  {isFiltered && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-cartoon font-bold bg-[#1e1e1c] text-[#D8CBB3]">
                      Active
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={onOpenNewWallet}
            className={`min-w-[118px] p-3 rounded-2xl border-2 border-dashed border-[#D8CBB3]/50 flex flex-col items-center justify-center gap-1 shrink-0 key-press ${ui.textSecondary}`}
          >
            <span className="text-xl font-cartoon font-bold">+</span>
            <span className="text-[11px] font-cartoon font-bold">New Account</span>
          </button>
        </div>
      </div>

      {/* Search + Type Filter Pills */}
      <div className="flex items-center gap-2 shrink-0">
        <div className={`flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${ui.input}`}>
          <svg
            className={`w-3.5 h-3.5 shrink-0 ${ui.textMuted}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search note, category, amount..."
            value={activitySearch}
            onChange={(e) => setActivitySearch(e.target.value)}
            className="w-full bg-transparent text-xs font-medium focus:outline-none scale-[0.85] origin-left"
          />
          {activitySearch && (
            <button
              type="button"
              onClick={() => setActivitySearch('')}
              className={`text-[11px] font-bold ${ui.textMuted}`}
            >
              ✕
            </button>
          )}
        </div>

        <div className={`flex p-0.5 rounded-xl shrink-0 ${ui.segmentedBg}`}>
          {[
            { id: 'all', label: 'All' },
            { id: 'expense', label: 'Out' },
            { id: 'income', label: 'In' }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActivityTypeFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-cartoon font-bold transition-all ${
                activityTypeFilter === f.id ? `${ui.segmentedThumb} ${ui.segmentedTextActive}` : ui.textSecondary
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date-Grouped Activity Feed */}
      <div className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5 pb-1">
        {groupedTransactions.length === 0 ? (
          <div className={`p-6 rounded-2xl text-center text-xs font-cartoon ${ui.card} ${ui.textMuted}`}>
            No transactions here yet! Tap the Keypad to pop one in.
          </div>
        ) : (
          groupedTransactions.map((group) => (
            <div key={group.label} className="space-y-2">
              <div
                className={`sticky top-0 z-10 py-1 px-1 flex items-center justify-between text-[11px] font-cartoon font-bold ${ui.stickyHeader}`}
              >
                <span className={ui.textSecondary}>{group.label}</span>
                <span className={`tabular-nums ${group.netSpend > 0 ? 'text-[#52B788]' : ui.textMuted}`}>
                  {group.netSpend > 0 ? '+' : group.netSpend < 0 ? '-' : ''}
                  {currencySymbol}
                  {Math.abs(group.netSpend).toLocaleString('en-IN')}
                </span>
              </div>

              {group.items.map((tx, idx) => {
                const w = wallets.find((item) => item.id === tx.wallet_id);
                const toW = wallets.find((item) => item.id === tx.to_wallet_id);
                const { category: c, cleanNote } = resolveTxCategory(tx);
                const catAccent =
                  tx.type === 'transfer'
                    ? '#F4B942'
                    : tx.type === 'income'
                    ? '#52B788'
                    : getCategoryAccentColor(c, idx);

                return (
                  <div
                    key={tx.id}
                    onClick={() => openEditTransaction(tx)}
                    className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer key-press ${ui.card}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl border-2 border-[#111110] shadow-[0_2px_0_#111110] flex items-center justify-center text-base shrink-0"
                        style={{ backgroundColor: catAccent }}
                      >
                        {tx.type === 'transfer' ? '⇄' : c?.icon || (tx.type === 'income' ? '💰' : '💸')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-cartoon font-bold truncate ${ui.textPrimary}`}>
                            {tx.type === 'transfer'
                              ? `${w?.name || 'Account'} → ${toW?.name || 'Account'}`
                              : cleanNote || c?.name || (tx.type === 'income' ? 'Income' : 'Expense')}
                          </p>
                          {tx.pendingSync && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#F4B942] text-[#1e1e1c] border border-[#111110] font-cartoon font-bold shrink-0">
                              Queued
                            </span>
                          )}
                          {tx.source === 'shortcut' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#D8CBB3] text-[#1e1e1c] border border-[#111110] font-cartoon font-bold shrink-0">
                              Back Tap
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] font-medium truncate ${ui.textMuted}`}>
                          {w?.name || 'Account'}
                          {cleanNote && c?.name ? ` · ${c.name}` : ''}
                          {tx.created_at ? ` · ${formatTimeOnly(tx.created_at)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-cartoon font-bold tabular-nums ${
                          tx.type === 'income'
                            ? 'text-[#52B788]'
                            : tx.type === 'transfer'
                            ? 'text-[#F4B942]'
                            : ui.textSand
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {currencySymbol}
                        {Number(tx.amount || 0).toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTransaction(tx.id);
                        }}
                        className={`p-1 rounded-lg text-xs font-bold key-press ${ui.textMuted} hover:text-[#F26B5B]`}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
