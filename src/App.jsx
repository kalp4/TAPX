import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';

// Paste your iCloud Shortcut Share Link here once you create it on your iPhone (Share -> Copy iCloud Link)
const SHARED_ICLOUD_SHORTCUT_URL = '';

const WALLET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const WALLET_ICONS = ['💳', '💵', '🏦', '⚡', '🪙', '📱', '💎'];
const CATEGORY_ICONS = ['🍔', '☕', '🛒', '⛽', '🎬', '🛍️', '💊', '📚', '🏠', '💰', '🎁', '✈️'];

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
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState('');
  const [activeTab, setActiveTab] = useState('pad'); // 'pad' | 'wallets' | 'analytics' | 'shortcut'
  const [shortcutMode, setShortcutMode] = useState('Menu'); // 'Menu' | 'Fast'

  // User Database State
  const [settings, setSettings] = useState({ currency: '₹', shortcut_token: '' });
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Quick Pad Entry State
  const [entryType, setEntryType] = useState('expense'); // 'expense' | 'income' | 'transfer'
  const [amountStr, setAmountStr] = useState('0');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Auth session error:', err);
        if (mounted) setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession || null);
      if (!newSession) {
        setWallets([]);
        setCategories([]);
        setTransactions([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // 2. Fetch User Data when authenticated
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData(session.user.id);
    }
  }, [session?.user?.id]);

  const showToast = (msg) => {
    setToast(String(msg));
    setTimeout(() => setToast(''), 3000);
  };

  const fetchUserData = async (userId) => {
    setLoading(true);
    setDbError('');
    try {
      let { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsError) {
        throw settingsError;
      }

      if (!userSettings) {
        const { data: insertedSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert([{ user_id: userId, currency: '₹' }])
          .select()
          .maybeSingle();

        if (insertError) {
          throw insertError;
        }
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
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
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

      if (fetchedWallets.length > 0 && !selectedWalletId) {
        setSelectedWalletId(fetchedWallets[0].id);
        if (fetchedWallets.length > 1) {
          setToWalletId(fetchedWallets[1].id);
        }
      }

      const firstExpenseCat = fetchedCategories.find((c) => c.type === 'expense');
      if (firstExpenseCat && !selectedCategoryId) {
        setSelectedCategoryId(firstExpenseCat.id);
      }
    } catch (err) {
      console.error('Supabase fetch error:', err);
      setDbError(
        String(
          err?.message ||
            'Could not load tables. Make sure you ran the Step 1 SQL script in your Supabase SQL Editor.'
        )
      );
    } finally {
      setLoading(false);
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
    await supabase.auth.signOut();
  };

  // Optional 1-Tap Starter Template
  const handleSeedStarterPack = async () => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    setLoading(true);

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

    await supabase.from('wallets').insert(starterWallets);
    await supabase.from('categories').insert(starterCategories);
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

  // Submit Transaction (Expense / Income / Transfer)
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

    setSubmitting(true);
    const payload = {
      user_id: session.user.id,
      wallet_id: selectedWalletId,
      to_wallet_id: entryType === 'transfer' ? toWalletId : null,
      category_id: entryType === 'transfer' ? null : selectedCategoryId || null,
      type: entryType,
      amount: numericAmount,
      note: note.trim(),
      source: 'app'
    };

    const { error } = await supabase.from('transactions').insert([payload]);
    setSubmitting(false);

    if (error) {
      showToast(error.message);
      return;
    }

    setAmountStr('0');
    setNote('');
    await fetchUserData(session.user.id);
    showToast(`${settings?.currency || '₹'}${numericAmount} ${entryType} logged!`);
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id) => {
    await supabase.from('transactions').delete().eq('id', id);
    await fetchUserData(session.user.id);
    showToast('Transaction removed & balance restored');
  };

  // Create Custom Wallet
  const handleCreateWallet = async (e) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    const { error } = await supabase.from('wallets').insert([
      {
        user_id: session.user.id,
        name: newWalletName.trim(),
        type: newWalletType,
        balance: parseFloat(newWalletBalance) || 0,
        color: newWalletColor,
        icon: newWalletIcon
      }
    ]);

    if (!error) {
      setNewWalletName('');
      setNewWalletBalance('');
      setShowWalletModal(false);
      await fetchUserData(session.user.id);
      showToast('Wallet created!');
    } else {
      showToast(error.message);
    }
  };

  const handleDeleteWallet = async (id) => {
    await supabase.from('wallets').delete().eq('id', id);
    await fetchUserData(session.user.id);
    showToast('Wallet deleted');
  };

  // Create Custom Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const { error } = await supabase.from('categories').insert([
      {
        user_id: session.user.id,
        name: newCatName.trim(),
        type: newCatType,
        icon: newCatIcon,
        monthly_budget: newCatBudget ? parseFloat(newCatBudget) : null
      }
    ]);

    if (!error) {
      setNewCatName('');
      setNewCatBudget('');
      setShowCategoryModal(false);
      await fetchUserData(session.user.id);
      showToast('Category added!');
    } else {
      showToast(error.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    await supabase.from('categories').delete().eq('id', id);
    await fetchUserData(session.user.id);
    showToast('Category deleted');
  };

  // Regenerate Apple Shortcut Token
  const handleRegenerateToken = async () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const { data } = await supabase
      .from('user_settings')
      .update({ shortcut_token: randomHex })
      .eq('user_id', session.user.id)
      .select()
      .maybeSingle();

    if (data) {
      setSettings({
        currency: data.currency || '₹',
        shortcut_token: data.shortcut_token || ''
      });
      showToast('New Shortcut Token generated!');
    }
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

  const currencySymbol = settings?.currency || '₹';
  const personalFastUrl = `${window.location.origin}/api/shortcut?token=${settings?.shortcut_token || ''}&q=`;
  const personalMetaUrl = `${window.location.origin}/api/shortcut?token=${settings?.shortcut_token || ''}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3 p-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-2xl animate-pulse">
          ⚡
        </div>
        <div className="text-sm font-medium text-zinc-300">Syncing TAPX Wallets...</div>
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg">
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
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">TAPX Total Balance</p>
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
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-medium"
            title="Sign Out"
          >
            Sign Out
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
                    setActiveTab('analytics');
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
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 font-bold text-sm text-white shadow-lg shadow-blue-600/20 transition"
          >
            {submitting
              ? 'Updating Balance...'
              : `Log ${entryType === 'transfer' ? 'Transfer' : entryType === 'income' ? 'Income' : 'Expense'}`}
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
              transactions.slice(0, 25).map((tx) => {
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

      {/* TAB 3: CATEGORIES & MONTHLY BUDGETS */}
      {activeTab === 'analytics' && (
        <div className="p-4 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Categories & Monthly Budgets</h3>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="text-xs bg-blue-600 px-3 py-1.5 rounded-xl font-semibold"
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

          <div className="space-y-3">
            {categories.map((c) => {
              const spent = currentMonthSpendByCat[c.id] || 0;
              const budget = Number(c.monthly_budget) || 0;
              const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

              return (
                <div key={c.id} className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{c.icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{c.name}</p>
                        <p className="text-[11px] text-zinc-500 capitalize">{c.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
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
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
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

      {/* TAB 4: LOCK SCREEN BACK TAP SETUP */}
      {activeTab === 'shortcut' && (
        <div className="p-4 space-y-4">
          {/* Tappy-Style 1-Tap Launch Card */}
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

          {/* Copyable Ready-Made URLs (No Headers or POST needed) */}
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

          {/* Mode Toggle: 3-Block Fast Shortcut vs Menu Picker Shortcut */}
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
                  <li>
                    Tap <strong>Share → Copy iCloud Link</strong> and paste that link into <code className="text-blue-400">SHARED_ICLOUD_SHORTCUT_URL</code> in <code className="text-zinc-200">App.jsx</code> so anyone can install it in 1 tap!
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-zinc-400">
                  Shows interactive Lock Screen pop-up menus for your Wallets and Categories (uses GET URLs only—no POST or Headers needed):
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

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-900 max-w-md mx-auto px-6 py-2.5 flex justify-between items-center z-40">
        {[
          { id: 'pad', label: 'Quick Tap', icon: '⚡' },
          { id: 'wallets', label: 'Wallets', icon: '💳' },
          { id: 'analytics', label: 'Budgets', icon: '📊' },
          { id: 'shortcut', label: 'Back Tap', icon: '📱' }
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