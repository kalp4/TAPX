import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';

// Paste your iCloud Shortcut Share Link here once you create it on your iPhone (Share -> Copy iCloud Link)
const SHARED_ICLOUD_SHORTCUT_URL = '';

const WALLET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const WALLET_ICONS = ['💳', '💵', '🏦', '⚡', '🪙', '📱', '💎'];
const CATEGORY_ICONS = ['🍔', '☕', '🛒', '⛽', '🎬', '🛍️', '💊', '📚', '🏠', '💰', '🎁', '✈️'];
const CHART_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

const CACHE_KEY = 'tapx_local_cache_v1';

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
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-2xl">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-white">Something went wrong</h2>
          <p className="text-xs text-red-300 bg-red-950/50 border border-red-500/30 p-3 rounded-xl font-mono break-all">
            {this.state.errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
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
  // Load cached state immediately so the app feels instant
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

  // Navigation State: 'pad' | 'wallets' | 'analytics' | 'settings'
  const [activeTab, setActiveTab] = useState('pad');
  // Settings Sub-Section: 'budgets' | 'shortcut'
  const [settingsSection, setSettingsSection] = useState('budgets');
  const [shortcutMode, setShortcutMode] = useState('Fast'); // 'Fast' | 'Menu'
  const [analyticsRange, setAnalyticsRange] = useState('month'); // 'week' | 'month' | 'all'

  // User Database State (Hydrated from local cache if available)
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
    setTimeout(() => setToast(''), 2500);
  };

  // Silent background sync — NEVER blocks the UI or flashes a loading screen
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
      const fetchedCategories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
      const fetchedTx = Array.isArray(txRes.data) ? txRes.data : [];

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

  // Optional 1-Tap Starter Template (Silent / Smooth)
  const handleSeedStarterPack = async () => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    showToast('Adding starter wallets & categories...');

    const starterWallets = [
      { user_id: uid, name: 'FamPay', type: 'UPI / Wallet', balance: 0, color: '#f59e0b', icon: '⚡' },
      { user_id: uid, name: 'Cash', type: 'Cash', balance: 0, color: '#10b981', icon: '💵' },
      { user_id: uid, name: 'Bank Account', type: 'Bank', balance: 0, color: '#3b82f6', icon: '🏦' }
    ];

    const starterCategories = [
      { user_id: uid, name: 'Food & Drinks', type: 'expense', icon: '🍔', color: '#ef4444', monthly_budget: 3000 },
      { user_id: uid, name: 'Transport', type: 'expense', icon: '⛽', color: '#f59e0b', monthly_budget: 1500 },
      { user_id: uid, name: 'Shopping', type: 'expense', icon: '🛍️', color: '#8b5cf6', monthly_budget: 2500 },
      { user_id: uid, name: 'Subscriptions', type: 'expense', icon: '🎬', color: '#ec4899', monthly_budget: 500 },
      { user_id: uid, name: 'Allowance / Income', type: 'income', icon: '💰', color: '#10b981', monthly_budget: null }
    ];

    await Promise.all([
      supabase.from('wallets').insert(starterWallets),
      supabase.from('categories').insert(starterCategories)
    ]);
    await fetchUserData(uid);
    showToast('Starter Wallets & Categories Added!');
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

    // 1. Instant Optimistic UI Update (0ms)
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

    // 2. Quiet Background Sync with Supabase
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

  // Optimistic Delete Transaction (0ms UI response)
  const handleDeleteTransaction = async (id) => {
    const targetTx = transactions.find((t) => t.id === id);
    if (!targetTx) return;

    const amt = Number(targetTx.amount) || 0;

    // 1. Instant UI removal & balance restoration
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

    // 2. Background DB delete
    await supabase.from('transactions').delete().eq('id', id);
  };

  // Create Custom Wallet (Instant UI update)
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

  // Create Custom Category (Instant UI update)
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

  // Current Month Spending per Category (for Monthly Budgets)
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
          color: wObj?.color || '#3b82f6',
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

  // Only shown on the very first cold boot before cache exists
  if (initialBoot) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3 p-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-2xl animate-pulse">
          ⚡
        </div>
      </div>
    );
  }

  // GOOGLE SIGN-IN SCREEN
  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-between p-6 max-w-md mx-auto">
        <div className="mt-16 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl">
            ⚡
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">TAPX</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Instant iOS Lock Screen Back Tap logging paired with full multi-wallet balance management (Cash, Bank, FamPay, and more). 100% free and customizable.
          </p>
        </div>

        <div className="space-y-4 mb-10">
          <button
            onClick={handleGoogleLogin}
            className="w-full py-4 px-5 bg-white text-zinc-950 font-semibold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition shadow-lg"
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
          <p className="text-xs text-center text-zinc-500">
            Install to your iPhone Home Screen via Safari Share → Add to Home Screen
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col max-w-md mx-auto pb-24">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      {/* Database Error Banner */}
      {dbError && (
        <div className="m-4 p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
          <span className="text-base">⚠️</span>
          <div>
            <p className="font-bold">Supabase Database Error</p>
            <p className="text-red-300 mt-0.5">{dbError}</p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              TAPX Total Balance
            </p>
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                isSyncingBg ? 'bg-blue-400 animate-pulse' : 'bg-emerald-500/80'
              }`}
              title={isSyncingBg ? 'Syncing in background...' : 'Synced'}
            />
          </div>
          <h2 className="text-xl font-bold text-white">
            {currencySymbol}
            {Number(totalNetWorth || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {wallets.length === 0 && (
            <button
              onClick={handleSeedStarterPack}
              className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium"
            >
              <span>✨</span> Starter Setup
            </button>
          )}
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-xl border transition ${
              activeTab === 'settings'
                ? 'bg-zinc-800 border-blue-500/50 text-blue-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* TAB 1: TAPPY-STYLE QUICK KEYPAD */}
      {activeTab === 'pad' && (
        <div className="flex-1 flex flex-col justify-between px-4 pt-3 space-y-3">
          {/* Type Switcher (Expense / Income / Transfer) */}
          <div className="grid grid-cols-3 bg-zinc-900 p-1 rounded-2xl">
            {['expense', 'income', 'transfer'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setEntryType(t);
                  const firstMatch = categories.find((c) => c.type === (t === 'income' ? 'income' : 'expense'));
                  if (firstMatch) setSelectedCategoryId(firstMatch.id);
                }}
                className={`py-2 text-xs font-semibold capitalize rounded-xl transition ${
                  entryType === t ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Big Amount Display + Note Input */}
          <div className="text-center py-2">
            <div className="text-5xl font-extrabold tracking-tight text-white">
              <span className="text-2xl text-zinc-500 mr-1">{currencySymbol}</span>
              {amountStr}
            </div>
            <input
              type="text"
              placeholder="Add a quick note (optional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 bg-transparent text-center text-xs text-zinc-400 placeholder-zinc-600 focus:outline-none w-full"
            />
          </div>

          {/* Wallet Selector Pills */}
          <div className="space-y-1.5">
            <p className="text-[11px] text-zinc-500 font-medium px-1">
              {entryType === 'transfer' ? 'From Wallet → To Wallet' : 'Select Wallet'}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {wallets.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWalletId(w.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 border transition ${
                    selectedWalletId === w.id
                      ? 'bg-zinc-800 border-blue-500 text-white'
                      : 'bg-zinc-900/70 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span>{w.icon}</span>
                  <span>{w.name}</span>
                  <span className="text-[10px] text-zinc-400">
                    ({currencySymbol}
                    {Number(w.balance || 0).toLocaleString('en-IN')})
                  </span>
                </button>
              ))}
              <button
                onClick={() => {
                  setActiveTab('wallets');
                  setShowWalletModal(true);
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900 border border-dashed border-zinc-700 text-zinc-400 shrink-0 flex items-center gap-1"
              >
                + Wallet
              </button>
            </div>

            {/* Destination Wallet for Transfers */}
            {entryType === 'transfer' && wallets.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pt-1 pb-1 no-scrollbar">
                {wallets
                  .filter((w) => w.id !== selectedWalletId)
                  .map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setToWalletId(w.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 border transition ${
                        toWalletId === w.id
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span>⇄ To {w.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Category Selector Pills (Hidden for Transfers) */}
          {entryType !== 'transfer' && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-zinc-500 font-medium px-1">Category</p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {filteredCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategoryId(c.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 border transition ${
                      selectedCategoryId === c.id
                        ? 'bg-zinc-800 border-blue-500 text-white'
                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setSettingsSection('budgets');
                    setShowCategoryModal(true);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900 border border-dashed border-zinc-700 text-zinc-400 shrink-0 flex items-center gap-1"
                >
                  + Category
                </button>
              </div>
            </div>
          )}

          {/* Fast Numpad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map((key) => (
              <button
                key={key}
                onClick={() => handleDigitPress(key)}
                className="h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-lg font-semibold flex items-center justify-center transition select-none"
              >
                {key === 'DEL' ? '⌫' : key}
              </button>
            ))}
          </div>

          {/* Primary Log Action Button */}
          <button
            onClick={handleLogTransaction}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 font-bold text-sm text-white shadow-lg shadow-blue-600/20 transition"
          >
            Log {entryType === 'transfer' ? 'Transfer' : entryType === 'income' ? 'Income' : 'Expense'}
          </button>
        </div>
      )}

      {/* TAB 2: WALLETS & RECENT TRANSACTIONS */}
      {activeTab === 'wallets' && (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Your Wallets & Accounts</h3>
            <button
              onClick={() => setShowWalletModal(true)}
              className="text-xs bg-blue-600 px-3 py-1.5 rounded-xl font-semibold"
            >
              + Add Wallet
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {wallets.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${w.color || '#3b82f6'}22`, border: `1px solid ${w.color || '#3b82f6'}55` }}
                  >
                    {w.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">{w.name}</p>
                    <p className="text-xs text-zinc-500">{w.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-base">
                    {currencySymbol}
                    {Number(w.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={() => handleDeleteWallet(w.id)}
                    className="text-zinc-500 hover:text-red-400 px-2 py-1 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Wallet Modal */}
          {showWalletModal && (
            <form
              onSubmit={handleCreateWallet}
              className="p-4 rounded-2xl bg-zinc-900 border border-zinc-700 space-y-3"
            >
              <h4 className="text-sm font-bold">New Custom Wallet</h4>
              <input
                type="text"
                placeholder="Wallet Name (e.g. FamPay, Cash, HDFC)"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newWalletType}
                  onChange={(e) => setNewWalletType(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
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
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex gap-2">
                {WALLET_ICONS.map((ic) => (
                  <button
                    type="button"
                    key={ic}
                    onClick={() => setNewWalletIcon(ic)}
                    className={`p-2 rounded-lg border ${
                      newWalletIcon === ic ? 'border-blue-500 bg-zinc-800' : 'border-zinc-800'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWalletModal(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-xs font-semibold"
                >
                  Save Wallet
                </button>
              </div>
            </form>
          )}

          {/* Recent Transactions History */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-300">Recent Transactions</h3>
            {transactions.length === 0 ? (
              <p className="text-xs text-zinc-500">No transactions logged yet.</p>
            ) : (
              transactions.slice(0, 30).map((tx) => {
                const w = wallets.find((item) => item.id === tx.wallet_id);
                const toW = wallets.find((item) => item.id === tx.to_wallet_id);
                const c = categories.find((item) => item.id === tx.category_id);
                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-base">
                        {tx.type === 'transfer' ? '🔄' : c?.icon || '💸'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {tx.type === 'transfer'
                            ? `${w?.name || 'Wallet'} → ${toW?.name || 'Wallet'}`
                            : c?.name || tx.type}
                          {tx.source === 'shortcut' && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                              Back Tap
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {w?.name} {tx.note ? `• ${tx.note}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          tx.type === 'income'
                            ? 'text-emerald-400'
                            : tx.type === 'transfer'
                            ? 'text-blue-400'
                            : 'text-red-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {currencySymbol}
                        {Number(tx.amount || 0).toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="text-zinc-500 hover:text-red-400 px-1.5 text-xs"
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

      {/* TAB 3: PURE SPENDING ANALYTICS & INSIGHTS */}
      {activeTab === 'analytics' && (
        <div className="p-4 space-y-5">
          {/* Timeframe Filter Switcher */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Spending Analytics</h3>
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              {[
                { id: 'week', label: '7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAnalyticsRange(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    analyticsRange === tab.id ? 'bg-blue-600 text-white shadow' : 'text-zinc-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4-Card KPI Summary Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
              <p className="text-[11px] text-zinc-400 font-medium">Total Spent</p>
              <p className="text-lg font-extrabold text-red-400 mt-0.5">
                {currencySymbol}
                {analyticsData.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {analyticsData.expenseCount} expense{analyticsData.expenseCount === 1 ? '' : 's'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
              <p className="text-[11px] text-zinc-400 font-medium">Daily Average</p>
              <p className="text-lg font-extrabold text-blue-400 mt-0.5">
                {currencySymbol}
                {analyticsData.dailyAvgExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Per day spend rate</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
              <p className="text-[11px] text-zinc-400 font-medium">Total Income</p>
              <p className="text-lg font-extrabold text-emerald-400 mt-0.5">
                +{currencySymbol}
                {analyticsData.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Net: {analyticsData.netFlow >= 0 ? '+' : ''}
                {currencySymbol}
                {analyticsData.netFlow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
              <p className="text-[11px] text-zinc-400 font-medium">Back Tap Logs</p>
              <p className="text-lg font-extrabold text-purple-400 mt-0.5">
                {analyticsData.shortcutPct}%
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {analyticsData.shortcutCount} of {analyticsData.totalTxCount} via Lock Screen
              </p>
            </div>
          </div>

          {/* 7-Day Daily Spending Bar Chart */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-200">Last 7 Days Spending Trend</h4>
              <span className="text-[10px] text-zinc-500">Daily Expenses</span>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-32 pt-4">
              {analyticsData.last7Days.map((day, idx) => {
                const heightPct =
                  day.amount > 0
                    ? Math.max(12, Math.round((day.amount / analyticsData.maxDaySpend) * 100))
                    : 4;
                return (
                  <div key={idx} className="flex flex-col items-center justify-end h-full gap-1.5">
                    <span className="text-[9px] text-zinc-400 font-mono truncate max-w-full">
                      {day.amount > 0
                        ? day.amount >= 1000
                          ? `${(day.amount / 1000).toFixed(1)}k`
                          : Math.round(day.amount)
                        : ''}
                    </span>
                    <div className="w-full bg-zinc-950 rounded-xl h-20 flex items-end p-0.5 border border-zinc-800/60">
                      <div
                        className={`w-full rounded-lg transition-all ${
                          day.isToday
                            ? 'bg-blue-500 shadow-sm shadow-blue-500/50'
                            : day.amount > 0
                            ? 'bg-zinc-600'
                            : 'bg-zinc-800/40'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-semibold ${
                        day.isToday ? 'text-blue-400' : 'text-zinc-500'
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
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-200">Where Your Money Goes</h4>
              <span className="text-[10px] text-zinc-500">By Category</span>
            </div>

            {analyticsData.categoryBreakdown.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">No expenses logged in this period yet.</p>
            ) : (
              <>
                <div className="w-full h-3 rounded-full bg-zinc-950 overflow-hidden flex gap-0.5 p-0.5 border border-zinc-800">
                  {analyticsData.categoryBreakdown.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        width: `${Math.max(item.pct, 3)}%`,
                        backgroundColor: item.color
                      }}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      title={`${item.name}: ${item.pct}%`}
                    />
                  ))}
                </div>

                <div className="space-y-2.5 pt-1">
                  {analyticsData.categoryBreakdown.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.icon}</span>
                        <span className="font-medium text-zinc-200">{item.name}</span>
                        <span className="text-[10px] text-zinc-500">({item.count})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {currencySymbol}
                          {item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono w-10 text-right">
                          {item.pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Spending by Wallet */}
          {analyticsData.walletBreakdown.length > 0 && (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-200">Spending by Wallet</h4>
                <span className="text-[10px] text-zinc-500">Payment Mode Split</span>
              </div>
              <div className="space-y-2.5">
                {analyticsData.walletBreakdown.map((w) => (
                  <div key={w.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-300">
                        {w.icon} {w.name}
                      </span>
                      <span className="font-semibold text-zinc-200">
                        {currencySymbol}
                        {w.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                        <span className="text-zinc-500 text-[10px]">({w.pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
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
      )}

      {/* TAB 4: SETTINGS (HOUSES BUDGETS & CATEGORIES + BACK TAP SETUP + ACCOUNT) */}
      {activeTab === 'settings' && (
        <div className="p-4 space-y-5">
          {/* Top Settings Navigation Buttons: Budgets vs. Back Tap */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white px-1">Settings & Configuration</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setSettingsSection('budgets')}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-2 ${
                  settingsSection === 'budgets'
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="text-xl">🎯</span>
                <div>
                  <p className="text-xs font-bold text-white">Budgets & Categories</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    {categories.length} active categories
                  </p>
                </div>
              </button>

              <button
                onClick={() => setSettingsSection('shortcut')}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-2 ${
                  settingsSection === 'shortcut'
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="text-xl">📱</span>
                <div>
                  <p className="text-xs font-bold text-white">Back Tap Shortcut</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    iOS Lock Screen bridge
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* SUB-VIEW 1: BUDGETS & CATEGORIES */}
          {settingsSection === 'budgets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Categories & Monthly Budgets
                </h4>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="text-xs bg-blue-600 px-3 py-1.5 rounded-xl font-semibold text-white"
                >
                  + New Category
                </button>
              </div>

              {showCategoryModal && (
                <form
                  onSubmit={handleCreateCategory}
                  className="p-4 rounded-2xl bg-zinc-900 border border-zinc-700 space-y-3"
                >
                  <h4 className="text-sm font-bold">Add Custom Category</h4>
                  <input
                    type="text"
                    placeholder="Category Name (e.g. Snacks, Gym, Salary)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newCatType}
                      onChange={(e) => setNewCatType(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Monthly Budget (Optional)"
                      value={newCatBudget}
                      onChange={(e) => setNewCatBudget(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar">
                    {CATEGORY_ICONS.map((ic) => (
                      <button
                        type="button"
                        key={ic}
                        onClick={() => setNewCatIcon(ic)}
                        className={`p-2 rounded-lg border shrink-0 ${
                          newCatIcon === ic ? 'border-blue-500 bg-zinc-800' : 'border-zinc-800'
                        }`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(false)}
                      className="flex-1 py-2 rounded-xl bg-zinc-800 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-blue-600 text-xs font-semibold"
                    >
                      Save Category
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2.5">
                {categories.map((c) => {
                  const spent = currentMonthSpendByCat[c.id] || 0;
                  const budget = Number(c.monthly_budget) || 0;
                  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

                  return (
                    <div key={c.id} className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{c.icon}</span>
                          <div>
                            <p className="text-xs font-semibold text-white">{c.name}</p>
                            <p className="text-[10px] text-zinc-500 capitalize">
                              {c.type} {budget > 0 ? `• ${pct}% of monthly budget` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          {c.type === 'expense' && (
                            <span className="text-xs font-semibold text-zinc-300">
                              {currencySymbol}
                              {spent.toLocaleString('en-IN')}
                              {budget > 0 ? ` / ${currencySymbol}${budget.toLocaleString('en-IN')}` : ''}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteCategory(c.id)}
                            className="text-zinc-500 hover:text-red-400 px-1.5 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {budget > 0 && c.type === 'expense' && (
                        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
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

          {/* SUB-VIEW 2: LOCK SCREEN BACK TAP SETUP */}
          {settingsSection === 'shortcut' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/20 to-zinc-900 border border-blue-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">⚡ 1-Tap iOS Shortcut Setup</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                    Lock Screen Ready
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Tap below to automatically copy your personal logging URL and launch the Apple Shortcuts app.
                </p>
                <button
                  onClick={handleOneTapShortcut}
                  className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition"
                >
                  <span>⚡ Copy Personal URL & Open Shortcuts</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 font-semibold">
                    1-Line Instant Logging URL (No Headers / No JSON Needed)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={personalFastUrl}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300"
                    />
                    <button
                      onClick={() => copyToClipboard(personalFastUrl, 'fastUrl')}
                      className="px-3 py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white shrink-0"
                    >
                      {copiedField === 'fastUrl' ? 'Copied!' : 'Copy URL'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-semibold">Your Personal Token</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={settings?.shortcut_token || ''}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-400"
                    />
                    <button
                      onClick={() => copyToClipboard(settings?.shortcut_token, 'token')}
                      className="px-3 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-200"
                    >
                      {copiedField === 'token' ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={handleRegenerateToken}
                      className="px-3 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-200"
                      title="Regenerate Token"
                    >
                      ↻
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 text-xs text-zinc-300">
                <div className="grid grid-cols-2 bg-zinc-950 p-1 rounded-xl">
                  <button
                    onClick={() => setShortcutMode('Fast')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                      shortcutMode === 'Fast' ? 'bg-zinc-800 text-white' : 'text-zinc-500'
                    }`}
                  >
                    ⚡ 3-Block Setup (15s)
                  </button>
                  <button
                    onClick={() => setShortcutMode('Menu')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                      shortcutMode === 'Menu' ? 'bg-zinc-800 text-white' : 'text-zinc-500'
                    }`}
                  >
                    📋 Menu Picker Setup
                  </button>
                </div>

                {shortcutMode === 'Fast' ? (
                  <div className="space-y-2">
                    <p className="text-zinc-400">
                      Takes <strong>15 seconds</strong> to build once—no POST, no Headers, and no Dictionary blocks:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-zinc-300">
                      <li>
                        Add <strong>Ask for Input</strong> (Prompt: <em>"Enter Amount (e.g. 150 or 150 fampay food)"</em>).
                      </li>
                      <li>
                        Add <strong>Get Contents of URL</strong>: paste your <strong>1-Line Instant Logging URL</strong> above and tap <strong>Provided Input</strong> right at the end of the URL after <code className="text-blue-400">&amp;q=</code>.
                      </li>
                      <li>
                        Add <strong>Show Notification</strong> and set its text to <strong>Contents of URL</strong>.
                      </li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-zinc-400">
                      Shows interactive Lock Screen pop-up menus for your Wallets and Categories:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-zinc-300">
                      <li>
                        Add <strong>Get Contents of URL</strong> set to <code className="text-blue-400 break-all">{personalMetaUrl}</code>
                      </li>
                      <li>
                        Add <strong>Get Dictionary Value</strong> (<code className="text-zinc-200">wallets</code>) → <strong>Choose from List</strong>.
                      </li>
                      <li>
                        Add <strong>Get Dictionary Value</strong> (<code className="text-zinc-200">categories</code> from first URL) → <strong>Choose from List</strong>.
                      </li>
                      <li>
                        Add <strong>Ask for Input</strong> (Type: <em>Number</em>, Prompt: <em>"Amount?"</em>).
                      </li>
                      <li>
                        Add <strong>Get Contents of URL</strong> set to:<br />
                        <code className="text-blue-400 break-all">
                          {personalMetaUrl}&amp;amount=[Provided Input]&amp;wallet=[Chosen Item 1]&amp;category=[Chosen Item 2]
                        </code>
                      </li>
                      <li>
                        Add <strong>Show Notification</strong> set directly to <strong>Contents of URL</strong>.
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account & Sync Footer inside Settings */}
          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between">
            <div className="text-xs text-zinc-500 truncate max-w-[200px]">
              {session?.user?.email}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchUserData(session.user.id);
                  showToast('Synced with cloud');
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium"
              >
                ↻ Sync Now
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-900 max-w-md mx-auto px-6 py-2.5 flex justify-between items-center z-40">
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
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                active ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
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