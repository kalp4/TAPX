import React from 'react';
import { formatDayGroupLabel, getCategoryAccentColor } from '../utils/formatters';

export default function InsightsTab({
  ui,
  isDark,
  tabAnimClass,
  analyticsRange,
  setAnalyticsRange,
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
  const selectedDayObj =
    analyticsData.last7Days[selectedBarIdx] ||
    analyticsData.last7Days[analyticsData.last7Days.length - 1];

  const activeDonutCat =
    analyticsData.categoryBreakdown.find((c) => c.id === selectedDonutCatId) ||
    analyticsData.categoryBreakdown[0] ||
    null;

  const donutRadius = 45;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutCumulativeShare = 0;

  return (
    <div className={`flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden ${tabAnimClass}`}>
      {/* Top Bar: Period Selector + 1-Tap CSV Export */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className={`flex p-0.5 rounded-xl ${ui.segmentedBg}`}>
          {[
            { id: 'week', label: '7D' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAnalyticsRange(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-cartoon font-bold transition-all duration-200 ${
                analyticsRange === tab.id ? `${ui.segmentedThumb} ${ui.segmentedTextActive}` : ui.textSecondary
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-cartoon font-bold flex items-center gap-1.5 key-press ${ui.pillActive}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Scrollable Cartoon Insights Cards */}
      <div className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5 pb-1">
        {/* Hero Cashflow & Pacing Card */}
        <div className={`p-4 rounded-3xl space-y-3 relative overflow-hidden ${ui.card}`}>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className={`text-[10px] font-cartoon font-bold uppercase tracking-wider ${ui.textMuted}`}>Spent</p>
              <p className={`text-base font-cartoon font-bold tabular-nums mt-0.5 truncate ${ui.textPrimary}`}>
                {currencySymbol}
                {analyticsData.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className={`text-[10px] font-semibold tabular-nums ${ui.textMuted}`}>
                {currencySymbol}
                {analyticsData.dailyAvgExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/day
              </p>
            </div>

            <div>
              <p className={`text-[10px] font-cartoon font-bold uppercase tracking-wider ${ui.textMuted}`}>Income</p>
              <p className="text-base font-cartoon font-bold tabular-nums text-[#52B788] mt-0.5 truncate">
                +{currencySymbol}
                {analyticsData.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className={`text-[10px] font-semibold tabular-nums ${ui.textMuted}`}>
                {analyticsData.savingsRate !== null
                  ? `${analyticsData.savingsRate}% saved`
                  : `${analyticsData.expenseCount} entries`}
              </p>
            </div>

            <div>
              <p className={`text-[10px] font-cartoon font-bold uppercase tracking-wider ${ui.textMuted}`}>
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
                  <>
                    {currencySymbol}
                    {analyticsData.projectedMonthSpend.toLocaleString('en-IN')}
                  </>
                ) : (
                  <>
                    {analyticsData.netFlow >= 0 ? '+' : '-'}
                    {currencySymbol}
                    {Math.abs(analyticsData.netFlow).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </>
                )}
              </p>
              <p className={`text-[10px] font-semibold ${ui.textMuted}`}>
                {analyticsRange === 'month' ? 'Monthly pace' : `${analyticsData.shortcutPct}% Back Tap`}
              </p>
            </div>
          </div>

          {(analyticsData.totalExpense > 0 || analyticsData.totalIncome > 0) && (
            <div className="space-y-1 pt-1">
              <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-[#161614] border-2 border-[#111110] p-0.5 gap-0.5">
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
            </div>
          )}
        </div>

        {/* Interactive SVG Category Donut + Breakdown Card */}
        <div className={`p-4 rounded-3xl space-y-3.5 ${ui.card}`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Where It Went</h4>
            <span className={`text-[10px] font-semibold ${ui.textMuted}`}>Tap a slice to inspect</span>
          </div>

          {analyticsData.categoryBreakdown.length === 0 ? (
            <p className={`text-xs py-3 text-center font-cartoon ${ui.textMuted}`}>
              No expenses recorded in this period.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-4 py-1">
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                    <circle
                      cx="56"
                      cy="56"
                      r={donutRadius}
                      fill="none"
                      stroke={isDark ? '#181816' : '#D8CBB3'}
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
                          onClick={() => setSelectedDonutCatId(item.id)}
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
                        className="w-3 h-3 rounded-full border border-[#111110] shrink-0"
                        style={{ backgroundColor: activeDonutCat.color }}
                      />
                      <p className={`text-xs font-cartoon font-bold truncate ${ui.textPrimary}`}>
                        {activeDonutCat.name}
                      </p>
                    </div>
                    <p className={`text-lg font-cartoon font-bold tabular-nums leading-tight ${ui.textSand}`}>
                      {currencySymbol}
                      {activeDonutCat.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                    <div className={`text-[10px] font-semibold space-y-0.5 ${ui.textSecondary}`}>
                      <p>
                        {activeDonutCat.count} {activeDonutCat.count === 1 ? 'entry' : 'entries'}
                      </p>
                      <p className="tabular-nums">
                        Avg {currencySymbol}
                        {activeDonutCat.avgTicket.toLocaleString('en-IN')}/spend
                      </p>
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
                      onClick={() => setSelectedDonutCatId(item.id)}
                      className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-xs transition-all key-press ${
                        isFocused ? ui.cardElevated : ui.cardSubtle
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-7 h-7 rounded-xl border-2 border-[#111110] flex items-center justify-center text-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.icon}
                        </span>
                        <span className={`font-cartoon font-bold truncate ${ui.textPrimary}`}>{item.name}</span>
                        <span className={`text-[10px] font-semibold ${ui.textMuted}`}>({item.count})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span className={`font-cartoon font-bold ${ui.textPrimary}`}>
                          {currencySymbol}
                          {item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-lg border border-[#111110] font-cartoon font-bold text-[#1e1e1c]"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.pct}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Interactive 7-Day Trend Bar Chart */}
        <div className={`p-4 rounded-3xl space-y-3 ${ui.card}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Last 7 Days Rhythm</h4>
              {selectedDayObj && (
                <p className={`text-[10px] font-semibold tabular-nums ${ui.textSecondary}`}>
                  {selectedDayObj.fullDateLabel}:{' '}
                  <span className={`font-bold ${ui.textSand}`}>
                    {currencySymbol}
                    {selectedDayObj.amount.toLocaleString('en-IN')}
                  </span>
                </p>
              )}
            </div>
            <span className={`text-[10px] font-cartoon font-bold tabular-nums ${ui.textMuted}`}>
              Avg: {currencySymbol}
              {Math.round(analyticsData.sevenDayAvg).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 items-end h-28 pt-2">
            {analyticsData.last7Days.map((day, idx) => {
              const isSelected = selectedBarIdx === idx;
              const heightPct =
                day.amount > 0
                  ? Math.max(16, Math.round((day.amount / analyticsData.maxDaySpend) * 100))
                  : 8;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedBarIdx(idx)}
                  className="flex flex-col items-center justify-end h-full gap-1 key-press"
                >
                  <span
                    className={`text-[9px] font-cartoon font-bold tabular-nums truncate max-w-full ${
                      isSelected ? ui.textSand : ui.textMuted
                    }`}
                  >
                    {day.amount > 0
                      ? day.amount >= 1000
                        ? `${(day.amount / 1000).toFixed(1)}k`
                        : Math.round(day.amount)
                      : ''}
                  </span>
                  <div
                    className={`w-full rounded-xl h-16 flex items-end p-0.5 border-2 border-[#111110] ${
                      isSelected ? 'bg-[#181816]' : ui.cardSubtle
                    }`}
                  >
                    <div
                      className={`w-full rounded-lg border border-[#111110] transition-all duration-500 ios-spring ${
                        isSelected
                          ? 'bg-[#F4B942]'
                          : day.isToday
                          ? 'bg-[#D8CBB3]'
                          : day.amount > 0
                          ? 'bg-[#52B788]'
                          : 'bg-transparent border-transparent'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-cartoon font-bold ${
                      isSelected || day.isToday ? ui.textSand : ui.textMuted
                    }`}
                  >
                    {day.isToday ? 'Today' : day.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
                      {currencySymbol}
                      {w.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                      <span className={`text-[10px] font-semibold ${ui.textMuted}`}>({w.pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden bg-[#181816] border-2 border-[#111110] p-0.5">
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

        {/* Largest Spends in Period */}
        {analyticsData.topExpenses.length > 0 && (
          <div className={`p-4 rounded-3xl space-y-2.5 ${ui.card}`}>
            <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Biggest Splurges</h4>
            <div className="space-y-2">
              {analyticsData.topExpenses.map((tx, idx) => {
                const w = wallets.find((item) => item.id === tx.wallet_id);
                const { category: c, cleanNote } = resolveTxCategory(tx);
                const accent = getCategoryAccentColor(c, idx);
                return (
                  <div
                    key={tx.id}
                    onClick={() => openEditTransaction(tx)}
                    className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer key-press ${ui.cardSubtle}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-8 h-8 rounded-xl border-2 border-[#111110] flex items-center justify-center text-xs shrink-0"
                        style={{ backgroundColor: accent }}
                      >
                        {c?.icon || '💸'}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-cartoon font-bold truncate ${ui.textPrimary}`}>
                          {cleanNote || c?.name || 'Expense'}
                        </p>
                        <p className={`text-[10px] font-semibold truncate ${ui.textMuted}`}>
                          {w?.name || 'Account'} · {formatDayGroupLabel(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-cartoon font-bold tabular-nums shrink-0 ${ui.textSand}`}>
                      -{currencySymbol}
                      {Number(tx.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
