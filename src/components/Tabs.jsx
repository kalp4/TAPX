import React, { useEffect, useRef, useState } from 'react';
import { WALLET_COLORS } from '../constants';
import { formatTimeOnly, formatDayGroupLabel, getCategoryAccentColor } from '../analytics';
import { playQuickChip, playTabSwitch } from '../sounds';

const RANGE_PRESETS = [
  { id: 'week', label: '7D' },
  { id: 'month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'all', label: 'All' },
  { id: 'custom', label: '📅 Custom' }
];

const INSIGHTS_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'habits', label: 'Habits' }
];

function formatCompactDateBadge(dateStr, todayDateStr) {
  if (!dateStr || dateStr === todayDateStr) return 'Today';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return 'Today';
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (target.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return target.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(target.getFullYear() !== now.getFullYear() ? { year: '2-digit' } : {})
  });
}

function EmptyStateCard({ ui, icon, title, subtitle }) {
  return (
    <div className={`p-6 rounded-3xl flex flex-col items-center text-center space-y-2 ${ui.card}`}>
      <span
        className={`w-12 h-12 rounded-2xl bg-[#D8CBB3] text-[#1e1e1c] flex items-center justify-center text-2xl ${ui.iconBadge}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className={`text-sm font-cartoon font-bold ${ui.textPrimary}`}>{title}</p>
      <p className={`text-xs font-medium max-w-[240px] leading-relaxed ${ui.textMuted}`}>
        {subtitle}
      </p>
    </div>
  );
}

export function KeypadTab({
  ui,
  tabAnimClass,
  privacyMode,
  entryType,
  setEntryType,
  entryDate,
  setEntryDate,
  todayDateStr,
  setSelectedCategoryId,
  amountStr,
  formattedDisplayAmount,
  amountFontSizeClass,
  amountPulse,
  currencySymbol,
  note,
  setNote,
  noteInputRef,
  smartRepeatPresets,
  onApplySmartPreset,
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
  onOpenNewWallet,
  onOpenNewCategory
}) {
  const delHoldTimerRef = useRef(null);
  const didClearRef = useRef(false);
  const cancelDeleteHold = () => clearTimeout(delHoldTimerRef.current);
  useEffect(() => () => clearTimeout(delHoldTimerRef.current), []);

  const entryIndex = entryType === 'expense' ? 0 : entryType === 'income' ? 1 : 2;
  const primaryButtonClass =
    entryType === 'income'
      ? ui.primaryBtnIncome
      : entryType === 'transfer'
      ? ui.primaryBtnTransfer
      : ui.primaryBtnExpense;

  const numericAmount = parseFloat(amountStr) || 0;
  const currentWalletBalance = Number(selectedWalletObj?.balance || 0);
  const projectedBalance =
    entryType === 'income'
      ? currentWalletBalance + numericAmount
      : currentWalletBalance - numericAmount;
  const willGoNegative = Boolean(
    selectedWalletObj && numericAmount > 0 && entryType !== 'income' && projectedBalance < 0
  );

  const isCustomDate = Boolean(entryDate && entryDate !== todayDateStr);
  const dateBadgeLabel = formatCompactDateBadge(entryDate, todayDateStr);

  return (
    <div className={`flex-1 min-h-0 flex flex-col gap-2 custom-scroll ${tabAnimClass}`}>
      {/* Entry Type Segmented Control */}
      <div
        role="tablist"
        aria-label="Transaction type"
        className={`relative grid grid-cols-3 p-1 rounded-2xl shrink-0 ${ui.segmentedBg}`}
      >
        <div
          aria-hidden="true"
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
            role="tab"
            aria-selected={entryType === t.id}
            onClick={() => {
              if (entryType === t.id) return;
              playTabSwitch();
              setEntryType(t.id);
            }}
            className={`relative z-10 py-1.5 text-xs font-cartoon rounded-xl transition-colors duration-200 ${
              entryType === t.id ? ui.segmentedTextActive : `${ui.textSecondary} font-semibold`
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Primary Hero Amount Stage */}
      <div
        className={`py-2.5 px-3.5 rounded-3xl flex flex-col items-center justify-center relative shrink-0 overflow-hidden transition-colors duration-200 ${
          willGoNegative ? ui.heroCardWarning : ui.heroCard
        }`}
      >
        {/* Top Utility Strip: Any-Day Date Picker Pill & Reset */}
        <div className="w-full flex items-center justify-between gap-2 mb-1">
          <label
            className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-cartoon font-bold cursor-pointer key-press ${
              isCustomDate
                ? `bg-[#F4B942] text-[#1e1e1c] border ${ui.badgeBorder}`
                : ui.pillIdle
            }`}
          >
            <span aria-hidden="true">📅</span>
            <span>{dateBadgeLabel}</span>
            <input
              type="date"
              aria-label="Transaction date"
              max={todayDateStr}
              value={entryDate}
              onChange={(e) => {
                playQuickChip();
                setEntryDate(e.target.value || todayDateStr);
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>

          <div className="flex items-center gap-1.5">
            {isCustomDate && (
              <button
                type="button"
                onClick={() => {
                  playQuickChip();
                  setEntryDate(todayDateStr);
                }}
                aria-label="Reset date to today"
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-cartoon font-bold key-press ${ui.pillIdle}`}
              >
                Today
              </button>
            )}
            {amountStr !== '0' && (
              <button
                type="button"
                onClick={() => handleDigitPress('CLEAR')}
                aria-label="Reset amount"
                className={`px-2.5 py-1 rounded-full text-[11px] font-cartoon font-bold key-press ${ui.pillIdle}`}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Amount Readout */}
        <div
          className={`${amountFontSizeClass} leading-none font-cartoon font-bold tracking-tight tabular-nums transition-transform duration-100 my-0.5 ${
            amountPulse ? 'scale-[1.06] -rotate-1' : 'scale-100'
          } ${
            willGoNegative
              ? 'text-[#F26B5B]'
              : entryType === 'income'
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

        {/* Framed Note Input Pill */}
        <div className={`mt-1.5 w-full max-w-[280px] rounded-xl px-3 py-1 transition-colors ${ui.notePill}`}>
          <input
            ref={noteInputRef}
            type="text"
            enterKeyHint="done"
            aria-label="Transaction note"
            placeholder={
              entryType === 'transfer'
                ? 'Transfer note (e.g. ATM)...'
                : 'Add a quick note...'
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className={`w-full bg-transparent text-center text-[16px] leading-snug font-medium focus:outline-none ${ui.textSecondary}`}
          />
        </div>

        {/* Quick-Add Chips OR Smart Repeat Presets */}
        {amountStr === '0' && smartRepeatPresets.length > 0 ? (
          <div className="w-full flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar justify-start sm:justify-center">
            {smartRepeatPresets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => onApplySmartPreset(preset)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-cartoon font-bold flex items-center gap-1 shrink-0 key-press ${ui.chipSoft}`}
              >
                <span>{preset.icon}</span>
                <span className="max-w-[78px] truncate">{preset.label}</span>
                <span className={`tabular-nums ${ui.textMuted}`}>
                  {currencySymbol}
                  {preset.amount.toLocaleString('en-IN')}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-2">
            {[50, 100, 500, 1000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAddAmount(val)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-cartoon font-bold tabular-nums key-press ${ui.pillIdle}`}
              >
                +{currencySymbol}
                {val >= 1000 ? '1k' : val}
              </button>
            ))}
          </div>
        )}

        {/* Selected Wallet Balance Preview Strip */}
        {selectedWalletObj && (
          <div
            className={`mt-2 pt-1.5 border-t border-dashed w-full flex items-center justify-center flex-wrap gap-1.5 text-[11px] font-semibold ${ui.divider} ${ui.textMuted}`}
          >
            <span
              className={`w-2 h-2 rounded-full border shrink-0 ${ui.badgeBorder}`}
              style={{ backgroundColor: selectedWalletObj.color || '#D8CBB3' }}
              aria-hidden="true"
            />
            <span className={`font-bold ${ui.textSecondary}`}>
              {selectedWalletObj.icon} {selectedWalletObj.name}
            </span>
            <span>·</span>
            <span className="tabular-nums">
              {privacyMode
                ? `${currencySymbol}••••`
                : `${currencySymbol}${currentWalletBalance.toLocaleString('en-IN')}`}
            </span>
            {numericAmount > 0 && !privacyMode && (
              <>
                <span aria-hidden="true">→</span>
                <span
                  className={`font-cartoon font-bold tabular-nums ${
                    willGoNegative
                      ? 'text-[#F26B5B]'
                      : entryType === 'income'
                      ? 'text-[#52B788]'
                      : ui.textSecondary
                  }`}
                >
                  {projectedBalance < 0 ? '-' : ''}
                  {currencySymbol}
                  {Math.abs(projectedBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
                {willGoNegative && (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-cartoon font-bold bg-[#F26B5B]/20 text-[#F26B5B]">
                    Negative
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Account & Category Pickers */}
      <div className="space-y-1.5 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center justify-between px-0.5">
            <span className={`text-[11px] font-cartoon uppercase tracking-wider font-bold ${ui.textMuted}`}>
              {entryType === 'transfer' ? 'From Account → To Account' : 'Pick Account'}
            </span>
            {entryType === 'transfer' && wallets.length > 1 && (
              <button
                type="button"
                onClick={handleSwapTransferWallets}
                className="text-[11px] font-cartoon font-bold text-[#F4B942] key-press"
              >
                ⇄ Swap
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {wallets.length === 0 ? (
              <button
                type="button"
                onClick={onOpenNewWallet}
                className={`px-3.5 py-1.5 rounded-full text-xs font-cartoon font-bold shrink-0 key-press ${ui.pillIdle}`}
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
                    aria-pressed={active}
                    onClick={() => {
                      playQuickChip();
                      setSelectedWalletId(w.id);
                    }}
                    style={
                      active
                        ? {
                            backgroundColor: wColor,
                            color: '#1e1e1c'
                          }
                        : undefined
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold flex items-center gap-1.5 shrink-0 transition-all duration-150 key-press ${
                      active ? ui.pillSelectedBorder : ui.pillIdle
                    }`}
                  >
                    <span>{w.icon}</span>
                    <span>{w.name}</span>
                    <span className={`text-[11px] tabular-nums ${active ? 'opacity-90 font-extrabold' : 'opacity-75'}`}>
                      {privacyMode
                        ? `${currencySymbol}•••`
                        : `${currencySymbol}${Number(w.balance || 0).toLocaleString('en-IN')}`}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {entryType === 'transfer' && wallets.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pt-0.5 pb-0.5 no-scrollbar">
              {wallets
                .filter((w) => w.id !== selectedWalletId)
                .map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    aria-pressed={toWalletId === w.id}
                    onClick={() => {
                      playQuickChip();
                      setToWalletId(w.id);
                    }}
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
              <span className={`text-[11px] font-cartoon uppercase tracking-wider font-bold ${ui.textMuted}`}>
                {entryType === 'income' ? 'Income Category' : 'Expense Category'}
              </span>
              <button
                type="button"
                onClick={() => onOpenNewCategory(entryType === 'income' ? 'income' : 'expense')}
                className={`text-[11px] font-cartoon font-bold ${ui.textSecondary} key-press`}
              >
                + Custom
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {filteredCategories.map((c, idx) => {
                const active = selectedCategoryId === c.id;
                const accent = getCategoryAccentColor(c, idx);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      playQuickChip();
                      setSelectedCategoryId(c.id);
                    }}
                    style={
                      active
                        ? {
                            backgroundColor: accent,
                            color: '#1e1e1c'
                          }
                        : undefined
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold flex items-center gap-1.5 shrink-0 transition-all duration-150 key-press ${
                      active ? ui.pillSelectedBorder : ui.pillIdle
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

      {/* Fluid Thumb-Zone Numpad */}
      <div className="flex-1 min-h-fit flex flex-col justify-end gap-2">
        <div className="flex-1 min-h-[196px] max-h-[296px] grid grid-cols-3 grid-rows-4 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
            <button
              key={key}
              type="button"
              aria-label={key === 'DEL' ? 'Delete last digit' : key === '.' ? 'Decimal point' : `Digit ${key}`}
              onClick={(event) => {
                if (key !== 'DEL' || !didClearRef.current || event.detail === 0) handleDigitPress(key);
                didClearRef.current = false;
              }}
              onPointerDown={(event) => {
                if (key !== 'DEL' || event.button !== 0 || !event.isPrimary) return;
                didClearRef.current = false;
                cancelDeleteHold();
                delHoldTimerRef.current = setTimeout(() => {
                  didClearRef.current = true;
                  handleDigitPress('CLEAR');
                }, 420);
              }}
              onContextMenu={key === 'DEL' ? (event) => event.preventDefault() : undefined}
              onPointerUp={cancelDeleteHold}
              onPointerLeave={cancelDeleteHold}
              onPointerCancel={cancelDeleteHold}
              className={`h-full min-h-[46px] max-h-[68px] rounded-2xl text-xl font-cartoon font-bold tabular-nums flex items-center justify-center key-press ${
                key === 'DEL' || key === '.' ? ui.numpadKeySpecial : ui.numpadKey
              }`}
            >
              {key === 'DEL' ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  aria-hidden="true"
                >
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

        <button
          type="button"
          onClick={handleLogTransaction}
          className={`w-full py-3.5 rounded-2xl font-cartoon font-bold text-sm tracking-wide key-press shrink-0 ${primaryButtonClass} ${
            numericAmount <= 0 ? 'opacity-70' : 'opacity-100'
          }`}
        >
          Save {entryType === 'transfer' ? 'Transfer ⇄' : entryType === 'income' ? 'Income 💰' : 'Expense 💸'}
          {isCustomDate ? ` · ${dateBadgeLabel}` : ''}
        </button>
      </div>
    </div>
  );
}

export function AccountsTab({
  ui,
  isDark,
  privacyMode,
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
  hasMore,
  onLoadMore,
  resolveTxCategory,
  openEditWallet,
  onOpenNewWallet,
  openEditTransaction
}) {
  return (
    <div className={`flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden ${tabAnimClass}`}>
      <div className="shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className={`text-xs font-cartoon font-bold uppercase tracking-wider ${ui.textSecondary}`}>
            Your Accounts ({wallets.length})
          </h3>
          {activityWalletFilter !== 'all' && (
            <button
              type="button"
              onClick={() => {
                playQuickChip();
                setActivityWalletFilter('all');
              }}
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
            const toggleWalletFilter = () => {
              playQuickChip();
              setActivityWalletFilter((prev) => (prev === w.id ? 'all' : w.id));
            };
            return (
              <div
                key={w.id}
                role="button"
                tabIndex={0}
                aria-pressed={isFiltered}
                onClick={toggleWalletFilter}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    toggleWalletFilter();
                  }
                }}
                style={{
                  backgroundColor: isFiltered ? cardAccent : isDark ? '#282825' : '#FAF6EE'
                }}
                className={`min-w-[172px] p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer transition-all shrink-0 relative overflow-hidden key-press ${
                  isFiltered ? ui.walletCardHero : `${ui.card} wallet-sheen`
                }`}
              >
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${ui.iconBadge}`}
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
                    aria-label={`Edit ${w.name} account`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditWallet(w);
                    }}
                    className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-cartoon font-bold ${ui.badgeBorder} ${
                      isFiltered ? 'bg-[#1e1e1c] text-[#D8CBB3]' : 'bg-[#D8CBB3] text-[#1e1e1c]'
                    }`}
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-3.5 relative z-10 flex items-baseline justify-between gap-2">
                  <div>
                    <p
                      className={`font-cartoon font-bold text-[15px] tabular-nums ${
                        isFiltered ? 'text-[#1e1e1c]' : ui.textPrimary
                      }`}
                    >
                      {privacyMode
                        ? `${currencySymbol}••••`
                        : `${currencySymbol}${Number(w.balance || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2
                          })}`}
                    </p>
                    <p
                      className={`text-[10.5px] font-semibold ${
                        isFiltered ? 'text-[#1e1e1c]/75' : ui.textMuted
                      }`}
                    >
                      {w.type}
                    </p>
                  </div>
                  {isFiltered && (
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full font-cartoon font-bold bg-[#1e1e1c] text-[#D8CBB3]">
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
            className={`min-w-[118px] p-3 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 shrink-0 key-press ${ui.dashBorder} ${ui.textSecondary}`}
          >
            <span className="text-xl font-cartoon font-bold">+</span>
            <span className="text-[11px] font-cartoon font-bold">New Account</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Row */}
      <div className="flex items-center gap-2 shrink-0">
        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl ${ui.input}`}>
          <svg
            className={`w-4 h-4 shrink-0 ${ui.textMuted}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            aria-label="Search transactions"
            placeholder="Search note, category..."
            value={activitySearch}
            onChange={(e) => setActivitySearch(e.target.value)}
            className="w-full bg-transparent text-[16px] leading-snug font-medium focus:outline-none"
          />
          {activitySearch && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setActivitySearch('')}
              className={`p-0.5 text-xs font-bold ${ui.textMuted}`}
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
              aria-pressed={activityTypeFilter === f.id}
              onClick={() => {
                if (activityTypeFilter !== f.id) playQuickChip();
                setActivityTypeFilter(f.id);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-cartoon font-bold transition-all ${
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
          <EmptyStateCard
            ui={ui}
            icon="🧾"
            title={activitySearch ? 'No matching entries' : 'No activity yet'}
            subtitle={
              activitySearch
                ? 'Try a different keyword or clear the active account filter.'
                : 'Head over to the Keypad to log your first expense, income, or transfer.'
            }
          />
        ) : (
          groupedTransactions.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <div
                className={`sticky top-0 z-10 py-1 px-1 flex items-center justify-between text-[11px] font-cartoon font-bold ${ui.stickyHeader}`}
              >
                <span className={ui.textSecondary}>{group.label}</span>
                <span className={`tabular-nums ${group.netSpend > 0 ? 'text-[#52B788]' : ui.textMuted}`}>
                  {privacyMode
                    ? `${currencySymbol}•••`
                    : `${group.netSpend > 0 ? '+' : group.netSpend < 0 ? '-' : ''}${currencySymbol}${Math.abs(
                        group.netSpend
                      ).toLocaleString('en-IN')}`}
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
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => openEditTransaction(tx)}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between text-left cursor-pointer key-press ${ui.listRow}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 ${ui.iconBadge}`}
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
                            <span
                              className={`text-[10.5px] px-1.5 py-0.5 rounded-md bg-[#F4B942] text-[#1e1e1c] border font-cartoon font-bold shrink-0 ${ui.badgeBorder}`}
                            >
                              Queued
                            </span>
                          )}
                          {tx.source === 'shortcut' && (
                            <span
                              className={`text-[10.5px] px-1.5 py-0.5 rounded-md bg-[#D8CBB3] text-[#1e1e1c] border font-cartoon font-bold shrink-0 ${ui.badgeBorder}`}
                            >
                              Back Tap
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] font-medium truncate ${ui.textMuted}`}>
                          {w?.name || 'Account'}
                          {cleanNote && c?.name ? ` · ${c.name}` : ''}
                          {tx.created_at ? ` · ${formatTimeOnly(tx.created_at)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <span
                        className={`text-xs font-cartoon font-bold tabular-nums ${
                          tx.type === 'income'
                            ? 'text-[#52B788]'
                            : tx.type === 'transfer'
                            ? 'text-[#F4B942]'
                            : ui.textSand
                        }`}
                      >
                        {privacyMode
                          ? `${currencySymbol}•••`
                          : `${tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}${currencySymbol}${Number(
                              tx.amount || 0
                            ).toLocaleString('en-IN')}`}
                      </span>
                      <span className={`text-sm font-bold opacity-45 ${ui.textMuted}`} aria-hidden="true">
                        ›
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
        {hasMore && (
          <button type="button" onClick={onLoadMore}
            className={`w-full py-2 rounded-xl text-xs font-bold key-press ${ui.pillIdle}`}>
            Show more entries
          </button>
        )}
      </div>
    </div>
  );
}

export function InsightsTab({
  ui,
  isDark,
  privacyMode,
  tabAnimClass,
  analyticsRange,
  setAnalyticsRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  analyticsData,
  currencySymbol,
  selectedDonutCatId,
  setSelectedDonutCatId,
  selectedBarIdx,
  setSelectedBarIdx,
  wallets,
  resolveTxCategory,
  openEditTransaction,
  handleExportCsv
}) {
  const [insightsView, setInsightsView] = useState('overview');
  const [selectedDow, setSelectedDow] = useState(null);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState(null);

  const insightsSubIndex = INSIGHTS_SECTIONS.findIndex((s) => s.id === insightsView);

  const fmtAmt = (val, opts = { maximumFractionDigits: 0 }) =>
    privacyMode ? `${currencySymbol}••••` : `${currencySymbol}${Number(val || 0).toLocaleString('en-IN', opts)}`;

  const safeBarIdx = Math.min(
    selectedBarIdx,
    Math.max(0, (analyticsData.trendBars?.length || 1) - 1)
  );
  const selectedDayObj =
    analyticsData.trendBars?.[safeBarIdx] ||
    analyticsData.trendBars?.[analyticsData.trendBars.length - 1];

  const activeDonutCat =
    analyticsData.categoryBreakdown.find((c) => c.id === selectedDonutCatId) ||
    analyticsData.categoryBreakdown[0] ||
    null;

  const activeDowObj =
    analyticsData.dowBreakdown.find((d) => d.dayNum === selectedDow) ||
    analyticsData.peakDow ||
    analyticsData.dowBreakdown[0] ||
    null;

  const activeTimeSlotObj =
    analyticsData.timeOfDayBreakdown.find((s) => s.id === selectedTimeSlotId) ||
    analyticsData.peakTimeSlot ||
    analyticsData.timeOfDayBreakdown[0] ||
    null;

  const donutRadius = 45;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutCumulativeShare = 0;

  const hasAnyActivity = analyticsData.filteredTx.length > 0;

  return (
    <div className={`flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden ${tabAnimClass}`}>
      {/* Sticky Controls: Date Range Presets + CSV Export + 3-Way Section Switcher */}
      <div className="space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {RANGE_PRESETS.map((tab) => {
              const active = analyticsRange === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (analyticsRange !== tab.id) playQuickChip();
                    setAnalyticsRange(tab.id);
                    setSelectedBarIdx(6);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-cartoon font-bold shrink-0 transition-all key-press ${
                    active ? ui.pillActive : ui.pillIdle
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            aria-label="Export filtered period to CSV"
            title="Export filtered period to CSV"
            className={`px-3 py-1.5 rounded-xl text-[11px] font-cartoon font-bold flex items-center gap-1 shrink-0 key-press ${ui.pillActive}`}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            CSV
          </button>
        </div>

        {analyticsRange === 'custom' && (
          <div className={`p-2.5 rounded-2xl grid grid-cols-2 gap-2 animate-tab ${ui.card}`}>
            <div className="space-y-1">
              <label className={`text-[10.5px] font-cartoon font-bold uppercase px-1 ${ui.textMuted}`}>
                From Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={`w-full rounded-xl px-2.5 py-2 text-[16px] leading-snug font-cartoon font-bold focus:outline-none ${ui.input}`}
              />
            </div>
            <div className="space-y-1">
              <label className={`text-[10.5px] font-cartoon font-bold uppercase px-1 ${ui.textMuted}`}>
                To Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={`w-full rounded-xl px-2.5 py-2 text-[16px] leading-snug font-cartoon font-bold focus:outline-none ${ui.input}`}
              />
            </div>
          </div>
        )}

        <div
          role="tablist"
          aria-label="Insights sections"
          className={`relative grid grid-cols-3 p-1 rounded-2xl ${ui.segmentedBg}`}
        >
          <div
            aria-hidden="true"
            className={`absolute top-1 bottom-1 left-1 w-[calc(33.333%-2.66px)] rounded-xl transition-transform duration-300 ios-spring ${ui.segmentedThumb}`}
            style={{ transform: `translate3d(${Math.max(0, insightsSubIndex) * 100}%, 0, 0)` }}
          />
          {INSIGHTS_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              role="tab"
              aria-selected={insightsView === sec.id}
              onClick={() => {
                if (insightsView !== sec.id) playTabSwitch();
                setInsightsView(sec.id);
              }}
              className={`relative z-10 py-1.5 text-xs font-cartoon rounded-xl transition-colors duration-200 ${
                insightsView === sec.id ? ui.segmentedTextActive : `${ui.textSecondary} font-semibold`
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: OVERVIEW */}
      {insightsView === 'overview' && (
        <div key="insights-overview" className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5 pb-1 animate-tab">
          {!hasAnyActivity ? (
            <EmptyStateCard
              ui={ui}
              icon="📊"
              title={`No activity in ${analyticsData.windowLabel}`}
              subtitle="Log an expense or income on the Keypad, or switch the date preset above."
            />
          ) : (
            <>
              {/* Hero Cashflow Summary Card */}
              <div className={`p-4 rounded-3xl space-y-3.5 ${ui.heroCard}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-cartoon font-bold uppercase tracking-wider ${ui.textSecondary}`}>
                    {analyticsData.windowLabel} · {analyticsData.effectiveDays}{' '}
                    {analyticsData.effectiveDays === 1 ? 'Day' : 'Days'}
                  </span>
                  {analyticsData.expenseDeltaPct !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-cartoon font-bold border ${ui.badgeBorder} ${
                        analyticsData.expenseDeltaPct <= 0
                          ? 'bg-[#52B788] text-[#1e1e1c]'
                          : 'bg-[#F26B5B] text-[#1e1e1c]'
                      }`}
                    >
                      {analyticsData.expenseDeltaPct > 0 ? '▲ +' : '▼ '}
                      {analyticsData.expenseDeltaPct}% vs prev
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className={`text-[10.5px] font-cartoon font-bold uppercase tracking-wider ${ui.textMuted}`}>
                      Spent
                    </p>
                    <p className={`text-base font-cartoon font-bold tabular-nums mt-0.5 truncate ${ui.textPrimary}`}>
                      {fmtAmt(analyticsData.totalExpense)}
                    </p>
                    <p className={`text-[10.5px] font-semibold tabular-nums ${ui.textMuted}`}>
                      {fmtAmt(analyticsData.dailyAvgExpense)}/day
                    </p>
                  </div>

                  <div>
                    <p className={`text-[10.5px] font-cartoon font-bold uppercase tracking-wider ${ui.textMuted}`}>
                      Income
                    </p>
                    <p className="text-base font-cartoon font-bold tabular-nums text-[#52B788] mt-0.5 truncate">
                      +{fmtAmt(analyticsData.totalIncome)}
                    </p>
                    <p className={`text-[10.5px] font-semibold tabular-nums ${ui.textMuted}`}>
                      {analyticsData.savingsRate !== null
                        ? `${analyticsData.savingsRate}% saved`
                        : `${analyticsData.expenseCount} entries`}
                    </p>
                  </div>

                  <div>
                    <p className={`text-[10.5px] font-cartoon font-bold uppercase tracking-wider ${ui.textMuted}`}>
                      {analyticsRange === 'month' ? 'Est. Month' : 'Net Flow'}
                    </p>
                    <p
                      className={`text-base font-cartoon font-bold tabular-nums mt-0.5 truncate ${
                        analyticsRange === 'month'
                          ? ui.textSand
                          : analyticsData.netFlow >= 0
                          ? 'text-[#52B788]'
                          : 'text-[#F26B5B]'
                      }`}
                    >
                      {analyticsRange === 'month' ? (
                        fmtAmt(analyticsData.projectedMonthSpend)
                      ) : (
                        <>
                          {analyticsData.netFlow >= 0 ? '+' : '-'}
                          {fmtAmt(Math.abs(analyticsData.netFlow))}
                        </>
                      )}
                    </p>
                    <p className={`text-[10.5px] font-semibold ${ui.textMuted}`}>
                      {analyticsRange === 'month' ? 'Monthly pace' : `${analyticsData.shortcutPct}% Back Tap`}
                    </p>
                  </div>
                </div>

                <div className={`w-full h-3 rounded-full overflow-hidden flex p-0.5 gap-0.5 ${ui.trackBg}`}>
                  {analyticsData.totalIncome > 0 && (
                    <div
                      className="h-full rounded-l-full bg-[#52B788] transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          8,
                          Math.round(
                            (analyticsData.totalIncome /
                              (analyticsData.totalIncome + analyticsData.totalExpense)) *
                              100
                          )
                        )}%`
                      }}
                    />
                  )}
                  {analyticsData.totalExpense > 0 && (
                    <div
                      className="h-full rounded-r-full bg-[#F26B5B] transition-all duration-500"
                      style={{
                        width: `${Math.max(
                          8,
                          Math.round(
                            (analyticsData.totalExpense /
                              (analyticsData.totalIncome + analyticsData.totalExpense)) *
                              100
                          )
                        )}%`
                      }}
                    />
                  )}
                </div>

                <div className={`pt-2.5 border-t border-dashed grid grid-cols-3 gap-2 text-center ${ui.divider}`}>
                  <div>
                    <p className={`text-[10.5px] font-cartoon font-bold uppercase ${ui.textMuted}`}>No-Spend</p>
                    <p className="text-xs font-cartoon font-bold tabular-nums text-[#52B788] mt-0.5">
                      {analyticsData.noSpendDays}d ({analyticsData.noSpendPct}%)
                    </p>
                  </div>
                  <div>
                    <p className={`text-[10.5px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Avg Spend</p>
                    <p className={`text-xs font-cartoon font-bold tabular-nums mt-0.5 ${ui.textSand}`}>
                      {fmtAmt(analyticsData.avgTicket)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-[10.5px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Entries</p>
                    <p className={`text-xs font-cartoon font-bold tabular-nums mt-0.5 ${ui.textPrimary}`}>
                      {analyticsData.expenseCount} out
                    </p>
                  </div>
                </div>
              </div>

              {/* Spending Rhythm Bar Chart */}
              <div className={`p-4 rounded-3xl space-y-3 ${ui.card}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Spending Rhythm</h4>
                    {selectedDayObj && (
                      <p className={`text-[11px] font-semibold tabular-nums ${ui.textSecondary}`}>
                        {selectedDayObj.fullDateLabel}:{' '}
                        <span className={`font-bold ${ui.textSand}`}>
                          {fmtAmt(selectedDayObj.amount)}
                        </span>
                      </p>
                    )}
                  </div>
                  <span className={`text-[11px] font-cartoon font-bold tabular-nums ${ui.textMuted}`}>
                    Avg: {fmtAmt(Math.round(analyticsData.trendAvg))}
                  </span>
                </div>

                <div
                  className="grid gap-1.5 items-end h-28 pt-2"
                  style={{
                    gridTemplateColumns: `repeat(${analyticsData.trendBars.length}, minmax(0, 1fr))`
                  }}
                >
                  {analyticsData.trendBars.map((day, idx) => {
                    const isSelected = safeBarIdx === idx;
                    const heightPct =
                      day.amount > 0
                        ? Math.max(16, Math.round((day.amount / analyticsData.maxTrendSpend) * 100))
                        : 8;
                    return (
                      <button
                        key={idx}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${day.fullDateLabel}: ${fmtAmt(day.amount)}`}
                        onClick={() => {
                          playQuickChip();
                          setSelectedBarIdx(idx);
                        }}
                        className="flex flex-col items-center justify-end h-full gap-1 key-press min-w-0"
                      >
                        <span
                          className={`text-[10.5px] font-cartoon font-bold tabular-nums truncate max-w-full ${
                            isSelected ? ui.textSand : ui.textMuted
                          }`}
                        >
                          {privacyMode
                            ? day.amount > 0
                              ? '••'
                              : ''
                            : day.amount > 0
                            ? day.amount >= 1000
                              ? `${(day.amount / 1000).toFixed(1)}k`
                              : Math.round(day.amount)
                            : ''}
                        </span>
                        <div
                          className={`w-full rounded-xl h-16 flex items-end p-0.5 transition-colors ${
                            isSelected ? ui.trackActiveBg : ui.trackBg
                          }`}
                        >
                          <div
                            className={`w-full rounded-lg transition-all duration-500 ios-spring ${
                              isSelected
                                ? 'bg-[#F4B942]'
                                : day.isToday
                                ? 'bg-[#D8CBB3]'
                                : day.amount > 0
                                ? 'bg-[#52B788]'
                                : 'bg-transparent'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span
                          className={`text-[10.5px] font-cartoon font-bold truncate max-w-full ${
                            isSelected || day.isToday ? ui.textSand : ui.textMuted
                          }`}
                        >
                          {day.isToday && analyticsData.effectiveDays <= 14 ? 'Today' : day.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Biggest Splurges */}
              {analyticsData.topExpenses.length > 0 && (
                <div className={`p-4 rounded-3xl space-y-2.5 ${ui.card}`}>
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Biggest Splurges</h4>
                    <span className={`text-[11px] font-semibold ${ui.textMuted}`}>Tap to edit</span>
                  </div>
                  <div className="space-y-2">
                    {analyticsData.topExpenses.map((tx, idx) => {
                      const w = wallets.find((item) => item.id === tx.wallet_id);
                      const { category: c, cleanNote } = resolveTxCategory(tx);
                      const accent = getCategoryAccentColor(c, idx);
                      return (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() => openEditTransaction(tx)}
                          className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-left cursor-pointer key-press ${ui.cardSubtle}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${ui.iconBadge}`}
                              style={{ backgroundColor: accent }}
                            >
                              {c?.icon || '💸'}
                            </span>
                            <div className="min-w-0">
                              <p className={`text-xs font-cartoon font-bold truncate ${ui.textPrimary}`}>
                                {cleanNote || c?.name || 'Expense'}
                              </p>
                              <p className={`text-[11px] font-semibold truncate ${ui.textMuted}`}>
                                {w?.name || 'Account'} · {formatDayGroupLabel(tx.created_at)}
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-cartoon font-bold tabular-nums shrink-0 ${ui.textSand}`}>
                            -{fmtAmt(tx.amount)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SECTION 2: BREAKDOWN */}
      {insightsView === 'breakdown' && (
        <div key="insights-breakdown" className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5 pb-1 animate-tab">
          {analyticsData.categoryBreakdown.length === 0 ? (
            <EmptyStateCard
              ui={ui}
              icon="🍩"
              title="No expenses to break down"
              subtitle={`No expenses were recorded in ${analyticsData.windowLabel}. Try switching the timeframe above.`}
            />
          ) : (
            <>
              {/* Interactive SVG Category Donut + Breakdown */}
              <div className={`p-4 rounded-3xl space-y-3.5 ${ui.card}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Where It Went</h4>
                  <span className={`text-[11px] font-semibold ${ui.textMuted}`}>Tap a slice to inspect</span>
                </div>

                <div className="flex items-center gap-4 py-1">
                  <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112" aria-label="Spending by category donut chart">
                      <circle
                        cx="56"
                        cy="56"
                        r={donutRadius}
                        fill="none"
                        stroke={isDark ? '#181816' : '#E2D9C6'}
                        strokeWidth="14"
                      />
                      {analyticsData.categoryBreakdown.map((item) => {
                        const strokeLen = Math.max(
                          0,
                          item.exactShare * donutCircumference -
                            (analyticsData.categoryBreakdown.length > 1 ? 3 : 0)
                        );
                        const dashOffset = -donutCumulativeShare * donutCircumference;
                        donutCumulativeShare += item.exactShare;
                        const isFocused = activeDonutCat?.id === item.id;

                        return (
                          <circle
                            key={item.id}
                            cx="56"
                            cy="56"
                            r={donutRadius}
                            fill="none"
                            stroke={item.color}
                            strokeWidth={isFocused ? '16' : '12.5'}
                            strokeDasharray={`${strokeLen} ${donutCircumference}`}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            className="transition-all duration-300 cursor-pointer"
                            onClick={() => {
                              playQuickChip();
                              setSelectedDonutCatId(item.id);
                            }}
                          />
                        );
                      })}
                    </svg>
                    {activeDonutCat && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                        <span className="text-lg leading-none">{activeDonutCat.icon}</span>
                        <span className={`text-xs font-cartoon font-bold tabular-nums mt-0.5 ${ui.textPrimary}`}>
                          {activeDonutCat.pct}%
                        </span>
                      </div>
                    )}
                  </div>

                  {activeDonutCat && (
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-3 h-3 rounded-full border shrink-0 ${ui.badgeBorder}`}
                          style={{ backgroundColor: activeDonutCat.color }}
                        />
                        <p className={`text-xs font-cartoon font-bold truncate ${ui.textPrimary}`}>
                          {activeDonutCat.name}
                        </p>
                      </div>
                      <p className={`text-lg font-cartoon font-bold tabular-nums leading-tight ${ui.textSand}`}>
                        {fmtAmt(activeDonutCat.amount)}
                      </p>
                      <div className={`text-[11px] font-semibold space-y-0.5 ${ui.textSecondary}`}>
                        <p>
                          {activeDonutCat.count} {activeDonutCat.count === 1 ? 'entry' : 'entries'} · Avg{' '}
                          {fmtAmt(activeDonutCat.avgTicket)}
                        </p>
                        {activeDonutCat.budget > 0 && (
                          <p className="text-[#F4B942]">
                            Month Limit: {fmtAmt(activeDonutCat.budget)} ({activeDonutCat.budgetPct}%)
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {analyticsData.categoryBreakdown.map((item) => {
                    const isFocused = activeDonutCat?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={isFocused}
                        onClick={() => {
                          playQuickChip();
                          setSelectedDonutCatId(item.id);
                        }}
                        className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-xs transition-all key-press ${
                          isFocused ? ui.cardElevated : ui.cardSubtle
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${ui.iconBadge}`}
                            style={{ backgroundColor: item.color }}
                          >
                            {item.icon}
                          </span>
                          <span className={`font-cartoon font-bold truncate ${ui.textPrimary}`}>{item.name}</span>
                          <span className={`text-[11px] font-semibold ${ui.textMuted}`}>({item.count})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 tabular-nums">
                          <span className={`font-cartoon font-bold ${ui.textPrimary}`}>
                            {fmtAmt(item.amount)}
                          </span>
                          <span
                            className={`text-[10.5px] px-2 py-0.5 rounded-lg border font-cartoon font-bold text-[#1e1e1c] ${ui.badgeBorder}`}
                            style={{ backgroundColor: item.color }}
                          >
                            {item.pct}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Budget Guardrails (always current month) */}
              {analyticsData.budgetedCategories.length > 0 && (
                <div className={`p-4 rounded-3xl space-y-3 ${ui.card}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>
                      Budget Guardrails · This Month
                    </h4>
                    <span className={`text-[11px] font-cartoon font-bold tabular-nums shrink-0 ${ui.textSand}`}>
                      {fmtAmt(analyticsData.totalBudgetSpent)} / {fmtAmt(analyticsData.totalBudgetLimit)}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {analyticsData.budgetedCategories.map((b) => (
                      <div key={b.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs tabular-nums">
                          <span className={`font-cartoon font-bold ${ui.textPrimary}`}>
                            {b.icon} {b.name}
                          </span>
                          <span className={`font-cartoon font-bold ${b.overBy > 0 ? 'text-[#F26B5B]' : ui.textPrimary}`}>
                            {fmtAmt(b.spent)} / {fmtAmt(b.limit)} ({b.pct}%)
                          </span>
                        </div>
                        <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 ${ui.trackBg}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ios-spring ${
                              b.pct >= 100
                                ? 'bg-[#F26B5B]'
                                : b.pct >= 80
                                ? 'bg-[#F4B942]'
                                : 'bg-[#52B788]'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(6, b.pct))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Share Breakdown */}
              {analyticsData.walletBreakdown.length > 0 && (
                <div className={`p-4 rounded-3xl space-y-2.5 ${ui.card}`}>
                  <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Account Share</h4>
                  <div className="space-y-2.5">
                    {analyticsData.walletBreakdown.map((w) => (
                      <div key={w.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs tabular-nums">
                          <span className={`font-cartoon font-bold ${ui.textPrimary}`}>
                            {w.icon} {w.name}
                          </span>
                          <span className={`font-cartoon font-bold ${ui.textPrimary}`}>
                            {fmtAmt(w.amount)}{' '}
                            <span className={`text-[11px] font-semibold ${ui.textMuted}`}>({w.pct}%)</span>
                          </span>
                        </div>
                        <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 ${ui.trackBg}`}>
                          <div
                            className="h-full rounded-full transition-all duration-500 ios-spring"
                            style={{ width: `${Math.max(6, w.pct)}%`, backgroundColor: w.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SECTION 3: HABITS */}
      {insightsView === 'habits' && (
        <div key="insights-habits" className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5 pb-1 animate-tab">
          {analyticsData.expenseCount === 0 ? (
            <EmptyStateCard
              ui={ui}
              icon="🧭"
              title="No habit patterns yet"
              subtitle="Log a few expenses in this period to reveal your peak spending days, time windows, and ticket sizes."
            />
          ) : (
            <>
              {/* Pace & Ticket Metrics Strip */}
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-3 rounded-2xl flex flex-col justify-between ${ui.card}`}>
                  <span className={`text-[10.5px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
                    🛡️ No-Spend
                  </span>
                  <p className="text-base font-cartoon font-bold tabular-nums text-[#52B788] mt-1">
                    {analyticsData.noSpendDays} {analyticsData.noSpendDays === 1 ? 'Day' : 'Days'}
                  </p>
                  <span className={`text-[10.5px] font-semibold ${ui.textSecondary}`}>
                    {analyticsData.noSpendPct}% of period
                  </span>
                </div>

                <div className={`p-3 rounded-2xl flex flex-col justify-between ${ui.card}`}>
                  <span className={`text-[10.5px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
                    🎯 Avg Spend
                  </span>
                  <p className={`text-base font-cartoon font-bold tabular-nums mt-1 ${ui.textSand}`}>
                    {fmtAmt(analyticsData.avgTicket)}
                  </p>
                  <span className={`text-[10.5px] font-semibold tabular-nums ${ui.textSecondary}`}>
                    Med {fmtAmt(analyticsData.medianTicket)}
                  </span>
                </div>

                <div className={`p-3 rounded-2xl flex flex-col justify-between ${ui.card}`}>
                  <span className={`text-[10.5px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
                    ⚡ Frequency
                  </span>
                  <p className={`text-base font-cartoon font-bold tabular-nums mt-1 ${ui.textPrimary}`}>
                    {(analyticsData.expenseCount / Math.max(1, analyticsData.effectiveDays)).toFixed(1)}/d
                  </p>
                  <span className={`text-[10.5px] font-semibold ${ui.textSecondary}`}>
                    {analyticsData.activeSpendDays} active days
                  </span>
                </div>
              </div>

              {/* Interactive Day-of-Week Heatmap (Mon–Sun) */}
              <div className={`p-4 rounded-3xl space-y-3 ${ui.card}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Day-of-Week Heatmap</h4>
                    <p className={`text-[11px] font-semibold ${ui.textMuted}`}>
                      Tap any day to inspect details
                    </p>
                  </div>
                  {analyticsData.peakDow && analyticsData.peakDow.amount > 0 && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-cartoon font-bold bg-[#F4B942] text-[#1e1e1c] border ${ui.badgeBorder}`}
                    >
                      Peak: {analyticsData.peakDow.label} ({analyticsData.peakDow.sharePct}%)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1.5 pt-0.5">
                  {analyticsData.dowBreakdown.map((d) => {
                    const isPeak = analyticsData.peakDow?.dayNum === d.dayNum && d.amount > 0;
                    const isSelected = activeDowObj?.dayNum === d.dayNum;
                    return (
                      <button
                        key={d.dayNum}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${d.label}: ${currencySymbol}${Math.round(d.amount)} across ${d.count} entries`}
                        onClick={() => {
                          playQuickChip();
                          setSelectedDow(d.dayNum);
                        }}
                        className={`p-2 rounded-2xl flex flex-col items-center gap-1 transition-all duration-150 key-press ${
                          isSelected
                            ? `bg-[#F4B942] text-[#1e1e1c] ${ui.pillSelectedBorder}`
                            : isPeak
                            ? `bg-[#D8CBB3]/25 border border-[#F4B942]/70 ${ui.textPrimary}`
                            : ui.cardSubtle
                        }`}
                      >
                        <span
                          className={`text-[10.5px] font-cartoon font-bold ${
                            isSelected ? 'text-[#1e1e1c]' : ui.textSecondary
                          }`}
                        >
                          {d.label}
                        </span>
                        <span
                          className={`text-[10.5px] font-cartoon font-bold tabular-nums ${
                            isSelected ? 'text-[#1e1e1c]' : ui.textPrimary
                          }`}
                        >
                          {privacyMode
                            ? '••'
                            : d.amount >= 1000
                            ? `${(d.amount / 1000).toFixed(1)}k`
                            : Math.round(d.amount)}
                        </span>
                        <span
                          className={`text-[10.5px] font-semibold ${
                            isSelected ? 'text-[#1e1e1c]/80' : ui.textMuted
                          }`}
                        >
                          {d.count}x
                        </span>
                      </button>
                    );
                  })}
                </div>

                {activeDowObj && (
                  <div
                    className={`px-3 py-2 rounded-2xl flex items-center justify-between text-[11px] font-semibold transition-all ${ui.cardSubtle}`}
                  >
                    <span className={`font-cartoon font-bold ${ui.textPrimary}`}>
                      {activeDowObj.label} Total:{' '}
                      <span className={ui.textSand}>{fmtAmt(Math.round(activeDowObj.amount))}</span>
                    </span>
                    <span className={`tabular-nums ${ui.textSecondary}`}>
                      {activeDowObj.sharePct}% share · {activeDowObj.count}{' '}
                      {activeDowObj.count === 1 ? 'entry' : 'entries'}
                      {activeDowObj.count > 0 && !privacyMode
                        ? ` (avg ${currencySymbol}${Math.round(
                            activeDowObj.amount / activeDowObj.count
                          ).toLocaleString('en-IN')})`
                        : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Interactive Time-of-Day Rhythm + Ticket Size Buckets */}
              <div className={`p-4 rounded-3xl space-y-3 ${ui.card}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>
                    Time-of-Day &amp; Ticket Size
                  </h4>
                  <span className={`text-[11px] font-semibold ${ui.textMuted}`}>Tap card to inspect</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {analyticsData.timeOfDayBreakdown.map((slot) => {
                    const isSelected = activeTimeSlotObj?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          playQuickChip();
                          setSelectedTimeSlotId(slot.id);
                        }}
                        className={`p-2.5 rounded-2xl flex items-center justify-between text-left transition-all duration-150 key-press ${
                          isSelected ? ui.cardElevated : ui.cardSubtle
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 ${ui.iconBadge}`}
                            style={{ backgroundColor: slot.color }}
                          >
                            {slot.icon}
                          </span>
                          <div className="min-w-0">
                            <p className={`text-[11px] font-cartoon font-bold truncate ${ui.textPrimary}`}>
                              {slot.label}
                            </p>
                            <p className={`text-[10.5px] font-semibold ${ui.textMuted}`}>{slot.sub}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <p className={`text-[11px] font-cartoon font-bold ${ui.textSand}`}>{slot.pct}%</p>
                          <p className={`text-[10.5px] font-semibold ${ui.textMuted}`}>{slot.count}x</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {activeTimeSlotObj && (
                  <div
                    className={`px-3 py-2 rounded-2xl flex items-center justify-between text-[11px] font-semibold ${ui.cardSubtle}`}
                  >
                    <span className={`font-cartoon font-bold ${ui.textPrimary}`}>
                      {activeTimeSlotObj.icon} {activeTimeSlotObj.label} ({activeTimeSlotObj.sub})
                    </span>
                    <span className={`tabular-nums ${ui.textSand} font-cartoon font-bold`}>
                      {fmtAmt(Math.round(activeTimeSlotObj.amount))}
                      {activeTimeSlotObj.count > 0 && !privacyMode
                        ? ` · avg ${currencySymbol}${Math.round(
                            activeTimeSlotObj.amount / activeTimeSlotObj.count
                          ).toLocaleString('en-IN')}`
                        : ''}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  {Object.values(analyticsData.ticketBuckets).map((b) => (
                    <div
                      key={b.label}
                      className={`p-2.5 rounded-2xl text-center space-y-0.5 ${ui.cardSubtle}`}
                    >
                      <p className={`text-[10.5px] font-cartoon font-bold ${ui.textSecondary}`}>
                        {b.label}
                      </p>
                      <p className={`text-sm font-cartoon font-bold tabular-nums ${ui.textPrimary}`}>
                        {b.count} <span className={`text-[10.5px] font-normal ${ui.textMuted}`}>txns</span>
                      </p>
                      <p className="text-[11px] font-cartoon font-bold tabular-nums" style={{ color: b.color }}>
                        {fmtAmt(Math.round(b.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Smart Pocket Insights */}
              {analyticsData.smartInsights.length > 0 && (
                <div className={`p-4 rounded-3xl space-y-2.5 ${ui.card}`}>
                  <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Smart Takeaways</h4>
                  <div className="space-y-2">
                    {analyticsData.smartInsights.map((ins, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-2xl flex items-center gap-2.5 ${ui.cardSubtle}`}
                      >
                        <span
                          className={`w-8 h-8 rounded-xl bg-[#D8CBB3] text-[#1e1e1c] flex items-center justify-center text-sm shrink-0 ${ui.iconBadge}`}
                        >
                          {ins.icon}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-xs font-cartoon font-bold truncate ${ui.textPrimary}`}>
                            {ins.title}
                          </p>
                          <p className={`text-[11px] font-medium leading-snug ${ui.textSecondary}`}>
                            {ins.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function SettingsTab({
  ui,
  tabAnimClass,
  themePref,
  setThemePref,
  soundEnabled,
  onToggleSound,
  settingsSection,
  setSettingsSection,
  personalApiUrl,
  copyToClipboard,
  copiedField,
  handleOneTapShortcut,
  settings,
  handleRegenerateToken,
  categories,
  currentMonthSpendByCat,
  currencySymbol,
  onOpenNewCategory,
  openEditCategory,
  handleDeleteCategory,
  confirmDeleteId,
  session,
  isSyncing,
  onSync,
  handleLogout
}) {
  const settingsSubIndex = settingsSection === 'shortcut' ? 0 : 1;

  return (
    <div className={`flex-1 min-h-0 flex flex-col gap-3 overflow-hidden ${tabAnimClass}`}>
      <div className={`p-3.5 rounded-2xl space-y-2.5 shrink-0 ${ui.card}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Theme Vibe</p>
            <p className={`text-[11px] font-medium ${ui.textMuted}`}>Select your preferred theme</p>
          </div>
          <div className={`flex p-0.5 rounded-xl ${ui.segmentedBg}`}>
            {[
              { id: 'system', label: 'Auto' },
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={themePref === m.id}
                onClick={() => {
                  if (themePref !== m.id) playQuickChip();
                  setThemePref(m.id);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-cartoon font-bold transition-all duration-200 ${
                  themePref === m.id ? `${ui.segmentedThumb} ${ui.segmentedTextActive}` : ui.textSecondary
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`pt-2.5 border-t border-dashed flex items-center justify-between ${ui.divider}`}>
          <div>
            <p className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Sound Effects</p>
            <p className={`text-[11px] font-medium ${ui.textMuted}`}>Tactile keypad pops &amp; chimes</p>
          </div>
          <div className={`flex p-0.5 rounded-xl ${ui.segmentedBg}`}>
            {[
              { id: true, label: '🔊 On' },
              { id: false, label: '🔇 Muted' }
            ].map((opt) => (
              <button
                key={String(opt.id)}
                type="button"
                aria-pressed={soundEnabled === opt.id}
                onClick={() => onToggleSound(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-cartoon font-bold transition-all duration-200 ${
                  soundEnabled === opt.id
                    ? `${ui.segmentedThumb} ${ui.segmentedTextActive}`
                    : ui.textSecondary
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Settings sections"
        className={`relative grid grid-cols-2 p-1 rounded-2xl shrink-0 ${ui.segmentedBg}`}
      >
        <div
          aria-hidden="true"
          className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl transition-transform duration-300 ios-spring ${ui.segmentedThumb}`}
          style={{ transform: `translate3d(${settingsSubIndex * 100}%, 0, 0)` }}
        />
        <button
          type="button"
          role="tab"
          aria-selected={settingsSection === 'shortcut'}
          onClick={() => {
            if (settingsSection !== 'shortcut') playTabSwitch();
            setSettingsSection('shortcut');
          }}
          className={`relative z-10 py-1.5 rounded-xl text-xs font-cartoon transition-colors duration-200 ${
            settingsSection === 'shortcut' ? ui.segmentedTextActive : `${ui.textSecondary} font-semibold`
          }`}
        >
          Shortcut Setup
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={settingsSection === 'budgets'}
          onClick={() => {
            if (settingsSection !== 'budgets') playTabSwitch();
            setSettingsSection('budgets');
          }}
          className={`relative z-10 py-1.5 rounded-xl text-xs font-cartoon transition-colors duration-200 ${
            settingsSection === 'budgets' ? ui.segmentedTextActive : `${ui.textSecondary} font-semibold`
          }`}
        >
          Categories
        </button>
      </div>

      {settingsSection === 'shortcut' && (
        <div key="sub-shortcut" className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5 pb-1 animate-tab-left">
          <div className={`p-4 rounded-2xl space-y-3 ${ui.card}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>iOS Shortcut Installer</h3>
                <p className={`text-[11px] font-medium ${ui.textMuted}`}>
                  Log from Lock Screen with double-tap on the back of your iPhone
                </p>
              </div>
              <span
                className={`text-[10.5px] px-2.5 py-0.5 rounded-full bg-[#D8CBB3] text-[#1e1e1c] border font-cartoon font-bold shrink-0 ${ui.badgeBorder}`}
              >
                iOS
              </span>
            </div>

            <div className="space-y-1">
              <label className={`text-[11px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
                Your Personal Shortcut URL
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  aria-label="Personal Shortcut URL"
                  value={personalApiUrl}
                  className={`flex-1 min-w-0 rounded-xl px-3 py-2 text-[16px] leading-snug font-mono ${ui.input}`}
                />
                <button
                  type="button"
                  disabled={!personalApiUrl}
                  onClick={() => copyToClipboard(personalApiUrl, 'apiUrl')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-cartoon font-bold shrink-0 key-press ${ui.pillIdle}`}
                >
                  {copiedField === 'apiUrl' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={!personalApiUrl}
              onClick={handleOneTapShortcut}
              className={`w-full py-3 px-4 rounded-xl font-cartoon font-bold text-xs key-press ${ui.primaryBtnExpense}`}
            >
              Copy Personal URL &amp; Install Shortcut
            </button>

            <div className={`pt-2 border-t border-dashed space-y-1.5 text-[11px] ${ui.divider} ${ui.textSecondary}`}>
              <p className={`font-cartoon font-bold ${ui.textPrimary}`}>
                Quick Setup (If you want it to be a Back Tap Shortcut):
              </p>
              <ol className="list-decimal list-inside space-y-1 leading-relaxed font-medium">
                <li>Tap the button above (your Personal URL copies automatically).</li>
                <li>
                  When Apple Shortcuts opens, tap <strong>Paste</strong> into the setup prompt and tap{' '}
                  <strong>Add Shortcut</strong>.
                </li>
                <li>
                  Go to iPhone <strong>Settings → Accessibility → Touch → Back Tap → Double Tap</strong> and select{' '}
                  <strong>TAPX</strong>.
                </li>
              </ol>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl space-y-1.5 ${ui.card}`}>
            <label className={`text-[11px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
              Shortcut Security Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                aria-label="Shortcut Security Token"
                value={settings?.shortcut_token || ''}
                className={`flex-1 min-w-0 rounded-xl px-3 py-2 text-[16px] leading-snug font-mono ${ui.input}`}
              />
              <button
                type="button"
                disabled={!settings?.shortcut_token}
                onClick={() => copyToClipboard(settings?.shortcut_token, 'token')}
                className={`px-3 py-2.5 rounded-xl text-xs font-cartoon font-bold shrink-0 key-press ${ui.pillIdle}`}
              >
                {copiedField === 'token' ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handleRegenerateToken}
                aria-label="Regenerate Shortcut Security Token"
                className={`px-3 py-2.5 rounded-xl text-xs font-cartoon font-bold shrink-0 key-press ${ui.pillIdle}`}
                title="Regenerate Token"
              >
                ↻
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsSection === 'budgets' && (
        <div key="sub-budgets" className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden animate-tab-right">
          <div className="flex items-center justify-between shrink-0">
            <span className={`text-[11px] font-cartoon font-bold ${ui.textMuted}`}>
              {categories.length} Categories
            </span>
            <button
              type="button"
              onClick={onOpenNewCategory}
              className={`text-xs px-3 py-1 rounded-full font-cartoon font-bold key-press ${ui.pillActive}`}
            >
              + Add Category
            </button>
          </div>

          <div className="flex-1 min-h-0 custom-scroll space-y-2 pr-0.5 pb-1">
            {categories.map((c, idx) => {
              const spent = currentMonthSpendByCat[c.id] || 0;
              const budget = Number(c.monthly_budget) || 0;
              const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
              const accent = getCategoryAccentColor(c, idx);

              return (
                <div
                  key={c.id}
                  onClick={() => openEditCategory(c)}
                  className={`p-3 rounded-2xl space-y-2 cursor-pointer key-press ${ui.listRow}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${ui.iconBadge}`}
                        style={{ backgroundColor: accent }}
                      >
                        {c.icon}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-cartoon font-bold truncate ${ui.textPrimary}`}>{c.name}</p>
                        <p className={`text-[11px] font-semibold capitalize ${ui.textMuted}`}>
                          {c.type} {budget > 0 ? `· ${pct}% of limit` : ''}
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1.5 tabular-nums shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.type === 'expense' && (
                        <span className={`text-xs font-cartoon font-bold mr-1 ${ui.textSand}`}>
                          {currencySymbol}
                          {spent.toLocaleString('en-IN')}
                          {budget > 0 ? ` / ${currencySymbol}${budget.toLocaleString('en-IN')}` : ''}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditCategory(c)}
                        className={`px-2 py-1 rounded-lg text-[10.5px] font-cartoon font-bold key-press ${ui.pillIdle}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${c.name} category`}
                        onClick={() => handleDeleteCategory(c.id)}
                        className={`px-2 py-1 rounded-lg text-[10.5px] font-cartoon font-bold key-press ${
                          confirmDeleteId === c.id
                            ? ui.dangerBtn
                            : `${ui.textMuted} hover:text-[#F26B5B]`
                        }`}
                      >
                        {confirmDeleteId === c.id ? 'Sure?' : '✕'}
                      </button>
                    </div>
                  </div>
                  {budget > 0 && c.type === 'expense' && (
                    <div className={`w-full h-2.5 rounded-full overflow-hidden p-0.5 ${ui.trackBg}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ios-spring ${
                          pct >= 90 ? 'bg-[#F26B5B]' : pct >= 75 ? 'bg-[#F4B942]' : 'bg-[#52B788]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`pt-2 border-t border-dashed flex items-center justify-between shrink-0 ${ui.divider}`}>
        <span className={`text-[11px] font-semibold truncate max-w-[180px] ${ui.textMuted}`}>
          {session?.user?.email}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSyncing}
            onClick={onSync}
            className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold key-press ${ui.pillIdle}`}
          >
            {isSyncing ? 'Syncing…' : 'Sync'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold key-press ${ui.dangerBtn}`}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}