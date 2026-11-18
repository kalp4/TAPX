import React from 'react';
import { WALLET_COLORS } from '../constants/theme';
import { getCategoryAccentColor } from '../utils/formatters';

export default function KeypadTab({
  ui,
  tabAnimClass,
  entryType,
  setEntryType,
  categories,
  setSelectedCategoryId,
  amountStr,
  formattedDisplayAmount,
  amountFontSizeClass,
  amountPulse,
  currencySymbol,
  note,
  setNote,
  noteInputRef,
  selectedWalletObj,
  wallets,
  selectedWalletId,
  setSelectedWalletId,
  toWalletId,
  setToWalletId,
  filteredCategories,
  selectedCategoryId,
  handleDigitPress,
  handleQuickAddAmount,
  handleSwapTransferWallets,
  handleLogTransaction,
  delHoldTimerRef,
  onOpenNewWallet,
  onOpenNewCategory
}) {
  const entryIndex = entryType === 'expense' ? 0 : entryType === 'income' ? 1 : 2;
  const primaryButtonClass =
    entryType === 'income'
      ? ui.primaryBtnIncome
      : entryType === 'transfer'
      ? ui.primaryBtnTransfer
      : ui.primaryBtnExpense;

  return (
    <div className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${tabAnimClass}`}>
      {/* Chunky Sliding Segmented Control */}
      <div className={`relative grid grid-cols-3 p-1 rounded-2xl shrink-0 ${ui.segmentedBg}`}>
        <div
          className={`absolute top-1 bottom-1 left-1 w-[calc(33.333%-2.66px)] rounded-xl transition-transform duration-300 ios-spring ${ui.segmentedThumb}`}
          style={{ transform: `translate3d(${entryIndex * 100}%, 0, 0)` }}
        />
        {[
          { id: 'expense', label: '💸 Expense' },
          { id: 'income', label: '💰 Income' },
          { id: 'transfer', label: '⇄ Transfer' }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setEntryType(t.id);
              const firstMatch = categories.find(
                (c) => c.type === (t.id === 'income' ? 'income' : 'expense')
              );
              if (firstMatch) setSelectedCategoryId(firstMatch.id);
            }}
            className={`relative z-10 py-1.5 text-xs font-cartoon rounded-xl transition-colors duration-200 ${
              entryType === t.id ? ui.segmentedTextActive : `${ui.textSecondary} font-semibold`
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Center Cartoon Amount Display Card */}
      <div
        className={`my-auto py-3 px-4 rounded-3xl flex flex-col items-center justify-center relative shrink-0 overflow-hidden ${ui.heroCard}`}
      >
        {amountStr !== '0' && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              handleDigitPress('CLEAR');
            }}
            className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-cartoon font-bold key-press ${ui.pillIdle}`}
          >
            Reset
          </button>
        )}

        <div
          className={`${amountFontSizeClass} leading-none font-cartoon font-bold tracking-tight tabular-nums transition-transform duration-100 ${
            amountPulse ? 'scale-[1.06] -rotate-1' : 'scale-100'
          } ${
            entryType === 'income'
              ? 'text-[#52B788]'
              : entryType === 'transfer'
              ? 'text-[#F4B942]'
              : ui.textSand
          }`}
        >
          <span className={`text-2xl mr-1 font-cartoon ${ui.textMuted}`}>
            {entryType === 'income' ? '+' : entryType === 'expense' && amountStr !== '0' ? '-' : ''}
            {currencySymbol}
          </span>
          {formattedDisplayAmount}
        </div>

        <input
          ref={noteInputRef}
          type="text"
          enterKeyHint="done"
          placeholder={
            entryType === 'transfer'
              ? 'Transfer note (e.g. ATM withdrawal)...'
              : 'Write a quick note...'
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className={`mt-1 bg-transparent text-center text-xs font-semibold focus:outline-none w-4/5 scale-[0.84] origin-center ${ui.textSecondary}`}
        />

        {/* Quick Add Sticker Chips */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {[50, 100, 500, 1000].map((val) => (
            <button
              key={val}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleQuickAddAmount(val);
              }}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-cartoon font-bold tabular-nums key-press ${ui.pillIdle}`}
            >
              +{currencySymbol}
              {val >= 1000 ? '1k' : val}
            </button>
          ))}
        </div>

        {selectedWalletObj && (
          <div
            className={`mt-2.5 pt-2 border-t-2 border-dashed w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold ${ui.divider} ${ui.textMuted}`}
          >
            <span>{selectedWalletObj.icon}</span>
            <span className={`font-bold ${ui.textSecondary}`}>{selectedWalletObj.name}</span>
            <span>·</span>
            <span className="tabular-nums">
              {currencySymbol}
              {Number(selectedWalletObj.balance || 0).toLocaleString('en-IN')} in pocket
            </span>
          </div>
        )}
      </div>

      {/* Wallet & Category Selector Pills */}
      <div className="space-y-2 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center justify-between px-0.5">
            <span className={`text-[10px] font-cartoon uppercase tracking-wider font-bold ${ui.textMuted}`}>
              {entryType === 'transfer' ? 'From Account → To Account' : 'Pick Account'}
            </span>
            {entryType === 'transfer' && wallets.length > 1 && (
              <button
                type="button"
                onClick={handleSwapTransferWallets}
                className="text-[10px] font-cartoon font-bold text-[#F4B942] key-press"
              >
                ⇄ Swap
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {wallets.length === 0 ? (
              <button
                type="button"
                onClick={onOpenNewWallet}
                className={`px-3.5 py-2 rounded-full text-xs font-cartoon font-bold shrink-0 key-press ${ui.pillIdle}`}
              >
                + Add your first account
              </button>
            ) : (
              wallets.map((w, idx) => {
                const active = selectedWalletId === w.id;
                const wColor = w.color || WALLET_COLORS[idx % WALLET_COLORS.length];
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSelectedWalletId(w.id)}
                    style={
                      active
                        ? {
                            backgroundColor: wColor,
                            borderColor: '#111110',
                            color: '#1e1e1c'
                          }
                        : undefined
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold flex items-center gap-1.5 shrink-0 transition-all duration-150 key-press ${
                      active ? 'border-2 border-[#111110] shadow-[0_3px_0_#111110]' : ui.pillIdle
                    }`}
                  >
                    <span>{w.icon}</span>
                    <span>{w.name}</span>
                    <span className={`text-[10px] tabular-nums ${active ? 'opacity-90 font-extrabold' : 'opacity-75'}`}>
                      {currencySymbol}
                      {Number(w.balance || 0).toLocaleString('en-IN')}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {entryType === 'transfer' && wallets.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pt-0.5 pb-1 no-scrollbar">
              {wallets
                .filter((w) => w.id !== selectedWalletId)
                .map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setToWalletId(w.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold flex items-center gap-1 shrink-0 transition-colors duration-150 key-press ${
                      toWalletId === w.id ? ui.pillActive : ui.pillIdle
                    }`}
                  >
                    <span>
                      → {w.icon} {w.name}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {entryType !== 'transfer' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-0.5">
              <span className={`text-[10px] font-cartoon uppercase tracking-wider font-bold ${ui.textMuted}`}>
                {entryType === 'income' ? 'Income Category' : 'Expense Category'}
              </span>
              <button
                type="button"
                onClick={() => onOpenNewCategory(entryType === 'income' ? 'income' : 'expense')}
                className={`text-[10px] font-cartoon font-bold ${ui.textSecondary} key-press`}
              >
                + Custom
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {filteredCategories.map((c, idx) => {
                const active = selectedCategoryId === c.id;
                const accent = getCategoryAccentColor(c, idx);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(c.id)}
                    style={
                      active
                        ? {
                            backgroundColor: accent,
                            borderColor: '#111110',
                            color: '#1e1e1c'
                          }
                        : undefined
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold flex items-center gap-1.5 shrink-0 transition-all duration-150 key-press ${
                      active ? 'border-2 border-[#111110] shadow-[0_3px_0_#111110]' : ui.pillIdle
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tactile Arcade Cartoon Numpad */}
      <div className="grid grid-cols-3 gap-2 pt-1.5 shrink-0">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
          <button
            key={key}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              handleDigitPress(key);
              if (key === 'DEL') {
                if (delHoldTimerRef.current) clearTimeout(delHoldTimerRef.current);
                delHoldTimerRef.current = setTimeout(() => {
                  handleDigitPress('CLEAR');
                }, 420);
              }
            }}
            onPointerUp={() => {
              if (key === 'DEL' && delHoldTimerRef.current) {
                clearTimeout(delHoldTimerRef.current);
              }
            }}
            onPointerLeave={() => {
              if (key === 'DEL' && delHoldTimerRef.current) {
                clearTimeout(delHoldTimerRef.current);
              }
            }}
            className={`h-11 rounded-2xl text-lg font-cartoon font-bold tabular-nums flex items-center justify-center key-press ${
              key === 'DEL' || key === '.' ? ui.numpadKeySpecial : ui.numpadKey
            }`}
          >
            {key === 'DEL' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33Z"
                />
              </svg>
            ) : (
              key
            )}
          </button>
        ))}
      </div>

      {/* Chunky Sand / Mint / Gold Action Button */}
      <button
        type="button"
        onClick={handleLogTransaction}
        className={`w-full py-3.5 mt-2 rounded-2xl font-cartoon font-bold text-sm tracking-wide key-press shrink-0 ${primaryButtonClass}`}
      >
        Save {entryType === 'transfer' ? 'Transfer ⇄' : entryType === 'income' ? 'Income 💰' : 'Expense 💸'}
      </button>
    </div>
  );
}
