import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
  SHARED_ICLOUD_SHORTCUT_URL,
  WALLET_COLORS,
  DEFAULT_WALLETS_TEMPLATE,
  DEFAULT_CATEGORIES_TEMPLATE,
  NAV_TABS,
  CACHE_KEY,
  THEME_KEY,
  SOUND_KEY,
  SAVED_ACCOUNTS_KEY,
  OFFLINE_QUEUE_KEY,
  getUiTheme
} from './constants';
import {
  getInitialSyncSession,
  hasOAuthParamsInUrl,
  parseShortcutCategoryTag,
  cleanCategoryString,
  findMatchingCategoryObj,
  formatDisplayAmount,
  formatDayGroupLabel,
  escapeCsvCell,
  computeAnalytics
} from './analytics';
import {
  setSoundEnabled,
  playKeyTap,
  playKeyDelete,
  playQuickChip,
  playTabSwitch,
  playSuccess,
  playDelete,
  playUndo,
  playError,
  playModalOpen,
  playCopy
} from './sounds';
import {
  TapxLogo,
  NavIcon,
  LoginScreen,
  WalletModal,
  CategoryModal,
  EditTransactionModal
} from './components/Modals';
import {
  KeypadTab,
  AccountsTab,
  InsightsTab,
  SettingsTab
} from './components/Tabs';

function getTodayDateString() {
  return new Date().toLocaleDateString('en-CA');
}

function buildIsoForLocalDate(dateStr, referenceIso = null) {
  const todayStr = getTodayDateString();
  if (!dateStr || (!referenceIso && dateStr === todayStr)) {
    return new Date().toISOString();
  }
  const refDate = referenceIso ? new Date(referenceIso) : new Date();
  const validRef = !isNaN(refDate.getTime()) ? refDate : new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  const combined = new Date(
    y,
    m - 1,
    d,
    validRef.getHours(),
    validRef.getMinutes(),
    validRef.getSeconds(),
    0
  );
  return combined.toISOString();
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
          <p className="text-xs text-[#F26B5B] bg-[#282825] border border-[#3A3934] p-3 rounded-2xl font-mono break-all shadow-[0_3px_0_#111110]">
            {this.state.errorMessage}
          </p>
          <button
            type="button"
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

  const [savedAccounts, setSavedAccounts] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

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

  const [themePref, setThemePref] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [privacyMode, setPrivacyMode] = useState(true);

  const handleTogglePrivacy = useCallback(() => {
    playQuickChip();
    setPrivacyMode((prev) => !prev);
  }, []);

  const [soundEnabled, setSoundEnabledState] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== 'off';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  const handleToggleSound = useCallback((enabled) => {
    setSoundEnabled(enabled);
    setSoundEnabledState(enabled);
    if (enabled) {
      playSuccess('save');
    }
  }, []);

  const [systemIsDark, setSystemIsDark] = useState(() =>
    window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const isDark = themePref === 'system' ? systemIsDark : themePref === 'dark';

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, themePref);
    } catch {}
    const bgHex = isDark ? '#1e1e1c' : '#EFE7DA';
    document.documentElement.style.backgroundColor = bgHex;
    document.body.style.backgroundColor = bgHex;
    const rootEl = document.getElementById('root');
    if (rootEl) rootEl.style.backgroundColor = bgHex;
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', bgHex);
  }, [themePref, isDark]);

  const ui = useMemo(() => getUiTheme(isDark), [isDark]);

  const [session, setSession] = useState(() => initialSyncSession);
  const [isAuthChecking, setIsAuthChecking] = useState(() => !initialSyncSession);
  const [isLoggingIn, setIsLoggingIn] = useState(() => hasOAuthParamsInUrl());
  const [isSyncingBg, setIsSyncingBg] = useState(false);
  const [dbError, setDbError] = useState('');
  const seedingRef = useRef(false);

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
  const [analyticsRange, setAnalyticsRange] = useState('week');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toLocaleDateString('en-CA');
  });
  const [customEndDate, setCustomEndDate] = useState(() => getTodayDateString());
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
        playTabSwitch();
        const prevIdx = NAV_TABS.findIndex((t) => t.id === prevTab);
        const nextIdx = NAV_TABS.findIndex((t) => t.id === nextTabId);
        setTabDirection(nextIdx >= prevIdx ? 'right' : 'left');
        return nextTabId;
      });
    },
    [triggerLensMagnification]
  );

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
      } catch {}
    }

    if (isScrubbingRef.current) {
      const clampedIndex = getClampedIndexFromClientX(e.clientX);
      setScrubProgress(clampedIndex);
      const nearestIdx = Math.round(clampedIndex);
      const targetTab = NAV_TABS[nearestIdx]?.id;
      if (targetTab && targetTab !== activeTab) {
        playTabSwitch();
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
    lensTimerRef.current = setTimeout(() => setLensBulge(false), 220);
  };

  const activeTabIndex = Math.max(0, NAV_TABS.findIndex((t) => t.id === activeTab));
  const visualLensIndex = scrubProgress !== null ? scrubProgress : activeTabIndex;
  const tabAnimClass = tabDirection === 'right' ? 'animate-tab-right' : 'animate-tab-left';

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
  const [entryDate, setEntryDate] = useState(() => getTodayDateString());
  const [selectedWalletId, setSelectedWalletId] = useState(cachedData?.wallets?.[0]?.id || '');
  const [toWalletId, setToWalletId] = useState(cachedData?.wallets?.[1]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    cachedData?.categories?.find((c) => c.type === 'expense')?.id || ''
  );
  const [note, setNote] = useState('');

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const [activityWalletFilter, setActivityWalletFilter] = useState('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');

  // Modal States
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState(null);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState('UPI / Wallet');
  const [newWalletBalance, setNewWalletBalance] = useState('');
  const [newWalletColor, setNewWalletColor] = useState(WALLET_COLORS[0]);
  const [newWalletIcon, setNewWalletIcon] = useState('💳');

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatIcon, setNewCatIcon] = useState('🍔');
  const [newCatBudget, setNewCatBudget] = useState('');

  const [editingTx, setEditingTx] = useState(null);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxDate, setEditTxDate] = useState('');
  const [editTxNote, setEditTxNote] = useState('');
  const [editTxWalletId, setEditTxWalletId] = useState('');
  const [editTxToWalletId, setEditTxToWalletId] = useState('');
  const [editTxCategoryId, setEditTxCategoryId] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    if (wallets.length > 1 && selectedWalletId === toWalletId) {
      const fallback = wallets.find((w) => w.id !== selectedWalletId);
      if (fallback) setToWalletId(fallback.id);
    }
  }, [selectedWalletId, toWalletId, wallets]);

  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
    } catch {}
  }, [offlineQueue]);

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
      } catch {}
      return next;
    });
  }, [session?.user]);

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
    } catch {}
  }, [
    session?.user?.id,
    session?.user?.email,
    session?.user?.user_metadata,
    settings,
    wallets,
    categories,
    transactions
  ]);

  const showToast = useCallback((message, onUndo = null, duration = 2200) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: String(message), onUndo });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, onUndo ? 4000 : duration);
  }, []);

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
        playSuccess('save');
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
          supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(500)
        ]);

        if (walletsRes.error) throw walletsRes.error;
        if (categoriesRes.error) throw categoriesRes.error;
        if (txRes.error) throw txRes.error;

        let fetchedWallets = Array.isArray(walletsRes.data) ? walletsRes.data : [];
        let fetchedCategories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
        let fetchedTx = Array.isArray(txRes.data) ? txRes.data : [];

        if (!seedingRef.current) {
          seedingRef.current = true;

          if (fetchedWallets.length === 0 && fetchedTx.length === 0) {
            const starterWallets = DEFAULT_WALLETS_TEMPLATE.map((w) => ({ ...w, user_id: userId }));
            const { data: seededWallets } = await supabase.from('wallets').insert(starterWallets).select();
            if (Array.isArray(seededWallets) && seededWallets.length > 0) {
              fetchedWallets = seededWallets;
            }
          }

          if (fetchedCategories.length < 7) {
            const existingNames = new Set(fetchedCategories.map((c) => c.name.toLowerCase()));
            const missingDefaults = DEFAULT_CATEGORIES_TEMPLATE.filter(
              (item) => !existingNames.has(item.name.toLowerCase())
            ).map((item) => ({ ...item, user_id: userId }));

            if (missingDefaults.length > 0) {
              const { data: seededCats } = await supabase.from('categories').insert(missingDefaults).select();
              if (Array.isArray(seededCats)) {
                fetchedCategories = [...fetchedCategories, ...seededCats];
              }
            }
          }
        }

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
          } else if (tx.source === 'shortcut' && tx.category_id === defaultFirstCatId && cleanNote) {
            const noteCatMatch = findMatchingCategoryObj(cleanNote, fetchedCategories);
            if (noteCatMatch && noteCatMatch.id !== defaultFirstCatId) {
              const strippedNote =
                cleanCategoryString(cleanNote) === cleanCategoryString(noteCatMatch.name) ? '' : cleanNote;
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

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (session?.user?.id) fetchUserData(session.user.id);
    };
    const handleOffline = () => setIsOnline(false);

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
    if (session?.user?.id) fetchUserData(session.user.id);
  }, [session?.user?.id, fetchUserData]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') fetchUserData(session.user.id);
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [session?.user?.id, fetchUserData]);

  const handleGoogleLogin = async (loginHintEmail = '') => {
    playQuickChip();
    setIsLoggingIn(true);
    const queryParams = {
      access_type: 'offline',
      ...(loginHintEmail ? { login_hint: loginHintEmail } : { prompt: 'select_account' })
    };

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams }
    });

    if (error) {
      setIsLoggingIn(false);
      playError();
      showToast(error.message || 'Sign-in failed');
    }
  };

  const handleRemoveSavedAccount = (emailToRemove, e) => {
    e.stopPropagation();
    playDelete();
    setSavedAccounts((prev) => {
      const next = prev.filter((a) => a.email.toLowerCase() !== emailToRemove.toLowerCase());
      try {
        localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleLogout = async () => {
    playDelete();
    localStorage.removeItem(CACHE_KEY);
    setSession(null);
    await supabase.auth.signOut();
  };

  const handleDigitPress = (digit) => {
    if (noteInputRef.current && document.activeElement === noteInputRef.current) {
      noteInputRef.current.blur();
    }
    triggerAmountPulse();

    if (digit === 'CLEAR') {
      playKeyDelete();
      setAmountStr('0');
      return;
    }
    if (digit === 'DEL') {
      playKeyDelete();
      setAmountStr((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }

    playKeyTap(digit);

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
    playQuickChip();
    triggerAmountPulse();
    setAmountStr((prev) => {
      const current = parseFloat(prev) || 0;
      const next = Math.max(0, Number((current + delta).toFixed(2)));
      return String(next);
    });
  };

  const handleApplySmartPreset = useCallback(
    (preset) => {
      if (!preset) return;
      playQuickChip();
      triggerAmountPulse();
      setAmountStr(String(preset.amount));
      setNote(preset.note || '');
      if (preset.categoryId && categories.some((c) => c.id === preset.categoryId)) {
        setSelectedCategoryId(preset.categoryId);
      }
      if (preset.walletId && wallets.some((w) => w.id === preset.walletId)) {
        setSelectedWalletId(preset.walletId);
      }
    },
    [categories, wallets, triggerAmountPulse]
  );

  const handleSwapTransferWallets = () => {
    if (!selectedWalletId || !toWalletId) return;
    playQuickChip();
    const prevFrom = selectedWalletId;
    setSelectedWalletId(toWalletId);
    setToWalletId(prevFrom);
  };

  const resetWalletModal = () => {
    setEditingWalletId(null);
    setNewWalletName('');
    setNewWalletBalance('');
    setNewWalletType('UPI / Wallet');
    setNewWalletColor(WALLET_COLORS[0]);
    setNewWalletIcon('💳');
    setShowWalletModal(false);
  };

  const resetCategoryModal = () => {
    setEditingCatId(null);
    setNewCatName('');
    setNewCatBudget('');
    setNewCatType('expense');
    setNewCatIcon('🍔');
    setShowCategoryModal(false);
  };

  const handleLogTransaction = async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const numericAmount = parseFloat(amountStr);
    if (!numericAmount || numericAmount <= 0) {
      playError();
      showToast('Pop in an amount above 0!');
      return;
    }
    if (!selectedWalletId) {
      playError();
      showToast('Create an account first!');
      resetWalletModal();
      setShowWalletModal(true);
      return;
    }
    if (entryType === 'transfer' && (!toWalletId || toWalletId === selectedWalletId)) {
      playError();
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

    const createdAtIso = buildIsoForLocalDate(entryDate);
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
      created_at: createdAtIso
    };

    const currentlyOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const optimisticTx = { id: tempId, ...insertPayload, pendingSync: currentlyOffline };

    setTransactions((prev) =>
      [optimisticTx, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === fromId) return { ...w, balance: expectedFromBalance };
        if (currentType === 'transfer' && w.id === destId && expectedToBalance !== null) {
          return { ...w, balance: expectedToBalance };
        }
        return w;
      })
    );

    const loggedOnDifferentDay = entryDate && entryDate !== getTodayDateString();
    setAmountStr('0');
    setNote('');
    setEntryDate(getTodayDateString());
    playSuccess(currentType);

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
      setTransactions((prev) => prev.map((tx) => (tx.id === tempId ? { ...tx, pendingSync: true } : tx)));
      showToast('Saved offline · Will sync when back!');
    };

    if (currentlyOffline) {
      enqueueOfflineItem();
      return;
    }

    const actionPrefix = currentType === 'income' ? '+' : currentType === 'expense' ? '-' : '⇄ ';
    const daySuffix = loggedOnDifferentDay ? ` (${formatDayGroupLabel(createdAtIso)})` : '';
    showToast(
      `${actionPrefix}${settings?.currency || '₹'}${numericAmount.toLocaleString('en-IN')} logged${daySuffix}!`
    );

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
      await supabase.from('wallets').update({ balance: expectedFromBalance }).eq('id', fromId);
    }

    if (currentType === 'transfer' && destId && expectedToBalance !== null) {
      const { data: checkToWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', destId)
        .maybeSingle();

      if (checkToWallet && Number(checkToWallet.balance) !== expectedToBalance) {
        await supabase.from('wallets').update({ balance: expectedToBalance }).eq('id', destId);
      }
    }

    if (insertedRow) {
      setTransactions((prev) =>
        prev
          .map((tx) => (tx.id === tempId ? insertedRow : tx))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    }
  };

  const handleDeleteTransaction = async (id) => {
    const targetTx = transactions.find((t) => t.id === id);
    if (!targetTx) return;

    playDelete();

    const amt = Number(targetTx.amount) || 0;
    const fromWallet = wallets.find((w) => w.id === targetTx.wallet_id);
    const toWallet = targetTx.to_wallet_id ? wallets.find((w) => w.id === targetTx.to_wallet_id) : null;

    const origFromBal = fromWallet ? Number(fromWallet.balance || 0) : null;
    const origToBal = toWallet ? Number(toWallet.balance || 0) : null;

    const restoredFromBalance = fromWallet
      ? targetTx.type === 'income'
        ? origFromBal - amt
        : origFromBal + amt
      : null;

    const restoredToBalance = targetTx.type === 'transfer' && toWallet ? origToBal - amt : null;

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

    if (editingTx?.id === id) setEditingTx(null);

    if (!String(id).startsWith('temp-')) {
      await supabase.from('transactions').delete().eq('id', id);

      if (targetTx.wallet_id && restoredFromBalance !== null) {
        await supabase.from('wallets').update({ balance: restoredFromBalance }).eq('id', targetTx.wallet_id);
      }

      if (targetTx.type === 'transfer' && targetTx.to_wallet_id && restoredToBalance !== null) {
        await supabase.from('wallets').update({ balance: restoredToBalance }).eq('id', targetTx.to_wallet_id);
      }
    }

    showToast('Entry popped!', async () => {
      playUndo();
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

  const openEditTransaction = (tx) => {
    playModalOpen();
    const { cleanNote, tagCategoryName } = parseShortcutCategoryTag(tx.note);
    const resolvedCat =
      (tagCategoryName && findMatchingCategoryObj(tagCategoryName, categories)) ||
      categories.find((c) => c.id === tx.category_id);

    const txDateObj = tx.created_at ? new Date(tx.created_at) : new Date();
    const txDateStr = !isNaN(txDateObj.getTime())
      ? txDateObj.toLocaleDateString('en-CA')
      : getTodayDateString();

    setEditingTx(tx);
    setEditTxAmount(String(tx.amount ?? ''));
    setEditTxDate(txDateStr);
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
      playError();
      showToast('Enter a valid amount');
      return;
    }

    const oldTx = editingTx;
    const oldAmt = Number(oldTx.amount) || 0;
    const cleanNote = editTxNote.trim();
    const nextWalletId = editTxWalletId || oldTx.wallet_id;
    const nextToWalletId = oldTx.type === 'transfer' ? editTxToWalletId : null;
    const nextCategoryId = oldTx.type === 'transfer' ? null : editTxCategoryId || null;

    const oldDateObj = oldTx.created_at ? new Date(oldTx.created_at) : new Date();
    const oldDateStr = !isNaN(oldDateObj.getTime()) ? oldDateObj.toLocaleDateString('en-CA') : '';
    const nextCreatedAt =
      editTxDate && editTxDate !== oldDateStr
        ? buildIsoForLocalDate(editTxDate, oldTx.created_at)
        : oldTx.created_at;

    if (oldTx.type === 'transfer' && nextWalletId === nextToWalletId) {
      playError();
      showToast('Pick two different accounts');
      return;
    }

    const balanceDeltas = {};
    const addDelta = (wId, delta) => {
      if (!wId) return;
      balanceDeltas[wId] = (balanceDeltas[wId] || 0) + delta;
    };

    if (oldTx.type === 'income') addDelta(oldTx.wallet_id, -oldAmt);
    else if (oldTx.type === 'expense') addDelta(oldTx.wallet_id, oldAmt);
    else if (oldTx.type === 'transfer') {
      addDelta(oldTx.wallet_id, oldAmt);
      addDelta(oldTx.to_wallet_id, -oldAmt);
    }

    if (oldTx.type === 'income') addDelta(nextWalletId, newAmt);
    else if (oldTx.type === 'expense') addDelta(nextWalletId, -newAmt);
    else if (oldTx.type === 'transfer') {
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
      prev
        .map((t) =>
          t.id === oldTx.id
            ? {
                ...t,
                amount: newAmt,
                note: cleanNote,
                wallet_id: nextWalletId,
                to_wallet_id: nextToWalletId,
                category_id: nextCategoryId,
                created_at: nextCreatedAt
              }
            : t
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    );

    setEditingTx(null);
    playSuccess('save');
    showToast('Transaction updated!');

    if (!String(oldTx.id).startsWith('temp-')) {
      await supabase
        .from('transactions')
        .update({
          amount: newAmt,
          note: cleanNote,
          wallet_id: nextWalletId,
          to_wallet_id: nextToWalletId,
          category_id: nextCategoryId,
          created_at: nextCreatedAt
        })
        .eq('id', oldTx.id);

      for (const [wId, nextBal] of Object.entries(updatedWalletsMap)) {
        await supabase.from('wallets').update({ balance: nextBal }).eq('id', wId);
      }
    }
  };

  const openEditWallet = (wallet) => {
    playModalOpen();
    setEditingWalletId(wallet.id);
    setNewWalletName(wallet.name || '');
    setNewWalletType(wallet.type || 'UPI / Wallet');
    setNewWalletBalance(String(wallet.balance ?? 0));
    setNewWalletColor(wallet.color || WALLET_COLORS[0]);
    setNewWalletIcon(wallet.icon || '💳');
    setShowWalletModal(true);
  };

  const handleSaveWallet = async (e) => {
    e.preventDefault();
    if (!newWalletName.trim()) return;

    const nameVal = newWalletName.trim();
    const balVal = parseFloat(newWalletBalance) || 0;
    const typeVal = newWalletType;
    const colorVal = newWalletColor;
    const iconVal = newWalletIcon || '💳';
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
      playSuccess('save');
      showToast('Account updated!');

      const { error } = await supabase
        .from('wallets')
        .update({ name: nameVal, type: typeVal, balance: balVal, color: colorVal, icon: iconVal })
        .eq('id', targetEditId);

      if (error) {
        playError();
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
      playSuccess('save');
      showToast('Account created!');
    } else if (error) {
      playError();
      showToast(error.message);
    }
  };

  const handleDeleteWallet = async (id) => {
    if (confirmDeleteId !== id) {
      playQuickChip();
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId((prev) => (prev === id ? null : prev)), 3000);
      return;
    }
    playDelete();
    setConfirmDeleteId(null);
    setWallets((prev) => prev.filter((w) => w.id !== id));
    if (activityWalletFilter === id) setActivityWalletFilter('all');
    if (editingWalletId === id) resetWalletModal();
    showToast('Account removed');
    await supabase.from('wallets').delete().eq('id', id);
  };

  const openEditCategory = (cat) => {
    playModalOpen();
    setEditingCatId(cat.id);
    setNewCatName(cat.name || '');
    setNewCatType(cat.type || 'expense');
    setNewCatIcon(cat.icon || '🍔');
    setNewCatBudget(cat.monthly_budget ? String(cat.monthly_budget) : '');
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const nameVal = newCatName.trim();
    const typeVal = newCatType;
    const iconVal = newCatIcon || '🍔';
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
      playSuccess('save');
      showToast('Category updated!');

      const { error } = await supabase
        .from('categories')
        .update({ name: nameVal, type: typeVal, icon: iconVal, monthly_budget: budgetVal })
        .eq('id', targetEditId);

      if (error) {
        playError();
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
      playSuccess('save');
      showToast('Category created!');
    } else if (error) {
      playError();
      showToast(error.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (confirmDeleteId !== id) {
      playQuickChip();
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId((prev) => (prev === id ? null : prev)), 3000);
      return;
    }
    playDelete();
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
    playSuccess('save');
    showToast('Token refreshed!');
    await supabase.from('user_settings').update({ shortcut_token: randomHex }).eq('user_id', session.user.id);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text || '');
    playCopy();
    setCopiedField(label);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopiedField(''), 2000);
  };

  const personalApiUrl = `${window.location.origin}/api/shortcut?token=${settings?.shortcut_token || ''}`;

  const handleOneTapShortcut = () => {
    navigator.clipboard.writeText(personalApiUrl);
    playCopy();
    showToast('Personal URL copied · Opening Shortcuts');
    setTimeout(() => {
      window.location.href = SHARED_ICLOUD_SHORTCUT_URL;
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

  // Smart Repeat Presets derived from frequent/recent entries matching current entryType
  const smartRepeatPresets = useMemo(() => {
    if (entryType === 'transfer') return [];
    const counts = new Map();

    transactions.slice(0, 120).forEach((tx, index) => {
      if (tx.type !== entryType) return;
      const amt = Number(tx.amount) || 0;
      if (amt <= 0) return;
      const { category: c, cleanNote } = resolveTxCategory(tx);
      const label = cleanNote || c?.name || '';
      if (!label) return;

      const key = `${c?.id || 'none'}|${label.toLowerCase()}|${amt}`;
      const existing = counts.get(key);
      const recencyBoost = Math.max(0, 1 - index / 120);
      if (existing) {
        existing.count += 1;
        existing.score += 1.4 + recencyBoost;
      } else {
        counts.set(key, {
          key,
          label,
          note: cleanNote || '',
          amount: amt,
          icon: c?.icon || (entryType === 'income' ? '💰' : '💸'),
          categoryId: c?.id || tx.category_id || '',
          walletId: tx.wallet_id || '',
          count: 1,
          score: 1 + recencyBoost
        });
      }
    });

    return Array.from(counts.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [transactions, entryType, resolveTxCategory]);

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
        if (activityTypeFilter !== 'all' && tx.type !== activityTypeFilter) return false;
        if (!q) return true;
        const w = wallets.find((item) => item.id === tx.wallet_id);
        const toW = wallets.find((item) => item.id === tx.to_wallet_id);
        const { category: c, cleanNote } = resolveTxCategory(tx);
        const haystack = [cleanNote, w?.name, toW?.name, c?.name, String(tx.amount || '')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 80);
  }, [transactions, activityWalletFilter, activityTypeFilter, activitySearch, wallets, resolveTxCategory]);

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

  const analyticsData = useMemo(
    () =>
      computeAnalytics({
        transactions,
        categories,
        wallets,
        analyticsRange,
        customStartDate,
        customEndDate,
        resolveTxCategory
      }),
    [
      transactions,
      categories,
      wallets,
      analyticsRange,
      customStartDate,
      customEndDate,
      resolveTxCategory
    ]
  );

  const handleExportCsv = useCallback(() => {
    const sourceRows = analyticsData.filteredTx.length > 0 ? analyticsData.filteredTx : transactions;
    if (sourceRows.length === 0) {
      playError();
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
      const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : '';
      const timeStr = !isNaN(d.getTime())
        ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '';
      const w = wallets.find((item) => item.id === tx.wallet_id);
      const toW = wallets.find((item) => item.id === tx.to_wallet_id);
      const { category: c, cleanNote } = resolveTxCategory(tx);

      csvLines.push(
        [
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
        ]
          .map(escapeCsvCell)
          .join(',')
      );
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

    playCopy();
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

  if ((isAuthChecking && !session) || (isLoggingIn && !session)) {
    return (
      <div className={`h-full w-full ${ui.bg} flex flex-col items-center justify-center gap-4 p-6 overflow-hidden`}>
        <TapxLogo className="w-20 h-20 animate-bounce" />
        <div className="w-6 h-6 rounded-full border-[3px] border-[#D8CBB3] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        ui={ui}
        savedAccounts={savedAccounts}
        onGoogleLogin={handleGoogleLogin}
        onRemoveSavedAccount={handleRemoveSavedAccount}
      />
    );
  }

  return (
    <div
      className={`h-full w-full ${ui.bg} flex flex-col max-w-md mx-auto overflow-hidden relative select-none`}
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)'
      }}
    >
      {/* Chunky Cartoon Toast Pill */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-cartoon font-bold flex items-center gap-3 animate-tab ${ui.toastBg}`}
        >
          <span>{toast.message}</span>
          {toast.onUndo && (
            <button
              type="button"
              onClick={toast.onUndo}
              className={`px-2.5 py-0.5 rounded-full bg-[#F4B942] text-[#1e1e1c] border font-bold text-[11px] key-press ${ui.badgeBorder}`}
            >
              Undo
            </button>
          )}
        </div>
      )}

      {dbError && (
        <div
          role="alert"
          className={`relative z-10 mx-5 mt-1 p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between shrink-0 ${ui.warningBanner}`}
        >
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

      {/* Top Header */}
      <header className="relative z-10 px-5 pt-0.5 pb-1.5 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectTab('wallets')}
              className={`text-[11px] font-cartoon font-bold uppercase tracking-wider ${ui.textSecondary}`}
            >
              Total Balance
            </button>
            {!isOnline ? (
              <span
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#F4B942] text-[#1e1e1c] border flex items-center gap-1 ${ui.badgeBorder}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e1e1c]" />
                Offline{offlineQueue.length > 0 ? ` · ${offlineQueue.length}` : ''}
              </span>
            ) : offlineQueue.length > 0 ? (
              <button
                type="button"
                onClick={() => flushOfflineQueue(session.user.id)}
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#5C9EAD] text-[#1e1e1c] border flex items-center gap-1 ${ui.badgeBorder}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e1e1c] animate-ping" />
                Syncing {offlineQueue.length}
              </button>
            ) : (
              <span
                aria-label={isSyncingBg ? 'Syncing with cloud' : 'Connected and synced'}
                className={`w-2.5 h-2.5 rounded-full border transition-colors duration-300 ${ui.badgeBorder} ${
                  isSyncingBg ? 'bg-[#F4B942] animate-pulse' : 'bg-[#52B788]'
                }`}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectTab('wallets')}
              aria-label="Open accounts tab"
              className={`text-[28px] leading-tight font-cartoon font-bold tracking-tight tabular-nums text-left ${ui.textPrimary}`}
            >
              {privacyMode
                ? `${currencySymbol}•••••`
                : `${currencySymbol}${Number(totalNetWorth || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2
                  })}`}
            </button>
            <button
              type="button"
              onClick={handleTogglePrivacy}
              aria-label={privacyMode ? 'Show balances' : 'Hide balances'}
              aria-pressed={privacyMode}
              title={privacyMode ? 'Show balances' : 'Hide balances'}
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 key-press ${ui.pillIdle}`}
            >
              {privacyMode ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playModalOpen();
            resetWalletModal();
            setShowWalletModal(true);
          }}
          aria-label="Add new account"
          className={`px-3.5 py-2 rounded-2xl text-xs font-cartoon font-bold shrink-0 key-press ${ui.pillActive}`}
        >
          + Account
        </button>
      </header>

      {/* MAIN VIEWPORT (Flush spacing right down to the 60px dock at bottom: 10px) */}
      <main
        className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden px-5"
        style={{
          paddingBottom: '78px'
        }}
      >
        {activeTab === 'pad' && (
          <KeypadTab
            key="tab-pad"
            ui={ui}
            tabAnimClass={tabAnimClass}
            privacyMode={privacyMode}
            entryType={entryType}
            setEntryType={setEntryType}
            entryDate={entryDate}
            setEntryDate={setEntryDate}
            todayDateStr={getTodayDateString()}
            categories={categories}
            setSelectedCategoryId={setSelectedCategoryId}
            amountStr={amountStr}
            formattedDisplayAmount={formattedDisplayAmount}
            amountFontSizeClass={amountFontSizeClass}
            amountPulse={amountPulse}
            currencySymbol={currencySymbol}
            note={note}
            setNote={setNote}
            noteInputRef={noteInputRef}
            smartRepeatPresets={smartRepeatPresets}
            onApplySmartPreset={handleApplySmartPreset}
            selectedWalletObj={selectedWalletObj}
            wallets={wallets}
            selectedWalletId={selectedWalletId}
            setSelectedWalletId={setSelectedWalletId}
            toWalletId={toWalletId}
            setToWalletId={setToWalletId}
            filteredCategories={filteredCategories}
            selectedCategoryId={selectedCategoryId}
            handleDigitPress={handleDigitPress}
            handleQuickAddAmount={handleQuickAddAmount}
            handleSwapTransferWallets={handleSwapTransferWallets}
            handleLogTransaction={handleLogTransaction}
            delHoldTimerRef={delHoldTimerRef}
            onOpenNewWallet={() => {
              playModalOpen();
              resetWalletModal();
              setShowWalletModal(true);
            }}
            onOpenNewCategory={(type) => {
              playModalOpen();
              resetCategoryModal();
              setNewCatType(type);
              setShowCategoryModal(true);
            }}
          />
        )}

        {activeTab === 'wallets' && (
          <AccountsTab
            key="tab-wallets"
            ui={ui}
            isDark={isDark}
            privacyMode={privacyMode}
            tabAnimClass={tabAnimClass}
            wallets={wallets}
            currencySymbol={currencySymbol}
            activityWalletFilter={activityWalletFilter}
            setActivityWalletFilter={setActivityWalletFilter}
            activitySearch={activitySearch}
            setActivitySearch={setActivitySearch}
            activityTypeFilter={activityTypeFilter}
            setActivityTypeFilter={setActivityTypeFilter}
            groupedTransactions={groupedTransactions}
            resolveTxCategory={resolveTxCategory}
            openEditWallet={openEditWallet}
            onOpenNewWallet={() => {
              playModalOpen();
              resetWalletModal();
              setShowWalletModal(true);
            }}
            openEditTransaction={openEditTransaction}
          />
        )}

        {activeTab === 'analytics' && (
          <InsightsTab
            key="tab-analytics"
            ui={ui}
            isDark={isDark}
            privacyMode={privacyMode}
            tabAnimClass={tabAnimClass}
            analyticsRange={analyticsRange}
            setAnalyticsRange={setAnalyticsRange}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
            analyticsData={analyticsData}
            currencySymbol={currencySymbol}
            selectedDonutCatId={selectedDonutCatId}
            setSelectedDonutCatId={setSelectedDonutCatId}
            selectedBarIdx={selectedBarIdx}
            setSelectedBarIdx={setSelectedBarIdx}
            wallets={wallets}
            resolveTxCategory={resolveTxCategory}
            openEditTransaction={openEditTransaction}
            handleExportCsv={handleExportCsv}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            key="tab-settings"
            ui={ui}
            tabAnimClass={tabAnimClass}
            themePref={themePref}
            setThemePref={setThemePref}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            settingsSection={settingsSection}
            setSettingsSection={setSettingsSection}
            personalApiUrl={personalApiUrl}
            copyToClipboard={copyToClipboard}
            copiedField={copiedField}
            handleOneTapShortcut={handleOneTapShortcut}
            settings={settings}
            handleRegenerateToken={handleRegenerateToken}
            categories={categories}
            currentMonthSpendByCat={currentMonthSpendByCat}
            currencySymbol={currencySymbol}
            onOpenNewCategory={() => {
              playModalOpen();
              resetCategoryModal();
              setShowCategoryModal(true);
            }}
            openEditCategory={openEditCategory}
            handleDeleteCategory={handleDeleteCategory}
            confirmDeleteId={confirmDeleteId}
            session={session}
            onSync={() => {
              playSuccess('save');
              fetchUserData(session.user.id);
              showToast('Synced!');
            }}
            handleLogout={handleLogout}
          />
        )}
      </main>

      {showWalletModal && (
        <WalletModal
          ui={ui}
          editingWalletId={editingWalletId}
          newWalletName={newWalletName}
          setNewWalletName={setNewWalletName}
          newWalletType={newWalletType}
          setNewWalletType={setNewWalletType}
          newWalletBalance={newWalletBalance}
          setNewWalletBalance={setNewWalletBalance}
          newWalletColor={newWalletColor}
          setNewWalletColor={setNewWalletColor}
          newWalletIcon={newWalletIcon}
          setNewWalletIcon={setNewWalletIcon}
          confirmDeleteId={confirmDeleteId}
          onSave={handleSaveWallet}
          onDelete={handleDeleteWallet}
          onClose={resetWalletModal}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          ui={ui}
          editingCatId={editingCatId}
          newCatName={newCatName}
          setNewCatName={setNewCatName}
          newCatType={newCatType}
          setNewCatType={setNewCatType}
          newCatIcon={newCatIcon}
          setNewCatIcon={setNewCatIcon}
          newCatBudget={newCatBudget}
          setNewCatBudget={setNewCatBudget}
          onSave={handleSaveCategory}
          onClose={resetCategoryModal}
        />
      )}

      {editingTx && (
        <EditTransactionModal
          ui={ui}
          editingTx={editingTx}
          currencySymbol={currencySymbol}
          editTxAmount={editTxAmount}
          setEditTxAmount={setEditTxAmount}
          editTxDate={editTxDate}
          setEditTxDate={setEditTxDate}
          editTxWalletId={editTxWalletId}
          setEditTxWalletId={setEditTxWalletId}
          editTxToWalletId={editTxToWalletId}
          setEditTxToWalletId={setEditTxToWalletId}
          editTxCategoryId={editTxCategoryId}
          setEditTxCategoryId={setEditTxCategoryId}
          editTxNote={editTxNote}
          setEditTxNote={setEditTxNote}
          wallets={wallets}
          categories={categories}
          onSave={handleSaveEditedTransaction}
          onDelete={handleDeleteTransaction}
          onClose={() => setEditingTx(null)}
        />
      )}

      {/* CHUNKY CARTOON DOCK BAR (Flush at bottom: 10px) */}
      <div
        className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none px-4"
        style={{
          bottom: '10px'
        }}
      >
        <nav
          ref={navBarRef}
          role="tablist"
          aria-label="Primary navigation"
          onPointerDown={handleNavPointerDown}
          onPointerMove={handleNavPointerMove}
          onPointerUp={handleNavPointerUpOrCancel}
          onPointerCancel={handleNavPointerUpOrCancel}
          className={`pointer-events-auto relative grid grid-cols-4 items-center w-full max-w-[388px] h-[60px] p-[5px] rounded-full touch-none transition-transform duration-300 ios-spring ${
            lensBulge ? 'scale-[1.02]' : 'scale-100'
          } ${ui.islandBar}`}
        >
          <div
            aria-hidden="true"
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
                role="tab"
                aria-selected={active}
                aria-label={item.label}
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