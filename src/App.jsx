import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';

// Paste your iCloud Shortcut Share Link here once you create it on your iPhone (Share -> Copy iCloud Link)
const SHARED_ICLOUD_SHORTCUT_URL = '';

const WALLET_COLORS = ['#18181b', '#2563eb', '#059669', '#d97706', '#e11d48', '#7c3aed', '#0891b2'];
const WALLET_ICONS = ['💳', '💵', '🏦', '⚡', '🪙', '📱', '💎'];
const CATEGORY_ICONS = ['🍔', '🛒', '⛽', '🛍️', '🎬', '⚡', '💊', '☕', '📚', '🏠', '💰', '✈️'];
const CHART_COLORS = ['#2563eb', '#e11d48', '#d97706', '#059669', '#7c3aed', '#0891b2', '#db2777', '#4f46e5'];

const DEFAULT_CATEGORIES_TEMPLATE = [
  { name: 'Food & Drinks', type: 'expense', icon: '🍔', color: '#e11d48', monthly_budget: 3000 },
  { name: 'Groceries', type: 'expense', icon: '🛒', color: '#059669', monthly_budget: 2500 },
  { name: 'Transport', type: 'expense', icon: '⛽', color: '#d97706', monthly_budget: 1500 },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#7c3aed', monthly_budget: 2500 },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#db2777', monthly_budget: 1000 },
  { name: 'Bills & Recharge', type: 'expense', icon: '⚡', color: '#0891b2', monthly_budget: 1500 },
  { name: 'Health & Fitness', type: 'expense', icon: '💊', color: '#2563eb', monthly_budget: 1000 },
  { name: 'Income & Allowance', type: 'income', icon: '💰', color: '#059669', monthly_budget: null }
];

const CACHE_KEY = 'tapx_local_cache_v3';
const THEME_KEY = 'tapx_theme_pref';

// Clean Vector Icons for Navigation & UI
function NavIcon({ id, active }) {
  const strokeWidth = active ? '2.2' : '1.75';
  if (id === 'pad') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    );
  }
  if (id === 'wallets') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
      </svg>
    );
  }
  if (id === 'analytics') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
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

  // Sync theme color with iOS Status Bar / Notch so there is zero top blur or color seam
  useEffect(() => {
    localStorage.setItem(THEME_KEY, themePref);
    const bgHex = isDark ? '#09090b' : '#f4f4f6';
    document.documentElement.style.backgroundColor = bgHex;
    document.body.style.backgroundColor = bgHex;
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', bgHex);
  }, [themePref, isDark]);

  // Dynamic Theme Palette (Editorial Apple Wallet / Copilot Aesthetic)
  const ui = useMemo(() => {
    if (isDark) {
      return {
        bg: 'bg-[#09090b] text-zinc-100',
        card: 'bg-[#121215] border-[#222226]',
        cardSubtle: 'bg-[#16161a] border-[#242429]',
        input: 'bg-[#09090b] border-[#27272a] text-zinc-100 placeholder-zinc-500',
        pillIdle: 'bg-[#141418] border-[#242429] text-zinc-400 hover:text-zinc-200',
        pillActive: 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow-sm',
        numpadKey: 'bg-[#141418] hover:bg-[#1c1c21] active:bg-[#242429] border-[#222226] text-zinc-100',
        segmentedBg: 'bg-[#121215] border-[#222226]',
        segmentedActive: 'bg-[#242429] text-white shadow-sm',
        textPrimary: 'text-zinc-100',
        textSecondary: 'text-zinc-400',
        textMuted: 'text-zinc-500',
        island: 'bg-[#16161a]/95 border-white/[0.1] text-zinc-400 shadow-[0_12px_36px_rgba(0,0,0,0.75)]',
        islandActive: 'bg-zinc-100 text-zinc-950',
        primaryBtnExpense: 'bg-zinc-100 text-zinc-950 hover:bg-white',
        primaryBtnIncome: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400',
        primaryBtnTransfer: 'bg-blue-600 text-white hover:bg-blue-500',
        divider: 'border-[#1f1f23]'
      };
    }
    return {
      bg: 'bg-[#f4f4f6] text-zinc-900',
      card: 'bg-white border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]',
      cardSubtle: 'bg-zinc-100/80 border-zinc-200/70',
      input: 'bg-[#f4f4f6] border-zinc-300 text-zinc-900 placeholder-zinc-400',
      pillIdle: 'bg-white border-zinc-200/90 text-zinc-600 hover:text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
      pillActive: 'bg-zinc-900 border-zinc-900 text-white shadow-sm',
      numpadKey: 'bg-white hover:bg-zinc-50 active:bg-zinc-100 border-zinc-200/80 text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
      segmentedBg: 'bg-zinc-200/70 border-zinc-300/50',
      segmentedActive: 'bg-white text-zinc-900 shadow-sm',
      textPrimary: 'text-zinc-900',
      textSecondary: 'text-zinc-600',
      textMuted: 'text-zinc-400',
      island: 'bg-white/95 border-zinc-200/90 text-zinc-500 shadow-[0_10px_30px_rgba(0,0,0,0.1)]',
      islandActive: 'bg-zinc-900 text-white',
      primaryBtnExpense: 'bg-zinc-900 text-white hover:bg-zinc-800',
      primaryBtnIncome: 'bg-emerald-600 text-white hover:bg-emerald-500',
      primaryBtnTransfer: 'bg-blue-600 text-white hover:bg-blue-500',
      divider: 'border-zinc-200'
    };
  }, [isDark]);

  const [session, setSession] = useState(null);
  const [initialBoot, setInitialBoot] = useState(!cachedData);
  const [isSyncingBg, setIsSyncingBg] = useState(false);
  const [dbError, setDbError] = useState('');
  const seedingRef = useRef(false);

  // Navigation State: 'pad' | 'wallets' | 'analytics' | 'settings'
  const [activeTab, setActiveTab] = useState('pad');
  const [settingsSection, setSettingsSection] = useState('budgets'); // 'budgets' | 'shortcut' | 'appearance'
  const [shortcutMode, setShortcutMode] = useState('Fast'); // 'Fast' | 'Menu'
  const [analyticsRange, setAnalyticsRange] = useState('month'); // 'week' | 'month' | 'all'

  // User Database State
  const [settings, setSettings] = useState(
    cachedData?.settings || { currency: '₹', shortcut_token: '' }
  );
  const [wallets, setWallets] = useState(cachedData?.wallets || []);
  const [categories, setCategories] = useState(cachedData?.categories || []);
  const [transactions, setTransactions] = useState(cachedData?.transactions || []);

  // Quick Pad Entry State
  const [entryType, setEntryType] = useState('expense'); // 'expense' | 'income' | 'transfer'
  const [amountStr, setAmountStr] = useState('0');
  const [selectedWalletId, setSelectedWalletId] = useState(cachedData?.wallets?.[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(cachedData?.wallets?.[1]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    cachedData?.categories?.find((c) => c.type === 'expense')?.id || ''
  );
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');

  // New Wallet Modal State
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState('UPI / Wallet');
  const [newWalletBalance, setNewWalletBalance] = useState('');
  const [newWalletColor, setNewWalletColor] = useState(WALLET_COLORS[1]);
  const [newWalletIcon, setNewWalletIcon] = useState(WALLET_ICONS[0]);

  // New Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatIcon, setNewCatIcon] = useState(CATEGORY_ICONS[0]);
  const [newCatBudget, setNewCatBudget] = useState('');

  // Copy state for Shortcut setup
  const [copiedField, setCopiedField] = useState('');

  // Save state to localStorage automatically
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

  // 1. Listen to Auth State
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then((res) => {
        if (!mounted) return;
        const currentSession = res?.data?.session || null;
        setSession(currentSession);
        if (!currentSession) {
          setInitialBoot(false);
        }
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
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // 2. Silent Background Sync
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData(session.user.id);
    }
  }, [session?.user?.id]);

  const showToast = (msg) => {
    setToast(String(msg));
    setTimeout(() => setToast(''), 2200);
  };

  const fetchUserData = async (userId) => {
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

      const fetchedWallets = Array.isArray(walletsRes.data) ? walletsRes.data : [];
      let fetchedCategories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
      const fetchedTx = Array.isArray(txRes.data) ? txRes.data : [];

      // Auto-provision the 8 default categories if missing
      if (fetchedCategories.length < 7 && !seedingRef.current) {
        seedingRef.current = true;
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
  };

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

  const handleDigitPress = (digit) => {
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

  // Instant Optimistic Transaction Logging
  const handleLogTransaction = async () => {
    const numericAmount = parseFloat(amountStr);
    if (!numericAmount || numericAmount <= 0) {
      showToast('Enter an amount');
      return;
    }
    if (!selectedWalletId) {
      showToast('Add a wallet first');
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
        if (currentType === 'expense' && w.id === fromId) {
          return { ...w, balance: Number(w.balance || 0) - numericAmount };
        }
        if (currentType === 'income' && w.id === fromId) {
          return { ...w, balance: Number(w.balance || 0) + numericAmount };
        }
        if (currentType === 'transfer') {
          if (w.id === fromId) return { ...w, balance: Number(w.balance || 0) - numericAmount };
          if (w.id === destId) return { ...w, balance: Number(w.balance || 0) + numericAmount };
        }
        return w;
      })
    );

    setAmountStr('0');
    setNote('');
    showToast(`${settings?.currency || '₹'}${numericAmount.toLocaleString('en-IN')} logged`);

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

    if (insertedRow) {
      setTransactions((prev) => prev.map((tx) => (tx.id === tempId ? insertedRow : tx)));
    }
  };

  const handleDeleteTransaction = async (id) => {
    const targetTx = transactions.find((t) => t.id === id);
    if (!targetTx) return;

    const amt = Number(targetTx.amount) || 0;

    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setWallets((prev) =>
      prev.map((w) => {
        if (targetTx.type === 'expense' && w.id === targetTx.wallet_id) {
          return { ...w, balance: Number(w.balance || 0) + amt };
        }
        if (targetTx.type === 'income' && w.id === targetTx.wallet_id) {
          return { ...w, balance: Number(w.balance || 0) - amt };
        }
        if (targetTx.type === 'transfer') {
          if (w.id === targetTx.wallet_id) return { ...w, balance: Number(w.balance || 0) + amt };
          if (w.id === targetTx.to_wallet_id) return { ...w, balance: Number(w.balance || 0) - amt };
        }
        return w;
      })
    );
    showToast('Transaction removed');

    await supabase.from('transactions').delete().eq('id', id);
  };

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    const nameVal = newWalletName.trim();
    const balVal = parseFloat(newWalletBalance) || 0;
    const typeVal = newWalletType;
    const colorVal = newWalletColor;
    const iconVal = newWalletIcon;

    setNewWalletName('');
    setNewWalletBalance('');
    setShowWalletModal(false);

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
      showToast('Wallet added');
    } else if (error) {
      showToast(error.message);
    }
  };

  const handleDeleteWallet = async (id) => {
    setWallets((prev) => prev.filter((w) => w.id !== id));
    showToast('Wallet deleted');
    await supabase.from('wallets').delete().eq('id', id);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const nameVal = newCatName.trim();
    const typeVal = newCatType;
    const iconVal = newCatIcon;
    const budgetVal = newCatBudget ? parseFloat(newCatBudget) : null;

    setNewCatName('');
    setNewCatBudget('');
    setShowCategoryModal(false);

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
      showToast('Category added');
    } else if (error) {
      showToast(error.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast('Category deleted');
    await supabase.from('categories').delete().eq('id', id);
  };

  const handleRegenerateToken = async () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    setSettings((prev) => ({ ...prev, shortcut_token: randomHex }));
    showToast('Token regenerated');

    await supabase
      .from('user_settings')
      .update({ shortcut_token: randomHex })
      .eq('user_id', session.user.id);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text || '');
    setCopiedField(label);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleOneTapShortcut = () => {
    const fastUrl = `${window.location.origin}/api/shortcut?token=${settings?.shortcut_token || ''}&q=`;
    navigator.clipboard.writeText(fastUrl);
    showToast('URL copied · Opening Shortcuts');

    setTimeout(() => {
      if (SHARED_ICLOUD_SHORTCUT_URL) {
        window.location.href = SHARED_ICLOUD_SHORTCUT_URL;
      } else {
        window.location.href = 'shortcuts://create-shortcut';
      }
    }, 500);
  };

  const totalNetWorth = useMemo(
    () => wallets.reduce((acc, w) => acc + (Number(w?.balance) || 0), 0),
    [wallets]
  );

  const filteredCategories = useMemo(
    () => categories.filter((c) => c?.type === (entryType === 'income' ? 'income' : 'expense')),
    [categories, entryType]
  );

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
  const personalFastUrl = `${window.location.origin}/api/shortcut?token=${settings?.shortcut_token || ''}&q=`;
  const personalMetaUrl = `${window.location.origin}/api/shortcut?token=${settings?.shortcut_token || ''}`;

  const primaryButtonClass =
    entryType === 'income'
      ? ui.primaryBtnIncome
      : entryType === 'transfer'
      ? ui.primaryBtnTransfer
      : ui.primaryBtnExpense;

  if (initialBoot) {
    return (
      <div className={`h-full w-full ${ui.bg} flex items-center justify-center p-6 overflow-hidden`}>
        <div className="w-8 h-8 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // SIGN-IN SCREEN
  if (!session) {
    return (
      <div className={`h-full w-full ${ui.bg} flex flex-col justify-between p-7 max-w-md mx-auto overflow-hidden`}>
        <div className="mt-16 space-y-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${ui.card}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>iOS Lock Screen Expense Tracker</span>
          </div>
          <h1 className={`text-4xl font-bold tracking-tight ${ui.textPrimary}`}>TAPX</h1>
          <p className={`text-sm leading-relaxed ${ui.textSecondary}`}>
            Minimal multi-wallet balance tracking with instant Back Tap lock screen logging.
          </p>
        </div>

        <div className="space-y-4 mb-10">
          <button
            onClick={handleGoogleLogin}
            className={`w-full py-4 px-5 font-semibold text-sm rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition ${
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
          <p className={`text-xs text-center ${ui.textMuted}`}>
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
        paddingTop: 'max(env(safe-area-inset-top), 12px)'
      }}
    >
      {/* Minimal Floating Toast Pill */}
      {toast && (
        <div
          className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-semibold shadow-lg pointer-events-none transition-all ${
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

      {/* Top Header — Zero Blur, Clean Editorial Typography */}
      <header className="px-5 pt-1 pb-3 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-medium tracking-tight ${ui.textSecondary}`}>
              Total Balance
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSyncingBg ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
          </div>
          <h2 className={`text-2xl font-bold tracking-tight tabular-nums ${ui.textPrimary}`}>
            {currencySymbol}
            {Number(totalNetWorth || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>
        </div>

        <button
          onClick={() => {
            setActiveTab('wallets');
            setShowWalletModal(true);
          }}
          className={`px-3.5 py-2 rounded-full border text-xs font-semibold transition active:scale-95 ${ui.card} ${ui.textPrimary}`}
        >
          + Wallet
        </button>
      </header>

      {/* MAIN VIEWPORT (Reserved Bottom Space for Floating Island Bar) */}
      <main
        className="flex-1 min-h-0 flex flex-col overflow-hidden px-5"
        style={{
          paddingBottom: 'calc(max(env(safe-area-inset-bottom), 14px) + 74px)'
        }}
      >
        {/* TAB 1: KEYPAD */}
        {activeTab === 'pad' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            {/* Segmented Mode Control */}
            <div className={`grid grid-cols-3 p-1 rounded-xl border shrink-0 ${ui.segmentedBg}`}>
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
                  className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                    entryType === t.id ? ui.segmentedActive : ui.textSecondary
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Center Amount Display & Note */}
            <div className="text-center my-auto py-1 shrink-0">
              <div className={`text-5xl font-bold tracking-tight tabular-nums ${ui.textPrimary}`}>
                <span className={`text-2xl mr-1 font-medium ${ui.textMuted}`}>{currencySymbol}</span>
                {amountStr}
              </div>
              <input
                type="text"
                placeholder="Add note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`mt-2 bg-transparent text-center text-xs focus:outline-none w-3/4 mx-auto block ${ui.textSecondary} placeholder:${ui.textMuted}`}
              />
            </div>

            {/* Wallet & Category Selector Pills */}
            <div className="space-y-2.5 shrink-0">
              {/* Wallet Row */}
              <div className="space-y-1">
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-0.5 ${ui.textMuted}`}>
                  {entryType === 'transfer' ? 'From Wallet' : 'Account'}
                </span>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {wallets.length === 0 ? (
                    <button
                      onClick={() => {
                        setActiveTab('wallets');
                        setShowWalletModal(true);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 ${ui.pillIdle}`}
                    >
                      + Add your first wallet
                    </button>
                  ) : (
                    wallets.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setSelectedWalletId(w.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 border transition ${
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
                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shrink-0 border transition ${
                            toWalletId === w.id ? ui.pillActive : ui.pillIdle
                          }`}
                        >
                          <span>→ {w.name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Category Row */}
              {entryType !== 'transfer' && (
                <div className="space-y-1">
                  <span className={`text-[10px] uppercase tracking-wider font-semibold px-0.5 ${ui.textMuted}`}>
                    Category
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {filteredCategories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategoryId(c.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 border transition ${
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

            {/* Tactile Numpad */}
            <div className="grid grid-cols-3 gap-2 pt-2 shrink-0">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleDigitPress(key)}
                  className={`h-11 rounded-xl border text-lg font-semibold tabular-nums flex items-center justify-center active:scale-[0.97] transition ${ui.numpadKey}`}
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
              className={`w-full py-3.5 mt-2 rounded-xl font-semibold text-sm active:scale-[0.98] transition shrink-0 ${primaryButtonClass}`}
            >
              Save {entryType === 'transfer' ? 'Transfer' : entryType === 'income' ? 'Income' : 'Expense'}
            </button>
          </div>
        )}

        {/* TAB 2: WALLETS & ACTIVITY */}
        {activeTab === 'wallets' && (
          <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${ui.textSecondary}`}>
                Accounts ({wallets.length})
              </h3>
              <button
                onClick={() => setShowWalletModal((prev) => !prev)}
                className={`text-xs px-3 py-1 rounded-full border font-medium ${ui.card} ${ui.textPrimary}`}
              >
                {showWalletModal ? 'Cancel' : '+ New'}
              </button>
            </div>

            {showWalletModal && (
              <form
                onSubmit={handleCreateWallet}
                className={`p-3.5 rounded-2xl border space-y-2.5 shrink-0 ${ui.card}`}
              >
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
                    placeholder="Opening Balance"
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
                      className={`p-2 rounded-xl border text-sm ${
                        newWalletIcon === ic ? ui.pillActive : ui.pillIdle
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold ${ui.primaryBtnExpense}`}
                >
                  Create Account
                </button>
              </form>
            )}

            {/* Scrollable Wallets Container */}
            <div className="max-h-[34%] custom-scroll space-y-2 pr-0.5 shrink-0">
              {wallets.length === 0 ? (
                <div className={`p-4 rounded-2xl border text-center text-xs ${ui.card} ${ui.textMuted}`}>
                  No accounts added yet.
                </div>
              ) : (
                wallets.map((w) => (
                  <div
                    key={w.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${ui.card}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-base ${ui.cardSubtle}`}>
                        {w.icon}
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${ui.textPrimary}`}>{w.name}</p>
                        <p className={`text-[11px] ${ui.textMuted}`}>{w.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`font-semibold text-sm tabular-nums ${ui.textPrimary}`}>
                        {currencySymbol}
                        {Number(w.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => handleDeleteWallet(w.id)}
                        className={`p-1 text-xs ${ui.textMuted} hover:text-rose-500`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-1 shrink-0">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${ui.textSecondary}`}>
                Recent Activity
              </h3>
              <span className={`text-[11px] ${ui.textMuted}`}>{transactions.length} entries</span>
            </div>

            {/* Scrollable Transactions Container */}
            <div className="flex-1 min-h-0 custom-scroll space-y-1.5 pr-0.5">
              {transactions.length === 0 ? (
                <div className={`p-6 rounded-2xl border text-center text-xs ${ui.card} ${ui.textMuted}`}>
                  No transactions recorded yet.
                </div>
              ) : (
                transactions.slice(0, 50).map((tx) => {
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
                          {tx.type === 'transfer' ? '⇄' : c?.icon || '💸'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs font-semibold truncate ${ui.textPrimary}`}>
                              {tx.type === 'transfer'
                                ? `${w?.name || 'Account'} → ${toW?.name || 'Account'}`
                                : c?.name || tx.type}
                            </p>
                            {tx.source === 'shortcut' && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${ui.cardSubtle} ${ui.textSecondary}`}>
                                Back Tap
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] truncate ${ui.textMuted}`}>
                            {w?.name} {tx.note ? `· ${tx.note}` : ''}
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
                          className={`px-1 text-xs ${ui.textMuted} hover:text-rose-500`}
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
          <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
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
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      analyticsRange === tab.id ? ui.segmentedActive : ui.textSecondary
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
              {/* 7-Day Trend */}
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
                            className={`w-full rounded-md transition-all ${
                              day.isToday
                                ? isDark
                                  ? 'bg-zinc-100'
                                  : 'bg-zinc-900'
                                : day.amount > 0
                                ? 'bg-blue-500/70'
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

              {/* Category Breakdown */}
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
                          className="h-full first:rounded-l-full last:rounded-r-full"
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

              {/* Wallet Breakdown */}
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
                            className="h-full rounded-full bg-blue-500"
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

        {/* TAB 4: SETTINGS (Appearance + Budgets + Back Tap) */}
        {activeTab === 'settings' && (
          <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
            {/* Appearance Mode Selector (Light / Dark / System) */}
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
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      themePref === m.id ? ui.segmentedActive : ui.textSecondary
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Section Switcher: Budgets vs Back Tap */}
            <div className={`grid grid-cols-2 p-1 rounded-xl border shrink-0 ${ui.segmentedBg}`}>
              <button
                onClick={() => setSettingsSection('budgets')}
                className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                  settingsSection === 'budgets' ? ui.segmentedActive : ui.textSecondary
                }`}
              >
                Budgets & Categories
              </button>
              <button
                onClick={() => setSettingsSection('shortcut')}
                className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                  settingsSection === 'shortcut' ? ui.segmentedActive : ui.textSecondary
                }`}
              >
                Back Tap Setup
              </button>
            </div>

            {/* SUB-VIEW 1: BUDGETS & CATEGORIES */}
            {settingsSection === 'budgets' && (
              <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <span className={`text-[11px] font-medium ${ui.textMuted}`}>
                    {categories.length} Categories
                  </span>
                  <button
                    onClick={() => setShowCategoryModal((prev) => !prev)}
                    className={`text-xs px-3 py-1 rounded-full border font-semibold ${ui.card} ${ui.textPrimary}`}
                  >
                    {showCategoryModal ? 'Close' : '+ Add Category'}
                  </button>
                </div>

                {showCategoryModal && (
                  <form
                    onSubmit={handleCreateCategory}
                    className={`p-3.5 rounded-2xl border space-y-2.5 shrink-0 ${ui.card}`}
                  >
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
                          className={`p-2 rounded-xl border shrink-0 text-sm ${
                            newCatIcon === ic ? ui.pillActive : ui.pillIdle
                          }`}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className={`w-full py-2 rounded-xl text-xs font-semibold ${ui.primaryBtnExpense}`}
                    >
                      Save Category
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
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{c.icon}</span>
                            <div>
                              <p className={`text-xs font-semibold ${ui.textPrimary}`}>{c.name}</p>
                              <p className={`text-[10px] capitalize ${ui.textMuted}`}>
                                {c.type} {budget > 0 ? `· ${pct}% used` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 tabular-nums">
                            {c.type === 'expense' && (
                              <span className={`text-xs font-semibold ${ui.textPrimary}`}>
                                {currencySymbol}
                                {spent.toLocaleString('en-IN')}
                                {budget > 0 ? ` / ${currencySymbol}${budget.toLocaleString('en-IN')}` : ''}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteCategory(c.id)}
                              className={`px-1 text-xs ${ui.textMuted} hover:text-rose-500`}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        {budget > 0 && c.type === 'expense' && (
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${ui.cardSubtle}`}>
                            <div
                              className={`h-full rounded-full ${
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

            {/* SUB-VIEW 2: BACK TAP SHORTCUT */}
            {settingsSection === 'shortcut' && (
              <div className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5">
                <div className={`p-4 rounded-2xl border space-y-2.5 ${ui.card}`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-xs font-semibold ${ui.textPrimary}`}>iOS Lock Screen Bridge</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ui.cardSubtle} ${ui.textSecondary}`}>
                      Back Tap
                    </span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${ui.textSecondary}`}>
                    Copies your personal logging URL and launches Apple Shortcuts.
                  </p>
                  <button
                    onClick={handleOneTapShortcut}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-xs active:scale-[0.98] transition ${ui.primaryBtnExpense}`}
                  >
                    Copy Personal URL & Open Shortcuts
                  </button>
                </div>

                <div className={`p-4 rounded-2xl border space-y-3 ${ui.card}`}>
                  <div className="space-y-1">
                    <label className={`text-[10px] font-semibold uppercase ${ui.textMuted}`}>
                      Instant Logging URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={personalFastUrl}
                        className={`flex-1 border rounded-xl px-3 py-2 text-xs font-mono ${ui.input}`}
                      />
                      <button
                        onClick={() => copyToClipboard(personalFastUrl, 'fastUrl')}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 ${ui.primaryBtnExpense}`}
                      >
                        {copiedField === 'fastUrl' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] font-semibold uppercase ${ui.textMuted}`}>
                      Shortcut Token
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={settings?.shortcut_token || ''}
                        className={`flex-1 border rounded-xl px-3 py-2 text-xs font-mono ${ui.input}`}
                      />
                      <button
                        onClick={() => copyToClipboard(settings?.shortcut_token, 'token')}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold ${ui.cardSubtle} ${ui.textPrimary}`}
                      >
                        {copiedField === 'token' ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={handleRegenerateToken}
                        className={`px-3 py-2 rounded-xl border text-xs font-semibold ${ui.cardSubtle} ${ui.textPrimary}`}
                        title="Regenerate Token"
                      >
                        ↻
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${ui.card}`}>
                  <div className={`grid grid-cols-2 p-0.5 rounded-xl border ${ui.segmentedBg}`}>
                    <button
                      onClick={() => setShortcutMode('Fast')}
                      className={`py-1 rounded-lg text-[11px] font-semibold transition ${
                        shortcutMode === 'Fast' ? ui.segmentedActive : ui.textSecondary
                      }`}
                    >
                      3-Step Quick Input
                    </button>
                    <button
                      onClick={() => setShortcutMode('Menu')}
                      className={`py-1 rounded-lg text-[11px] font-semibold transition ${
                        shortcutMode === 'Menu' ? ui.segmentedActive : ui.textSecondary
                      }`}
                    >
                      Menu Picker
                    </button>
                  </div>

                  {shortcutMode === 'Fast' ? (
                    <ol className={`list-decimal list-inside space-y-1.5 text-[11px] ${ui.textSecondary}`}>
                      <li>Add <strong>Ask for Input</strong> (Prompt: <em>Amount Spent?</em>).</li>
                      <li>Add <strong>Get Contents of URL</strong>: paste your Instant Logging URL and attach <strong>Provided Input</strong> after <code>&amp;q=</code>.</li>
                      <li>Add <strong>Show Notification</strong> set to <strong>Contents of URL</strong>.</li>
                    </ol>
                  ) : (
                    <ol className={`list-decimal list-inside space-y-1.5 text-[11px] ${ui.textSecondary}`}>
                      <li>Add <strong>Get Contents of URL</strong>: <code className="break-all">{personalMetaUrl}</code></li>
                      <li>Add <strong>Get Dictionary Value</strong> (<code>wallets</code>) → <strong>Choose from List</strong>.</li>
                      <li>Add <strong>Get Dictionary Value</strong> (<code>categories</code>) → <strong>Choose from List</strong>.</li>
                      <li>Add <strong>Ask for Input</strong> (Number).</li>
                      <li>Add <strong>Get Contents of URL</strong>: <code className="break-all">{personalMetaUrl}&amp;amount=[Input]&amp;wallet=[Wallet]&amp;category=[Category]</code></li>
                      <li>Add <strong>Show Notification</strong> set to <strong>Contents of URL</strong>.</li>
                    </ol>
                  )}
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
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium ${ui.card} ${ui.textPrimary}`}
                >
                  Sync
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-semibold"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FLOATING iOS ISLAND NAVIGATION BAR */}
      <div
        className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none px-6"
        style={{
          bottom: 'max(env(safe-area-inset-bottom), 14px)'
        }}
      >
        <nav
          className={`pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-full border backdrop-blur-xl transition-colors ${ui.island}`}
        >
          {[
            { id: 'pad', label: 'Keypad' },
            { id: 'wallets', label: 'Accounts' },
            { id: 'analytics', label: 'Insights' },
            { id: 'settings', label: 'Settings' }
          ].map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                  active ? ui.islandActive : 'hover:opacity-80'
                }`}
              >
                <NavIcon id={item.id} active={active} />
                {active && <span>{item.label}</span>}
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