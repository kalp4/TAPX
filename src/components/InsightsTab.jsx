import React from 'react';
import { formatDayGroupLabel, getCategoryAccentColor } from '../utils/formatters';

const RANGE_PRESETS = [
  { id: 'week', label: '7D' },
  { id: 'month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'all', label: 'All' },
  { id: 'custom', label: '📅 Custom' }
];

export default function InsightsTab({
  ui,
  isDark,
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

  const donutRadius = 45;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutCumulativeShare = 0;

  return (
    <div className={`flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden ${tabAnimClass}`}>
      {/* Top Bar: Scrollable Range Presets + Custom Toggle + 1-Tap CSV Export */}
      <div className="space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {RANGE_PRESETS.map((tab) => {
              const active = analyticsRange === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
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
            title="Export filtered period to CSV"
            className={`px-3 py-1.5 rounded-xl text-[11px] font-cartoon font-bold flex items-center gap-1 shrink-0 key-press ${ui.pillActive}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            CSV
          </button>
        </div>

        {/* Custom Date Range Picker Bar */}
        {analyticsRange === 'custom' && (
          <div className={`p-2.5 rounded-2xl grid grid-cols-2 gap-2 animate-tab ${ui.card}`}>
            <div className="space-y-0.5">
              <label className={`text-[9px] font-cartoon font-bold uppercase px-1 ${ui.textMuted}`}>
                From Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={`w-full rounded-xl px-2.5 py-1.5 text-xs font-cartoon font-bold focus:outline-none ${ui.input}`}
              />
            </div>
            <div className="space-y-0.5">
              <label className={`text-[9px] font-cartoon font-bold uppercase px-1 ${ui.textMuted}`}>
                To Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={`w-full rounded-xl px-2.5 py-1.5 text-xs font-cartoon font-bold focus:outline-none ${ui.input}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Deep Insights Feed */}
      <div className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5 pb-1">
        {/* 1. Hero Cashflow, Period Delta & Pacing Card */}
        <div className={`p-4 rounded-3xl space-y-3 relative overflow-hidden ${ui.card}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-cartoon font-bold uppercase tracking-wider ${ui.textSecondary}`}>
              {analyticsData.windowLabel} · {analyticsData.effectiveDays}{' '}
              {analyticsData.effectiveDays === 1 ? 'Day' : 'Days'}
            </span>
            {analyticsData.expenseDeltaPct !== null && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-cartoon font-bold border border-[#111110] ${
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

          {/* Chunky Cashflow Ratio Bar */}
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

        {/* 2. Velocity, No-Spend Days & Ticket Metrics Strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`p-3 rounded-2xl flex flex-col justify-between ${ui.card}`}>
            <span className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
              🛡️ No-Spend
            </span>
            <p className="text-base font-cartoon font-bold tabular-nums text-[#52B788] mt-1">
              {analyticsData.noSpendDays} {analyticsData.noSpendDays === 1 ? 'Day' : 'Days'}
            </p>
            <span className={`text-[10px] font-semibold ${ui.textSecondary}`}>
              {analyticsData.noSpendPct}% of period
            </span>
          </div>

          <div className={`p-3 rounded-2xl flex flex-col justify-between ${ui.card}`}>
            <span className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
              🎯 Avg Spend
            </span>
            <p className={`text-base font-cartoon font-bold tabular-nums mt-1 ${ui.textSand}`}>
              {currencySymbol}
              {analyticsData.avgTicket.toLocaleString('en-IN')}
            </p>
            <span className={`text-[10px] font-semibold tabular-nums ${ui.textSecondary}`}>
              Median {currencySymbol}
              {analyticsData.medianTicket.toLocaleString('en-IN')}
            </span>
          </div>

          <div className={`p-3 rounded-2xl flex flex-col justify-between ${ui.card}`}>
            <span className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
              ⚡ Frequency
            </span>
            <p className={`text-base font-cartoon font-bold tabular-nums mt-1 ${ui.textPrimary}`}>
              {(analyticsData.expenseCount / Math.max(1, analyticsData.effectiveDays)).toFixed(1)}/d
            </p>
            <span className={`text-[10px] font-semibold ${ui.textSecondary}`}>
              {analyticsData.activeSpendDays} active days
            </span>
          </div>
        </div>

        {/* 3. Smart Pocket Insights Callouts */}
        {analyticsData.smartInsights.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {analyticsData.smartInsights.map((ins, i) => (
              <div
                key={i}
                className={`min-w-[215px] p-3 rounded-2xl flex items-start gap-2.5 shrink-0 ${ui.card}`}
              >
                <span className="w-8 h-8 rounded-xl bg-[#D8CBB3] text-[#1e1e1c] border-2 border-[#111110] flex items-center justify-center text-sm shrink-0">
                  {ins.icon}
                </span>
                <div className="min-w-0">
                  <p className={`text-xs font-cartoon font-bold truncate ${ui.textPrimary}`}>
                    {ins.title}
                  </p>
                  <p className={`text-[10px] font-medium leading-snug mt-0.5 ${ui.textSecondary}`}>
                    {ins.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. Interactive SVG Category Donut + Breakdown Card */}
        <div className={`p-4 rounded-3xl space-y-3.5 ${ui.card}`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Where It Went</h4>
            <span className={`text-[10px] font-semibold ${ui.textMuted}`}>Tap a slice to inspect</span>
          </div>

          {analyticsData.categoryBreakdown.length === 0 ? (
            <p className={`text-xs py-3 text-center font-cartoon ${ui.textMuted}`}>
              No expenses recorded in this timeframe.
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
                        {activeDonutCat.count} {activeDonutCat.count === 1 ? 'entry' : 'entries'} · Avg{' '}
                        {currencySymbol}
                        {activeDonutCat.avgTicket.toLocaleString('en-IN')}
                      </p>
                      {activeDonutCat.budget > 0 && (
                        <p className="text-[#F4B942]">
                          Limit: {currencySymbol}
                          {activeDonutCat.budget.toLocaleString('en-IN')} ({activeDonutCat.budgetPct}%)
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

        {/* 5. Interactive Period Trend Bar Chart */}
        <div className={`p-4 rounded-3xl space-y-3 ${ui.card}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Spending Rhythm</h4>
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
              {Math.round(analyticsData.trendAvg).toLocaleString('en-IN')}
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
                  onClick={() => setSelectedBarIdx(idx)}
                  className="flex flex-col items-center justify-end h-full gap-1 key-press min-w-0"
                >
                  <span
                    className={`text-[8.5px] font-cartoon font-bold tabular-nums truncate max-w-full ${
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
                    className={`text-[9px] font-cartoon font-bold truncate max-w-full ${
                      isSelected || day.isToday ? ui.textSand : ui.textMuted
                    }`}
                  >
                    {day.isToday && analyticsData.trendBars.length <= 7 ? 'Today' : day.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Day-of-Week Heatmap (Mon–Sun) */}
        <div className={`p-4 rounded-3xl space-y-3 ${ui.card}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Day-of-Week Heatmap</h4>
              <p className={`text-[10px] font-semibold ${ui.textMuted}`}>
                Which days drain your wallet most
              </p>
            </div>
            {analyticsData.peakDow && analyticsData.peakDow.amount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-cartoon font-bold bg-[#F4B942] text-[#1e1e1c] border border-[#111110]">
                Peak: {analyticsData.peakDow.label} ({analyticsData.peakDow.sharePct}%)
              </span>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {analyticsData.dowBreakdown.map((d) => {
              const isPeak =
                analyticsData.peakDow?.dayNum === d.dayNum && d.amount > 0;
              return (
                <div
                  key={d.dayNum}
                  className={`p-2 rounded-2xl border-2 border-[#111110] flex flex-col items-center gap-1 ${
                    isPeak
                      ? 'bg-[#F4B942] text-[#1e1e1c] shadow-[0_3px_0_#111110]'
                      : ui.cardSubtle
                  }`}
                >
                  <span
                    className={`text-[10px] font-cartoon font-bold ${
                      isPeak ? 'text-[#1e1e1c]' : ui.textSecondary
                    }`}
                  >
                    {d.label}
                  </span>
                  <span
                    className={`text-[10px] font-cartoon font-bold tabular-nums ${
                      isPeak ? 'text-[#1e1e1c]' : ui.textPrimary
                    }`}
                  >
                    {d.amount >= 1000
                      ? `${(d.amount / 1000).toFixed(1)}k`
                      : Math.round(d.amount)}
                  </span>
                  <span
                    className={`text-[8.5px] font-semibold ${
                      isPeak ? 'text-[#1e1e1c]/80' : ui.textMuted
                    }`}
                  >
                    {d.count}x
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7. Time-of-Day Rhythm + Ticket Size Breakdown */}
        <div className={`p-4 rounded-3xl space-y-3.5 ${ui.card}`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>
              Time-of-Day &amp; Ticket Size
            </h4>
            <span className={`text-[10px] font-semibold ${ui.textMuted}`}>Habit breakdown</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {analyticsData.timeOfDayBreakdown.map((slot) => (
              <div
                key={slot.id}
                className={`p-2.5 rounded-2xl flex items-center justify-between ${ui.cardSubtle}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-7 h-7 rounded-xl border border-[#111110] flex items-center justify-center text-xs shrink-0"
                    style={{ backgroundColor: slot.color }}
                  >
                    {slot.icon}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-[11px] font-cartoon font-bold truncate ${ui.textPrimary}`}>
                      {slot.label}
                    </p>
                    <p className={`text-[9px] font-semibold ${ui.textMuted}`}>{slot.sub}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <p className={`text-[11px] font-cartoon font-bold ${ui.textSand}`}>{slot.pct}%</p>
                  <p className={`text-[9px] font-semibold ${ui.textMuted}`}>{slot.count}x</p>
                </div>
              </div>
            ))}
          </div>

          {/* Ticket Size Pills */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {Object.values(analyticsData.ticketBuckets).map((b) => (
              <div
                key={b.label}
                className={`p-2.5 rounded-2xl text-center space-y-0.5 ${ui.cardSubtle}`}
              >
                <p className={`text-[9.5px] font-cartoon font-bold ${ui.textSecondary}`}>
                  {b.label}
                </p>
                <p className={`text-sm font-cartoon font-bold tabular-nums ${ui.textPrimary}`}>
                  {b.count} <span className={`text-[10px] font-normal ${ui.textMuted}`}>txns</span>
                </p>
                <p className="text-[10px] font-cartoon font-bold tabular-nums" style={{ color: b.color }}>
                  {currencySymbol}
                  {Math.round(b.amount).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 8. Category Budget Health Tracker (When limits are set) */}
        {analyticsData.budgetedCategories.length > 0 && (
          <div className={`p-4 rounded-3xl space-y-3 ${ui.card}`}>
            <div className="flex items-center justify-between">
              <h4 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Budget Guardrails</h4>
              <span className={`text-[10px] font-cartoon font-bold tabular-nums ${ui.textSand}`}>
                {currencySymbol}
                {analyticsData.totalBudgetSpent.toLocaleString('en-IN')} / {currencySymbol}
                {analyticsData.totalBudgetLimit.toLocaleString('en-IN')}
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
                      {currencySymbol}
                      {b.spent.toLocaleString('en-IN')} / {currencySymbol}
                      {b.limit.toLocaleString('en-IN')} ({b.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden bg-[#181816] border-2 border-[#111110] p-0.5">
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

        {/* 9. Account Share Breakdown */}
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

        {/* 10. Largest Spends in Period */}
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