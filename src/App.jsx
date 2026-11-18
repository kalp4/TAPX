import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

// Shared iCloud Shortcut Link for 1-Tap Setup
const SHARED_ICLOUD_SHORTCUT_URL = 'https://www.icloud.com/shortcuts/f14c323b56b34217a774b466a558c57b';

// Playful Cartoon / Cozy Retro Palette
const WALLET_COLORS = ['#E07A5F', '#52B788', '#F4B942', '#5C9EAD', '#9B7EDE', '#E56B6F', '#D8CBB3'];
const WALLET_ICONS = ['💳', '💵', '🏦', '⚡', '🪙', '📱', '💎'];
const CATEGORY_ICONS = ['🍔', '🛒', '⛽', '🛍️', '🎬', '⚡', '💊', '☕', '📚', '🏠', '💰', '✈️'];
const CHART_COLORS = ['#F26B5B', '#52B788', '#F4B942', '#5C9EAD', '#9B7EDE', '#E07A5F', '#E56B6F', '#D8CBB3'];

const DEFAULT_WALLETS_TEMPLATE = [
  { name: 'UPI', type: 'UPI / Wallet', balance: 0, color: '#5C9EAD', icon: '⚡' },
  { name: 'Cash', type: 'Cash', balance: 0, color: '#52B788', icon: '💵' }
];

const DEFAULT_CATEGORIES_TEMPLATE = [
  { name: 'Food & Drinks', type: 'expense', icon: '🍔', color: '#F26B5B', monthly_budget: null },
  { name: 'Groceries', type: 'expense', icon: '🛒', color: '#52B788', monthly_budget: null },
  { name: 'Transport', type: 'expense', icon: '⛽', color: '#F4B942', monthly_budget: null },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#9B7EDE', monthly_budget: null },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#E56B6F', monthly_budget: null },
  { name: 'Bills & Recharge', type: 'expense', icon: '⚡', color: '#5C9EAD', monthly_budget: null },
  { name: 'Health & Fitness', type: 'expense', icon: '💊', color: '#E07A5F', monthly_budget: null },
  { name: 'Income & Allowance', type: 'income', icon: '💰', color: '#52B788', monthly_budget: null }
];

const NAV_TABS = [
  { id: 'pad', label: 'Keypad' },
  { id: 'wallets', label: 'Accounts' },
  { id: 'analytics', label: 'Insights' },
  { id: 'settings', label: 'Settings' }
];

const CACHE_KEY = 'tapx_local_cache_v4';
const THEME_KEY = 'tapx_theme_pref';
const BUDGET_CLEANUP_KEY = 'tapx_default_budgets_removed_v1';
const SAVED_ACCOUNTS_KEY = 'tapx_saved_accounts_v1';
const OFFLINE_QUEUE_KEY = 'tapx_offline_queue_v1';

// Read Supabase's localStorage token or TAPX local cache synchronously on frame 0
// so the Login screen NEVER flashes when opening the app while already signed in.
function getInitialSyncSession(cachedData) {
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

function hasOAuthParamsInUrl() {
  if (typeof window === 'undefined') return false;
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  return (
    search.includes('code=') ||
    hash.includes('access_token=') ||
    hash.includes('error_description=')
  );
}

// Parse embedded [cat:CategoryName] tag from Back Tap transaction notes
function parseShortcutCategoryTag(rawNote) {
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

function cleanCategoryString(str) {
  return String(str || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .trim()
    .toLowerCase();
}

function findMatchingCategoryObj(categoryName, categoriesList) {
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

// Assign a playful warm cartoon hex for any category
function getCategoryAccentColor(cat, index = 0) {
  if (cat?.color && !['#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899'].includes(cat.color)) {
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

// Format raw numeric string into Indian locale commas while preserving trailing dot/zeros
function formatDisplayAmount(rawStr) {
  if (!rawStr || rawStr === '0') return '0';
  const parts = String(rawStr).split('.');
  const intPart = Number(parts[0] || 0).toLocaleString('en-IN');
  if (parts.length > 1) {
    return `${intPart}.${parts[1]}`;
  }
  return intPart;
}

function formatDayGroupLabel(isoString) {
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

function formatTimeOnly(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Escape CSV cell safely
function escapeCsvCell(val) {
  const str = String(val ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

// Playful Cartoony Vector Wallet Logo (Warm Sand #D8CBB3, Charcoal #1e1e1c, Chunky Outlines)
function TapxLogo({ className = 'w-16 h-16' }) {
  return (
    <svg
      viewBox="70 50 375 415"
      className={`${className} shrink-0 select-none`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hard Cartoon Drop Shadow */}
      <rect
        x="108"
        y="224"
        width="316"
        height="220"
        rx="44"
        fill="#111110"
      />

      {/* 3 Rising Chunky Cartoon Bars with Bold Outlines */}
      <rect
        x="164"
        y="144"
        width="56"
        height="116"
        rx="14"
        fill="#F26B5B"
        stroke="#111110"
        strokeWidth="10"
      />
      <rect
        x="236"
        y="106"
        width="56"
        height="154"
        rx="14"
        fill="#52B788"
        stroke="#111110"
        strokeWidth="10"
      />
      <rect
        x="308"
        y="68"
        width="56"
        height="192"
        rx="14"
        fill="#F4B942"
        stroke="#111110"
        strokeWidth="10"
      />

      {/* Main Wallet Body in Warm Sand (#D8CBB3) */}
      <rect
        x="96"
        y="212"
        width="316"
        height="216"
        rx="44"
        fill="#D8CBB3"
        stroke="#111110"
        strokeWidth="11"
      />

      {/* Top Cartoon Highlight Stitch */}
      <path
        d="M 140 234 H 366"
        fill="none"
        stroke="#FAF6EE"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="16 14"
      />

      {/* Cute Smile / Curve Accent on Wallet */}
      <path
        d="M 156 322 Q 204 352 252 322"
        fill="none"
        stroke="#1e1e1c"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="150" cy="292" r="8" fill="#1e1e1c" />
      <circle cx="258" cy="292" r="8" fill="#1e1e1c" />

      {/* Wallet Clasp in Charcoal (#282825) */}
      <rect
        x="324"
        y="290"
        width="102"
        height="64"
        rx="32"
        fill="#282825"
        stroke="#111110"
        strokeWidth="10"
      />

      {/* Clasp Button Snap in Sunny Gold */}
      <circle
        cx="358"
        cy="322"
        r="13"
        fill="#F4B942"
        stroke="#111110"
        strokeWidth="7"
      />
    </svg>
  );
}

// Chunky Rounded Cartoon Navigation Icons
function NavIcon({ id, active }) {
  const sizeClass = 'w-[21px] h-[21px]';

  if (id === 'pad') {
    const r = active ? '2.4' : '1.9';
    return (
      <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6.5" cy="4.5" r={r} />
        <circle cx="12" cy="4.5" r={r} />
        <circle cx="17.5" cy="4.5" r={r} />
        <circle cx="6.5" cy="10" r={r} />
        <circle cx="12" cy="10" r={r} />
        <circle cx="17.5" cy="10" r={r} />
        <circle cx="6.5" cy="15.5" r={r} />
        <circle cx="12" cy="15.5" r={r} />
        <circle cx="17.5" cy="15.5" r={r} />
        <circle cx="12" cy="20.5" r={r} />
      </svg>
    );
  }

  if (id === 'wallets') {
    return (
      <svg
        className={sizeClass}
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? '1.6' : '2.2'}
      >
        <rect x="2.5" y="4.5" width="19" height="15" rx="3.5" />
        <path
          strokeLinecap="round"
          stroke={active ? '#1e1e1c' : 'currentColor'}
          strokeWidth="2.2"
          d="M2.5 9.5h19M6.5 14.5h4"
        />
      </svg>
    );
  }

  if (id === 'analytics') {
    return (
      <svg
        className={sizeClass}
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <rect x="3.5" y="12" width="4.2" height="8.5" rx="1.8" />
        <rect x="9.9" y="7.5" width="4.2" height="13" rx="1.8" />
        <rect x="16.3" y="3.5" width="4.2" height="17" rx="1.8" />
      </svg>
    );
  }

  return (
    <svg
      className={sizeClass}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={active ? '2.4' : '2.1'}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: String(error?.message || error || 'Unknown render error')
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('TAPX Render Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-[#1e1e1c] text-[#D8CBB3] flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center space-y-4 overflow-hidden">
          <p className="text-base font-cartoon font-bold text-[#F5EFE6]">Oops! Something tripped up</p>
          <p className="text-xs text-[#F26B5B] bg-[#282825] border-2 border-[#111110] p-3 rounded-2xl font-mono break-all shadow-[0_4px_0_#111110]">
            {this.state.errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-2xl bg-[#D8CBB3] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_4px_0_#111110] text-xs font-bold key-press"
          >
            Reload TAPX
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function TapxMainApp() {
  const cachedData = useMemo(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const initialSyncSession = useMemo(() => getInitialSyncSession(cachedData), [cachedData]);

  // Saved Google Accounts for 1-Tap Account Picker on Login Screen
  const [savedAccounts, setSavedAccounts] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persistent Offline Sync Queue
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const flushingQueueRef = useRef(false);

  // Theme Mode: 'system' | 'dark' | 'light'
  const [themePref, setThemePref] = useState(() => {
    return localStorage.getItem(THEME_KEY) || 'dark';
  });
  const [systemIsDark, setSystemIsDark] = useState(() => {
    return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const isDark = themePref === 'system' ? systemIsDark : themePref === 'dark';

  // Sync theme color (#1e1e1c in dark mode, #EFE7DA in light mode) with iOS Status Bar
  useEffect(() => {
    localStorage.setItem(THEME_KEY, themePref);
    const bgHex = isDark ? '#1e1e1c' : '#EFE7DA';
    document.documentElement.style.backgroundColor = bgHex;
    document.body.style.backgroundColor = bgHex;
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', bgHex);
  }, [themePref, isDark]);

  // Fun Cartoony / Tactile Cozy Theme System (Charcoal #1e1e1c & Sand #D8CBB3)
  const ui = useMemo(() => {
    if (isDark) {
      return {
        bg: 'bg-[#1e1e1c] text-[#F5EFE6]',
        sheetBg: 'bg-[#262623] border-2 border-[#D8CBB3]/30 text-[#F5EFE6]',
        card: 'bg-[#282825] border-2 border-[#111110] shadow-[0_4px_0_#111110]',
        cardElevated: 'bg-[#30302c] border-2 border-[#111110] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110]',
        cardSubtle: 'bg-[#22221f] border-2 border-[#111110]/80',
        heroCard: 'bg-[#282825] border-2 border-[#D8CBB3]/35 shadow-[0_5px_0_#111110]',
        input: 'bg-[#181816] border-2 border-[#111110] text-[#F5EFE6] placeholder-[#877D6E] shadow-[inset_0_2px_0_rgba(0,0,0,0.45)]',
        pillIdle: 'bg-[#282825] border-2 border-[#111110] text-[#D8CBB3] shadow-[0_3px_0_#111110] active:shadow-none',
        pillActive: 'bg-[#D8CBB3] border-2 border-[#111110] text-[#1e1e1c] font-bold shadow-[0_3px_0_#111110] active:shadow-none',
        numpadKey: 'bg-[#282825] border-2 border-[#111110] text-[#F5EFE6] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110] hover:bg-[#30302c]',
        numpadKeySpecial: 'bg-[#32302b] border-2 border-[#111110] text-[#D8CBB3] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110]',
        segmentedBg: 'bg-[#161614] border-2 border-[#111110] shadow-[inset_0_2px_0_rgba(0,0,0,0.5)]',
        segmentedThumb: 'bg-[#D8CBB3] border-2 border-[#111110] shadow-[0_2px_0_#111110]',
        segmentedTextActive: 'text-[#1e1e1c] font-extrabold',
        textPrimary: 'text-[#F5EFE6]',
        textSand: 'text-[#D8CBB3]',
        textSecondary: 'text-[#B8AA93]',
        textMuted: 'text-[#877D6E]',
        islandBar: 'cartoon-dock-dark',
        islandLens: 'cartoon-pill-lens-dark',
        islandTextActive: 'text-[#1e1e1c]',
        islandTextIdle: 'text-[#B8AA93]',
        primaryBtnExpense: 'bg-[#D8CBB3] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110]',
        primaryBtnIncome: 'bg-[#52B788] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110]',
        primaryBtnTransfer: 'bg-[#F4B942] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110]',
        divider: 'border-[#363632]',
        stickyHeader: 'bg-[#1e1e1c]/95 backdrop-blur-sm'
      };
    }
    return {
      bg: 'bg-[#EFE7DA] text-[#1e1e1c]',
      sheetBg: 'bg-[#FAF6EE] border-2 border-[#1e1e1c] text-[#1e1e1c]',
      card: 'bg-[#FAF6EE] border-2 border-[#1e1e1c] shadow-[0_4px_0_#1e1e1c]',
      cardElevated: 'bg-[#FFFFFF] border-2 border-[#1e1e1c] shadow-[0_4px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
      cardSubtle: 'bg-[#E5DEC9] border-2 border-[#1e1e1c]',
      heroCard: 'bg-[#FAF6EE] border-2 border-[#1e1e1c] shadow-[0_5px_0_#1e1e1c]',
      input: 'bg-[#FFFFFF] border-2 border-[#1e1e1c] text-[#1e1e1c] placeholder-[#877D6E]',
      pillIdle: 'bg-[#FAF6EE] border-2 border-[#1e1e1c] text-[#1e1e1c] shadow-[0_3px_0_#1e1e1c] active:shadow-none',
      pillActive: 'bg-[#1e1e1c] border-2 border-[#1e1e1c] text-[#D8CBB3] font-bold shadow-[0_3px_0_#524E46] active:shadow-none',
      numpadKey: 'bg-[#FAF6EE] border-2 border-[#1e1e1c] text-[#1e1e1c] shadow-[0_4px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
      numpadKeySpecial: 'bg-[#D8CBB3] border-2 border-[#1e1e1c] text-[#1e1e1c] shadow-[0_4px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
      segmentedBg: 'bg-[#D8CBB3] border-2 border-[#1e1e1c]',
      segmentedThumb: 'bg-[#1e1e1c] border-2 border-[#1e1e1c]',
      segmentedTextActive: 'text-[#D8CBB3] font-extrabold',
      textPrimary: 'text-[#1e1e1c]',
      textSand: 'text-[#1e1e1c]',
      textSecondary: 'text-[#524E46]',
      textMuted: 'text-[#7A7367]',
      islandBar: 'cartoon-dock-light',
      islandLens: 'cartoon-pill-lens-light',
      islandTextActive: 'text-[#D8CBB3]',
      islandTextIdle: 'text-[#524E46]',
      primaryBtnExpense: 'bg-[#1e1e1c] text-[#D8CBB3] border-2 border-[#1e1e1c] shadow-[0_4px_0_#524E46] active:shadow-[0_1px_0_#524E46]',
      primaryBtnIncome: 'bg-[#52B788] text-[#1e1e1c] border-2 border-[#1e1e1c] shadow-[0_4px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
      primaryBtnTransfer: 'bg-[#F4B942] text-[#1e1e1c] border-2 border-[#1e1e1c] shadow-[0_4px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
      divider: 'border-[#1e1e1c]/20',
      stickyHeader: 'bg-[#EFE7DA]/95 backdrop-blur-sm'
    };
  }, [isDark]);

  // Initialize session synchronously from localStorage/cache so we NEVER flash the login screen
  const [session, setSession] = useState(() => initialSyncSession);
  const [isAuthChecking, setIsAuthChecking] = useState(() => !initialSyncSession);
  const [isLoggingIn, setIsLoggingIn] = useState(() => hasOAuthParamsInUrl());
  const [isSyncingBg, setIsSyncingBg] = useState(false);
  const [dbError, setDbError] = useState('');
  const seedingRef = useRef(false);

  // Navigation, Bouncy Pill & Scrubbing State
  const [activeTab, setActiveTab] = useState('pad');
  const [tabDirection, setTabDirection] = useState('right');
  const [lensBulge, setLensBulge] = useState(false);
  const [scrubProgress, setScrubProgress] = useState(null);
  const navBarRef = useRef(null);
  const lensTimerRef = useRef(null);
  const isPointerDownOnNavRef = useRef(false);
  const pointerStartXRef = useRef(0);
  const isScrubbingRef = useRef(false);

  const [settingsSection, setSettingsSection] = useState('shortcut');
  const [analyticsRange, setAnalyticsRange] = useState('month');
  const [selectedBarIdx, setSelectedBarIdx] = useState(6);
  const [selectedDonutCatId, setSelectedDonutCatId] = useState(null);
  const [amountPulse, setAmountPulse] = useState(false);
  const pulseTimerRef = useRef(null);
  const delHoldTimerRef = useRef(null);
  const noteInputRef = useRef(null);

  const triggerAmountPulse = useCallback(() => {
    setAmountPulse(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setAmountPulse(false), 120);
  }, []);

  const triggerLensMagnification = useCallback((duration = 280) => {
    setLensBulge(true);
    if (lensTimerRef.current) clearTimeout(lensTimerRef.current);
    lensTimerRef.current = setTimeout(() => {
      if (!isPointerDownOnNavRef.current) {
        setLensBulge(false);
      }
    }, duration);
  }, []);

  const handleSelectTab = useCallback(
    (nextTabId) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      triggerLensMagnification(260);
      setActiveTab((prevTab) => {
        if (nextTabId === prevTab) return prevTab;
        const prevIdx = NAV_TABS.findIndex((t) => t.id === prevTab);
        const nextIdx = NAV_TABS.findIndex((t) => t.id === nextTabId);
        setTabDirection(nextIdx >= prevIdx ? 'right' : 'left');
        return nextTabId;
      });
    },
    [triggerLensMagnification]
  );

  // Continuous 0..3 index from finger X position
  const getClampedIndexFromClientX = useCallback((clientX) => {
    if (!navBarRef.current) return 0;
    const rect = navBarRef.current.getBoundingClientRect();
    const pad = 6;
    const innerWidth = rect.width - pad * 2;
    const slotWidth = innerWidth / 4;
    const rawIndex = (clientX - rect.left - pad - slotWidth / 2) / slotWidth;
    return Math.max(0, Math.min(3, rawIndex));
  }, []);

  const handleNavPointerDown = (e) => {
    isPointerDownOnNavRef.current = true;
    isScrubbingRef.current = false;
    pointerStartXRef.current = e.clientX;

    if (lensTimerRef.current) clearTimeout(lensTimerRef.current);
    setLensBulge(true);
  };

  const handleNavPointerMove = (e) => {
    if (!isPointerDownOnNavRef.current) return;

    if (!isScrubbingRef.current && Math.abs(e.clientX - pointerStartXRef.current) > 10) {
      isScrubbingRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture errors
      }
    }

    if (isScrubbingRef.current) {
      const clampedIndex = getClampedIndexFromClientX(e.clientX);
      setScrubProgress(clampedIndex);

      const nearestIdx = Math.round(clampedIndex);
      const targetTab = NAV_TABS[nearestIdx]?.id;
      if (targetTab && targetTab !== activeTab) {
        const prevIdx = NAV_TABS.findIndex((t) => t.id === activeTab);
        setTabDirection(nearestIdx >= prevIdx ? 'right' : 'left');
        setActiveTab(targetTab);
      }
    }
  };

  const handleNavPointerUpOrCancel = (e) => {
    if (!isPointerDownOnNavRef.current) return;
    isPointerDownOnNavRef.current = false;

    if (isScrubbingRef.current) {
      const clampedIndex = getClampedIndexFromClientX(e.clientX);
      const nearestIdx = Math.round(clampedIndex);
      const targetTab = NAV_TABS[nearestIdx]?.id;
      if (targetTab) {
        handleSelectTab(targetTab);
      }
      isScrubbingRef.current = false;
    }

    setScrubProgress(null);

    if (lensTimerRef.current) clearTimeout(lensTimerRef.current);
    lensTimerRef.current = setTimeout(() => {
      setLensBulge(false);
    }, 220);
  };

  const activeTabIndex = Math.max(
    0,
    NAV_TABS.findIndex((t) => t.id === activeTab)
  );
  const visualLensIndex = scrubProgress !== null ? scrubProgress : activeTabIndex;
  const tabAnimClass =
    tabDirection === 'right' ? 'animate-tab-right' : 'animate-tab-left';

  // User Database State
  const [settings, setSettings] = useState(
    cachedData?.settings || { currency: '₹', shortcut_token: '' }
  );
  const [wallets, setWallets] = useState(cachedData?.wallets || []);
  const [categories, setCategories] = useState(cachedData?.categories || []);
  const [transactions, setTransactions] = useState(cachedData?.transactions || []);

  // Quick Pad Entry State
  const [entryType, setEntryType] = useState('expense');
  const [amountStr, setAmountStr] = useState('0');
  const [selectedWalletId, setSelectedWalletId] = useState(cachedData?.wallets?.[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(cachedData?.wallets?.[1]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    cachedData?.categories?.find((c) => c.type === 'expense')?.id || ''
  );
  const [note, setNote] = useState('');

  // Toast + Undo State
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Activity Filter & Search State
  const [activityWalletFilter, setActivityWalletFilter] = useState('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');

  // Bottom Sheet State: New / Edit Wallet
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState(null);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState('UPI / Wallet');
  const [newWalletBalance, setNewWalletBalance] = useState('');
  const [newWalletColor, setNewWalletColor] = useState(WALLET_COLORS[0]);
  const [newWalletIcon, setNewWalletIcon] = useState(WALLET_ICONS[0]);

  // Bottom Sheet State: New / Edit Category
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatIcon, setNewCatIcon] = useState(CATEGORY_ICONS[0]);
  const [newCatBudget, setNewCatBudget] = useState('');

  // Bottom Sheet State: Edit Transaction
  const [editingTx, setEditingTx] = useState(null);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxNote, setEditTxNote] = useState('');
  const [editTxWalletId, setEditTxWalletId] = useState('');
  const [editTxToWalletId, setEditTxToWalletId] = useState('');
  const [editTxCategoryId, setEditTxCategoryId] = useState('');

  // Two-Tap Delete Confirmation State
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  // Keep Transfer destination wallet distinct from source wallet automatically
  useEffect(() => {
    if (wallets.length > 1 && selectedWalletId === toWalletId) {
      const fallback = wallets.find((w) => w.id !== selectedWalletId);
      if (fallback) setToWalletId(fallback.id);
    }
  }, [selectedWalletId, toWalletId, wallets]);

  // Persist Offline Sync Queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
    } catch {
      // Ignore storage errors
    }
  }, [offlineQueue]);

  // Remember signed-in Google account on device for the 1-Tap Account Chooser
  useEffect(() => {
    const user = session?.user;
    if (!user?.id || !user?.email) return;

    const meta = user.user_metadata || {};
    const profileEntry = {
      id: user.id,
      email: user.email,
      name: meta.full_name || meta.name || user.email.split('@')[0],
      avatar: meta.avatar_url || meta.picture || ''
    };

    setSavedAccounts((prev) => {
      const filtered = prev.filter((a) => a.email.toLowerCase() !== profileEntry.email.toLowerCase());
      const next = [profileEntry, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, [session?.user]);

  // Cache state automatically
  useEffect(() => {
    if (!session?.user?.id) return;
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          userId: session.user.id,
          userEmail: session.user.email || '',
          userMetadata: session.user.user_metadata || {},
          settings,
          wallets,
          categories,
          transactions
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [session?.user?.id, session?.user?.email, session?.user?.user_metadata, settings, wallets, categories, transactions]);

  const showToast = useCallback((message, onUndo = null, duration = 2200) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: String(message), onUndo });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, onUndo ? 4000 : duration);
  }, []);

  // Flush Offline Sync Queue when back online
  const flushOfflineQueue = useCallback(
    async (userId) => {
      if (!userId || flushingQueueRef.current) return;
      let currentQueue = [];
      try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        currentQueue = raw ? JSON.parse(raw) : [];
      } catch {
        currentQueue = [];
      }

      if (!Array.isArray(currentQueue) || currentQueue.length === 0) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      flushingQueueRef.current = true;
      setIsSyncingBg(true);

      const remaining = [];

      for (const item of currentQueue) {
        try {
          if (item.action === 'insert_tx') {
            const { data: insertedRow, error } = await supabase
              .from('transactions')
              .insert([item.payload])
              .select()
              .maybeSingle();

            if (error) throw error;

            if (item.fromWalletId && item.expectedFromBalance !== undefined) {
              await supabase
                .from('wallets')
                .update({ balance: item.expectedFromBalance })
                .eq('id', item.fromWalletId);
            }
            if (item.toWalletId && item.expectedToBalance !== undefined && item.expectedToBalance !== null) {
              await supabase
                .from('wallets')
                .update({ balance: item.expectedToBalance })
                .eq('id', item.toWalletId);
            }

            if (insertedRow) {
              setTransactions((prev) =>
                prev.map((tx) => (tx.id === item.tempId ? insertedRow : tx))
              );
            }
          }
        } catch {
          remaining.push(item);
        }
      }

      setOfflineQueue(remaining);
      flushingQueueRef.current = false;
      setIsSyncingBg(false);

      if (remaining.length === 0 && currentQueue.length > 0) {
        showToast(`Synced ${currentQueue.length} offline ${currentQueue.length === 1 ? 'entry' : 'entries'}!`);
      }
    },
    [showToast]
  );

  const fetchUserData = useCallback(
    async (userId) => {
      if (!userId) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
        return;
      }

      setIsSyncingBg(true);
      setDbError('');
      try {
        await flushOfflineQueue(userId);

        let { data: userSettings, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (settingsError) throw settingsError;

        if (!userSettings) {
          const { data: insertedSettings, error: insertError } = await supabase
            .from('user_settings')
            .insert([{ user_id: userId, currency: '₹' }])
            .select()
            .maybeSingle();

          if (insertError) throw insertError;
          userSettings = insertedSettings;
        }

        if (userSettings) {
          setSettings({
            currency: userSettings.currency || '₹',
            shortcut_token: userSettings.shortcut_token || ''
          });
        }

        const [walletsRes, categoriesRes, txRes] = await Promise.all([
          supabase.from('wallets').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
          supabase.from('categories').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
          supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500)
        ]);

        if (walletsRes.error) throw walletsRes.error;
        if (categoriesRes.error) throw categoriesRes.error;
        if (txRes.error) throw txRes.error;

        let fetchedWallets = Array.isArray(walletsRes.data) ? walletsRes.data : [];
        let fetchedCategories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
        let fetchedTx = Array.isArray(txRes.data) ? txRes.data : [];

        const alreadyCleanedBudgets = localStorage.getItem(BUDGET_CLEANUP_KEY);
        if (!alreadyCleanedBudgets && fetchedCategories.some((c) => c.monthly_budget !== null)) {
          await supabase
            .from('categories')
            .update({ monthly_budget: null })
            .eq('user_id', userId);
          fetchedCategories = fetchedCategories.map((c) => ({ ...c, monthly_budget: null }));
          localStorage.setItem(BUDGET_CLEANUP_KEY, 'true');
        } else if (!alreadyCleanedBudgets) {
          localStorage.setItem(BUDGET_CLEANUP_KEY, 'true');
        }

        if (!seedingRef.current) {
          seedingRef.current = true;

          if (fetchedWallets.length === 0 && fetchedTx.length === 0) {
            const starterWallets = DEFAULT_WALLETS_TEMPLATE.map((w) => ({
              ...w,
              user_id: userId
            }));
            const { data: seededWallets } = await supabase
              .from('wallets')
              .insert(starterWallets)
              .select();
            if (Array.isArray(seededWallets) && seededWallets.length > 0) {
              fetchedWallets = seededWallets;
            }
          }

          if (fetchedCategories.length < 7) {
            const existingNames = new Set(fetchedCategories.map((c) => c.name.toLowerCase()));
            const missingDefaults = DEFAULT_CATEGORIES_TEMPLATE.filter(
              (item) => !existingNames.has(item.name.toLowerCase())
            ).map((item) => ({
              ...item,
              user_id: userId
            }));

            if (missingDefaults.length > 0) {
              const { data: seededCats } = await supabase
                .from('categories')
                .insert(missingDefaults)
                .select();
              if (Array.isArray(seededCats)) {
                fetchedCategories = [...fetchedCategories, ...seededCats];
              }
            }
          }
        }

        // Auto-heal Back Tap transactions whose category was tagged in `note` ([cat:CategoryName])
        const defaultFirstCatId = fetchedCategories[0]?.id;
        const txUpdatesToSync = [];

        fetchedTx = fetchedTx.map((tx) => {
          const { cleanNote, tagCategoryName } = parseShortcutCategoryTag(tx.note);

          if (tagCategoryName) {
            const matchedCat = findMatchingCategoryObj(tagCategoryName, fetchedCategories);
            const nextCatId = matchedCat ? matchedCat.id : tx.category_id;
            if (nextCatId !== tx.category_id || cleanNote !== tx.note) {
              txUpdatesToSync.push({ id: tx.id, category_id: nextCatId, note: cleanNote });
              return { ...tx, category_id: nextCatId, note: cleanNote };
            }
          } else if (
            tx.source === 'shortcut' &&
            tx.category_id === defaultFirstCatId &&
            cleanNote
          ) {
            const noteCatMatch = findMatchingCategoryObj(cleanNote, fetchedCategories);
            if (noteCatMatch && noteCatMatch.id !== defaultFirstCatId) {
              const strippedNote =
                cleanCategoryString(cleanNote) === cleanCategoryString(noteCatMatch.name)
                  ? ''
                  : cleanNote;
              txUpdatesToSync.push({ id: tx.id, category_id: noteCatMatch.id, note: strippedNote });
              return { ...tx, category_id: noteCatMatch.id, note: strippedNote };
            }
          }

          return tx;
        });

        if (txUpdatesToSync.length > 0) {
          Promise.all(
            txUpdatesToSync.map((u) =>
              supabase
                .from('transactions')
                .update({ category_id: u.category_id, note: u.note })
                .eq('id', u.id)
            )
          ).catch(() => {});
        }

        setWallets(fetchedWallets);
        setCategories(fetchedCategories);
        setTransactions(fetchedTx);

        setSelectedWalletId((prev) => {
          if (prev && fetchedWallets.some((w) => w.id === prev)) return prev;
          return fetchedWallets[0]?.id || '';
        });

        setToWalletId((prev) => {
          if (prev && fetchedWallets.some((w) => w.id === prev)) return prev;
          return fetchedWallets[1]?.id || fetchedWallets[0]?.id || '';
        });

        setSelectedCategoryId((prev) => {
          if (prev && fetchedCategories.some((c) => c.id === prev)) return prev;
          const firstExpenseCat = fetchedCategories.find((c) => c.type === 'expense');
          return firstExpenseCat?.id || '';
        });
      } catch (err) {
        setDbError(String(err?.message || 'Database connection error'));
      } finally {
        setIsSyncingBg(false);
      }
    },
    [flushOfflineQueue]
  );

  // Track online/offline status & auto-flush queue on reconnect
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (session?.user?.id) {
        fetchUserData(session.user.id);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [session?.user?.id, fetchUserData]);

  useEffect(() => {
    let mounted = true;
    const oauthRedirectInFlight = hasOAuthParamsInUrl();

    supabase.auth
      .getSession()
      .then((res) => {
        if (!mounted) return;
        const currentSession = res?.data?.session || null;
        if (currentSession) {
          setSession(currentSession);
          setIsAuthChecking(false);
          setIsLoggingIn(false);
        } else if (!oauthRedirectInFlight) {
          setSession(null);
          localStorage.removeItem(CACHE_KEY);
          setIsAuthChecking(false);
          setIsLoggingIn(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsAuthChecking(false);
          setIsLoggingIn(false);
        }
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      if (newSession) {
        setSession(newSession);
        setIsAuthChecking(false);
        setIsLoggingIn(false);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setWallets([]);
        setCategories([]);
        setTransactions([]);
        localStorage.removeItem(CACHE_KEY);
        setIsAuthChecking(false);
        setIsLoggingIn(false);
      }
    });

    return () => {
      mounted = false;
      if (authListener?.subscription) authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData(session.user.id);
    }
  }, [session?.user?.id, fetchUserData]);

  // Automatically sync when returning to the app after using Back Tap
  useEffect(() => {
    if (!session?.user?.id) return;
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchUserData(session.user.id);
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [session?.user?.id, fetchUserData]);

  // Trigger Google OAuth with Account Chooser (`select_account`) or pre-selected `login_hint`
  const handleGoogleLogin = async (loginHintEmail = '') => {
    setIsLoggingIn(true);
    const queryParams = {
      access_type: 'offline',
      ...(loginHintEmail
        ? { login_hint: loginHintEmail }
        : { prompt: 'select_account' })
    };

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams
      }
    });

    if (error) {
      setIsLoggingIn(false);
      showToast(error.message || 'Sign-in failed');
    }
  };

  const handleRemoveSavedAccount = (emailToRemove, e) => {
    e.stopPropagation();
    setSavedAccounts((prev) => {
      const next = prev.filter((a) => a.email.toLowerCase() !== emailToRemove.toLowerCase());
      try {
        localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleLogout = async () => {
    localStorage.removeItem(CACHE_KEY);
    setSession(null);
    await supabase.auth.signOut();
  };

  // Zero-Latency Numpad Handler
  const handleDigitPress = (digit) => {
    if (noteInputRef.current && document.activeElement === noteInputRef.current) {
      noteInputRef.current.blur();
    }
    triggerAmountPulse();

    if (digit === 'CLEAR') {
      setAmountStr('0');
      return;
    }
    if (digit === 'DEL') {
      setAmountStr((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (digit === '.') {
      setAmountStr((prev) => (prev.includes('.') ? prev : `${prev}.`));
      return;
    }
    setAmountStr((prev) => {
      if (prev === '0') return digit;
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
      if (prev.replace('.', '').length >= 8) return prev;
      return prev + digit;
    });
  };

  const handleQuickAddAmount = (delta) => {
    if (noteInputRef.current && document.activeElement === noteInputRef.current) {
      noteInputRef.current.blur();
    }
    triggerAmountPulse();
    setAmountStr((prev) => {
      const current = parseFloat(prev) || 0;
      const next = Math.max(0, Number((current + delta).toFixed(2)));
      return String(next);
    });
  };

  const handleSwapTransferWallets = () => {
    if (!selectedWalletId || !toWalletId) return;
    const prevFrom = selectedWalletId;
    setSelectedWalletId(toWalletId);
    setToWalletId(prevFrom);
  };

  const handleLogTransaction = async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const numericAmount = parseFloat(amountStr);
    if (!numericAmount || numericAmount <= 0) {
      showToast('Pop in an amount above 0!');
      return;
    }
    if (!selectedWalletId) {
      showToast('Create an account first!');
      resetWalletModal();
      setShowWalletModal(true);
      return;
    }
    if (entryType === 'transfer' && (!toWalletId || toWalletId === selectedWalletId)) {
      showToast('Pick two different accounts!');
      return;
    }

    const cleanNote = note.trim();
    const currentType = entryType;
    const fromId = selectedWalletId;
    const destId = currentType === 'transfer' ? toWalletId : null;
    const catId = currentType === 'transfer' ? null : selectedCategoryId || null;

    const fromWalletObj = wallets.find((w) => w.id === fromId);
    const toWalletObj = destId ? wallets.find((w) => w.id === destId) : null;

    const expectedFromBalance =
      currentType === 'income'
        ? Number(fromWalletObj?.balance || 0) + numericAmount
        : Number(fromWalletObj?.balance || 0) - numericAmount;

    const expectedToBalance =
      currentType === 'transfer' && toWalletObj
        ? Number(toWalletObj.balance || 0) + numericAmount
        : null;

    const nowIso = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    const insertPayload = {
      user_id: session.user.id,
      wallet_id: fromId,
      to_wallet_id: destId,
      category_id: catId,
      type: currentType,
      amount: numericAmount,
      note: cleanNote,
      source: 'app',
      created_at: nowIso
    };

    const currentlyOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    const optimisticTx = {
      id: tempId,
      ...insertPayload,
      pendingSync: currentlyOffline
    };

    setTransactions((prev) => [optimisticTx, ...prev]);
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === fromId) return { ...w, balance: expectedFromBalance };
        if (currentType === 'transfer' && w.id === destId && expectedToBalance !== null) {
          return { ...w, balance: expectedToBalance };
        }
        return w;
      })
    );

    setAmountStr('0');
    setNote('');

    const enqueueOfflineItem = () => {
      const queueEntry = {
        tempId,
        action: 'insert_tx',
        payload: insertPayload,
        fromWalletId: fromId,
        expectedFromBalance,
        toWalletId: destId,
        expectedToBalance
      };
      setOfflineQueue((prev) => [...prev, queueEntry]);
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === tempId ? { ...tx, pendingSync: true } : tx))
      );
      showToast('Saved offline · Will sync when back!');
    };

    if (currentlyOffline) {
      enqueueOfflineItem();
      return;
    }

    const actionPrefix = currentType === 'income' ? '+' : currentType === 'expense' ? '-' : '⇄ ';
    showToast(`${actionPrefix}${settings?.currency || '₹'}${numericAmount.toLocaleString('en-IN')} logged!`);

    const { data: insertedRow, error } = await supabase
      .from('transactions')
      .insert([insertPayload])
      .select()
      .maybeSingle();

    if (error) {
      enqueueOfflineItem();
      return;
    }

    const { data: checkFromWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', fromId)
      .maybeSingle();

    if (checkFromWallet && Number(checkFromWallet.balance) !== expectedFromBalance) {
      await supabase
        .from('wallets')
        .update({ balance: expectedFromBalance })
        .eq('id', fromId);
    }

    if (currentType === 'transfer' && destId && expectedToBalance !== null) {
      const { data: checkToWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', destId)
        .maybeSingle();

      if (checkToWallet && Number(checkToWallet.balance) !== expectedToBalance) {
        await supabase
          .from('wallets')
          .update({ balance: expectedToBalance })
          .eq('id', destId);
      }
    }

    if (insertedRow) {
      setTransactions((prev) => prev.map((tx) => (tx.id === tempId ? insertedRow : tx)));
    }
  };

  // Delete Transaction with Instant Undo Support
  const handleDeleteTransaction = async (id) => {
    const targetTx = transactions.find((t) => t.id === id);
    if (!targetTx) return;

    const amt = Number(targetTx.amount) || 0;
    const fromWallet = wallets.find((w) => w.id === targetTx.wallet_id);
    const toWallet = targetTx.to_wallet_id
      ? wallets.find((w) => w.id === targetTx.to_wallet_id)
      : null;

    const origFromBal = fromWallet ? Number(fromWallet.balance || 0) : null;
    const origToBal = toWallet ? Number(toWallet.balance || 0) : null;

    const restoredFromBalance = fromWallet
      ? targetTx.type === 'income'
        ? origFromBal - amt
        : origFromBal + amt
      : null;

    const restoredToBalance =
      targetTx.type === 'transfer' && toWallet
        ? origToBal - amt
        : null;

    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setOfflineQueue((prev) => prev.filter((item) => item.tempId !== id));
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === targetTx.wallet_id && restoredFromBalance !== null) {
          return { ...w, balance: restoredFromBalance };
        }
        if (targetTx.type === 'transfer' && w.id === targetTx.to_wallet_id && restoredToBalance !== null) {
          return { ...w, balance: restoredToBalance };
        }
        return w;
      })
    );

    if (editingTx?.id === id) {
      setEditingTx(null);
    }

    if (!String(id).startsWith('temp-')) {
      await supabase.from('transactions').delete().eq('id', id);

      if (targetTx.wallet_id && restoredFromBalance !== null) {
        await supabase
          .from('wallets')
          .update({ balance: restoredFromBalance })
          .eq('id', targetTx.wallet_id);
      }

      if (targetTx.type === 'transfer' && targetTx.to_wallet_id && restoredToBalance !== null) {
        await supabase
          .from('wallets')
          .update({ balance: restoredToBalance })
          .eq('id', targetTx.to_wallet_id);
      }
    }

    showToast('Entry popped!', async () => {
      setToast(null);
      const { id: _oldId, pendingSync: _ps, ...reinsertPayload } = targetTx;
      const { data: restoredRow } = await supabase
        .from('transactions')
        .insert([reinsertPayload])
        .select()
        .maybeSingle();

      if (targetTx.wallet_id && origFromBal !== null) {
        await supabase.from('wallets').update({ balance: origFromBal }).eq('id', targetTx.wallet_id);
      }
      if (targetTx.type === 'transfer' && targetTx.to_wallet_id && origToBal !== null) {
        await supabase.from('wallets').update({ balance: origToBal }).eq('id', targetTx.to_wallet_id);
      }

      if (restoredRow) {
        setTransactions((prev) =>
          [restoredRow, ...prev].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        );
      }
      setWallets((prev) =>
        prev.map((w) => {
          if (w.id === targetTx.wallet_id && origFromBal !== null) return { ...w, balance: origFromBal };
          if (targetTx.type === 'transfer' && w.id === targetTx.to_wallet_id && origToBal !== null) {
            return { ...w, balance: origToBal };
          }
          return w;
        })
      );
      showToast('Entry restored!');
    });
  };

  // Open Edit Transaction Sheet
  const openEditTransaction = (tx) => {
    const { cleanNote, tagCategoryName } = parseShortcutCategoryTag(tx.note);
    const resolvedCat =
      (tagCategoryName && findMatchingCategoryObj(tagCategoryName, categories)) ||
      categories.find((c) => c.id === tx.category_id);

    setEditingTx(tx);
    setEditTxAmount(String(tx.amount ?? ''));
    setEditTxNote(cleanNote || '');
    setEditTxWalletId(tx.wallet_id || wallets[0]?.id || '');
    setEditTxToWalletId(tx.to_wallet_id || wallets[1]?.id || '');
    setEditTxCategoryId(resolvedCat?.id || tx.category_id || '');
  };

  const handleSaveEditedTransaction = async (e) => {
    e.preventDefault();
    if (!editingTx) return;
    const newAmt = parseFloat(editTxAmount);
    if (!newAmt || newAmt <= 0) {
      showToast('Enter a valid amount');
      return;
    }

    const oldTx = editingTx;
    const oldAmt = Number(oldTx.amount) || 0;
    const cleanNote = editTxNote.trim();
    const nextWalletId = editTxWalletId || oldTx.wallet_id;
    const nextToWalletId = oldTx.type === 'transfer' ? editTxToWalletId : null;
    const nextCategoryId = oldTx.type === 'transfer' ? null : editTxCategoryId || null;

    if (oldTx.type === 'transfer' && nextWalletId === nextToWalletId) {
      showToast('Pick two different accounts');
      return;
    }

    const balanceDeltas = {};
    const addDelta = (wId, delta) => {
      if (!wId) return;
      balanceDeltas[wId] = (balanceDeltas[wId] || 0) + delta;
    };

    if (oldTx.type === 'income') {
      addDelta(oldTx.wallet_id, -oldAmt);
    } else if (oldTx.type === 'expense') {
      addDelta(oldTx.wallet_id, oldAmt);
    } else if (oldTx.type === 'transfer') {
      addDelta(oldTx.wallet_id, oldAmt);
      addDelta(oldTx.to_wallet_id, -oldAmt);
    }

    if (oldTx.type === 'income') {
      addDelta(nextWalletId, newAmt);
    } else if (oldTx.type === 'expense') {
      addDelta(nextWalletId, -newAmt);
    } else if (oldTx.type === 'transfer') {
      addDelta(nextWalletId, -newAmt);
      addDelta(nextToWalletId, newAmt);
    }

    const updatedWalletsMap = {};
    setWallets((prev) =>
      prev.map((w) => {
        if (balanceDeltas[w.id]) {
          const nextBal = Number(w.balance || 0) + balanceDeltas[w.id];
          updatedWalletsMap[w.id] = nextBal;
          return { ...w, balance: nextBal };
        }
        return w;
      })
    );

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === oldTx.id
          ? {
              ...t,
              amount: newAmt,
              note: cleanNote,
              wallet_id: nextWalletId,
              to_wallet_id: nextToWalletId,
              category_id: nextCategoryId
            }
          : t
      )
    );

    setEditingTx(null);
    showToast('Transaction updated!');

    if (!String(oldTx.id).startsWith('temp-')) {
      await supabase
        .from('transactions')
        .update({
          amount: newAmt,
          note: cleanNote,
          wallet_id: nextWalletId,
          to_wallet_id: nextToWalletId,
          category_id: nextCategoryId
        })
        .eq('id', oldTx.id);

      for (const [wId, nextBal] of Object.entries(updatedWalletsMap)) {
        await supabase.from('wallets').update({ balance: nextBal }).eq('id', wId);
      }
    }
  };

  const openEditWallet = (wallet) => {
    setEditingWalletId(wallet.id);
    setNewWalletName(wallet.name || '');
    setNewWalletType(wallet.type || 'UPI / Wallet');
    setNewWalletBalance(String(wallet.balance ?? 0));
    setNewWalletColor(wallet.color || WALLET_COLORS[0]);
    setNewWalletIcon(wallet.icon || WALLET_ICONS[0]);
    setShowWalletModal(true);
  };

  const resetWalletModal = () => {
    setEditingWalletId(null);
    setNewWalletName('');
    setNewWalletBalance('');
    setNewWalletType('UPI / Wallet');
    setNewWalletColor(WALLET_COLORS[0]);
    setNewWalletIcon(WALLET_ICONS[0]);
    setShowWalletModal(false);
  };

  const handleSaveWallet = async (e) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    const nameVal = newWalletName.trim();
    const balVal = parseFloat(newWalletBalance) || 0;
    const typeVal = newWalletType;
    const colorVal = newWalletColor;
    const iconVal = newWalletIcon;
    const targetEditId = editingWalletId;

    resetWalletModal();

    if (targetEditId) {
      setWallets((prev) =>
        prev.map((w) =>
          w.id === targetEditId
            ? { ...w, name: nameVal, type: typeVal, balance: balVal, color: colorVal, icon: iconVal }
            : w
        )
      );
      showToast('Account updated!');

      const { error } = await supabase
        .from('wallets')
        .update({ name: nameVal, type: typeVal, balance: balVal, color: colorVal, icon: iconVal })
        .eq('id', targetEditId);

      if (error) {
        showToast(error.message);
        fetchUserData(session.user.id);
      }
      return;
    }

    const { data: createdWallet, error } = await supabase
      .from('wallets')
      .insert([
        {
          user_id: session.user.id,
          name: nameVal,
          type: typeVal,
          balance: balVal,
          color: colorVal,
          icon: iconVal
        }
      ])
      .select()
      .maybeSingle();

    if (!error && createdWallet) {
      setWallets((prev) => {
        const updated = [...prev, createdWallet];
        if (!selectedWalletId) setSelectedWalletId(createdWallet.id);
        return updated;
      });
      showToast('Account created!');
    } else if (error) {
      showToast(error.message);
    }
  };

  const handleDeleteWallet = async (id) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId((prev) => (prev === id ? null : prev)), 3000);
      return;
    }
    setConfirmDeleteId(null);
    setWallets((prev) => prev.filter((w) => w.id !== id));
    if (activityWalletFilter === id) setActivityWalletFilter('all');
    if (editingWalletId === id) resetWalletModal();
    showToast('Account removed');
    await supabase.from('wallets').delete().eq('id', id);
  };

  const openEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name || '');
    setNewCatType(cat.type || 'expense');
    setNewCatIcon(cat.icon || CATEGORY_ICONS[0]);
    setNewCatBudget(cat.monthly_budget ? String(cat.monthly_budget) : '');
    setShowCategoryModal(true);
  };

  const resetCategoryModal = () => {
    setEditingCatId(null);
    setNewCatName('');
    setNewCatBudget('');
    setNewCatType('expense');
    setNewCatIcon(CATEGORY_ICONS[0]);
    setShowCategoryModal(false);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const nameVal = newCatName.trim();
    const typeVal = newCatType;
    const iconVal = newCatIcon;
    const budgetVal = newCatBudget && parseFloat(newCatBudget) > 0 ? parseFloat(newCatBudget) : null;
    const targetEditId = editingCatId;

    resetCategoryModal();

    if (targetEditId) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === targetEditId
            ? { ...c, name: nameVal, type: typeVal, icon: iconVal, monthly_budget: budgetVal }
            : c
        )
      );
      showToast('Category updated!');

      const { error } = await supabase
        .from('categories')
        .update({ name: nameVal, type: typeVal, icon: iconVal, monthly_budget: budgetVal })
        .eq('id', targetEditId);

      if (error) {
        showToast(error.message);
        fetchUserData(session.user.id);
      }
      return;
    }

    const { data: createdCat, error } = await supabase
      .from('categories')
      .insert([
        {
          user_id: session.user.id,
          name: nameVal,
          type: typeVal,
          icon: iconVal,
          monthly_budget: budgetVal
        }
      ])
      .select()
      .maybeSingle();

    if (!error && createdCat) {
      setCategories((prev) => {
        const updated = [...prev, createdCat];
        if (!selectedCategoryId && createdCat.type === 'expense') {
          setSelectedCategoryId(createdCat.id);
        }
        return updated;
      });
      showToast('Category created!');
    } else if (error) {
      showToast(error.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId((prev) => (prev === id ? null : prev)), 3000);
      return;
    }
    setConfirmDeleteId(null);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (editingCatId === id) resetCategoryModal();
    showToast('Category deleted');
    await supabase.from('categories').delete().eq('id', id);
  };

  const handleRegenerateToken = async () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    setSettings((prev) => ({ ...prev, shortcut_token: randomHex }));
    showToast('Token refreshed!');

    await supabase
      .from('user_settings')
      .update({ shortcut_token: randomHex })
      .eq('user_id', session.user.id);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text || '');
    setCopiedField(label);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopiedField(''), 2000);
  };

  const personalApiUrl = `${window.location.origin}/api/shortcut?token=${settings?.shortcut_token || ''}`;

  const handleOneTapShortcut = () => {
    navigator.clipboard.writeText(personalApiUrl);
    showToast('Personal URL copied · Opening Shortcuts');

    setTimeout(() => {
      if (SHARED_ICLOUD_SHORTCUT_URL) {
        window.location.href = SHARED_ICLOUD_SHORTCUT_URL;
      } else {
        window.location.href = 'shortcuts://create-shortcut';
      }
    }, 450);
  };

  const totalNetWorth = useMemo(
    () => wallets.reduce((acc, w) => acc + (Number(w?.balance) || 0), 0),
    [wallets]
  );

  const selectedWalletObj = useMemo(
    () => wallets.find((w) => w.id === selectedWalletId) || wallets[0] || null,
    [wallets, selectedWalletId]
  );

  const filteredCategories = useMemo(
    () => categories.filter((c) => c?.type === (entryType === 'income' ? 'income' : 'expense')),
    [categories, entryType]
  );

  // Resolve transaction category cleanly even if Back Tap stored [cat:...] in note
  const resolveTxCategory = useCallback(
    (tx) => {
      const { cleanNote, tagCategoryName } = parseShortcutCategoryTag(tx?.note);
      if (tagCategoryName) {
        const byTag = findMatchingCategoryObj(tagCategoryName, categories);
        if (byTag) return { category: byTag, cleanNote };
      }
      const byId = categories.find((item) => item.id === tx?.category_id) || null;
      return { category: byId, cleanNote };
    },
    [categories]
  );

  // Filtered and Searchable Transactions
  const visibleTransactions = useMemo(() => {
    const q = activitySearch.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (
          activityWalletFilter !== 'all' &&
          tx.wallet_id !== activityWalletFilter &&
          tx.to_wallet_id !== activityWalletFilter
        ) {
          return false;
        }
        if (activityTypeFilter !== 'all' && tx.type !== activityTypeFilter) {
          return false;
        }
        if (!q) return true;
        const w = wallets.find((item) => item.id === tx.wallet_id);
        const toW = wallets.find((item) => item.id === tx.to_wallet_id);
        const { category: c, cleanNote } = resolveTxCategory(tx);
        const haystack = [
          cleanNote,
          w?.name,
          toW?.name,
          c?.name,
          String(tx.amount || '')
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 80);
  }, [transactions, activityWalletFilter, activityTypeFilter, activitySearch, wallets, resolveTxCategory]);

  // Group visibleTransactions by Date
  const groupedTransactions = useMemo(() => {
    const groups = [];
    const groupMap = new Map();

    visibleTransactions.forEach((tx) => {
      const label = formatDayGroupLabel(tx.created_at);
      if (!groupMap.has(label)) {
        const newGroup = { label, items: [], netSpend: 0 };
        groupMap.set(label, newGroup);
        groups.push(newGroup);
      }
      const group = groupMap.get(label);
      group.items.push(tx);
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'expense') group.netSpend -= amt;
      else if (tx.type === 'income') group.netSpend += amt;
    });

    return groups;
  }, [visibleTransactions]);

  const currentMonthSpendByCat = useMemo(() => {
    const now = new Date();
    const map = {};
    transactions.forEach((tx) => {
      if (!tx?.created_at) return;
      const d = new Date(tx.created_at);
      const { category: c } = resolveTxCategory(tx);
      const catId = c?.id || tx.category_id;
      if (
        tx.type === 'expense' &&
        catId &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      ) {
        map[catId] = (map[catId] || 0) + (Number(tx.amount) || 0);
      }
    });
    return map;
  }, [transactions, resolveTxCategory]);

  // Rich Analytics Engine (Donut Segments, Cashflow Ratio, Pacing, Top Spends, 7D Trend)
  const analyticsData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const filteredTx = transactions.filter((tx) => {
      if (!tx?.created_at) return false;
      const d = new Date(tx.created_at);
      if (analyticsRange === 'week') return d >= sevenDaysAgo;
      if (analyticsRange === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });

    let totalExpense = 0;
    let totalIncome = 0;
    let shortcutCount = 0;
    let expenseCount = 0;

    const categoryTotals = {};
    const categoryCounts = {};
    const walletTotals = {};
    const expenseTxList = [];

    filteredTx.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.source === 'shortcut') shortcutCount += 1;

      if (tx.type === 'expense') {
        totalExpense += amt;
        expenseCount += 1;
        expenseTxList.push(tx);
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

    const daysDivisor =
      analyticsRange === 'week'
        ? 7
        : analyticsRange === 'month'
        ? Math.max(1, now.getDate())
        : Math.max(1, new Set(filteredTx.map((t) => new Date(t.created_at).toDateString())).size);

    const dailyAvgExpense = totalExpense / daysDivisor;
    const projectedMonthSpend = Math.round(dailyAvgExpense * daysInCurrentMonth);
    const savingsRate =
      totalIncome > 0
        ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
        : null;

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(startOfToday);
      dayDate.setDate(dayDate.getDate() - i);
      const dayStr = dayDate.toDateString();
      const label = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDateLabel = dayDate.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      const daySum = transactions.reduce((sum, tx) => {
        if (!tx?.created_at || tx.type !== 'expense') return sum;
        const txDate = new Date(tx.created_at);
        return txDate.toDateString() === dayStr ? sum + (Number(tx.amount) || 0) : sum;
      }, 0);

      last7Days.push({
        label,
        fullDateLabel,
        isToday: i === 0,
        amount: daySum
      });
    }

    const maxDaySpend = Math.max(...last7Days.map((d) => d.amount), 1);
    const sevenDayAvg =
      last7Days.reduce((acc, d) => acc + d.amount, 0) / 7;

    const categoryBreakdown = Object.keys(categoryTotals)
      .map((catId, index) => {
        const catObj = categories.find((c) => c.id === catId);
        const amount = categoryTotals[catId];
        const count = categoryCounts[catId] || 0;
        const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
        const exactShare = totalExpense > 0 ? amount / totalExpense : 0;
        return {
          id: catId,
          name: catObj?.name || 'Other',
          icon: catObj?.icon || '💸',
          amount,
          count,
          avgTicket: count > 0 ? Math.round(amount / count) : 0,
          pct,
          exactShare,
          color: getCategoryAccentColor(catObj, index)
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const walletBreakdown = Object.keys(walletTotals)
      .map((wId, idx) => {
        const wObj = wallets.find((w) => w.id === wId);
        const amount = walletTotals[wId];
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
      .slice(0, 3);

    const shortcutPct =
      filteredTx.length > 0 ? Math.round((shortcutCount / filteredTx.length) * 100) : 0;

    return {
      filteredTx,
      totalExpense,
      totalIncome,
      netFlow: totalIncome - totalExpense,
      savingsRate,
      dailyAvgExpense,
      projectedMonthSpend,
      expenseCount,
      totalTxCount: filteredTx.length,
      shortcutCount,
      shortcutPct,
      last7Days,
      maxDaySpend,
      sevenDayAvg,
      categoryBreakdown,
      walletBreakdown,
      topExpenses
    };
  }, [transactions, categories, wallets, analyticsRange, resolveTxCategory]);

  // 1-Tap CSV Export Handler
  const handleExportCsv = useCallback(() => {
    const sourceRows = analyticsData.filteredTx.length > 0 ? analyticsData.filteredTx : transactions;
    if (sourceRows.length === 0) {
      showToast('No transactions to export');
      return;
    }

    const headers = [
      'Date',
      'Time',
      'Type',
      'Category',
      'Account',
      'To Account',
      'Amount',
      'Currency',
      'Note',
      'Source'
    ];

    const csvLines = [headers.map(escapeCsvCell).join(',')];

    sourceRows.forEach((tx) => {
      const d = tx.created_at ? new Date(tx.created_at) : new Date();
      const dateStr = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-CA')
        : '';
      const timeStr = !isNaN(d.getTime())
        ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '';
      const w = wallets.find((item) => item.id === tx.wallet_id);
      const toW = wallets.find((item) => item.id === tx.to_wallet_id);
      const { category: c, cleanNote } = resolveTxCategory(tx);

      const row = [
        dateStr,
        timeStr,
        tx.type || 'expense',
        tx.type === 'transfer' ? 'Transfer' : c?.name || 'Uncategorized',
        w?.name || '',
        toW?.name || '',
        Number(tx.amount || 0).toFixed(2),
        settings?.currency || '₹',
        cleanNote || '',
        tx.source || 'app'
      ];
      csvLines.push(row.map(escapeCsvCell).join(','));
    });

    const csvString = '\uFEFF' + csvLines.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const monthTag = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).replace(/\s+/g, '-');
    const fileName = `TAPX-${analyticsRange === 'month' ? monthTag : analyticsRange.toUpperCase()}-Ledger.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    showToast(`Exported ${sourceRows.length} entries to CSV!`);
  }, [analyticsData.filteredTx, transactions, wallets, resolveTxCategory, settings?.currency, analyticsRange, showToast]);

  const currencySymbol = settings?.currency || '₹';
  const formattedDisplayAmount = useMemo(() => formatDisplayAmount(amountStr), [amountStr]);

  const amountFontSizeClass = useMemo(() => {
    const len = formattedDisplayAmount.length;
    if (len > 10) return 'text-[28px]';
    if (len > 7) return 'text-[34px]';
    return 'text-[42px]';
  }, [formattedDisplayAmount]);

  const primaryButtonClass =
    entryType === 'income'
      ? ui.primaryBtnIncome
      : entryType === 'transfer'
      ? ui.primaryBtnTransfer
      : ui.primaryBtnExpense;

  const entryIndex = entryType === 'expense' ? 0 : entryType === 'income' ? 1 : 2;
  const settingsSubIndex = settingsSection === 'shortcut' ? 0 : 1;

  // Show boot screen while verifying initial auth or completing an OAuth redirect
  if ((isAuthChecking && !session) || (isLoggingIn && !session)) {
    return (
      <div className={`h-full w-full ${ui.bg} flex flex-col items-center justify-center gap-4 p-6 overflow-hidden`}>
        <TapxLogo className="w-20 h-20 animate-bounce" />
        <div className="w-6 h-6 rounded-full border-3 border-[#D8CBB3] border-t-transparent animate-spin" />
      </div>
    );
  }

  // CARTOONY LOGIN SCREEN WITH 1-TAP SAVED GOOGLE ACCOUNT PICKER
  if (!session) {
    return (
      <div
        className={`h-full w-full ${ui.bg} flex flex-col justify-between px-7 max-w-md mx-auto overflow-hidden select-none relative`}
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 24px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 28px)'
        }}
      >
        <div />

        <div className="relative z-10 flex flex-col items-center text-center space-y-3">
          <div className="p-3 rounded-[32px] bg-[#282825] border-2 border-[#111110] shadow-[0_6px_0_#111110] mb-1">
            <TapxLogo className="w-24 h-24" />
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-cartoon font-bold uppercase tracking-wider bg-[#D8CBB3] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_2px_0_#111110]">
            Pocket Expense Buddy
          </span>
          <h1 className={`text-4xl font-cartoon font-bold tracking-tight ${ui.textPrimary}`}>
            TAPX
          </h1>
          <p className={`text-sm max-w-[250px] font-medium leading-relaxed ${ui.textSecondary}`}>
            Playful multi-wallet expense tracking with instant iPhone Back Tap logging.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {savedAccounts.length > 0 && (
            <div className="space-y-2 pb-1">
              <p className={`text-[11px] font-cartoon font-bold uppercase tracking-wider px-1 ${ui.textMuted}`}>
                Jump right back in
              </p>
              <div className="space-y-2">
                {savedAccounts.map((acc) => (
                  <div
                    key={acc.email}
                    onClick={() => handleGoogleLogin(acc.email)}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between cursor-pointer key-press ${ui.cardElevated}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {acc.avatar ? (
                        <img
                          src={acc.avatar}
                          alt={acc.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-[#111110]"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#D8CBB3] text-[#1e1e1c] border-2 border-[#111110] font-cartoon font-bold text-sm flex items-center justify-center shrink-0">
                          {String(acc.name || acc.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 text-left">
                        <p className={`text-xs font-bold truncate ${ui.textPrimary}`}>
                          {acc.name}
                        </p>
                        <p className={`text-[11px] truncate ${ui.textSecondary}`}>
                          {acc.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveSavedAccount(acc.email, e)}
                      className={`p-1.5 text-xs rounded-xl font-bold ${ui.textMuted} hover:text-[#F26B5B]`}
                      title="Remove saved account"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleGoogleLogin('')}
            className={`w-full py-4 px-5 font-cartoon font-bold text-base rounded-2xl flex items-center justify-center gap-3 key-press ${ui.primaryBtnExpense}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            {savedAccounts.length > 0 ? 'Use another Google Account' : 'Continue with Google'}
          </button>

          <p className={`text-[11px] text-center leading-relaxed ${ui.textMuted}`}>
            TAPX uses Google Sign-In solely to sync your private account across devices. Read our{' '}
            <a
              href="/privacy.html"
              className={`underline font-bold ${ui.textSecondary}`}
            >
              Privacy Policy
            </a>
            {' · '}
            <a
              href="mailto:kalppatel132008@gmail.com"
              className={`underline font-bold ${ui.textSecondary}`}
            >
              Support
            </a>
          </p>
        </div>
      </div>
    );
  }

  const selectedDayObj =
    analyticsData.last7Days[selectedBarIdx] ||
    analyticsData.last7Days[analyticsData.last7Days.length - 1];

  const activeDonutCat =
    analyticsData.categoryBreakdown.find((c) => c.id === selectedDonutCatId) ||
    analyticsData.categoryBreakdown[0] ||
    null;

  // SVG Donut geometry
  const donutRadius = 45;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutCumulativeShare = 0;

  return (
    <div
      className={`h-full w-full ${ui.bg} flex flex-col max-w-md mx-auto overflow-hidden relative select-none`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 16px)'
      }}
    >
      {/* Self-contained UX helper styles */}
      <style>{`
        @media screen and (max-width: 768px) {
          input, select, textarea {
            font-size: 16px !important;
          }
        }
        @keyframes sheetSlideUp {
          0% { opacity: 0; transform: translate3d(0, 100%, 0); }
          100% { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .animate-sheet-up {
          animation: sheetSlideUp 280ms cubic-bezier(0.34, 1.35, 0.64, 1) forwards;
        }
      `}</style>

      {/* Chunky Cartoon Toast Pill with Optional Undo */}
      {toast && (
        <div
          className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-cartoon font-bold border-2 border-[#111110] shadow-[0_4px_0_#111110] flex items-center gap-3 animate-tab ${
            isDark ? 'bg-[#D8CBB3] text-[#1e1e1c]' : 'bg-[#1e1e1c] text-[#D8CBB3]'
          }`}
        >
          <span>{toast.message}</span>
          {toast.onUndo && (
            <button
              type="button"
              onClick={toast.onUndo}
              className="px-2.5 py-0.5 rounded-full bg-[#F4B942] text-[#1e1e1c] border-2 border-[#111110] font-bold text-[11px] key-press"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* Database Error Banner */}
      {dbError && (
        <div className="relative z-10 mx-5 mt-1 p-2.5 rounded-2xl bg-[#F26B5B]/20 border-2 border-[#F26B5B] text-[#F26B5B] text-xs font-bold flex items-center justify-between shrink-0">
          <span className="truncate">{dbError}</span>
          <button
            type="button"
            onClick={() => fetchUserData(session.user.id)}
            className="ml-2 underline font-extrabold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Header with Total Balance & Chunky "+ Account" Button */}
      <header className="relative z-10 px-5 pt-1 pb-2.5 flex items-center justify-between shrink-0">
        <div
          onClick={() => handleSelectTab('wallets')}
          className="cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-cartoon font-bold uppercase tracking-wider ${ui.textSecondary}`}>
              Total Stash
            </span>
            {!isOnline ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#F4B942] text-[#1e1e1c] border border-[#111110] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e1e1c]" />
                Offline{offlineQueue.length > 0 ? ` · ${offlineQueue.length}` : ''}
              </span>
            ) : offlineQueue.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  flushOfflineQueue(session.user.id);
                }}
                className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#5C9EAD] text-[#1e1e1c] border border-[#111110] flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e1e1c] animate-ping" />
                Syncing {offlineQueue.length}
              </button>
            ) : (
              <span
                className={`w-2.5 h-2.5 rounded-full border border-[#111110] transition-colors duration-300 ${
                  isSyncingBg ? 'bg-[#F4B942] animate-pulse' : 'bg-[#52B788]'
                }`}
              />
            )}
          </div>
          <h2 className={`text-[28px] leading-tight font-cartoon font-bold tracking-tight tabular-nums ${ui.textPrimary}`}>
            {currencySymbol}
            {Number(totalNetWorth || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            resetWalletModal();
            setShowWalletModal(true);
          }}
          className={`px-3.5 py-2 rounded-2xl text-xs font-cartoon font-bold key-press ${ui.pillActive}`}
        >
          + Account
        </button>
      </header>

      {/* MAIN VIEWPORT */}
      <main
        className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden px-5"
        style={{
          paddingBottom: 'calc(max(env(safe-area-inset-bottom), 14px) + 86px)'
        }}
      >
        {/* TAB 1: KEYPAD */}
        {activeTab === 'pad' && (
          <div key="tab-pad" className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${tabAnimClass}`}>
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
                    +{currencySymbol}{val >= 1000 ? '1k' : val}
                  </button>
                ))}
              </div>

              {selectedWalletObj && (
                <div className={`mt-2.5 pt-2 border-t-2 border-dashed w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold ${ui.divider} ${ui.textMuted}`}>
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
              {/* Wallet Row */}
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
                      onClick={() => {
                        resetWalletModal();
                        setShowWalletModal(true);
                      }}
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
                            active
                              ? 'border-2 border-[#111110] shadow-[0_3px_0_#111110]'
                              : ui.pillIdle
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

                {/* Transfer Destination Row */}
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
                          <span>→ {w.icon} {w.name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Category Row with Cartoon Badges */}
              {entryType !== 'transfer' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-0.5">
                    <span className={`text-[10px] font-cartoon uppercase tracking-wider font-bold ${ui.textMuted}`}>
                      {entryType === 'income' ? 'Income Category' : 'Expense Category'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        resetCategoryModal();
                        setNewCatType(entryType === 'income' ? 'income' : 'expense');
                        setShowCategoryModal(true);
                      }}
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
                            active
                              ? 'border-2 border-[#111110] shadow-[0_3px_0_#111110]'
                              : ui.pillIdle
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

            {/* Tactile Arcade Cartoon Numpad (Hold DEL to Clear) */}
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33Z" />
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
        )}

        {/* TAB 2: ACCOUNTS & ACTIVITY */}
        {activeTab === 'wallets' && (
          <div key="tab-wallets" className={`flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden ${tabAnimClass}`}>
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
                      className={`min-w-[164px] p-3.5 rounded-2xl border-2 border-[#111110] shadow-[0_4px_0_#111110] flex flex-col justify-between cursor-pointer transition-all shrink-0 relative overflow-hidden key-press`}
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
                            isFiltered
                              ? 'bg-[#1e1e1c] text-[#D8CBB3]'
                              : 'bg-[#D8CBB3] text-[#1e1e1c]'
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
                  onClick={() => {
                    resetWalletModal();
                    setShowWalletModal(true);
                  }}
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
                <svg className={`w-3.5 h-3.5 shrink-0 ${ui.textMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
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
                    <div className={`sticky top-0 z-10 py-1 px-1 flex items-center justify-between text-[11px] font-cartoon font-bold ${ui.stickyHeader}`}>
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
        )}

        {/* TAB 3: INSIGHTS & 1-TAP CSV EXPORT */}
        {activeTab === 'analytics' && (
          <div key="tab-analytics" className={`flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden ${tabAnimClass}`}>
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
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
                              item.exactShare * donutCircumference - (analyticsData.categoryBreakdown.length > 1 ? 3 : 0)
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
                            <p>{activeDonutCat.count} {activeDonutCat.count === 1 ? 'entry' : 'entries'}</p>
                            <p className="tabular-nums">
                              Avg {currencySymbol}{activeDonutCat.avgTicket.toLocaleString('en-IN')}/spend
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Category Rows */}
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
                        <span className={`text-[9px] font-cartoon font-bold tabular-nums truncate max-w-full ${isSelected ? ui.textSand : ui.textMuted}`}>
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
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div key="tab-settings" className={`flex-1 min-h-0 flex flex-col gap-3 overflow-hidden ${tabAnimClass}`}>
            {/* Appearance Mode Selector */}
            <div className={`p-3.5 rounded-2xl flex items-center justify-between shrink-0 ${ui.card}`}>
              <div>
                <p className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Theme Vibe</p>
                <p className={`text-[10px] font-medium ${ui.textMuted}`}>Charcoal #1e1e1c &amp; Sand #D8CBB3</p>
              </div>
              <div className={`flex p-0.5 rounded-xl ${ui.segmentedBg}`}>
                {[
                  { id: 'system', label: 'Auto' },
                  { id: 'light', label: 'Sand' },
                  { id: 'dark', label: 'Charcoal' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setThemePref(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-cartoon font-bold transition-all duration-200 ${
                      themePref === m.id ? `${ui.segmentedThumb} ${ui.segmentedTextActive}` : ui.textSecondary
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Animated Sliding Sub-Section Switcher */}
            <div className={`relative grid grid-cols-2 p-1 rounded-2xl shrink-0 ${ui.segmentedBg}`}>
              <div
                className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl transition-transform duration-300 ios-spring ${ui.segmentedThumb}`}
                style={{ transform: `translate3d(${settingsSubIndex * 100}%, 0, 0)` }}
              />
              <button
                type="button"
                onClick={() => setSettingsSection('shortcut')}
                className={`relative z-10 py-1.5 rounded-xl text-xs font-cartoon transition-colors duration-200 ${
                  settingsSection === 'shortcut' ? ui.segmentedTextActive : `${ui.textSecondary} font-semibold`
                }`}
              >
                ⚡ Back Tap Setup
              </button>
              <button
                type="button"
                onClick={() => setSettingsSection('budgets')}
                className={`relative z-10 py-1.5 rounded-xl text-xs font-cartoon transition-colors duration-200 ${
                  settingsSection === 'budgets' ? ui.segmentedTextActive : `${ui.textSecondary} font-semibold`
                }`}
              >
                🏷️ Categories
              </button>
            </div>

            {/* SUB-VIEW 1: BACK TAP SHORTCUT */}
            {settingsSection === 'shortcut' && (
              <div key="sub-shortcut" className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5 pb-1 animate-tab-left">
                <div className={`p-4 rounded-2xl space-y-3 ${ui.card}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>1-Tap Back Tap Installer</h3>
                      <p className={`text-[10px] font-medium ${ui.textMuted}`}>
                        Log from Lock Screen with double-tap on the back of your iPhone
                      </p>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#D8CBB3] text-[#1e1e1c] border-2 border-[#111110] font-cartoon font-bold">
                      iOS
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
                      Your Personal Shortcut URL
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={personalApiUrl}
                        className={`flex-1 rounded-xl px-2.5 py-2 text-[11px] font-mono ${ui.input}`}
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(personalApiUrl, 'apiUrl')}
                        className={`px-3 py-2 rounded-xl text-xs font-cartoon font-bold shrink-0 key-press ${ui.pillIdle}`}
                      >
                        {copiedField === 'apiUrl' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOneTapShortcut}
                    className={`w-full py-3 px-4 rounded-xl font-cartoon font-bold text-xs key-press ${ui.primaryBtnExpense}`}
                  >
                    Copy Personal URL &amp; Install Shortcut
                  </button>

                  <div className={`pt-2 border-t-2 border-dashed space-y-1.5 text-[11px] ${ui.divider} ${ui.textSecondary}`}>
                    <p className={`font-cartoon font-bold ${ui.textPrimary}`}>Quick Setup (10 Seconds):</p>
                    <ol className="list-decimal list-inside space-y-1 leading-relaxed font-medium">
                      <li>Tap the button above (your Personal URL copies automatically).</li>
                      <li>When Apple Shortcuts opens, tap <strong>Paste</strong> into the setup prompt and tap <strong>Add Shortcut</strong>.</li>
                      <li>Go to iPhone <strong>Settings → Accessibility → Touch → Back Tap → Double Tap</strong> and select <strong>Log to TAPX</strong>.</li>
                    </ol>
                  </div>
                </div>

                {/* Token Box */}
                <div className={`p-3.5 rounded-2xl space-y-1.5 ${ui.card}`}>
                  <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
                    Shortcut Security Token
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={settings?.shortcut_token || ''}
                      className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-mono ${ui.input}`}
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(settings?.shortcut_token, 'token')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-cartoon font-bold key-press ${ui.pillIdle}`}
                    >
                      {copiedField === 'token' ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateToken}
                      className={`px-3 py-1.5 rounded-xl text-xs font-cartoon font-bold key-press ${ui.pillIdle}`}
                      title="Regenerate Token"
                    >
                      ↻
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: CATEGORIES */}
            {settingsSection === 'budgets' && (
              <div key="sub-budgets" className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden animate-tab-right">
                <div className="flex items-center justify-between shrink-0">
                  <span className={`text-[11px] font-cartoon font-bold ${ui.textMuted}`}>
                    {categories.length} Categories
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      resetCategoryModal();
                      setShowCategoryModal(true);
                    }}
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
                        className={`p-3 rounded-2xl space-y-2 cursor-pointer key-press ${ui.card}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-8 h-8 rounded-xl border-2 border-[#111110] flex items-center justify-center text-sm shrink-0"
                              style={{ backgroundColor: accent }}
                            >
                              {c.icon}
                            </span>
                            <div className="min-w-0">
                              <p className={`text-xs font-cartoon font-bold truncate ${ui.textPrimary}`}>{c.name}</p>
                              <p className={`text-[10px] font-semibold capitalize ${ui.textMuted}`}>
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
                              className={`px-2 py-1 rounded-lg text-[10px] font-cartoon font-bold key-press ${ui.pillIdle}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(c.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-cartoon font-bold key-press ${
                                confirmDeleteId === c.id
                                  ? 'bg-[#F26B5B] text-[#1e1e1c] border-2 border-[#111110]'
                                  : `${ui.textMuted} hover:text-[#F26B5B]`
                              }`}
                            >
                              {confirmDeleteId === c.id ? 'Sure?' : '✕'}
                            </button>
                          </div>
                        </div>
                        {budget > 0 && c.type === 'expense' && (
                          <div className="w-full h-2.5 rounded-full overflow-hidden bg-[#181816] border border-[#111110] p-0.5">
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

            {/* Account Footer */}
            <div className={`pt-2 border-t-2 border-dashed flex items-center justify-between shrink-0 ${ui.divider}`}>
              <span className={`text-[11px] font-semibold truncate max-w-[180px] ${ui.textMuted}`}>
                {session?.user?.email}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    fetchUserData(session.user.id);
                    showToast('Synced!');
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold key-press ${ui.pillIdle}`}
                >
                  Sync
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-full bg-[#F26B5B] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_3px_0_#111110] text-xs font-cartoon font-bold key-press"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM SHEET 1: CREATE / EDIT ACCOUNT */}
      {showWalletModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3"
          onClick={resetWalletModal}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveWallet}
            className={`w-full max-w-md rounded-3xl p-5 space-y-3.5 shadow-[0_8px_0_#111110] animate-sheet-up ${ui.sheetBg}`}
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
          >
            <div className="w-12 h-1.5 rounded-full bg-[#D8CBB3]/40 mx-auto" />
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-cartoon font-bold ${ui.textPrimary}`}>
                {editingWalletId ? 'Edit Account' : 'New Account'}
              </h3>
              <button
                type="button"
                onClick={resetWalletModal}
                className={`text-xs font-cartoon font-bold px-3 py-1 rounded-full key-press ${ui.pillIdle}`}
              >
                Close
              </button>
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Account Name</label>
              <input
                type="text"
                placeholder="e.g. UPI, Cash, FamPay, HDFC"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                className={`w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none ${ui.input}`}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Type</label>
                <select
                  value={newWalletType}
                  onChange={(e) => setNewWalletType(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none ${ui.input}`}
                >
                  <option>UPI / Wallet</option>
                  <option>Cash</option>
                  <option>Bank</option>
                  <option>Card</option>
                  <option>Savings</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Current Balance</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newWalletBalance}
                  onChange={(e) => setNewWalletBalance(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none ${ui.input}`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Sticker Color</label>
              <div className="flex items-center gap-2">
                {WALLET_COLORS.map((hex) => (
                  <button
                    type="button"
                    key={hex}
                    onClick={() => setNewWalletColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-8 h-8 rounded-full border-2 border-[#111110] transition-transform key-press ${
                      newWalletColor === hex ? 'scale-110 ring-2 ring-[#D8CBB3] shadow-[0_3px_0_#111110]' : 'opacity-75'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Icon</label>
              <div className="flex gap-1.5 justify-between">
                {WALLET_ICONS.map((ic) => (
                  <button
                    type="button"
                    key={ic}
                    onClick={() => setNewWalletIcon(ic)}
                    className={`p-2.5 rounded-xl text-base key-press ${
                      newWalletIcon === ic ? ui.pillActive : ui.pillIdle
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {editingWalletId && (
                <button
                  type="button"
                  onClick={() => handleDeleteWallet(editingWalletId)}
                  className={`px-4 py-3 rounded-xl text-xs font-cartoon font-bold border-2 border-[#111110] shadow-[0_3px_0_#111110] key-press ${
                    confirmDeleteId === editingWalletId
                      ? 'bg-[#F26B5B] text-[#1e1e1c]'
                      : 'bg-[#F26B5B]/20 text-[#F26B5B]'
                  }`}
                >
                  {confirmDeleteId === editingWalletId ? 'Tap to Confirm' : 'Delete'}
                </button>
              )}
              <button
                type="submit"
                className={`flex-1 py-3 rounded-xl text-xs font-cartoon font-bold key-press ${ui.primaryBtnExpense}`}
              >
                {editingWalletId ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BOTTOM SHEET 2: CREATE / EDIT CATEGORY */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3"
          onClick={resetCategoryModal}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveCategory}
            className={`w-full max-w-md rounded-3xl p-5 space-y-3.5 shadow-[0_8px_0_#111110] animate-sheet-up ${ui.sheetBg}`}
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
          >
            <div className="w-12 h-1.5 rounded-full bg-[#D8CBB3]/40 mx-auto" />
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-cartoon font-bold ${ui.textPrimary}`}>
                {editingCatId ? 'Edit Category' : 'New Category'}
              </h3>
              <button
                type="button"
                onClick={resetCategoryModal}
                className={`text-xs font-cartoon font-bold px-3 py-1 rounded-full key-press ${ui.pillIdle}`}
              >
                Close
              </button>
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Category Name</label>
              <input
                type="text"
                placeholder="e.g. Dining Out, Subscriptions"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className={`w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none ${ui.input}`}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Type</label>
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none ${ui.input}`}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Monthly Limit (Optional)</label>
                <input
                  type="number"
                  placeholder="No limit"
                  value={newCatBudget}
                  onChange={(e) => setNewCatBudget(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none ${ui.input}`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Icon</label>
              <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar">
                {CATEGORY_ICONS.map((ic) => (
                  <button
                    type="button"
                    key={ic}
                    onClick={() => setNewCatIcon(ic)}
                    className={`p-2.5 rounded-xl shrink-0 text-base key-press ${
                      newCatIcon === ic ? ui.pillActive : ui.pillIdle
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-3 rounded-xl text-xs font-cartoon font-bold key-press ${ui.primaryBtnExpense}`}
            >
              {editingCatId ? 'Update Category' : 'Save Category'}
            </button>
          </form>
        </div>
      )}

      {/* BOTTOM SHEET 3: EDIT TRANSACTION */}
      {editingTx && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3"
          onClick={() => setEditingTx(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveEditedTransaction}
            className={`w-full max-w-md rounded-3xl p-5 space-y-3.5 shadow-[0_8px_0_#111110] animate-sheet-up ${ui.sheetBg}`}
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
          >
            <div className="w-12 h-1.5 rounded-full bg-[#D8CBB3]/40 mx-auto" />
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-cartoon font-bold capitalize ${ui.textPrimary}`}>
                Edit {editingTx.type}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className={`text-xs font-cartoon font-bold px-3 py-1 rounded-full key-press ${ui.pillIdle}`}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Amount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  value={editTxAmount}
                  onChange={(e) => setEditTxAmount(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-cartoon font-bold tabular-nums focus:outline-none ${ui.input}`}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Account</label>
                <select
                  value={editTxWalletId}
                  onChange={(e) => setEditTxWalletId(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none ${ui.input}`}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.icon} {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {editingTx.type === 'transfer' ? (
              <div className="space-y-1">
                <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>To Account</label>
                <select
                  value={editTxToWalletId}
                  onChange={(e) => setEditTxToWalletId(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none ${ui.input}`}
                >
                  {wallets
                    .filter((w) => w.id !== editTxWalletId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.icon} {w.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Category</label>
                <select
                  value={editTxCategoryId}
                  onChange={(e) => setEditTxCategoryId(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none ${ui.input}`}
                >
                  {categories
                    .filter((c) => c.type === editingTx.type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Note</label>
              <input
                type="text"
                placeholder="Optional note"
                value={editTxNote}
                onChange={(e) => setEditTxNote(e.target.value)}
                className={`w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none ${ui.input}`}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDeleteTransaction(editingTx.id)}
                className="px-4 py-3 rounded-xl text-xs font-cartoon font-bold border-2 border-[#111110] shadow-[0_3px_0_#111110] text-[#1e1e1c] bg-[#F26B5B] key-press"
              >
                Delete
              </button>
              <button
                type="submit"
                className={`flex-1 py-3 rounded-xl text-xs font-cartoon font-bold key-press ${ui.primaryBtnExpense}`}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CHUNKY CARTOON DOCK BAR WITH BOUNCY SAND PILL & SCRUBBING */}
      <div
        className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none px-4"
        style={{
          bottom: 'max(env(safe-area-inset-bottom), 14px)'
        }}
      >
        <nav
          ref={navBarRef}
          onPointerDown={handleNavPointerDown}
          onPointerMove={handleNavPointerMove}
          onPointerUp={handleNavPointerUpOrCancel}
          onPointerCancel={handleNavPointerUpOrCancel}
          className={`pointer-events-auto relative grid grid-cols-4 items-center w-full max-w-[388px] h-[64px] p-[5px] rounded-full touch-none transition-transform duration-300 ios-spring ${
            lensBulge ? 'scale-[1.02]' : 'scale-100'
          } ${ui.islandBar}`}
        >
          {/* Bouncy Sand / Charcoal Cartoon Pill Indicator */}
          <div
            className={`absolute top-[5px] bottom-[5px] left-[5px] w-[calc(25%-2.5px)] rounded-full pointer-events-none z-20 ${ui.islandLens}`}
            style={{
              transition:
                scrubProgress !== null
                  ? 'transform 110ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                  : 'transform 360ms cubic-bezier(0.34, 1.45, 0.64, 1)',
              transform: `translate3d(${visualLensIndex * 100}%, 0, 0) scale3d(${
                scrubProgress !== null ? 1.06 : lensBulge ? 1.03 : 1.0
              }, ${scrubProgress !== null ? 1.08 : lensBulge ? 1.04 : 1.0}, 1)`
            }}
          />

          {NAV_TABS.map((item, idx) => {
            const active = activeTab === item.id;
            const distance = Math.abs(visualLensIndex - idx);
            const proximity = Math.max(0, 1 - distance);
            const totalScale = 0.94 + proximity * 0.08 + (active && lensBulge ? 0.04 : 0);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`relative z-30 h-full flex flex-col items-center justify-center gap-[2px] rounded-full transition-colors duration-200 ${
                  active ? ui.islandTextActive : ui.islandTextIdle
                }`}
              >
                <div
                  className="flex flex-col items-center justify-center gap-[2px]"
                  style={{
                    transition:
                      scrubProgress !== null
                        ? 'transform 110ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                        : 'transform 340ms cubic-bezier(0.34, 1.45, 0.64, 1)',
                    transform: `scale3d(${totalScale.toFixed(3)}, ${totalScale.toFixed(
                      3
                    )}, 1) translate3d(0, ${active ? '-1px' : '0px'}, 0)`
                  }}
                >
                  <NavIcon id={item.id} active={active} />
                  <span
                    className={`text-[10.5px] font-cartoon leading-none tracking-tight ${
                      active ? 'font-bold' : 'font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TapxMainApp />
    </ErrorBoundary>
  );
}