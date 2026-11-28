import { WALLET_COLORS, CHART_COLORS } from './constants.js';

export function roundMoney(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

export function getInitialSyncSession(cachedData) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          const sessionObj = parsed?.currentSession || parsed?.session || parsed;
          if (sessionObj?.user?.id) {
            return sessionObj;
          }
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }

  if (cachedData?.userId) {
    return {
      user: {
        id: cachedData.userId,
        email: cachedData.userEmail || '',
        user_metadata: cachedData.userMetadata || {}
      }
    };
  }

  return null;
}

export function hasOAuthParamsInUrl() {
  if (typeof window === 'undefined') return false;
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  return (
    search.includes('code=') ||
    hash.includes('access_token=') ||
    hash.includes('error_description=') ||
    new URLSearchParams(search).has('error')
  );
}

export function parseShortcutCategoryTag(rawNote) {
  const str = String(rawNote || '');
  const match = str.match(/\[cat:([^\]]+)\]/i);
  if (!match) {
    return { cleanNote: str, tagCategoryName: null };
  }
  return {
    cleanNote: str.replace(/\[cat:[^\]]+\]/gi, '').replace(/\s+/g, ' ').trim(),
    tagCategoryName: match[1].trim()
  };
}

export function cleanCategoryString(str) {
  return String(str || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .trim()
    .toLowerCase();
}

export function findMatchingCategoryObj(categoryName, categoriesList) {
  if (!categoryName || !Array.isArray(categoriesList) || categoriesList.length === 0) {
    return null;
  }
  const rawTarget = String(categoryName).trim().toLowerCase();
  const rawExact = categoriesList.find((c) => String(c?.name || '').trim().toLowerCase() === rawTarget);
  if (rawExact) return rawExact;

  const target = cleanCategoryString(categoryName);
  if (!target) return null;

  const exact = categoriesList.find((c) => cleanCategoryString(c.name) === target);
  if (exact) return exact;

  const partial = categoriesList.find((c) => {
    const cleanDb = cleanCategoryString(c.name);
    if (!cleanDb) return false;
    return cleanDb.includes(target) || target.includes(cleanDb);
  });
  return partial || null;
}

export function getCategoryAccentColor(cat, index = 0) {
  if (
    cat?.color &&
    !['#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899'].includes(cat.color)
  ) {
    return cat.color;
  }
  const name = String(cat?.name || '').toLowerCase();
  if (name.includes('food') || name.includes('drink') || name.includes('dining')) return '#F26B5B';
  if (name.includes('grocer')) return '#52B788';
  if (name.includes('transport') || name.includes('fuel') || name.includes('cab')) return '#F4B942';
  if (name.includes('shop')) return '#9B7EDE';
  if (name.includes('entertain') || name.includes('movie')) return '#E56B6F';
  if (name.includes('bill') || name.includes('recharge')) return '#5C9EAD';
  if (name.includes('health') || name.includes('fitness')) return '#E07A5F';
  if (name.includes('income') || name.includes('allowance') || name.includes('salary')) return '#52B788';
  return CHART_COLORS[index % CHART_COLORS.length];
}

export function formatDisplayAmount(rawStr) {
  if (!rawStr || rawStr === '0') return '0';
  const parts = String(rawStr).split('.');
  const intPart = Number(parts[0] || 0).toLocaleString('en-IN');
  if (parts.length > 1) {
    return `${intPart}.${parts[1]}`;
  }
  return intPart;
}

export function formatDayGroupLabel(isoString) {
  if (!isoString) return 'Recent';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Recent';

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
  });
}

export function formatTimeOnly(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function escapeCsvCell(val) {
  let str = String(val ?? '');
  // Neutralize spreadsheet formula injection characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function resolvePeriodWindow(analyticsRange, customStartStr, customEndStr) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  if (analyticsRange === 'week') {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - 6);
    return { start, end: todayEnd, label: 'Last 7 Days', daysCount: 7 };
  }

  if (analyticsRange === '30d') {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - 29);
    return { start, end: todayEnd, label: 'Last 30 Days', daysCount: 30 };
  }

  if (analyticsRange === '90d') {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - 89);
    return { start, end: todayEnd, label: 'Last 90 Days', daysCount: 90 };
  }

  if (analyticsRange === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const daysElapsed = Math.max(1, now.getDate());
    return { start, end: todayEnd, label: 'This Month', daysCount: daysElapsed };
  }

  if (analyticsRange === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const daysCount = Math.max(1, end.getDate());
    return { start, end, label: 'Last Month', daysCount };
  }

  if (analyticsRange === 'custom') {
    const parsedStart = customStartStr ? new Date(`${customStartStr}T00:00:00`) : null;
    const parsedEnd = customEndStr ? new Date(`${customEndStr}T23:59:59.999`) : null;

    let start =
      parsedStart && !isNaN(parsedStart.getTime())
        ? parsedStart
        : new Date(now.getFullYear(), now.getMonth(), 1);
    let end = parsedEnd && !isNaN(parsedEnd.getTime()) ? parsedEnd : todayEnd;

    if (start > end) {
      const tmp = start;
      start = startOfDay(end);
      end = endOfDay(tmp);
    }

    const diffDays = Math.max(
      1,
      Math.round((endOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000)
    );
    return {
      start: startOfDay(start),
      end: endOfDay(end),
      label: 'Custom Range',
      daysCount: diffDays
    };
  }

  return { start: null, end: todayEnd, label: 'All Time', daysCount: null };
}

function resolvePreviousPeriodWindow(analyticsRange, windowObj, now) {
  if (!windowObj.start) return null;

  if (analyticsRange === 'month') {
    const prevMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prevMonthIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonthIdx + 1, 0).getDate();
    const matchedDay = Math.min(now.getDate(), daysInPrevMonth);
    return {
      start: new Date(prevMonthYear, prevMonthIdx, 1, 0, 0, 0, 0),
      end: new Date(prevMonthYear, prevMonthIdx, matchedDay, 23, 59, 59, 999)
    };
  }

  if (analyticsRange === 'last_month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0),
      end: new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999)
    };
  }

  const daysSpan = Math.max(1, windowObj.daysCount || 1);
  const prevEndDay = new Date(
    windowObj.start.getFullYear(),
    windowObj.start.getMonth(),
    windowObj.start.getDate() - 1
  );
  const prevStartDay = new Date(
    prevEndDay.getFullYear(),
    prevEndDay.getMonth(),
    prevEndDay.getDate() - (daysSpan - 1)
  );
  return { start: startOfDay(prevStartDay), end: endOfDay(prevEndDay) };
}

export function computeAnalytics({
  transactions,
  categories,
  wallets,
  analyticsRange,
  customStartDate,
  customEndDate,
  resolveTxCategory
}) {
  const now = new Date();
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const windowObj = resolvePeriodWindow(analyticsRange, customStartDate, customEndDate);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const walletById = new Map(wallets.map((w) => [w.id, w]));

  const filteredTx = transactions.filter((tx) => {
    if (!tx?.created_at) return false;
    const d = new Date(tx.created_at);
    if (isNaN(d.getTime())) return false;
    if (!windowObj.start) return true;
    return d >= windowObj.start && d <= windowObj.end;
  });

  // Always compute current-month spend per category so monthly budget guardrails stay accurate
  const currentMonthCatTotals = {};
  transactions.forEach((tx) => {
    if (!tx?.created_at || tx.type !== 'expense') return;
    const d = new Date(tx.created_at);
    if (isNaN(d.getTime())) return;
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      const { category: c } = resolveTxCategory(tx);
      const catKey = c?.id || tx.category_id;
      if (catKey) {
        currentMonthCatTotals[catKey] = roundMoney(
          (currentMonthCatTotals[catKey] || 0) + (Number(tx.amount) || 0)
        );
      }
    }
  });

  let effectiveDays = windowObj.daysCount;
  let periodStartDate = windowObj.start;
  let periodEndDate = windowObj.end;

  if (!effectiveDays) {
    if (filteredTx.length > 0) {
      const timestamps = filteredTx
        .map((t) => new Date(t.created_at).getTime())
        .filter((n) => !isNaN(n));
      const minTs = Math.min(...timestamps);
      const maxTs = Math.max(...timestamps, now.getTime());
      periodStartDate = startOfDay(new Date(minTs));
      periodEndDate = endOfDay(new Date(maxTs));
      effectiveDays = Math.max(
        1,
        Math.round((periodEndDate.getTime() - periodStartDate.getTime()) / 86400000)
      );
    } else {
      effectiveDays = 1;
      periodStartDate = startOfDay(now);
      periodEndDate = endOfDay(now);
    }
  }

  let prevPeriodExpense = null;
  let prevPeriodIncome = null;
  let expenseDeltaPct = null;

  const prevWindow = resolvePreviousPeriodWindow(analyticsRange, windowObj, now);
  if (prevWindow) {
    let pExp = 0;
    let pInc = 0;
    transactions.forEach((tx) => {
      if (!tx?.created_at) return;
      const d = new Date(tx.created_at);
      if (d >= prevWindow.start && d <= prevWindow.end) {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'expense') pExp += amt;
        else if (tx.type === 'income') pInc += amt;
      }
    });
    prevPeriodExpense = roundMoney(pExp);
    prevPeriodIncome = roundMoney(pInc);
    if (pExp > 0) {
      const currExp = filteredTx.reduce(
        (acc, t) => (t.type === 'expense' ? acc + (Number(t.amount) || 0) : acc),
        0
      );
      expenseDeltaPct = Math.round(((currExp - pExp) / pExp) * 100);
    }
  }

  let totalExpense = 0;
  let totalIncome = 0;
  let shortcutCount = 0;
  let expenseCount = 0;

  const categoryTotals = {};
  const categoryCounts = {};
  const walletTotals = {};
  const expenseTxList = [];
  const expenseAmounts = [];
  const activeSpendDaysSet = new Set();

  const dowOrder = [1, 2, 3, 4, 5, 6, 0];
  const dowLabels = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
  const dowTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const dowCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  const timeOfDayMap = {
    morning: { id: 'morning', label: 'Morning', sub: '6am–12pm', icon: '🌅', amount: 0, count: 0, color: '#F4B942' },
    afternoon: { id: 'afternoon', label: 'Afternoon', sub: '12pm–5pm', icon: '☀️', amount: 0, count: 0, color: '#E07A5F' },
    evening: { id: 'evening', label: 'Evening', sub: '5pm–10pm', icon: '🌆', amount: 0, count: 0, color: '#F26B5B' },
    night: { id: 'night', label: 'Late Night', sub: '10pm–6am', icon: '🌙', amount: 0, count: 0, color: '#9B7EDE' }
  };

  const ticketBuckets = {
    micro: { label: 'Micro (< ₹100)', count: 0, amount: 0, color: '#52B788' },
    medium: { label: 'Mid (₹100–₹500)', count: 0, amount: 0, color: '#F4B942' },
    large: { label: 'Big (> ₹500)', count: 0, amount: 0, color: '#F26B5B' }
  };

  filteredTx.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.source === 'shortcut') shortcutCount += 1;

    if (tx.type === 'expense') {
      totalExpense += amt;
      expenseCount += 1;
      expenseTxList.push(tx);
      expenseAmounts.push(amt);

      const d = new Date(tx.created_at);
      if (!isNaN(d.getTime())) {
        activeSpendDaysSet.add(d.toDateString());
        const dayIdx = d.getDay();
        dowTotals[dayIdx] = (dowTotals[dayIdx] || 0) + amt;
        dowCounts[dayIdx] = (dowCounts[dayIdx] || 0) + 1;

        const hr = d.getHours();
        if (hr >= 6 && hr < 12) {
          timeOfDayMap.morning.amount += amt;
          timeOfDayMap.morning.count += 1;
        } else if (hr >= 12 && hr < 17) {
          timeOfDayMap.afternoon.amount += amt;
          timeOfDayMap.afternoon.count += 1;
        } else if (hr >= 17 && hr < 22) {
          timeOfDayMap.evening.amount += amt;
          timeOfDayMap.evening.count += 1;
        } else {
          timeOfDayMap.night.amount += amt;
          timeOfDayMap.night.count += 1;
        }
      }

      if (amt < 100) {
        ticketBuckets.micro.count += 1;
        ticketBuckets.micro.amount += amt;
      } else if (amt <= 500) {
        ticketBuckets.medium.count += 1;
        ticketBuckets.medium.amount += amt;
      } else {
        ticketBuckets.large.count += 1;
        ticketBuckets.large.amount += amt;
      }

      const { category: c } = resolveTxCategory(tx);
      const catKey = c?.id || tx.category_id || 'uncategorized';
      categoryTotals[catKey] = (categoryTotals[catKey] || 0) + amt;
      categoryCounts[catKey] = (categoryCounts[catKey] || 0) + 1;

      if (tx.wallet_id) {
        walletTotals[tx.wallet_id] = (walletTotals[tx.wallet_id] || 0) + amt;
      }
    } else if (tx.type === 'income') {
      totalIncome += amt;
    }
  });

  totalExpense = roundMoney(totalExpense);
  totalIncome = roundMoney(totalIncome);

  const dailyAvgExpense = totalExpense / Math.max(1, effectiveDays);
  const projectedMonthSpend = Math.round(dailyAvgExpense * daysInCurrentMonth);
  const savingsRate =
    totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : null;

  const sortedAmounts = [...expenseAmounts].sort((a, b) => a - b);
  const avgTicket = expenseCount > 0 ? Math.round(totalExpense / expenseCount) : 0;
  let medianTicket = 0;
  if (sortedAmounts.length > 0) {
    const mid = Math.floor(sortedAmounts.length / 2);
    medianTicket =
      sortedAmounts.length % 2 === 1
        ? Math.round(sortedAmounts[mid])
        : Math.round((sortedAmounts[mid - 1] + sortedAmounts[mid]) / 2);
  }

  const activeSpendDays = activeSpendDaysSet.size;
  const noSpendDays = Math.max(0, effectiveDays - activeSpendDays);
  const noSpendPct = Math.round((noSpendDays / Math.max(1, effectiveDays)) * 100);

  const trendBars = [];
  const endAnchor = periodEndDate;
  const todayStartTs = startOfDay(now).getTime();
  const startAnchor =
    periodStartDate ||
    new Date(startOfDay(endAnchor).getTime() - (Math.max(7, effectiveDays) - 1) * 86400000);

  if (effectiveDays <= 7) {
    const daysToRender = effectiveDays;
    for (let i = daysToRender - 1; i >= 0; i--) {
      const dayDate = new Date(startOfDay(endAnchor));
      dayDate.setDate(dayDate.getDate() - i);
      const dayStr = dayDate.toDateString();
      const label = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDateLabel = dayDate.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      const daySum = filteredTx.reduce((sum, tx) => {
        if (!tx?.created_at || tx.type !== 'expense') return sum;
        const txDate = new Date(tx.created_at);
        return txDate.toDateString() === dayStr ? sum + (Number(tx.amount) || 0) : sum;
      }, 0);

      trendBars.push({
        label,
        fullDateLabel,
        isToday: dayStr === now.toDateString(),
        amount: roundMoney(daySum)
      });
    }
  } else {
    // Divide into 7 non-overlapping whole-calendar-day buckets so labels never truncate on mobile
    const startDayDate = startOfDay(startAnchor);
    const totalDays = Math.max(7, effectiveDays);
    for (let i = 0; i < 7; i++) {
      const startOffset = Math.floor((i * totalDays) / 7);
      const endOffset = Math.max(startOffset, Math.floor(((i + 1) * totalDays) / 7) - 1);

      const bStart = new Date(startDayDate);
      bStart.setDate(bStart.getDate() + startOffset);
      const bEndDay = new Date(startDayDate);
      bEndDay.setDate(bEndDay.getDate() + endOffset);
      const bEnd = endOfDay(bEndDay);

      const label = bStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const fullDateLabel =
        bStart.toDateString() === bEndDay.toDateString()
          ? label
          : `${label} – ${bEndDay.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

      const bucketSum = filteredTx.reduce((sum, tx) => {
        if (!tx?.created_at || tx.type !== 'expense') return sum;
        const t = new Date(tx.created_at).getTime();
        return t >= bStart.getTime() && t <= bEnd.getTime()
          ? sum + (Number(tx.amount) || 0)
          : sum;
      }, 0);

      trendBars.push({
        label,
        fullDateLabel,
        isToday: todayStartTs >= bStart.getTime() && todayStartTs <= bEnd.getTime(),
        amount: roundMoney(bucketSum)
      });
    }
  }

  const maxTrendSpend = Math.max(...trendBars.map((d) => d.amount), 1);
  const trendAvg = trendBars.reduce((acc, d) => acc + d.amount, 0) / Math.max(1, trendBars.length);

  const maxDowSpend = Math.max(...Object.values(dowTotals), 1);
  const dowBreakdown = dowOrder.map((dayNum) => ({
    dayNum,
    label: dowLabels[dayNum],
    amount: roundMoney(dowTotals[dayNum] || 0),
    count: dowCounts[dayNum] || 0,
    pctOfMax: Math.round(((dowTotals[dayNum] || 0) / maxDowSpend) * 100),
    sharePct: totalExpense > 0 ? Math.round(((dowTotals[dayNum] || 0) / totalExpense) * 100) : 0
  }));
  const peakDow = [...dowBreakdown].sort((a, b) => b.amount - a.amount)[0] || null;

  const timeOfDayBreakdown = Object.values(timeOfDayMap).map((slot) => ({
    ...slot,
    amount: roundMoney(slot.amount),
    pct: totalExpense > 0 ? Math.round((slot.amount / totalExpense) * 100) : 0
  }));
  const peakTimeSlot = [...timeOfDayBreakdown].sort((a, b) => b.amount - a.amount)[0] || null;

  const categoryBreakdown = Object.keys(categoryTotals)
    .map((catId, index) => {
      const catObj = categoryById.get(catId);
      const amount = roundMoney(categoryTotals[catId]);
      const count = categoryCounts[catId] || 0;
      const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      const exactShare = totalExpense > 0 ? amount / totalExpense : 0;
      const budget = Number(catObj?.monthly_budget) || 0;
      const currentMonthSpent = roundMoney(currentMonthCatTotals[catId] || 0);
      return {
        id: catId,
        name: catObj?.name || 'Other',
        icon: catObj?.icon || '💸',
        amount,
        count,
        avgTicket: count > 0 ? Math.round(amount / count) : 0,
        pct,
        exactShare,
        budget,
        budgetPct: budget > 0 ? Math.round((currentMonthSpent / budget) * 100) : null,
        color: getCategoryAccentColor(catObj, index)
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Budget Guardrails always evaluate against current-month spend
  const budgetedCategories = categories
    .filter((c) => c.type === 'expense' && Number(c.monthly_budget) > 0)
    .map((c, idx) => {
      const spent = roundMoney(currentMonthCatTotals[c.id] || 0);
      const limit = Number(c.monthly_budget);
      const pct = Math.round((spent / limit) * 100);
      return {
        id: c.id,
        name: c.name,
        icon: c.icon || '💸',
        spent,
        limit,
        remaining: Math.max(0, roundMoney(limit - spent)),
        overBy: Math.max(0, roundMoney(spent - limit)),
        pct,
        color: getCategoryAccentColor(c, idx)
      };
    })
    .sort((a, b) => b.pct - a.pct);

  const totalBudgetLimit = roundMoney(budgetedCategories.reduce((s, c) => s + c.limit, 0));
  const totalBudgetSpent = roundMoney(budgetedCategories.reduce((s, c) => s + c.spent, 0));

  const walletBreakdown = Object.keys(walletTotals)
    .map((wId, idx) => {
      const wObj = walletById.get(wId);
      const amount = roundMoney(walletTotals[wId]);
      const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return {
        id: wId,
        name: wObj?.name || 'Wallet',
        icon: wObj?.icon || '💳',
        color: wObj?.color || WALLET_COLORS[idx % WALLET_COLORS.length],
        amount,
        pct
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const topExpenses = [...expenseTxList]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 5);

  const shortcutPct =
    filteredTx.length > 0 ? Math.round((shortcutCount / filteredTx.length) * 100) : 0;

  const smartInsights = [];
  if (noSpendDays > 0 && effectiveDays >= 3) {
    smartInsights.push({
      icon: '🛡️',
      title: `${noSpendDays} No-Spend ${noSpendDays === 1 ? 'Day' : 'Days'}`,
      detail: `${noSpendPct}% of this ${effectiveDays}-day window had zero expenses.`
    });
  }
  if (categoryBreakdown[0] && totalExpense > 0) {
    smartInsights.push({
      icon: categoryBreakdown[0].icon,
      title: `Top Drain: ${categoryBreakdown[0].name}`,
      detail: `Accounts for ${categoryBreakdown[0].pct}% of spending across ${categoryBreakdown[0].count} entries.`
    });
  }
  if (peakDow && peakDow.amount > 0) {
    smartInsights.push({
      icon: '📅',
      title: `Peak Day: ${peakDow.label}s`,
      detail: `${peakDow.sharePct}% of your spending happens on ${peakDow.label}s.`
    });
  }
  if (peakTimeSlot && peakTimeSlot.amount > 0) {
    smartInsights.push({
      icon: peakTimeSlot.icon,
      title: `${peakTimeSlot.label} Spender`,
      detail: `${peakTimeSlot.pct}% of expenses are logged between ${peakTimeSlot.sub}.`
    });
  }

  return {
    windowLabel: windowObj.label,
    effectiveDays,
    filteredTx,
    totalExpense,
    totalIncome,
    netFlow: roundMoney(totalIncome - totalExpense),
    prevPeriodExpense,
    prevPeriodIncome,
    expenseDeltaPct,
    savingsRate,
    dailyAvgExpense,
    projectedMonthSpend,
    avgTicket,
    medianTicket,
    activeSpendDays,
    noSpendDays,
    noSpendPct,
    expenseCount,
    totalTxCount: filteredTx.length,
    shortcutCount,
    shortcutPct,
    trendBars,
    maxTrendSpend,
    trendAvg,
    dowBreakdown,
    peakDow,
    timeOfDayBreakdown,
    peakTimeSlot,
    ticketBuckets,
    categoryBreakdown,
    currentMonthCatTotals,
    budgetedCategories,
    totalBudgetLimit,
    totalBudgetSpent,
    walletBreakdown,
    topExpenses,
    smartInsights
  };
}