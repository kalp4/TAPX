export const SHARED_ICLOUD_SHORTCUT_URL =
  'https://www.icloud.com/shortcuts/f14c323b56b34217a774b466a558c57b';

export const WALLET_COLORS = [
  '#E07A5F',
  '#52B788',
  '#F4B942',
  '#5C9EAD',
  '#9B7EDE',
  '#E56B6F',
  '#D8CBB3',
  '#F26B5B',
  '#4EA8DE',
  '#80ED99',
  '#F7A072',
  '#B5838D'
];

export const CHART_COLORS = [
  '#F26B5B',
  '#52B788',
  '#F4B942',
  '#5C9EAD',
  '#9B7EDE',
  '#E07A5F',
  '#E56B6F',
  '#D8CBB3'
];

export const DEFAULT_WALLETS_TEMPLATE = [
  { name: 'UPI', type: 'UPI / Wallet', balance: 0, color: '#5C9EAD', icon: '⚡' },
  { name: 'Cash', type: 'Cash', balance: 0, color: '#52B788', icon: '💵' }
];

export const DEFAULT_CATEGORIES_TEMPLATE = [
  { name: 'Food & Drinks', type: 'expense', icon: '🍔', color: '#F26B5B', monthly_budget: null },
  { name: 'Groceries', type: 'expense', icon: '🛒', color: '#52B788', monthly_budget: null },
  { name: 'Transport', type: 'expense', icon: '⛽', color: '#F4B942', monthly_budget: null },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#9B7EDE', monthly_budget: null },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#E56B6F', monthly_budget: null },
  { name: 'Bills & Recharge', type: 'expense', icon: '⚡', color: '#5C9EAD', monthly_budget: null },
  { name: 'Health & Fitness', type: 'expense', icon: '💊', color: '#E07A5F', monthly_budget: null },
  { name: 'Income & Allowance', type: 'income', icon: '💰', color: '#52B788', monthly_budget: null }
];

export const NAV_TABS = [
  { id: 'pad', label: 'Keypad' },
  { id: 'wallets', label: 'Accounts' },
  { id: 'analytics', label: 'Insights' },
  { id: 'settings', label: 'Settings' }
];

export const CACHE_KEY = 'tapx_local_cache_v4';
export const THEME_KEY = 'tapx_theme_pref';
export const BUDGET_CLEANUP_KEY = 'tapx_default_budgets_removed_v1';
export const SAVED_ACCOUNTS_KEY = 'tapx_saved_accounts_v1';
export const OFFLINE_QUEUE_KEY = 'tapx_offline_queue_v1';

export function getUiTheme(isDark) {
  if (isDark) {
    return {
      bg: 'bg-[#1e1e1c] text-[#F5EFE6]',
      sheetBg: 'bg-[#262623] border-2 border-[#D8CBB3]/30 text-[#F5EFE6]',
      card: 'bg-[#282825] border-2 border-[#111110] shadow-[0_4px_0_#111110]',
      cardElevated:
        'bg-[#30302c] border-2 border-[#111110] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110]',
      cardSubtle: 'bg-[#22221f] border-2 border-[#111110]/80',
      heroCard: 'bg-[#282825] border-2 border-[#D8CBB3]/35 shadow-[0_5px_0_#111110]',
      input:
        'bg-[#181816] border-2 border-[#111110] text-[#F5EFE6] placeholder-[#877D6E] shadow-[inset_0_2px_0_rgba(0,0,0,0.45)]',
      pillIdle:
        'bg-[#282825] border-2 border-[#111110] text-[#D8CBB3] shadow-[0_3px_0_#111110] active:shadow-none',
      pillActive:
        'bg-[#D8CBB3] border-2 border-[#111110] text-[#1e1e1c] font-bold shadow-[0_3px_0_#111110] active:shadow-none',
      numpadKey:
        'bg-[#282825] border-2 border-[#111110] text-[#F5EFE6] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110] hover:bg-[#30302c]',
      numpadKeySpecial:
        'bg-[#32302b] border-2 border-[#111110] text-[#D8CBB3] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110]',
      segmentedBg:
        'bg-[#161614] border-2 border-[#111110] shadow-[inset_0_2px_0_rgba(0,0,0,0.5)]',
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
      primaryBtnExpense:
        'bg-[#D8CBB3] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110]',
      primaryBtnIncome:
        'bg-[#52B788] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110]',
      primaryBtnTransfer:
        'bg-[#F4B942] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_4px_0_#111110] active:shadow-[0_1px_0_#111110]',
      divider: 'border-[#363632]',
      stickyHeader: 'bg-[#1e1e1c]'
    };
  }

  return {
    bg: 'bg-[#EFE7DA] text-[#1e1e1c]',
    sheetBg: 'bg-[#FAF6EE] border-2 border-[#1e1e1c] text-[#1e1e1c]',
    card: 'bg-[#FAF6EE] border-2 border-[#1e1e1c] shadow-[0_4px_0_#1e1e1c]',
    cardElevated:
      'bg-[#FFFFFF] border-2 border-[#1e1e1c] shadow-[0_4px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
    cardSubtle: 'bg-[#E5DEC9] border-2 border-[#1e1e1c]',
    heroCard: 'bg-[#FAF6EE] border-2 border-[#1e1e1c] shadow-[0_5px_0_#1e1e1c]',
    input: 'bg-[#FFFFFF] border-2 border-[#1e1e1c] text-[#1e1e1c] placeholder-[#877D6E]',
    pillIdle:
      'bg-[#FAF6EE] border-2 border-[#1e1e1c] text-[#1e1e1c] shadow-[0_3px_0_#1e1e1c] active:shadow-none',
    pillActive:
      'bg-[#1e1e1c] border-2 border-[#1e1e1c] text-[#D8CBB3] font-bold shadow-[0_3px_0_#524E46] active:shadow-none',
    numpadKey:
      'bg-[#FAF6EE] border-2 border-[#1e1e1c] text-[#1e1e1c] shadow-[0_4px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
    numpadKeySpecial:
      'bg-[#D8CBB3] border-2 border-[#1e1e1c] text-[#1e1e1c] shadow-[0_4px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
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
    primaryBtnExpense:
      'bg-[#1e1e1c] text-[#D8CBB3] border-2 border-[#1e1e1c] shadow-[0_4px_0_#524E46] active:shadow-[0_1px_0_#524E46]',
    primaryBtnIncome:
      'bg-[#52B788] text-[#1e1e1c] border-2 border-[#1e1e1c] shadow-[0_4px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
    primaryBtnTransfer:
      'bg-[#F4B942] text-[#1e1e1c] border-2 border-[#1e1e1c] shadow-[0_4px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
    divider: 'border-[#1e1e1c]/20',
    stickyHeader: 'bg-[#EFE7DA]'
  };
}
