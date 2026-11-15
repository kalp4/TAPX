import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

// Shared iCloud Shortcut Link for 1-Tap Setup
const SHARED_ICLOUD_SHORTCUT_URL = 'https://www.icloud.com/shortcuts/e2b04fe336ae49af8df883fccb1370f2';

const WALLET_COLORS = ['#18181b', '#2563eb', '#059669', '#d97706', '#e11d48', '#7c3aed', '#0891b2'];
const WALLET_ICONS = ['💳', '💵', '🏦', '⚡', '🪙', '📱', '💎'];
const CATEGORY_ICONS = ['🍔', '🛒', '⛽', '🛍️', '🎬', '⚡', '💊', '☕', '📚', '🏠', '💰', '✈️'];
const CHART_COLORS = ['#2563eb', '#e11d48', '#d97706', '#059669', '#7c3aed', '#0891b2', '#db2777', '#4f46e5'];

const DEFAULT_WALLETS_TEMPLATE = [
  { name: 'UPI', type: 'UPI / Wallet', balance: 0, color: '#2563eb', icon: '⚡' },
  { name: 'Cash', type: 'Cash', balance: 0, color: '#059669', icon: '💵' }
];

// All default monthly_budget values are null (no pre-set budgets)
const DEFAULT_CATEGORIES_TEMPLATE = [
  { name: 'Food & Drinks', type: 'expense', icon: '🍔', color: '#e11d48', monthly_budget: null },
  { name: 'Groceries', type: 'expense', icon: '🛒', color: '#059669', monthly_budget: null },
  { name: 'Transport', type: 'expense', icon: '⛽', color: '#d97706', monthly_budget: null },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#7c3aed', monthly_budget: null },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#db2777', monthly_budget: null },
  { name: 'Bills & Recharge', type: 'expense', icon: '⚡', color: '#0891b2', monthly_budget: null },
  { name: 'Health & Fitness', type: 'expense', icon: '💊', color: '#2563eb', monthly_budget: null },
  { name: 'Income & Allowance', type: 'income', icon: '💰', color: '#059669', monthly_budget: null }
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

// Frameless, 100% Transparent-Cutout Vector Logo (No Border, No Background Box)
function TapxLogo({ className = 'w-16 h-16' }) {
  const uid = React.useId().replace(/:/g, '');
  const walletMaskId = `wallet-cut-${uid}`;
  const claspMaskId = `clasp-cut-${uid}`;
  const bar1Id = `b1-${uid}`;
  const bar2Id = `b2-${uid}`;
  const bar3Id = `b3-${uid}`;
  const navyId = `nv-${uid}`;

  return (
    <svg
      viewBox="85 60 345 395"
      className={`${className} shrink-0 select-none`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={bar1Id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id={bar2Id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id={bar3Id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id={navyId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#163e7a" />
          <stop offset="100%" stopColor="#0a2347" />
        </linearGradient>

        <mask id={walletMaskId}>
          <rect x="0" y="0" width="512" height="512" fill="white" />
          <path
            d="M 142 238 H 300 A 11 11 0 0 1 300 260 H 142 A 11 11 0 0 1 142 238 Z"
            fill="black"
          />
          <circle cx="298" cy="260" r="60" fill="black" />
          <rect x="312" y="312" width="124" height="84" rx="42" fill="black" />
        </mask>

        <mask id={claspMaskId}>
          <rect x="0" y="0" width="512" height="512" fill="white" />
          <circle cx="358" cy="354" r="12" fill="black" />
        </mask>
      </defs>

      <g mask={`url(#${walletMaskId})`}>
        {/* 3 Rising Bars */}
        <rect x="172" y="152" width="54" height="106" rx="6" fill={`url(#${bar1Id})`} />
        <rect x="242" y="114" width="54" height="144" rx="6" fill={`url(#${bar2Id})`} />
        <rect x="312" y="74" width="54" height="184" rx="6" fill={`url(#${bar3Id})`} />

        {/* Wallet Base */}
        <path
          d="M 142 214 H 170 A 8 8 0 0 1 178 222 V 238 H 142 A 11 11 0 0 0 142 260 H 374 A 42 42 0 0 1 416 302 V 398 A 42 42 0 0 1 374 440 H 142 A 42 42 0 0 1 100 398 V 256 A 42 42 0 0 1 142 214 Z"
          fill={`url(#${navyId})`}
        />

        {/* Mid Teal Wave */}
        <path
          d="M 228 260 H 374 A 42 42 0 0 1 416 302 V 398 A 42 42 0 0 1 374 440 H 316 C 266 410 238 344 228 260 Z"
          fill="#0e7c86"
        />

        {/* Right Emerald Wave */}
        <path
          d="M 298 260 H 374 A 42 42 0 0 1 416 302 V 398 A 42 42 0 0 1 374 440 H 338 C 306 408 294 336 298 260 Z"
          fill="#15a378"
        />
      </g>

      {/* Center Emerald Arch Swoop */}
      <path
        d="M 254 260 A 44 44 0 0 1 342 260 C 342 332 324 398 338 440 H 316 C 276 406 254 334 254 260 Z"
        fill="#15a378"
      />
      <path
        d="M 272 246 A 28 28 0 0 1 324 246"
        fill="none"
        stroke="#0a5c4c"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Clasp with Transparent Button Dot */}
      <rect
        x="328"
        y="328"
        width="96"
        height="52"
        rx="26"
        fill={`url(#${navyId})`}
        mask={`url(#${claspMaskId})`}
      />
    </svg>
  );
}

function formatRelativeDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (date.toDateString() === todayStr) {
    return `Today, ${timeStr}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeStr}`;
  }
  const dayMonth = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
  return `${dayMonth}, ${timeStr}`;
}

// Authentic iOS Phone App SF Symbols Icon Set
function NavIcon({ id, active }) {
  const sizeClass = 'w-[22px] h-[22px]';

  if (id === 'pad') {
    const r = active ? '2.2' : '1.75';
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
    if (active) {
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.5 3.75A2.25 2.25 0 0 0 2.25 6v1.5h19.5V6a2.25 2.25 0 0 0-2.25-2.25H4.5Z" />
          <path
            fillRule="evenodd"
            d="M2.25 9.75v8.25A2.25 2.25 0 0 0 4.5 20.25h15a2.25 2.25 0 0 0 2.25-2.25V9.75H2.25Zm3.75 4.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75Z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <svg className={sizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.85">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
        <path strokeLinecap="round" d="M2.5 9.25h19M6.5 14.5h3.5" />
      </svg>
    );
  }

  if (id === 'analytics') {
    if (active) {
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
          <rect x="3.5" y="12" width="4.2" height="8.5" rx="1.4" />
          <rect x="9.9" y="7.5" width="4.2" height="13" rx="1.4" />
          <rect x="16.3" y="3.5" width="4.2" height="17" rx="1.4" />
        </svg>
      );
    }
    return (
      <svg className={sizeClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.85">
        <rect x="3.75" y="12.25" width="3.75" height="8" rx="1.1" />
        <rect x="10.12" y="7.75" width="3.75" height="12.5" rx="1.1" />
        <rect x="16.5" y="3.75" width="3.75" height="16.5" rx="1.1" />
      </svg>
    );
  }

  return (
    <svg
      className={sizeClass}
      fill={active ? 'currentColor' : 'none'}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={active ? '1.2' : '1.85'}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill={active ? '#09090b' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
      />
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
        <div className="h-full w-full bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center space-y-4 overflow-hidden">
          <p className="text-sm font-semibold text-white">Application Error</p>
          <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl font-mono break-all">
            {this.state.errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-semibold"
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

  // Theme Mode: 'system' | 'dark' | 'light'
  const [themePref, setThemePref] = useState(() => {
    return localStorage.getItem(THEME_KEY) || 'system';
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

  // Sync theme color with iOS Status Bar
  useEffect(() => {
    localStorage.setItem(THEME_KEY, themePref);
    const bgHex = isDark ? '#09090b' : '#f5f5f7';
    document.documentElement.style.backgroundColor = bgHex;
    document.body.style.backgroundColor = bgHex;
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', bgHex);
  }, [themePref, isDark]);

  // Refined Apple-Grade Palette + Optical Crystal Liquid Glass
  const ui = useMemo(() => {
    if (isDark) {
      return {
        bg: 'bg-[#09090b] text-zinc-100',
        card: 'bg-[#131316] border-[#232329]',
        cardElevated: 'bg-[#18181c] border-[#292930]',
        cardSubtle: 'bg-[#1c1c21] border-[#27272e]',
        input: 'bg-[#131316] border-[#27272e] text-zinc-100 placeholder-zinc-500',
        pillIdle: 'bg-[#141418] border-[#24242b] text-zinc-400',
        pillActive: 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow-sm',
        numpadKey: 'bg-[#151519] border-[#24242b] text-zinc-100 shadow-[0_1px_0_rgba(255,255,255,0.04)]',
        segmentedBg: 'bg-[#131316] border-[#222228]',
        segmentedThumb: 'bg-[#26262d] shadow-sm',
        textPrimary: 'text-zinc-50',
        textSecondary: 'text-zinc-400',
        textMuted: 'text-zinc-500',
        islandBar: 'ios-glass-bar-dark',
        islandLens: 'ios-magnifying-lens-dark',
        islandTextActive: 'text-white drop-shadow-[0_1px_8px_rgba(255,255,255,0.28)]',
        islandTextIdle: 'text-zinc-400/80',
        primaryBtnExpense: 'bg-zinc-100 text-zinc-950',
        primaryBtnIncome: 'bg-emerald-500 text-zinc-950',
        primaryBtnTransfer: 'bg-blue-500 text-white',
        divider: 'border-[#1e1e24]'
      };
    }
    return {
      bg: 'bg-[#f5f5f7] text-zinc-900',
      card: 'bg-white border-zinc-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)]',
      cardElevated: 'bg-white border-zinc-200/90 shadow-[0_4px_14px_rgba(0,0,0,0.04)]',
      cardSubtle: 'bg-zinc-100 border-zinc-200/70',
      input: 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400',
      pillIdle: 'bg-white border-zinc-200/90 text-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
      pillActive: 'bg-zinc-900 border-zinc-900 text-white shadow-sm',
      numpadKey: 'bg-white border-zinc-200/90 text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
      segmentedBg: 'bg-zinc-200/80 border-zinc-300/40',
      segmentedThumb: 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
      textPrimary: 'text-zinc-900',
      textSecondary: 'text-zinc-500',
      textMuted: 'text-zinc-400',
      islandBar: 'ios-glass-bar-light',
      islandLens: 'ios-magnifying-lens-light',
      islandTextActive: 'text-[#007AFF] drop-shadow-[0_1px_4px_rgba(0,122,255,0.18)]',
      islandTextIdle: 'text-zinc-500/85',
      primaryBtnExpense: 'bg-zinc-900 text-white',
      primaryBtnIncome: 'bg-emerald-600 text-white',
      primaryBtnTransfer: 'bg-blue-600 text-white',
      divider: 'border-zinc-200'
    };
  }, [isDark]);

  const [session, setSession] = useState(null);
  const [initialBoot, setInitialBoot] = useState(!cachedData);
  const [isSyncingBg, setIsSyncingBg] = useState(false);
  const [dbError, setDbError] = useState('');
  const seedingRef = useRef(false);

  // Navigation, Magnifying Lens & Scrubbing State
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
  const [popKey, setPopKey] = useState(0);

  const triggerLensMagnification = useCallback((duration = 440) => {
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
      triggerLensMagnification(440);
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

  // Helper to get continuous 0..3 index from finger X position
  const getClampedIndexFromClientX = useCallback((clientX) => {
    if (!navBarRef.current) return 0;
    const rect = navBarRef.current.getBoundingClientRect();
    const pad = 5;
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
    setScrubProgress(null);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore capture errors
    }

    const nearestIdx = Math.round(getClampedIndexFromClientX(e.clientX));
    const targetTab = NAV_TABS[nearestIdx]?.id;
    if (targetTab) {
      handleSelectTab(targetTab);
    }
  };

  const handleNavPointerMove = (e) => {
    if (!isPointerDownOnNavRef.current) return;

    if (!isScrubbingRef.current && Math.abs(e.clientX - pointerStartXRef.current) > 14) {
      isScrubbingRef.current = true;
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
    }, 300);
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
  const [toast, setToast] = useState('');

  // Activity Filter State
  const [activityWalletFilter, setActivityWalletFilter] = useState('all');

  // New / Edit Wallet Modal State
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState(null);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState('UPI / Wallet');
  const [newWalletBalance, setNewWalletBalance] = useState('');
  const [newWalletColor, setNewWalletColor] = useState(WALLET_COLORS[1]);
  const [newWalletIcon, setNewWalletIcon] = useState(WALLET_ICONS[0]);

  // New / Edit Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatIcon, setNewCatIcon] = useState(CATEGORY_ICONS[0]);
  const [newCatBudget, setNewCatBudget] = useState('');

  // Two-Tap Delete Confirmation State
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  // Cache state automatically
  useEffect(() => {
    if (!session?.user?.id) return;
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          userId: session.user.id,
          settings,
          wallets,
          categories,
          transactions
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [session?.user?.id, settings, wallets, categories, transactions]);

  const showToast = (msg) => {
    setToast(String(msg));
    setTimeout(() => setToast(''), 2000);
  };

  const fetchUserData = useCallback(async (userId) => {
    if (!userId) return;
    setIsSyncingBg(true);
    setDbError('');
    try {
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
      const fetchedTx = Array.isArray(txRes.data) ? txRes.data : [];

      // One-time auto-cleanup to remove previously seeded default budgets from Supabase
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
      setInitialBoot(false);
      setIsSyncingBg(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then((res) => {
        if (!mounted) return;
        const currentSession = res?.data?.session || null;
        setSession(currentSession);
        if (!currentSession) setInitialBoot(false);
      })
      .catch(() => {
        if (mounted) setInitialBoot(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession || null);
      if (!newSession) {
        setWallets([]);
        setCategories([]);
        setTransactions([]);
        localStorage.removeItem(CACHE_KEY);
        setInitialBoot(false);
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

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  const handleLogout = async () => {
    localStorage.removeItem(CACHE_KEY);
    await supabase.auth.signOut();
  };

  // Zero-Latency Numpad Handler
  const handleDigitPress = (digit) => {
    setPopKey((k) => k + 1);
    if (digit === 'CLEAR') {
      setAmountStr('0');
      return;
    }
    if (digit === 'DEL') {
      setAmountStr((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (digit === '.') {
      if (!amountStr.includes('.')) setAmountStr((prev) => prev + '.');
      return;
    }
    setAmountStr((prev) => {
      if (prev === '0') return digit;
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
      if (prev.length >= 8) return prev;
      return prev + digit;
    });
  };

  const handleQuickAddAmount = (delta) => {
    setPopKey((k) => k + 1);
    setAmountStr((prev) => {
      const current = parseFloat(prev) || 0;
      const next = current + delta;
      return String(next);
    });
  };

  const handleLogTransaction = async () => {
    const numericAmount = parseFloat(amountStr);
    if (!numericAmount || numericAmount <= 0) {
      showToast('Enter an amount');
      return;
    }
    if (!selectedWalletId) {
      showToast('Add a wallet first');
      handleSelectTab('wallets');
      setShowWalletModal(true);
      return;
    }
    if (entryType === 'transfer' && (!toWalletId || toWalletId === selectedWalletId)) {
      showToast('Select two different wallets');
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

    const tempId = `temp-${Date.now()}`;
    const optimisticTx = {
      id: tempId,
      user_id: session.user.id,
      wallet_id: fromId,
      to_wallet_id: destId,
      category_id: catId,
      type: currentType,
      amount: numericAmount,
      note: cleanNote,
      source: 'app',
      created_at: new Date().toISOString()
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
    showToast(`${settings?.currency || '₹'}${numericAmount.toLocaleString('en-IN')} saved`);

    const { data: insertedRow, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: session.user.id,
          wallet_id: fromId,
          to_wallet_id: destId,
          category_id: catId,
          type: currentType,
          amount: numericAmount,
          note: cleanNote,
          source: 'app'
        }
      ])
      .select()
      .maybeSingle();

    if (error) {
      showToast(`Sync error: ${error.message}`);
      fetchUserData(session.user.id);
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

  const handleDeleteTransaction = async (id) => {
    const targetTx = transactions.find((t) => t.id === id);
    if (!targetTx) return;

    const amt = Number(targetTx.amount) || 0;
    const fromWallet = wallets.find((w) => w.id === targetTx.wallet_id);
    const toWallet = targetTx.to_wallet_id
      ? wallets.find((w) => w.id === targetTx.to_wallet_id)
      : null;

    const restoredFromBalance = fromWallet
      ? targetTx.type === 'income'
        ? Number(fromWallet.balance || 0) - amt
        : Number(fromWallet.balance || 0) + amt
      : null;

    const restoredToBalance =
      targetTx.type === 'transfer' && toWallet
        ? Number(toWallet.balance || 0) - amt
        : null;

    setTransactions((prev) => prev.filter((t) => t.id !== id));
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
    showToast('Entry deleted');

    await supabase.from('transactions').delete().eq('id', id);

    if (targetTx.wallet_id && restoredFromBalance !== null) {
      const { data: checkW } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', targetTx.wallet_id)
        .maybeSingle();
      if (checkW && Number(checkW.balance) !== restoredFromBalance) {
        await supabase
          .from('wallets')
          .update({ balance: restoredFromBalance })
          .eq('id', targetTx.wallet_id);
      }
    }

    if (targetTx.type === 'transfer' && targetTx.to_wallet_id && restoredToBalance !== null) {
      const { data: checkToW } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', targetTx.to_wallet_id)
        .maybeSingle();
      if (checkToW && Number(checkToW.balance) !== restoredToBalance) {
        await supabase
          .from('wallets')
          .update({ balance: restoredToBalance })
          .eq('id', targetTx.to_wallet_id);
      }
    }
  };

  const openEditWallet = (wallet) => {
    setEditingWalletId(wallet.id);
    setNewWalletName(wallet.name || '');
    setNewWalletType(wallet.type || 'UPI / Wallet');
    setNewWalletBalance(String(wallet.balance ?? 0));
    setNewWalletColor(wallet.color || WALLET_COLORS[1]);
    setNewWalletIcon(wallet.icon || WALLET_ICONS[0]);
    setShowWalletModal(true);
  };

  const resetWalletModal = () => {
    setEditingWalletId(null);
    setNewWalletName('');
    setNewWalletBalance('');
    setNewWalletType('UPI / Wallet');
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
      showToast('Account updated');

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
      showToast('Account created');
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
    showToast('Account deleted');
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
      showToast('Category updated');

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
      showToast('Category created');
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
    showToast('Category deleted');
    await supabase.from('categories').delete().eq('id', id);
  };

  const handleRegenerateToken = async () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    setSettings((prev) => ({ ...prev, shortcut_token: randomHex }));
    showToast('Token updated');

    await supabase
      .from('user_settings')
      .update({ shortcut_token: randomHex })
      .eq('user_id', session.user.id);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text || '');
    setCopiedField(label);
    showToast('Copied to clipboard');
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

  const visibleTransactions = useMemo(() => {
    if (activityWalletFilter === 'all') return transactions.slice(0, 60);
    return transactions
      .filter(
        (tx) =>
          tx.wallet_id === activityWalletFilter || tx.to_wallet_id === activityWalletFilter
      )
      .slice(0, 60);
  }, [transactions, activityWalletFilter]);

  const currentMonthSpendByCat = useMemo(() => {
    const now = new Date();
    const map = {};
    transactions.forEach((tx) => {
      if (!tx?.created_at) return;
      const d = new Date(tx.created_at);
      if (
        tx.type === 'expense' &&
        tx.category_id &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      ) {
        map[tx.category_id] = (map[tx.category_id] || 0) + (Number(tx.amount) || 0);
      }
    });
    return map;
  }, [transactions]);

  const analyticsData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

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

    filteredTx.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.source === 'shortcut') shortcutCount += 1;

      if (tx.type === 'expense') {
        totalExpense += amt;
        expenseCount += 1;
        const catKey = tx.category_id || 'uncategorized';
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

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(startOfToday);
      dayDate.setDate(dayDate.getDate() - i);
      const dayStr = dayDate.toDateString();
      const label = dayDate.toLocaleDateString('en-US', { weekday: 'short' });

      const daySum = transactions.reduce((sum, tx) => {
        if (!tx?.created_at || tx.type !== 'expense') return sum;
        const txDate = new Date(tx.created_at);
        return txDate.toDateString() === dayStr ? sum + (Number(tx.amount) || 0) : sum;
      }, 0);

      last7Days.push({
        label,
        isToday: i === 0,
        amount: daySum
      });
    }

    const maxDaySpend = Math.max(...last7Days.map((d) => d.amount), 1);

    const categoryBreakdown = Object.keys(categoryTotals)
      .map((catId, index) => {
        const catObj = categories.find((c) => c.id === catId);
        const amount = categoryTotals[catId];
        const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
        return {
          id: catId,
          name: catObj?.name || 'Other',
          icon: catObj?.icon || '💸',
          amount,
          count: categoryCounts[catId] || 0,
          pct,
          color: CHART_COLORS[index % CHART_COLORS.length]
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const walletBreakdown = Object.keys(walletTotals)
      .map((wId) => {
        const wObj = wallets.find((w) => w.id === wId);
        const amount = walletTotals[wId];
        const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
        return {
          id: wId,
          name: wObj?.name || 'Wallet',
          icon: wObj?.icon || '💳',
          color: wObj?.color || '#2563eb',
          amount,
          pct
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const shortcutPct =
      filteredTx.length > 0 ? Math.round((shortcutCount / filteredTx.length) * 100) : 0;

    return {
      totalExpense,
      totalIncome,
      netFlow: totalIncome - totalExpense,
      dailyAvgExpense,
      expenseCount,
      totalTxCount: filteredTx.length,
      shortcutCount,
      shortcutPct,
      last7Days,
      maxDaySpend,
      categoryBreakdown,
      walletBreakdown
    };
  }, [transactions, categories, wallets, analyticsRange]);

  const currencySymbol = settings?.currency || '₹';

  const primaryButtonClass =
    entryType === 'income'
      ? ui.primaryBtnIncome
      : entryType === 'transfer'
      ? ui.primaryBtnTransfer
      : ui.primaryBtnExpense;

  const entryIndex = entryType === 'expense' ? 0 : entryType === 'income' ? 1 : 2;
  const settingsSubIndex = settingsSection === 'shortcut' ? 0 : 1;

  if (initialBoot) {
    return (
      <div className={`h-full w-full ${ui.bg} flex flex-col items-center justify-center gap-4 p-6 overflow-hidden`}>
        <TapxLogo className="w-16 h-16 animate-pulse" />
        <div className="w-5 h-5 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ULTRA-CLEAN MINIMAL LOGIN SCREEN (No Clutter, Frameless Logo)
  if (!session) {
    return (
      <div
        className={`h-full w-full ${ui.bg} flex flex-col justify-between px-7 max-w-md mx-auto overflow-hidden select-none`}
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 24px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 28px)'
        }}
      >
        <div />

        <div className="flex flex-col items-center text-center space-y-3">
          <TapxLogo className="w-24 h-24 mb-1" />
          <h1 className={`text-3xl font-bold tracking-tight ${ui.textPrimary}`}>
            TAPX
          </h1>
          <p className={`text-sm max-w-[240px] leading-relaxed ${ui.textSecondary}`}>
            Instant multi-wallet expense tracking with iPhone Back Tap.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            className={`w-full py-4 px-5 font-semibold text-sm rounded-2xl flex items-center justify-center gap-3 key-press ${
              isDark ? 'bg-white text-zinc-950' : 'bg-zinc-900 text-white'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            Continue with Google
          </button>

          <p className={`text-[11px] text-center ${ui.textMuted}`}>
            Share → Add to Home Screen for full-screen iOS mode
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full ${ui.bg} flex flex-col max-w-md mx-auto overflow-hidden relative select-none`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 18px)'
      }}
    >
      {/* Floating Toast Pill */}
      {toast && (
        <div
          className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-semibold shadow-xl pointer-events-none animate-tab ${
            isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
          }`}
        >
          {toast}
        </div>
      )}

      {/* Database Error Banner */}
      {dbError && (
        <div className="mx-5 mt-1 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center justify-between shrink-0">
          <span className="truncate">{dbError}</span>
        </div>
      )}

      {/* Crisp Top Header (Logo Removed from Home Screen) */}
      <header className="px-5 pt-2 pb-3 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-medium tracking-tight ${ui.textSecondary}`}>
              Total Balance
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                isSyncingBg ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
          </div>
          <h2 className={`text-[26px] leading-tight font-bold tracking-tight tabular-nums ${ui.textPrimary}`}>
            {currencySymbol}
            {Number(totalNetWorth || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>
        </div>

        <button
          onClick={() => {
            resetWalletModal();
            handleSelectTab('wallets');
            setShowWalletModal(true);
          }}
          className={`px-3.5 py-2 rounded-full border text-xs font-semibold key-press ${ui.cardElevated} ${ui.textPrimary}`}
        >
          + Wallet
        </button>
      </header>

      {/* MAIN VIEWPORT */}
      <main
        className="flex-1 min-h-0 flex flex-col overflow-hidden px-5"
        style={{
          paddingBottom: 'calc(max(env(safe-area-inset-bottom), 14px) + 88px)'
        }}
      >
        {/* TAB 1: KEYPAD */}
        {activeTab === 'pad' && (
          <div key="tab-pad" className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${tabAnimClass}`}>
            {/* Hardware-Accelerated Sliding Segmented Control */}
            <div className={`relative grid grid-cols-3 p-1 rounded-2xl border shrink-0 ${ui.segmentedBg}`}>
              <div
                className={`absolute top-1 bottom-1 left-1 w-[calc(33.333%-2.66px)] rounded-xl transition-transform duration-300 ios-spring ${ui.segmentedThumb}`}
                style={{ transform: `translate3d(${entryIndex * 100}%, 0, 0)` }}
              />
              {[
                { id: 'expense', label: 'Expense' },
                { id: 'income', label: 'Income' },
                { id: 'transfer', label: 'Transfer' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setEntryType(t.id);
                    const firstMatch = categories.find(
                      (c) => c.type === (t.id === 'income' ? 'income' : 'expense')
                    );
                    if (firstMatch) setSelectedCategoryId(firstMatch.id);
                  }}
                  className={`relative z-10 py-1.5 text-xs font-semibold rounded-xl transition-colors duration-200 ${
                    entryType === t.id ? ui.textPrimary : ui.textSecondary
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Center Amount Hero Card */}
            <div className={`my-auto py-3 px-4 rounded-3xl border flex flex-col items-center justify-center relative shrink-0 ${ui.card}`}>
              {amountStr !== '0' && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleDigitPress('CLEAR');
                  }}
                  className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold border key-press ${ui.cardSubtle} ${ui.textSecondary}`}
                >
                  Clear
                </button>
              )}

              <div
                key={popKey}
                className={`text-[42px] leading-none font-bold tracking-tight tabular-nums animate-pop ${
                  entryType === 'income'
                    ? 'text-emerald-500'
                    : entryType === 'transfer'
                    ? 'text-blue-500'
                    : ui.textPrimary
                }`}
              >
                <span className={`text-2xl mr-1 font-medium ${ui.textMuted}`}>{currencySymbol}</span>
                {amountStr}
              </div>

              <input
                type="text"
                placeholder={
                  entryType === 'transfer'
                    ? 'Transfer note (e.g. ATM withdrawal, top-up)...'
                    : 'Add a note...'
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`mt-2 bg-transparent text-center text-xs focus:outline-none w-4/5 ${ui.textSecondary} placeholder:${ui.textMuted}`}
              />

              {/* Quick Add Chips */}
              <div className="flex items-center gap-1.5 mt-2">
                {[50, 100, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleQuickAddAmount(val);
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border tabular-nums key-press ${ui.cardSubtle} ${ui.textSecondary}`}
                  >
                    +{currencySymbol}{val}
                  </button>
                ))}
              </div>

              {selectedWalletObj && (
                <div className={`mt-2 pt-2 border-t w-full flex items-center justify-center gap-1.5 text-[11px] ${ui.divider} ${ui.textMuted}`}>
                  <span>{selectedWalletObj.icon}</span>
                  <span>{selectedWalletObj.name}</span>
                  <span>·</span>
                  <span className="tabular-nums">
                    {currencySymbol}
                    {Number(selectedWalletObj.balance || 0).toLocaleString('en-IN')} available
                  </span>
                </div>
              )}
            </div>

            {/* Wallet & Category Selector Pills */}
            <div className="space-y-2 shrink-0">
              {/* Wallet Row */}
              <div className="space-y-1">
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-0.5 ${ui.textMuted}`}>
                  {entryType === 'transfer' ? 'From Account → To Account' : 'Account'}
                </span>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {wallets.length === 0 ? (
                    <button
                      onClick={() => {
                        resetWalletModal();
                        handleSelectTab('wallets');
                        setShowWalletModal(true);
                      }}
                      className={`px-3.5 py-2 rounded-full text-xs font-medium border shrink-0 key-press ${ui.pillIdle}`}
                    >
                      + Add your first wallet
                    </button>
                  ) : (
                    wallets.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setSelectedWalletId(w.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 border transition-colors duration-150 key-press ${
                          selectedWalletId === w.id ? ui.pillActive : ui.pillIdle
                        }`}
                      >
                        <span>{w.icon}</span>
                        <span>{w.name}</span>
                        <span className="text-[10px] opacity-70 tabular-nums">
                          {currencySymbol}
                          {Number(w.balance || 0).toLocaleString('en-IN')}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Transfer Destination Row */}
                {entryType === 'transfer' && wallets.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pt-1 no-scrollbar">
                    {wallets
                      .filter((w) => w.id !== selectedWalletId)
                      .map((w) => (
                        <button
                          key={w.id}
                          onClick={() => setToWalletId(w.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 shrink-0 border transition-colors duration-150 key-press ${
                            toWalletId === w.id ? ui.pillActive : ui.pillIdle
                          }`}
                        >
                          <span>→ {w.icon} {w.name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Category Row */}
              {entryType !== 'transfer' && (
                <div className="space-y-1">
                  <span className={`text-[10px] uppercase tracking-wider font-semibold px-0.5 ${ui.textMuted}`}>
                    {entryType === 'income' ? 'Income Category' : 'Expense Category'}
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {filteredCategories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategoryId(c.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 border transition-colors duration-150 key-press ${
                          selectedCategoryId === c.id ? ui.pillActive : ui.pillIdle
                        }`}
                      >
                        <span>{c.icon}</span>
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Zero-Latency Tactile Numpad */}
            <div className="grid grid-cols-3 gap-2 pt-2 shrink-0">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleDigitPress(key);
                  }}
                  className={`h-11 rounded-2xl border text-lg font-semibold tabular-nums flex items-center justify-center key-press ${ui.numpadKey}`}
                >
                  {key === 'DEL' ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75 14.25 12m0 0 2.25 2.25M14.25 12l2.25-2.25M14.25 12 12 14.25m-2.58 4.92-6.374-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.21-.211.497-.33.795-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.795-.33Z" />
                    </svg>
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleLogTransaction}
              className={`w-full py-3.5 mt-2 rounded-2xl font-semibold text-sm key-press shrink-0 shadow-sm ${primaryButtonClass}`}
            >
              Save {entryType === 'transfer' ? 'Transfer' : entryType === 'income' ? 'Income' : 'Expense'}
            </button>
          </div>
        )}

        {/* TAB 2: WALLETS & ACTIVITY */}
        {activeTab === 'wallets' && (
          <div key="tab-wallets" className={`flex-1 min-h-0 flex flex-col gap-3 overflow-hidden ${tabAnimClass}`}>
            <div className="flex items-center justify-between shrink-0">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${ui.textSecondary}`}>
                Accounts ({wallets.length})
              </h3>
              <button
                onClick={() => {
                  if (showWalletModal) {
                    resetWalletModal();
                  } else {
                    resetWalletModal();
                    setShowWalletModal(true);
                  }
                }}
                className={`text-xs px-3 py-1 rounded-full border font-medium key-press ${ui.cardElevated} ${ui.textPrimary}`}
              >
                {showWalletModal ? 'Cancel' : '+ New'}
              </button>
            </div>

            {showWalletModal && (
              <form
                onSubmit={handleSaveWallet}
                className={`p-3.5 rounded-2xl border space-y-2.5 shrink-0 animate-tab ${ui.cardElevated}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${ui.textSecondary}`}>
                    {editingWalletId ? 'Edit Account & Balance' : 'Create New Account'}
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Account Name (e.g. HDFC, Cash, FamPay)"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${ui.input}`}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newWalletType}
                    onChange={(e) => setNewWalletType(e.target.value)}
                    className={`border rounded-xl px-3 py-2 text-xs focus:outline-none ${ui.input}`}
                  >
                    <option>UPI / Wallet</option>
                    <option>Cash</option>
                    <option>Bank</option>
                    <option>Card</option>
                    <option>Savings</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Current Balance"
                    value={newWalletBalance}
                    onChange={(e) => setNewWalletBalance(e.target.value)}
                    className={`border rounded-xl px-3 py-2 text-xs focus:outline-none ${ui.input}`}
                  />
                </div>
                <div className="flex gap-1.5 justify-between">
                  {WALLET_ICONS.map((ic) => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setNewWalletIcon(ic)}
                      className={`p-2 rounded-xl border text-sm key-press ${
                        newWalletIcon === ic ? ui.pillActive : ui.pillIdle
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold key-press ${ui.primaryBtnExpense}`}
                >
                  {editingWalletId ? 'Save Changes' : 'Create Account'}
                </button>
              </form>
            )}

            {/* Scrollable Wallets Container */}
            <div className="max-h-[34%] custom-scroll space-y-2 pr-0.5 shrink-0">
              {wallets.length === 0 ? (
                <div className={`p-4 rounded-2xl border text-center text-xs ${ui.card} ${ui.textMuted}`}>
                  No accounts added yet. Tap + New to add Cash, Bank, or FamPay.
                </div>
              ) : (
                wallets.map((w) => {
                  const isFiltered = activityWalletFilter === w.id;
                  return (
                    <div
                      key={w.id}
                      onClick={() =>
                        setActivityWalletFilter((prev) => (prev === w.id ? 'all' : w.id))
                      }
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isFiltered ? ui.cardElevated : ui.card
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base shrink-0 ${ui.cardSubtle}`}>
                          {w.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`font-semibold text-sm truncate ${ui.textPrimary}`}>{w.name}</p>
                            {isFiltered && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">
                                Filtered
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] ${ui.textMuted}`}>{w.type}</p>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className={`font-semibold text-sm tabular-nums mr-1 ${ui.textPrimary}`}>
                          {currencySymbol}
                          {Number(w.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          onClick={() => openEditWallet(w)}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-medium key-press ${ui.cardSubtle} ${ui.textSecondary}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteWallet(w.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold key-press ${
                            confirmDeleteId === w.id
                              ? 'bg-rose-500 text-white'
                              : `${ui.textMuted} hover:text-rose-500`
                          }`}
                        >
                          {confirmDeleteId === w.id ? 'Sure?' : '✕'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-1 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${ui.textSecondary}`}>
                  Recent Activity
                </h3>
                {activityWalletFilter !== 'all' && (
                  <button
                    onClick={() => setActivityWalletFilter('all')}
                    className="text-[10px] text-blue-400 font-semibold"
                  >
                    Show All
                  </button>
                )}
              </div>
              <span className={`text-[11px] ${ui.textMuted}`}>{visibleTransactions.length} entries</span>
            </div>

            {/* Scrollable Transactions Container */}
            <div className="flex-1 min-h-0 custom-scroll space-y-1.5 pr-0.5">
              {visibleTransactions.length === 0 ? (
                <div className={`p-6 rounded-2xl border text-center text-xs ${ui.card} ${ui.textMuted}`}>
                  No transactions recorded yet.
                </div>
              ) : (
                visibleTransactions.map((tx) => {
                  const w = wallets.find((item) => item.id === tx.wallet_id);
                  const toW = wallets.find((item) => item.id === tx.to_wallet_id);
                  const c = categories.find((item) => item.id === tx.category_id);
                  return (
                    <div
                      key={tx.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between ${ui.card}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm shrink-0 ${ui.cardSubtle}`}>
                          {tx.type === 'transfer' ? '⇄' : c?.icon || (tx.type === 'income' ? '💰' : '💸')}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-semibold truncate ${ui.textPrimary}`}>
                              {tx.type === 'transfer'
                                ? `${w?.name || 'Account'} → ${toW?.name || 'Account'}`
                                : c?.name || (tx.type === 'income' ? 'Income' : 'Expense')}
                            </p>
                            {tx.source === 'shortcut' && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${ui.cardSubtle} ${ui.textSecondary}`}>
                                Back Tap
                              </span>
                            )}
                          </div>
                          <p className={`text-[10px] truncate ${ui.textMuted}`}>
                            {w?.name || 'Account'}
                            {tx.note ? ` · ${tx.note}` : ''}
                            {tx.created_at ? ` · ${formatRelativeDateTime(tx.created_at)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            tx.type === 'income'
                              ? 'text-emerald-500'
                              : tx.type === 'transfer'
                              ? 'text-blue-500'
                              : ui.textPrimary
                          }`}
                        >
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          {currencySymbol}
                          {Number(tx.amount || 0).toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className={`px-1 text-xs key-press ${ui.textMuted} hover:text-rose-500`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div key="tab-analytics" className={`flex-1 min-h-0 flex flex-col gap-3 overflow-hidden ${tabAnimClass}`}>
            <div className="flex items-center justify-between shrink-0">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${ui.textSecondary}`}>
                Overview
              </h3>
              <div className={`flex p-0.5 rounded-xl border ${ui.segmentedBg}`}>
                {[
                  { id: 'week', label: '7D' },
                  { id: 'month', label: 'Month' },
                  { id: 'all', label: 'All' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAnalyticsRange(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                      analyticsRange === tab.id ? `${ui.segmentedThumb} ${ui.textPrimary}` : ui.textSecondary
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className={`p-3 rounded-2xl border ${ui.card}`}>
                <p className={`text-[10px] font-medium ${ui.textMuted}`}>Total Spent</p>
                <p className={`text-sm font-bold tabular-nums mt-0.5 truncate ${ui.textPrimary}`}>
                  {currencySymbol}
                  {analyticsData.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className={`p-3 rounded-2xl border ${ui.card}`}>
                <p className={`text-[10px] font-medium ${ui.textMuted}`}>Daily Avg</p>
                <p className={`text-sm font-bold tabular-nums mt-0.5 truncate ${ui.textPrimary}`}>
                  {currencySymbol}
                  {analyticsData.dailyAvgExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className={`p-3 rounded-2xl border ${ui.card}`}>
                <p className={`text-[10px] font-medium ${ui.textMuted}`}>Income</p>
                <p className="text-sm font-bold tabular-nums text-emerald-500 mt-0.5 truncate">
                  +{currencySymbol}
                  {analyticsData.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Inner Scrollable Analytics Cards */}
            <div className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5">
              <div className={`p-4 rounded-2xl border space-y-3 ${ui.card}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-semibold ${ui.textPrimary}`}>Last 7 Days</h4>
                  <span className={`text-[10px] font-medium ${ui.textMuted}`}>
                    {analyticsData.shortcutPct}% logged via Back Tap
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2 items-end h-28 pt-2">
                  {analyticsData.last7Days.map((day, idx) => {
                    const heightPct =
                      day.amount > 0
                        ? Math.max(14, Math.round((day.amount / analyticsData.maxDaySpend) * 100))
                        : 6;
                    return (
                      <div key={idx} className="flex flex-col items-center justify-end h-full gap-1">
                        <span className={`text-[9px] font-mono tabular-nums truncate max-w-full ${ui.textMuted}`}>
                          {day.amount > 0
                            ? day.amount >= 1000
                              ? `${(day.amount / 1000).toFixed(1)}k`
                              : Math.round(day.amount)
                            : ''}
                        </span>
                        <div className={`w-full rounded-lg h-16 flex items-end p-0.5 border ${ui.cardSubtle}`}>
                          <div
                            className={`w-full rounded-md transition-all duration-500 ios-spring ${
                              day.isToday
                                ? isDark
                                  ? 'bg-zinc-100'
                                  : 'bg-zinc-900'
                                : day.amount > 0
                                ? 'bg-blue-500/75'
                                : 'bg-transparent'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-medium ${
                            day.isToday ? ui.textPrimary : ui.textMuted
                          }`}
                        >
                          {day.isToday ? 'Today' : day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`p-4 rounded-2xl border space-y-3 ${ui.card}`}>
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-semibold ${ui.textPrimary}`}>Spending by Category</h4>
                  <span className={`text-[10px] ${ui.textMuted}`}>{analyticsData.expenseCount} items</span>
                </div>

                {analyticsData.categoryBreakdown.length === 0 ? (
                  <p className={`text-xs py-2 ${ui.textMuted}`}>No expenses in this period.</p>
                ) : (
                  <>
                    <div className={`w-full h-2.5 rounded-full overflow-hidden flex gap-0.5 p-0.5 border ${ui.cardSubtle}`}>
                      {analyticsData.categoryBreakdown.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            width: `${Math.max(item.pct, 4)}%`,
                            backgroundColor: item.color
                          }}
                          className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 ios-spring"
                        />
                      ))}
                    </div>

                    <div className="space-y-2 pt-1">
                      {analyticsData.categoryBreakdown.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.icon}</span>
                            <span className={`font-medium truncate ${ui.textPrimary}`}>{item.name}</span>
                            <span className={`text-[10px] ${ui.textMuted}`}>({item.count})</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 tabular-nums">
                            <span className={`font-semibold ${ui.textPrimary}`}>
                              {currencySymbol}
                              {item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono w-10 text-right ${ui.cardSubtle} ${ui.textSecondary}`}>
                              {item.pct}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {analyticsData.walletBreakdown.length > 0 && (
                <div className={`p-4 rounded-2xl border space-y-2.5 ${ui.card}`}>
                  <h4 className={`text-xs font-semibold ${ui.textPrimary}`}>Account Share</h4>
                  <div className="space-y-2">
                    {analyticsData.walletBreakdown.map((w) => (
                      <div key={w.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs tabular-nums">
                          <span className={`font-medium ${ui.textPrimary}`}>
                            {w.icon} {w.name}
                          </span>
                          <span className={`font-semibold ${ui.textPrimary}`}>
                            {currencySymbol}
                            {w.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                            <span className={`text-[10px] font-normal ${ui.textMuted}`}>({w.pct}%)</span>
                          </span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${ui.cardSubtle}`}>
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-500 ios-spring"
                            style={{ width: `${w.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS (Appearance + Back Tap + Categories) */}
        {activeTab === 'settings' && (
          <div key="tab-settings" className={`flex-1 min-h-0 flex flex-col gap-3 overflow-hidden ${tabAnimClass}`}>
            {/* Appearance Mode Selector */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between shrink-0 ${ui.card}`}>
              <div>
                <p className={`text-xs font-semibold ${ui.textPrimary}`}>Appearance</p>
                <p className={`text-[10px] ${ui.textMuted}`}>Light, Dark, or iPhone System</p>
              </div>
              <div className={`flex p-0.5 rounded-xl border ${ui.segmentedBg}`}>
                {[
                  { id: 'system', label: 'Auto' },
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setThemePref(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                      themePref === m.id ? `${ui.segmentedThumb} ${ui.textPrimary}` : ui.textSecondary
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Animated Sliding Sub-Section Switcher */}
            <div className={`relative grid grid-cols-2 p-1 rounded-2xl border shrink-0 ${ui.segmentedBg}`}>
              <div
                className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl transition-transform duration-300 ios-spring ${ui.segmentedThumb}`}
                style={{ transform: `translate3d(${settingsSubIndex * 100}%, 0, 0)` }}
              />
              <button
                onClick={() => setSettingsSection('shortcut')}
                className={`relative z-10 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-200 ${
                  settingsSection === 'shortcut' ? ui.textPrimary : ui.textSecondary
                }`}
              >
                Back Tap Setup
              </button>
              <button
                onClick={() => setSettingsSection('budgets')}
                className={`relative z-10 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-200 ${
                  settingsSection === 'budgets' ? ui.textPrimary : ui.textSecondary
                }`}
              >
                Categories
              </button>
            </div>

            {/* SUB-VIEW 1: BACK TAP SHORTCUT */}
            {settingsSection === 'shortcut' && (
              <div key="sub-shortcut" className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5 animate-tab-left">
                <div className={`p-4 rounded-2xl border space-y-3 ${ui.card}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-xs font-semibold ${ui.textPrimary}`}>1-Tap Back Tap Installer</h3>
                      <p className={`text-[10px] ${ui.textMuted}`}>
                        Asks Spent/Earned, Account, Category & Amount on Lock Screen
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ui.cardSubtle} ${ui.textSecondary}`}>
                      iOS
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] font-semibold uppercase ${ui.textMuted}`}>
                      Your Personal Shortcut URL
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={personalApiUrl}
                        className={`flex-1 border rounded-xl px-2.5 py-2 text-[11px] font-mono ${ui.input}`}
                      />
                      <button
                        onClick={() => copyToClipboard(personalApiUrl, 'apiUrl')}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 key-press ${ui.cardSubtle} ${ui.textPrimary} border`}
                      >
                        {copiedField === 'apiUrl' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleOneTapShortcut}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-xs key-press ${ui.primaryBtnExpense}`}
                  >
                    Copy Personal URL & Install Shortcut
                  </button>

                  <div className={`pt-2 border-t space-y-1.5 text-[11px] ${ui.divider} ${ui.textSecondary}`}>
                    <p className={`font-semibold ${ui.textPrimary}`}>Quick Setup (10 Seconds):</p>
                    <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                      <li>Tap the button above (your Personal URL copies automatically).</li>
                      <li>When Apple Shortcuts opens, tap <strong>Paste</strong> into the setup prompt and tap <strong>Add Shortcut</strong>.</li>
                      <li>Go to iPhone <strong>Settings → Accessibility → Touch → Back Tap → Double Tap</strong> and select <strong>Log to TAPX</strong>.</li>
                    </ol>
                  </div>
                </div>

                {/* Token Box */}
                <div className={`p-3.5 rounded-2xl border space-y-1.5 ${ui.card}`}>
                  <label className={`text-[10px] font-semibold uppercase ${ui.textMuted}`}>
                    Shortcut Security Token
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={settings?.shortcut_token || ''}
                      className={`flex-1 border rounded-xl px-3 py-1.5 text-xs font-mono ${ui.input}`}
                    />
                    <button
                      onClick={() => copyToClipboard(settings?.shortcut_token, 'token')}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold key-press ${ui.cardSubtle} ${ui.textPrimary}`}
                    >
                      {copiedField === 'token' ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={handleRegenerateToken}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold key-press ${ui.cardSubtle} ${ui.textPrimary}`}
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
                  <span className={`text-[11px] font-medium ${ui.textMuted}`}>
                    {categories.length} Categories
                  </span>
                  <button
                    onClick={() => {
                      if (showCategoryModal) {
                        resetCategoryModal();
                      } else {
                        resetCategoryModal();
                        setShowCategoryModal(true);
                      }
                    }}
                    className={`text-xs px-3 py-1 rounded-full border font-semibold key-press ${ui.cardElevated} ${ui.textPrimary}`}
                  >
                    {showCategoryModal ? 'Close' : '+ Add Category'}
                  </button>
                </div>

                {showCategoryModal && (
                  <form
                    onSubmit={handleSaveCategory}
                    className={`p-3.5 rounded-2xl border space-y-2.5 shrink-0 animate-tab ${ui.cardElevated}`}
                  >
                    <span className={`text-[11px] font-semibold ${ui.textSecondary}`}>
                      {editingCatId ? 'Edit Category' : 'New Category'}
                    </span>
                    <input
                      type="text"
                      placeholder="Category Name"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${ui.input}`}
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newCatType}
                        onChange={(e) => setNewCatType(e.target.value)}
                        className={`border rounded-xl px-3 py-2 text-xs focus:outline-none ${ui.input}`}
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Monthly Limit (Optional)"
                        value={newCatBudget}
                        onChange={(e) => setNewCatBudget(e.target.value)}
                        className={`border rounded-xl px-3 py-2 text-xs focus:outline-none ${ui.input}`}
                      />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                      {CATEGORY_ICONS.map((ic) => (
                        <button
                          type="button"
                          key={ic}
                          onClick={() => setNewCatIcon(ic)}
                          className={`p-2 rounded-xl border shrink-0 text-sm key-press ${
                            newCatIcon === ic ? ui.pillActive : ui.pillIdle
                          }`}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className={`w-full py-2 rounded-xl text-xs font-semibold key-press ${ui.primaryBtnExpense}`}
                    >
                      {editingCatId ? 'Update Category' : 'Save Category'}
                    </button>
                  </form>
                )}

                <div className="flex-1 min-h-0 custom-scroll space-y-2 pr-0.5">
                  {categories.map((c) => {
                    const spent = currentMonthSpendByCat[c.id] || 0;
                    const budget = Number(c.monthly_budget) || 0;
                    const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-2xl border space-y-2 ${ui.card}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base shrink-0">{c.icon}</span>
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold truncate ${ui.textPrimary}`}>{c.name}</p>
                              <p className={`text-[10px] capitalize ${ui.textMuted}`}>
                                {c.type} {budget > 0 ? `· ${pct}% of limit` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 tabular-nums shrink-0">
                            {c.type === 'expense' && (
                              <span className={`text-xs font-semibold mr-1 ${ui.textPrimary}`}>
                                {currencySymbol}
                                {spent.toLocaleString('en-IN')}
                                {budget > 0 ? ` / ${currencySymbol}${budget.toLocaleString('en-IN')}` : ''}
                              </span>
                            )}
                            <button
                              onClick={() => openEditCategory(c)}
                              className={`px-2 py-1 rounded-lg border text-[10px] font-medium key-press ${ui.cardSubtle} ${ui.textSecondary}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(c.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold key-press ${
                                confirmDeleteId === c.id
                                  ? 'bg-rose-500 text-white'
                                  : `${ui.textMuted} hover:text-rose-500`
                              }`}
                            >
                              {confirmDeleteId === c.id ? 'Sure?' : '✕'}
                            </button>
                          </div>
                        </div>
                        {budget > 0 && c.type === 'expense' && (
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${ui.cardSubtle}`}>
                            <div
                              className={`h-full rounded-full transition-all duration-500 ios-spring ${
                                pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-blue-500'
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
            <div className={`pt-2 border-t flex items-center justify-between shrink-0 ${ui.divider}`}>
              <span className={`text-[11px] truncate max-w-[180px] ${ui.textMuted}`}>
                {session?.user?.email}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    fetchUserData(session.user.id);
                    showToast('Synced');
                  }}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium key-press ${ui.cardElevated} ${ui.textPrimary}`}
                >
                  Sync
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-semibold key-press"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* iOS PHONE APP LIQUID GLASS TAB BAR WITH SMOOTH GLIDE & OPTICAL MAGNIFICATION */}
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
          className={`pointer-events-auto relative grid grid-cols-4 items-center w-full max-w-[388px] h-[66px] p-[5px] rounded-full touch-none transition-transform duration-300 ios-spring ${
            lensBulge ? 'scale-[1.015]' : 'scale-100'
          } ${ui.islandBar}`}
        >
          {/* Optical Crystal Magnifying Bubble Lens */}
          <div
            className={`absolute top-[5px] bottom-[5px] left-[5px] w-[calc(25%-2.5px)] rounded-full pointer-events-none z-20 ${ui.islandLens}`}
            style={{
              transition:
                scrubProgress !== null
                  ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
                  : 'transform 480ms cubic-bezier(0.22, 1.18, 0.36, 1)',
              transform: `translate3d(${visualLensIndex * 100}%, 0, 0) scale3d(${
                lensBulge ? 1.22 : 1.03
              }, ${lensBulge ? 1.28 : 1.04}, 1)`
            }}
          />

          {NAV_TABS.map((item, idx) => {
            const active = activeTab === item.id;
            const distance = Math.abs(visualLensIndex - idx);
            const proximity = Math.max(0, 1 - distance);
            const baseScale = 0.9 + proximity * 0.22;
            const activeBoost = active && lensBulge ? 0.12 : 0;
            const totalScale = baseScale + activeBoost;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`relative z-30 h-full flex flex-col items-center justify-center gap-[3px] rounded-full transition-colors duration-200 ${
                  active ? ui.islandTextActive : ui.islandTextIdle
                }`}
              >
                <div
                  className="flex flex-col items-center justify-center gap-[3px]"
                  style={{
                    transition:
                      scrubProgress !== null
                        ? 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)'
                        : 'transform 440ms cubic-bezier(0.22, 1.18, 0.36, 1)',
                    transform: `scale3d(${totalScale.toFixed(3)}, ${totalScale.toFixed(
                      3
                    )}, 1) translate3d(0, ${active ? '-1px' : '0px'}, 0)`
                  }}
                >
                  <NavIcon id={item.id} active={active} />
                  <span
                    className={`text-[10.5px] leading-none tracking-[-0.015em] ${
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