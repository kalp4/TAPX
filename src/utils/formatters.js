import { CHART_COLORS } from '../constants/theme';

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
    hash.includes('error_description=')
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
  const target = cleanCategoryString(categoryName);
  if (!target) return null;

  const exact = categoriesList.find((c) => cleanCategoryString(c.name) === target);
  if (exact) return exact;

  const partial = categoriesList.find((c) => {
    const cleanDb = cleanCategoryString(c.name);
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
  const str = String(val ?? '').replace(/"/g, '""');
  return `"${str}"`;
}
