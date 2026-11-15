import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';

// Paste your iCloud Shortcut Share Link here once you create it on your iPhone (Share -> Copy iCloud Link)
const SHARED_ICLOUD_SHORTCUT_URL = '';

const WALLET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4'];
const WALLET_ICONS = ['💳', '💵', '🏦', '⚡', '🪙', '📱', '💎'];
const CATEGORY_ICONS = ['🍔', '🛒', '⛽', '🛍️', '🎬', '⚡', '💊', '☕', '📚', '🏠', '💰', '✈️'];
const CHART_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6'];

const DEFAULT_CATEGORIES_TEMPLATE = [
  { name: 'Food & Drinks', type: 'expense', icon: '🍔', color: '#f43f5e', monthly_budget: 3000 },
  { name: 'Groceries', type: 'expense', icon: '🛒', color: '#10b981', monthly_budget: 2500 },
  { name: 'Transport', type: 'expense', icon: '⛽', color: '#f59e0b', monthly_budget: 1500 },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#8b5cf6', monthly_budget: 2500 },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#ec4899', monthly_budget: 1000 },
  { name: 'Bills & Recharge', type: 'expense', icon: '⚡', color: '#06b6d4', monthly_budget: 1500 },
  { name: 'Health & Fitness', type: 'expense', icon: '💊', color: '#14b8a6', monthly_budget: 1000 },
  { name: 'Income & Allowance', type: 'income', icon: '💰', color: '#10b981', monthly_budget: null }
];

const CACHE_KEY = 'tapx_local_cache_v2';

// Built-in Error Boundary so the screen never turns black silently
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
        <div className="h-[100dvh] w-full bg-[#0b0f19] text-slate-100 flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center space-y-4 overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-2xl">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          <p className="text-xs text-rose-300 bg-rose-950/50 border border-rose-500/30 p-3 rounded-xl font-mono break-all">
            {this.state.errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
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

  const [session, setSession] = useState(null);
  const [initialBoot, setInitialBoot] = useState(!cachedData);
  const [isSyncingBg, setIsSyncingBg] = useState(false);
  const [dbError, setDbError] = useState('');
  const seedingRef = useRef(false);

  // Navigation State: 'pad' | 'wallets' | 'analytics' | 'settings'
  const [activeTab, setActiveTab] = useState('pad');
  const [settingsSection, setSettingsSection] = useState('budgets'); // 'budgets' | 'shortcut'
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
  const [newWalletColor, setNewWalletColor] = useState(WALLET_COLORS[0]);
  const [newWalletIcon, setNewWalletIcon] = useState(WALLET_ICONS[0]);

  // New Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatIcon, setNewCatIcon] = useState(CATEGORY_ICONS[0]);
  const [newCatBudget, setNewCatBudget] = useState('');

  // Copy state for Shortcut setup
  const [copiedField, setCopiedField] = useState('');

  // Save state to localStorage automatically whenever it changes
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

  // 1. Listen to Auth State safely
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
      .catch((err) => {
        console.error('Auth session error:', err);
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

  // 2. Fetch User Data silently in background when authenticated
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData(session.user.id);
    }
  }, [session?.user?.id]);

  const showToast = (msg) => {
    setToast(String(msg));
    setTimeout(() => setToast(''), 2400);
  };

  // Silent background sync + Auto-seeding 8 default categories if empty
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

      // Ensure all 8 default categories exist automatically
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
      console.error('Supabase fetch error:', err);
      setDbError(
        String(
          err?.message ||
            'Could not load tables. Make sure you ran the Step 1 SQL script in your Supabase SQL Editor.'
        )
      );
    } finally {
      setInitialBoot(false);
      setIsSyncingBg(false);
    }
  };

  // Sign in with Google
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

  // Numpad Handler
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
      if (prev.length >= 9) return prev;
      return prev + digit;
    });
  };

  // Optimistic Instant Transaction Logging (0ms UI response)
  const handleLogTransaction = async () => {
    const numericAmount = parseFloat(amountStr);
    if (!numericAmount || numericAmount <= 0) {
      showToast('Enter an amount greater than 0');
      return;
    }
    if (!selectedWalletId) {
      showToast('Create or select a wallet first');
      return;
    }
    if (entryType === 'transfer' && (!toWalletId || toWalletId === selectedWalletId)) {
      showToast('Select two different wallets for transfer');
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
    showToast(`${settings?.currency || '₹'}${numericAmount} ${currentType} logged!`);

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

  // Optimistic Delete Transaction
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
    showToast('Transaction removed & balance restored');

    await supabase.from('transactions').delete().eq('id', id);
  };

  // Create Custom Wallet
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
      showToast('Wallet created!');
    } else if (error) {
      showToast(error.message);
    }
  };

  // Optimistic Delete Wallet
  const handleDeleteWallet = async (id) => {
    setWallets((prev) => prev.filter((w) => w.id !== id));
    showToast('Wallet deleted');
    await supabase.from('wallets').delete().eq('id', id);
  };

  // Create Custom Category
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
      showToast('Category added!');
    } else if (error) {
      showToast(error.message);
    }
  };

  // Optimistic Delete Category
  const handleDeleteCategory = async (id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast('Category deleted');
    await supabase.from('categories').delete().eq('id', id);
  };

  // Regenerate Apple Shortcut Token
  const handleRegenerateToken = async () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    setSettings((prev) => ({ ...prev, shortcut_token: randomHex }));
    showToast('New Shortcut Token generated!');

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

  // 1-Tap Tappy-Style Shortcut Launcher
  const handleOneTapShortcut = () => {
    const fastUrl = `${window.location.origin}/api/shortcut?token=${settings?.shortcut_token || ''}&q=`;
    navigator.clipboard.writeText(fastUrl);
    showToast('Personal URL copied! Opening Shortcuts...');

    setTimeout(() => {
      if (SHARED_ICLOUD_SHORTCUT_URL) {
        window.location.href = SHARED_ICLOUD_SHORTCUT_URL;
      } else {
        window.location.href = 'shortcuts://create-shortcut';
      }
    }, 600);
  };

  // Computed Totals
  const totalNetWorth = useMemo(
    () => wallets.reduce((acc, w) => acc + (Number(w?.balance) || 0), 0),
    [wallets]
  );

  const filteredCategories = useMemo(
    () => categories.filter((c) => c?.type === (entryType === 'income' ? 'income' : 'expense')),
    [categories, entryType]
  );

  // Current Month Spending per Category
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

  // Comprehensive Analytics Calculations
  const analyticsData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const filteredTx = transactions.filter((tx) => {
      if (!tx?.created_at) return false;
      const d = new Date(tx.created_at);
      if (analyticsRange === 'week') {
        return d >= sevenDaysAgo;
      }
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
          color: wObj?.color || '#6366f1',
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

  // Dynamic Lively Accent Colors based on Entry Type
  const activeAccent =
    entryType === 'income'
      ? {
          button: 'from-emerald-500 to-teal-500 shadow-emerald-500/25',
          pill: 'bg-emerald-500/20 border-emerald-400 text-emerald-100',
          amountText: 'text-emerald-400'
        }
      : entryType === 'transfer'
      ? {
          button: 'from-cyan-500 to-blue-600 shadow-cyan-500/25',
          pill: 'bg-cyan-500/20 border-cyan-400 text-cyan-100',
          amountText: 'text-cyan-400'
        }
      : {
          button: 'from-indigo-500 via-violet-500 to-fuchsia-500 shadow-indigo-500/25',
          pill: 'bg-indigo-500/20 border-indigo-400 text-indigo-100',
          amountText: 'text-white'
        };

  if (initialBoot) {
    return (
      <div className="h-[100dvh] w-full bg-[#0b0f19] flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30 animate-pulse">
          ⚡
        </div>
      </div>
    );
  }

  // GOOGLE SIGN-IN SCREEN
  if (!session) {
    return (
      <div className="h-[100dvh] w-full bg-[#0b0f19] relative flex flex-col justify-between p-6 max-w-md mx-auto overflow-hidden">
        {/* Lively Aurora Glows */}
        <div className="absolute -top-24 -left-20 w-72 h-72 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-24 w-72 h-72 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="mt-16 space-y-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl shadow-xl shadow-indigo-500/30">
            ⚡
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">TAPX</h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Instant iOS Lock Screen Back Tap logging paired with multi-wallet balance management and live spending analytics.
          </p>
        </div>

        <div className="space-y-4 mb-8 relative z-10">
          <button
            onClick={handleGoogleLogin}
            className="w-full py-4 px-5 bg-white text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition shadow-xl"
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
            Continue with Google
          </button>
          <p className="text-xs text-center text-slate-400">
            Install to your iPhone Home Screen via Safari Share → Add to Home Screen
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] w-full bg-[#0b0f19] text-slate-100 flex flex-col max-w-md mx-auto overflow-hidden relative select-none"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 10px)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Ambient Lively Background Aurora Blobs */}
      <div className="absolute -top-28 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-28 w-72 h-72 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl pointer-events-none">
          {toast}
        </div>
      )}

      {/* Database Error Banner */}
      {dbError && (
        <div className="mx-4 mt-2 p-2.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2 shrink-0 z-20">
          <span className="text-sm">⚠️</span>
          <div className="truncate">
            <span className="font-bold">DB Error: </span>
            <span className="text-rose-300">{dbError}</span>
          </div>
        </div>
      )}

      {/* Top Header — Solid & Clean (No Notch Blur, No Starter Pack Button) */}
      <header className="px-4 pt-1 pb-2.5 shrink-0 relative z-10">
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600/25 via-violet-600/20 to-fuchsia-600/20 border border-indigo-400/25 flex items-center justify-between shadow-lg shadow-indigo-950/40">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold">
                Total Net Balance
              </p>
              <span
                className={`w-2 h-2 rounded-full transition-colors ${
                  isSyncingBg
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-400 shadow-sm shadow-emerald-400/80'
                }`}
                title={isSyncingBg ? 'Syncing...' : 'Synced'}
              />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
              {currencySymbol}
              {Number(totalNetWorth || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('wallets');
                setShowWalletModal(true);
              }}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold transition active:scale-95"
            >
              + Wallet
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT VIEWPORT (Strictly Non-Scrolling Outer Container) */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative z-10">
        {/* TAB 1: TAPPY-STYLE QUICK KEYPAD (100% Locked, Zero Vertical Scroll) */}
        {activeTab === 'pad' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between px-4 pb-2 overflow-hidden">
            {/* Vibrant Type Switcher */}
            <div className="grid grid-cols-3 bg-slate-900/90 border border-white/10 p-1 rounded-2xl shrink-0">
              {[
                { id: 'expense', label: '💸 Expense', activeCls: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md' },
                { id: 'income', label: '💰 Income', activeCls: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md' },
                { id: 'transfer', label: '⇄ Transfer', activeCls: 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md' }
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
                  className={`py-2 text-xs font-bold rounded-xl transition ${
                    entryType === t.id ? t.activeCls : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Big Amount Display + Note Input */}
            <div className="text-center my-auto py-1 shrink-0">
              <div className={`text-5xl font-black tracking-tight ${activeAccent.amountText}`}>
                <span className="text-2xl text-slate-400 mr-1 font-bold">{currencySymbol}</span>
                {amountStr}
              </div>
              <input
                type="text"
                placeholder="Tap to add a quick note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-1.5 text-center text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 w-4/5 mx-auto block"
              />
            </div>

            {/* Horizontal Scrollable Wallet & Category Pills */}
            <div className="space-y-2 shrink-0">
              {/* Wallet Selector Pills */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    {entryType === 'transfer' ? 'From Wallet → To Wallet' : 'Wallet'}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                  {wallets.length === 0 ? (
                    <button
                      onClick={() => {
                        setActiveTab('wallets');
                        setShowWalletModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 shrink-0"
                    >
                      + Create Your First Wallet
                    </button>
                  ) : (
                    wallets.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setSelectedWalletId(w.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 border transition ${
                          selectedWalletId === w.id
                            ? activeAccent.pill
                            : 'bg-slate-900/80 border-white/10 text-slate-300'
                        }`}
                      >
                        <span>{w.icon}</span>
                        <span>{w.name}</span>
                        <span className="text-[10px] opacity-75">
                          ({currencySymbol}
                          {Number(w.balance || 0).toLocaleString('en-IN')})
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Destination Wallet for Transfers */}
                {entryType === 'transfer' && wallets.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pt-1 no-scrollbar">
                    {wallets
                      .filter((w) => w.id !== selectedWalletId)
                      .map((w) => (
                        <button
                          key={w.id}
                          onClick={() => setToWalletId(w.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 border transition ${
                            toWalletId === w.id
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                              : 'bg-slate-900/60 border-white/10 text-slate-400'
                          }`}
                        >
                          <span>⇄ To {w.name}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Category Selector Pills (8 Default Categories + Custom) */}
              {entryType !== 'transfer' && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-1">
                    Category
                  </span>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                    {filteredCategories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategoryId(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 border transition ${
                          selectedCategoryId === c.id
                            ? activeAccent.pill
                            : 'bg-slate-900/80 border-white/10 text-slate-300'
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

            {/* Tactile Glass Numpad */}
            <div className="grid grid-cols-3 gap-2 pt-2 shrink-0">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleDigitPress(key)}
                  className="h-11 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] active:scale-95 text-lg font-bold text-white flex items-center justify-center transition"
                >
                  {key === 'DEL' ? '⌫' : key}
                </button>
              ))}
            </div>

            {/* Primary Log Action Button */}
            <button
              onClick={handleLogTransaction}
              className={`w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r ${activeAccent.button} active:scale-95 font-extrabold text-sm text-white shadow-lg transition shrink-0`}
            >
              Log {entryType === 'transfer' ? 'Transfer' : entryType === 'income' ? 'Income' : 'Expense'}
            </button>
          </div>
        )}

        {/* TAB 2: WALLETS & RECENT TRANSACTIONS (Independent Scrollable Boxes Only) */}
        {activeTab === 'wallets' && (
          <div className="flex-1 min-h-0 flex flex-col px-4 pb-2 gap-3 overflow-hidden">
            {/* Wallets Header */}
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                Your Wallets ({wallets.length})
              </h3>
              <button
                onClick={() => setShowWalletModal((prev) => !prev)}
                className="text-xs bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-3 py-1.5 rounded-xl font-bold shadow"
              >
                {showWalletModal ? 'Close' : '+ New Wallet'}
              </button>
            </div>

            {/* Add Wallet Modal */}
            {showWalletModal && (
              <form
                onSubmit={handleCreateWallet}
                className="p-3.5 rounded-2xl bg-slate-900/95 border border-indigo-500/40 space-y-2.5 shrink-0 shadow-xl"
              >
                <input
                  type="text"
                  placeholder="Wallet Name (e.g. FamPay, Cash, HDFC)"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newWalletType}
                    onChange={(e) => setNewWalletType(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
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
                    placeholder="Starting Balance"
                    value={newWalletBalance}
                    onChange={(e) => setNewWalletBalance(e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="flex gap-1.5 justify-between">
                  {WALLET_ICONS.map((ic) => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setNewWalletIcon(ic)}
                      className={`p-2 rounded-xl border text-sm ${
                        newWalletIcon === ic
                          ? 'border-indigo-400 bg-indigo-500/20'
                          : 'border-white/10 bg-slate-950'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-xs font-bold text-white"
                >
                  Save Wallet
                </button>
              </form>
            )}

            {/* Scrollable Wallets List (Only scrolls if many wallets are added) */}
            <div className="max-h-[32%] custom-scroll space-y-2 pr-0.5 shrink-0">
              {wallets.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-dashed border-white/15 text-center text-xs text-slate-400">
                  No wallets yet. Tap <strong>+ New Wallet</strong> above to add Cash, UPI, or Bank.
                </div>
              ) : (
                wallets.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner"
                        style={{
                          backgroundColor: `${w.color || '#6366f1'}25`,
                          border: `1px solid ${w.color || '#6366f1'}66`
                        }}
                      >
                        {w.icon}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{w.name}</p>
                        <p className="text-[11px] text-slate-400">{w.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-sm text-white">
                        {currencySymbol}
                        {Number(w.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => handleDeleteWallet(w.id)}
                        className="text-slate-500 hover:text-rose-400 px-1.5 py-1 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent Transactions Header */}
            <div className="flex items-center justify-between pt-1 shrink-0">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                Recent Activity ({transactions.length})
              </h3>
            </div>

            {/* Scrollable Transactions Container (Scrolls independently) */}
            <div className="flex-1 min-h-0 custom-scroll space-y-2 pr-0.5">
              {transactions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 text-center text-xs text-slate-500">
                  No transactions logged yet.
                </div>
              ) : (
                transactions.slice(0, 50).map((tx) => {
                  const w = wallets.find((item) => item.id === tx.wallet_id);
                  const toW = wallets.find((item) => item.id === tx.to_wallet_id);
                  const c = categories.find((item) => item.id === tx.category_id);
                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center text-base shrink-0">
                          {tx.type === 'transfer' ? '🔄' : c?.icon || '💸'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-white truncate">
                              {tx.type === 'transfer'
                                ? `${w?.name || 'Wallet'} → ${toW?.name || 'Wallet'}`
                                : c?.name || tx.type}
                            </p>
                            {tx.source === 'shortcut' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-fuchsia-500/20 border border-fuchsia-400/30 text-fuchsia-300 font-bold shrink-0">
                                Back Tap
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {w?.name} {tx.note ? `• ${tx.note}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-extrabold ${
                            tx.type === 'income'
                              ? 'text-emerald-400'
                              : tx.type === 'transfer'
                              ? 'text-cyan-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          {currencySymbol}
                          {Number(tx.amount || 0).toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="text-slate-500 hover:text-rose-400 px-1 text-xs"
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

        {/* TAB 3: ANALYTICS & INSIGHTS (Fixed KPIs + Inner Scrollable Breakdown) */}
        {activeTab === 'analytics' && (
          <div className="flex-1 min-h-0 flex flex-col px-4 pb-2 gap-3 overflow-hidden">
            {/* Fixed Timeframe Filter Switcher */}
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                Spending Insights
              </h3>
              <div className="flex bg-slate-900/90 p-1 rounded-xl border border-white/10">
                {[
                  { id: 'week', label: '7 Days' },
                  { id: 'month', label: 'Month' },
                  { id: 'all', label: 'All' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAnalyticsRange(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      analyticsRange === tab.id
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow'
                        : 'text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fixed KPI Summary Row */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25">
                <p className="text-[10px] text-rose-300 font-bold uppercase">Spent</p>
                <p className="text-sm font-black text-white mt-0.5 truncate">
                  {currencySymbol}
                  {analyticsData.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
                <p className="text-[10px] text-indigo-300 font-bold uppercase">Daily Avg</p>
                <p className="text-sm font-black text-white mt-0.5 truncate">
                  {currencySymbol}
                  {analyticsData.dailyAvgExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
                <p className="text-[10px] text-emerald-300 font-bold uppercase">Income</p>
                <p className="text-sm font-black text-white mt-0.5 truncate">
                  +{currencySymbol}
                  {analyticsData.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Inner Scrollable Charts & Category Breakdown */}
            <div className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5">
              {/* 7-Day Daily Spending Bar Chart */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">Last 7 Days Trend</h4>
                  <span className="text-[10px] text-indigo-300 font-semibold">
                    {analyticsData.shortcutPct}% via Back Tap
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2 items-end h-28 pt-3">
                  {analyticsData.last7Days.map((day, idx) => {
                    const heightPct =
                      day.amount > 0
                        ? Math.max(14, Math.round((day.amount / analyticsData.maxDaySpend) * 100))
                        : 6;
                    return (
                      <div key={idx} className="flex flex-col items-center justify-end h-full gap-1">
                        <span className="text-[9px] text-slate-300 font-mono truncate max-w-full">
                          {day.amount > 0
                            ? day.amount >= 1000
                              ? `${(day.amount / 1000).toFixed(1)}k`
                              : Math.round(day.amount)
                            : ''}
                        </span>
                        <div className="w-full bg-slate-950/80 rounded-xl h-16 flex items-end p-0.5 border border-white/10">
                          <div
                            className={`w-full rounded-lg transition-all ${
                              day.isToday
                                ? 'bg-gradient-to-t from-indigo-500 to-fuchsia-400 shadow-sm shadow-indigo-500/50'
                                : day.amount > 0
                                ? 'bg-indigo-500/50'
                                : 'bg-white/5'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-bold ${
                            day.isToday ? 'text-indigo-300' : 'text-slate-500'
                          }`}
                        >
                          {day.isToday ? 'Today' : day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category Distribution Breakdown */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">Category Breakdown</h4>
                  <span className="text-[10px] text-slate-400">Share of Spend</span>
                </div>

                {analyticsData.categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">No expenses logged in this period yet.</p>
                ) : (
                  <>
                    <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden flex gap-0.5 p-0.5 border border-white/10">
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
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.icon}</span>
                            <span className="font-semibold text-slate-100 truncate">{item.name}</span>
                            <span className="text-[10px] text-slate-500">({item.count})</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-white">
                              {currencySymbol}
                              {item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono w-10 text-right">
                              {item.pct}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Wallet Split */}
              {analyticsData.walletBreakdown.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                  <h4 className="text-xs font-bold text-white">Wallet Split</h4>
                  <div className="space-y-2">
                    {analyticsData.walletBreakdown.map((w) => (
                      <div key={w.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">
                            {w.icon} {w.name}
                          </span>
                          <span className="font-bold text-white">
                            {currencySymbol}
                            {w.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                            <span className="text-slate-400 text-[10px]">({w.pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${w.pct}%`, backgroundColor: w.color }}
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

        {/* TAB 4: SETTINGS (Fixed Switcher + Inner Scrollable List for Categories or Back Tap) */}
        {activeTab === 'settings' && (
          <div className="flex-1 min-h-0 flex flex-col px-4 pb-2 gap-3 overflow-hidden">
            {/* Fixed Top Sub-Navigation Buttons: Budgets vs. Back Tap */}
            <div className="grid grid-cols-2 gap-2.5 shrink-0">
              <button
                onClick={() => setSettingsSection('budgets')}
                className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                  settingsSection === 'budgets'
                    ? 'bg-gradient-to-br from-indigo-500/25 to-fuchsia-500/20 border-indigo-400 text-white shadow'
                    : 'bg-white/[0.04] border-white/10 text-slate-400'
                }`}
              >
                <span className="text-xl">🎯</span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-white truncate">Budgets</p>
                  <p className="text-[10px] text-slate-300 truncate">{categories.length} Categories</p>
                </div>
              </button>

              <button
                onClick={() => setSettingsSection('shortcut')}
                className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                  settingsSection === 'shortcut'
                    ? 'bg-gradient-to-br from-indigo-500/25 to-fuchsia-500/20 border-indigo-400 text-white shadow'
                    : 'bg-white/[0.04] border-white/10 text-slate-400'
                }`}
              >
                <span className="text-xl">📱</span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-white truncate">Back Tap</p>
                  <p className="text-[10px] text-slate-300 truncate">iOS Lock Screen</p>
                </div>
              </button>
            </div>

            {/* SUB-VIEW 1: BUDGETS & CATEGORIES (Scrolls Only Inside Category List) */}
            {settingsSection === 'budgets' && (
              <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                    Categories & Monthly Budgets
                  </h4>
                  <button
                    onClick={() => setShowCategoryModal((prev) => !prev)}
                    className="text-xs bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1.5 rounded-xl font-bold text-white"
                  >
                    {showCategoryModal ? 'Close' : '+ Category'}
                  </button>
                </div>

                {showCategoryModal && (
                  <form
                    onSubmit={handleCreateCategory}
                    className="p-3.5 rounded-2xl bg-slate-900/95 border border-indigo-500/40 space-y-2.5 shrink-0"
                  >
                    <input
                      type="text"
                      placeholder="Category Name (e.g. Snacks, Gym, Salary)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newCatType}
                        onChange={(e) => setNewCatType(e.target.value)}
                        className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Monthly Budget (Optional)"
                        value={newCatBudget}
                        onChange={(e) => setNewCatBudget(e.target.value)}
                        className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                      {CATEGORY_ICONS.map((ic) => (
                        <button
                          type="button"
                          key={ic}
                          onClick={() => setNewCatIcon(ic)}
                          className={`p-2 rounded-xl border shrink-0 text-sm ${
                            newCatIcon === ic
                              ? 'border-indigo-400 bg-indigo-500/20'
                              : 'border-white/10 bg-slate-950'
                          }`}
                        >
                          {ic}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-xs font-bold text-white"
                    >
                      Save Category
                    </button>
                  </form>
                )}

                {/* Scrollable Categories Container */}
                <div className="flex-1 min-h-0 custom-scroll space-y-2 pr-0.5">
                  {categories.map((c) => {
                    const spent = currentMonthSpendByCat[c.id] || 0;
                    const budget = Number(c.monthly_budget) || 0;
                    const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

                    return (
                      <div
                        key={c.id}
                        className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{c.icon}</span>
                            <div>
                              <p className="text-xs font-bold text-white">{c.name}</p>
                              <p className="text-[10px] text-slate-400 capitalize">
                                {c.type} {budget > 0 ? `• ${pct}% used` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            {c.type === 'expense' && (
                              <span className="text-xs font-bold text-slate-200">
                                {currencySymbol}
                                {spent.toLocaleString('en-IN')}
                                {budget > 0 ? ` / ${currencySymbol}${budget.toLocaleString('en-IN')}` : ''}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteCategory(c.id)}
                              className="text-slate-500 hover:text-rose-400 px-1.5 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        {budget > 0 && c.type === 'expense' && (
                          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct >= 90
                                  ? 'bg-rose-500'
                                  : pct >= 70
                                  ? 'bg-amber-400'
                                  : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
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

            {/* SUB-VIEW 2: LOCK SCREEN BACK TAP SETUP (Scrolls Internally if Needed) */}
            {settingsSection === 'shortcut' && (
              <div className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-600/25 to-fuchsia-600/15 border border-indigo-400/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-white">⚡ 1-Tap iOS Shortcut Setup</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 font-bold">
                      Lock Screen Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Copies your personal logging URL and opens Apple Shortcuts immediately.
                  </p>
                  <button
                    onClick={handleOneTapShortcut}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 active:scale-95 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition"
                  >
                    <span>⚡ Copy Personal URL & Open Shortcuts</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">
                      1-Line Instant Logging URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={personalFastUrl}
                        className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-300"
                      />
                      <button
                        onClick={() => copyToClipboard(personalFastUrl, 'fastUrl')}
                        className="px-3 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white shrink-0"
                      >
                        {copiedField === 'fastUrl' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase">
                      Personal Token
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={settings?.shortcut_token || ''}
                        className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-400"
                      />
                      <button
                        onClick={() => copyToClipboard(settings?.shortcut_token, 'token')}
                        className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold text-slate-200"
                      >
                        {copiedField === 'token' ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={handleRegenerateToken}
                        className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold text-slate-200"
                        title="Regenerate Token"
                      >
                        ↻
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5 text-xs text-slate-300">
                  <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl">
                    <button
                      onClick={() => setShortcutMode('Fast')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        shortcutMode === 'Fast' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      ⚡ 3-Block Setup
                    </button>
                    <button
                      onClick={() => setShortcutMode('Menu')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        shortcutMode === 'Menu' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      📋 Menu Picker
                    </button>
                  </div>

                  {shortcutMode === 'Fast' ? (
                    <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
                      <li>
                        Add <strong>Ask for Input</strong> (Prompt: <em>"Amount Spent?"</em>).
                      </li>
                      <li>
                        Add <strong>Get Contents of URL</strong>: paste your <strong>1-Line Instant Logging URL</strong> and attach <strong>Provided Input</strong> after <code className="text-indigo-300">&amp;q=</code>.
                      </li>
                      <li>
                        Add <strong>Show Notification</strong> set to <strong>Contents of URL</strong>.
                      </li>
                    </ol>
                  ) : (
                    <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
                      <li>
                        Add <strong>Get Contents of URL</strong>: <code className="text-indigo-300 break-all">{personalMetaUrl}</code>
                      </li>
                      <li>
                        Add <strong>Get Dictionary Value</strong> (<code className="text-white">wallets</code>) → <strong>Choose from List</strong>.
                      </li>
                      <li>
                        Add <strong>Get Dictionary Value</strong> (<code className="text-white">categories</code>) → <strong>Choose from List</strong>.
                      </li>
                      <li>
                        Add <strong>Ask for Input</strong> (Type: <em>Number</em>).
                      </li>
                      <li>
                        Add <strong>Get Contents of URL</strong>: <code className="text-indigo-300 break-all">{personalMetaUrl}&amp;amount=[Input]&amp;wallet=[Wallet]&amp;category=[Category]</code>
                      </li>
                      <li>
                        Add <strong>Show Notification</strong> set to <strong>Contents of URL</strong>.
                      </li>
                    </ol>
                  )}
                </div>
              </div>
            )}

            {/* Fixed Account & Sync Footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                {session?.user?.email}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    fetchUserData(session.user.id);
                    showToast('Synced with cloud');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-slate-200 text-xs font-bold"
                >
                  ↻ Sync
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar (Docked Flex Child, Never Overlaps Content) */}
      <nav className="shrink-0 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 px-6 py-2 flex justify-between items-center z-30">
        {[
          { id: 'pad', label: 'Quick Tap', icon: '⚡' },
          { id: 'wallets', label: 'Wallets', icon: '💳' },
          { id: 'analytics', label: 'Analytics', icon: '📊' },
          { id: 'settings', label: 'Settings', icon: '⚙️' }
        ].map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3.5 rounded-2xl transition ${
                active
                  ? 'bg-gradient-to-r from-indigo-500/25 to-fuchsia-500/25 border border-indigo-400/40 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </nav>
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