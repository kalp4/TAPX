export const SHARED_ICLOUD_SHORTCUT_URL =
  'https://www.icloud.com/shortcuts/dbde4b0b294c4fbca2ba72264897c13a';

export const WALLET_TYPES = ['UPI / Wallet', 'Cash', 'Bank', 'Card', 'Savings'];

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
export const SOUND_KEY = 'tapx_sound_pref';
export const PRIVACY_KEY = 'tapx_privacy_pref';
export const SEEDED_KEY_PREFIX = 'tapx_seeded_user_';
export const SAVED_ACCOUNTS_KEY = 'tapx_saved_accounts_v1';
export const OFFLINE_QUEUE_KEY = 'tapx_offline_queue_v1';

export const ICON_GROUPS = ['All', 'Money', 'Food', 'Travel', 'Shop', 'Fun', 'Health', 'Life'];

export const ICON_CATALOG = [
  // Money, Banking & Wallets
  { icon: '💳', group: 'Money', tags: 'card credit debit bank visa mastercard' },
  { icon: '💵', group: 'Money', tags: 'cash dollar bill notes paper money' },
  { icon: '🏦', group: 'Money', tags: 'bank account savings vault' },
  { icon: '⚡', group: 'Money', tags: 'upi instant lightning fast zap electricity' },
  { icon: '🪙', group: 'Money', tags: 'coin change gold token crypto' },
  { icon: '📱', group: 'Money', tags: 'phone mobile wallet gpay phonepe paytm fampay' },
  { icon: '💎', group: 'Money', tags: 'diamond wealth luxury investment gem' },
  { icon: '💰', group: 'Money', tags: 'money bag salary income allowance bonus' },
  { icon: '👛', group: 'Money', tags: 'purse wallet pouch pocket' },
  { icon: '🏧', group: 'Money', tags: 'atm withdraw deposit cash machine' },
  { icon: '💸', group: 'Money', tags: 'flying money expense spend transfer' },
  { icon: '📈', group: 'Money', tags: 'stocks chart invest trading mutual fund' },
  { icon: '📊', group: 'Money', tags: 'analytics portfolio budget graph' },
  { icon: '🧾', group: 'Money', tags: 'receipt bill invoice tax' },
  { icon: '🐖', group: 'Money', tags: 'piggy bank save savings' },
  { icon: '🧧', group: 'Money', tags: 'gift envelope shagun bonus' },
  { icon: '💹', group: 'Money', tags: 'forex currency market profit' },
  { icon: '🔐', group: 'Money', tags: 'safe lock emergency fund fd' },
  { icon: '🪪', group: 'Money', tags: 'id card membership pan aadhar' },
  { icon: '🤝', group: 'Money', tags: 'split lend borrow deal' },

  // Food & Drinks
  { icon: '🍔', group: 'Food', tags: 'burger fast food dining restaurant snack' },
  { icon: '🍕', group: 'Food', tags: 'pizza slice cheese party' },
  { icon: '☕', group: 'Food', tags: 'coffee tea cafe chai latte starbucks' },
  { icon: '🛒', group: 'Food', tags: 'groceries supermarket cart blinkit zepto instamart' },
  { icon: '🍟', group: 'Food', tags: 'fries snacks mcdonalds' },
  { icon: '🌮', group: 'Food', tags: 'taco mexican street food' },
  { icon: '🍜', group: 'Food', tags: 'noodles ramen maggi bowl chinese' },
  { icon: '🍱', group: 'Food', tags: 'bento lunch tiffin meal mess' },
  { icon: '🍛', group: 'Food', tags: 'curry rice thali indian dinner' },
  { icon: '🥗', group: 'Food', tags: 'salad healthy diet bowl' },
  { icon: '🥪', group: 'Food', tags: 'sandwich sub breakfast' },
  { icon: '🥐', group: 'Food', tags: 'croissant bakery puff bread' },
  { icon: '🍦', group: 'Food', tags: 'ice cream dessert sweet' },
  { icon: '🍩', group: 'Food', tags: 'donut pastry sweet cake' },
  { icon: '🎂', group: 'Food', tags: 'cake birthday bakery celebration' },
  { icon: '🍫', group: 'Food', tags: 'chocolate candy sweet' },
  { icon: '🧋', group: 'Food', tags: 'boba bubble tea cold coffee shake' },
  { icon: '🥤', group: 'Food', tags: 'soda juice soft drink cola' },
  { icon: '🍺', group: 'Food', tags: 'beer drinks pub bar' },
  { icon: '🍷', group: 'Food', tags: 'wine dine party club' },
  { icon: '🍎', group: 'Food', tags: 'fruits apple vegetables fresh' },
  { icon: '🥛', group: 'Food', tags: 'milk dairy morning' },
  { icon: '🍗', group: 'Food', tags: 'chicken meat protein dinner' },
  { icon: '🍳', group: 'Food', tags: 'eggs breakfast cooking' },

  // Transport & Travel
  { icon: '⛽', group: 'Travel', tags: 'fuel petrol diesel gas station' },
  { icon: '🚕', group: 'Travel', tags: 'cab taxi uber ola auto' },
  { icon: '🛺', group: 'Travel', tags: 'rickshaw auto rapido local' },
  { icon: '🚗', group: 'Travel', tags: 'car drive parking toll' },
  { icon: '🛵', group: 'Travel', tags: 'scooter bike two wheeler activa' },
  { icon: '🏍️', group: 'Travel', tags: 'motorcycle bike ride' },
  { icon: '🚌', group: 'Travel', tags: 'bus brts transit ticket' },
  { icon: '🚇', group: 'Travel', tags: 'metro train subway commute' },
  { icon: '🚆', group: 'Travel', tags: 'train railway irctc ticket' },
  { icon: '✈️', group: 'Travel', tags: 'flight airplane airport trip vacation' },
  { icon: '🏨', group: 'Travel', tags: 'hotel stay resort airbnb booking' },
  { icon: '🏖️', group: 'Travel', tags: 'beach holiday vacation trip' },
  { icon: '⛰️', group: 'Travel', tags: 'mountains trek camping trip' },
  { icon: '🧳', group: 'Travel', tags: 'luggage tour travel bag' },
  { icon: '🚲', group: 'Travel', tags: 'bicycle cycle ride' },
  { icon: '🅿️', group: 'Travel', tags: 'parking toll fastag' },
  { icon: '🛠️', group: 'Travel', tags: 'repair service mechanic garage' },
  { icon: '🗺️', group: 'Travel', tags: 'map tour guide explore' },

  // Shopping, Style & Personal
  { icon: '🛍️', group: 'Shop', tags: 'shopping bags mall retail amazon flipkart' },
  { icon: '👕', group: 'Shop', tags: 'clothes shirt fashion apparel' },
  { icon: '👟', group: 'Shop', tags: 'shoes sneakers footwear kicks' },
  { icon: '🧥', group: 'Shop', tags: 'jacket hoodie winter wear' },
  { icon: '🕶️', group: 'Shop', tags: 'sunglasses accessories style' },
  { icon: '⌚', group: 'Shop', tags: 'watch smartgadget luxury' },
  { icon: '🎒', group: 'Shop', tags: 'backpack bag college gear' },
  { icon: '💄', group: 'Shop', tags: 'cosmetics skincare beauty grooming' },
  { icon: '💈', group: 'Shop', tags: 'haircut barber salon grooming' },
  { icon: '🎁', group: 'Shop', tags: 'gift present birthday surprise' },
  { icon: '📦', group: 'Shop', tags: 'package parcel delivery courier' },
  { icon: '🏷️', group: 'Shop', tags: 'sale discount deal offer' },
  { icon: '💍', group: 'Shop', tags: 'jewelry ring gold silver' },
  { icon: '🧴', group: 'Shop', tags: 'personal care toiletries lotion' },

  // Entertainment, Gaming & Fun
  { icon: '🎬', group: 'Fun', tags: 'movies cinema theatre pvr netflix' },
  { icon: '🎮', group: 'Fun', tags: 'gaming playstation steam xbox valorant' },
  { icon: '🎧', group: 'Fun', tags: 'music spotify apple music audio concert' },
  { icon: '🎟️', group: 'Fun', tags: 'tickets event show bookmyshow standup' },
  { icon: '🍿', group: 'Fun', tags: 'popcorn theatre snacks movie' },
  { icon: '🎲', group: 'Fun', tags: 'board games party hangout club' },
  { icon: '🎳', group: 'Fun', tags: 'bowling arcade turf outing' },
  { icon: '🎸', group: 'Fun', tags: 'instrument guitar music gig' },
  { icon: '🎨', group: 'Fun', tags: 'art craft hobby painting design' },
  { icon: '📷', group: 'Fun', tags: 'camera photography lens film' },
  { icon: '🎉', group: 'Fun', tags: 'party celebration festival club' },
  { icon: '🕹️', group: 'Fun', tags: 'arcade retro game' },
  { icon: '📺', group: 'Fun', tags: 'tv streaming ott youtube premium' },
  { icon: '🎪', group: 'Fun', tags: 'festival fair carnival event' },

  // Health, Sports & Fitness
  { icon: '💊', group: 'Health', tags: 'medicine pharmacy doctor pills medical' },
  { icon: '🏋️', group: 'Health', tags: 'gym workout fitness weights protein' },
  { icon: '🏥', group: 'Health', tags: 'hospital clinic checkup dentist' },
  { icon: '🩺', group: 'Health', tags: 'doctor consultation health lab' },
  { icon: '🏏', group: 'Health', tags: 'cricket turf box sports match' },
  { icon: '⚽', group: 'Health', tags: 'football soccer turf sports' },
  { icon: '🏸', group: 'Health', tags: 'badminton court racket pickleball' },
  { icon: '🏊', group: 'Health', tags: 'swimming pool club sport' },
  { icon: '🧘', group: 'Health', tags: 'yoga meditation wellness spa' },
  { icon: '🦷', group: 'Health', tags: 'dentist dental care' },
  { icon: '👓', group: 'Health', tags: 'glasses optical lens eye' },
  { icon: '🩹', group: 'Health', tags: 'first aid bandage pharmacy' },

  // Tech, Bills, Study & Home
  { icon: '📚', group: 'Life', tags: 'books education study college school tuition' },
  { icon: '💻', group: 'Life', tags: 'laptop macbook computer coding software' },
  { icon: '🏠', group: 'Life', tags: 'home rent house hostel pg room' },
  { icon: '🌐', group: 'Life', tags: 'internet wifi broadband data recharge' },
  { icon: '💡', group: 'Life', tags: 'electricity utility power bill light' },
  { icon: '🔋', group: 'Life', tags: 'recharge battery powerbank' },
  { icon: '☁️', group: 'Life', tags: 'cloud storage icloud google one subscription' },
  { icon: '🤖', group: 'Life', tags: 'ai chatgpt claude cursor api subscription' },
  { icon: '🎓', group: 'Life', tags: 'college exam fee university coaching' },
  { icon: '✏️', group: 'Life', tags: 'stationery pen notebook printout' },
  { icon: '🐾', group: 'Life', tags: 'pet dog cat food vet' },
  { icon: '🪴', group: 'Life', tags: 'plants garden home decor' },
  { icon: '🧺', group: 'Life', tags: 'laundry cleaning wash dryclean' },
  { icon: '🛋️', group: 'Life', tags: 'furniture room decor appliance' },
  { icon: '🔑', group: 'Life', tags: 'key deposit rent lock' },
  { icon: '❤️', group: 'Life', tags: 'charity donate family love' },
  { icon: '⭐', group: 'Life', tags: 'star favorite special misc' },
  { icon: '🔥', group: 'Life', tags: 'fire hot streak urgent' }
];

export function getUiTheme(isDark) {
  if (isDark) {
    return {
      bg: 'bg-[#1e1e1c] text-[#F5EFE6]',
      appFrame: 'sm:border-x sm:border-[#34342F]/55 sm:shadow-[0_12px_48px_rgba(0,0,0,0.45)]',
      ambientGlow: 'tapx-ambient-dark',
      dockScrim: 'tapx-dock-scrim-dark',
      sheetBg: 'bg-[#262623] border-2 border-[#D8CBB3]/30 text-[#F5EFE6] shadow-[0_8px_0_#111110]',
      sheetHandle: 'bg-[#D8CBB3]/35',
      // Hero surfaces: chunky tactile outline + subtle top sheen
      heroCard:
        'bg-[#282825] hero-sheen-dark border-2 border-[#D8CBB3]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_5px_0_#111110]',
      heroCardIncome:
        'bg-[#282825] hero-sheen-dark border-2 border-[#52B788]/60 shadow-[inset_0_1px_0_rgba(82,183,136,0.16),0_5px_0_#111110]',
      heroCardTransfer:
        'bg-[#282825] hero-sheen-dark border-2 border-[#F4B942]/60 shadow-[inset_0_1px_0_rgba(244,185,66,0.16),0_5px_0_#111110]',
      heroCardWarning:
        'bg-[#282825] hero-sheen-dark border-2 border-[#F26B5B]/75 shadow-[inset_0_1px_0_rgba(242,107,91,0.18),0_5px_0_#111110]',
      walletCardHero: 'wallet-sheen border-2 border-[#111110] shadow-[0_4px_0_#111110]',
      // Secondary containers: softer borders & lighter elevation
      card: 'bg-[#262623] border border-[#3A3934]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_0_#141412]',
      cardElevated:
        'bg-[#30302c] border-[1.5px] border-[#4A473E] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_3px_0_#111110] active:shadow-[0_1px_0_#111110]',
      cardSubtle: 'bg-[#20201E] border border-[#32322D]/60',
      listRow: 'bg-[#262623] border border-[#34342F]/75 hover:bg-[#2C2C28]',
      notePill: 'bg-[#1B1B19]/85 border border-[#363530]/80 focus-within:border-[#D8CBB3]/55',
      input:
        'bg-[#181816] border-[1.5px] border-[#383732]/90 focus-within:border-[#D8CBB3]/65 focus:border-[#D8CBB3]/65 text-[#F5EFE6] placeholder-[#877D6E] shadow-[inset_0_2px_0_rgba(0,0,0,0.35)]',
      pillIdle:
        'bg-[#282825] border border-[#3D3C36]/85 text-[#D8CBB3] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_0_#141412] active:shadow-none',
      pillActive:
        'bg-[#D8CBB3] border-2 border-[#111110] text-[#1e1e1c] font-bold shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45),0_3px_0_#111110] active:shadow-[0_1px_0_#111110]',
      pillSelectedBorder:
        'border-2 border-[#111110] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.3),0_3px_0_#111110] active:shadow-[0_1px_0_#111110]',
      chipSoft:
        'bg-[#2D2C28] border border-[#45433B]/85 text-[#D8CBB3] shadow-[0_2px_0_#141412] active:shadow-none hover:bg-[#35342F]',
      numpadKey:
        'bg-[#2A2A27] border-[1.5px] border-[#111110] text-[#F5EFE6] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_0_#111110] active:shadow-[0_1px_0_#111110] hover:bg-[#32322E]',
      numpadKeySpecial:
        'bg-[#33312C] border-[1.5px] border-[#111110] text-[#D8CBB3] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_3px_0_#111110] active:shadow-[0_1px_0_#111110]',
      segmentedBg:
        'bg-[#161614] border border-[#32322D]/85 shadow-[inset_0_2px_0_rgba(0,0,0,0.45)]',
      segmentedThumb: 'bg-[#D8CBB3] border-[1.5px] border-[#111110] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),0_2px_0_#111110]',
      segmentedTextActive: 'text-[#1e1e1c] font-extrabold',
      outline: 'border-[#111110]',
      outlineSubtle: 'border-[#3A3934]',
      badgeBorder: 'border-[#111110]',
      iconBadge: 'border border-[#111110] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_0_#111110]',
      trackBg: 'bg-[#161614] border border-[#34342F]/70',
      trackActiveBg: 'bg-[#181816] border-[1.5px] border-[#D8CBB3]/70',
      dashBorder: 'border-[#D8CBB3]/35',
      toastBg: 'bg-[#D8CBB3] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_4px_0_#111110]',
      dangerBtn:
        'bg-[#F26B5B] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_3px_0_#111110] active:shadow-[0_1px_0_#111110]',
      dangerSoftBtn: 'bg-[#F26B5B]/15 text-[#F26B5B] border border-[#F26B5B]/40',
      warningBanner: 'bg-[#F26B5B]/15 border border-[#F26B5B]/45 text-[#F26B5B]',
      textPrimary: 'text-[#F5EFE6]',
      textSand: 'text-[#D8CBB3]',
      textSecondary: 'text-[#B8AA93]',
      textMuted: 'text-[#968C7C]',
      islandBar: 'cartoon-dock-dark',
      islandLens: 'cartoon-pill-lens-dark',
      islandTextActive: 'text-[#1e1e1c]',
      islandTextIdle: 'text-[#B8AA93]',
      primaryBtnExpense:
        'bg-[#D8CBB3] text-[#1e1e1c] border-2 border-[#111110] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.48),0_4px_0_#111110] active:shadow-[0_2px_0_#111110]',
      primaryBtnIncome:
        'bg-[#52B788] text-[#1e1e1c] border-2 border-[#111110] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.38),0_4px_0_#111110] active:shadow-[0_2px_0_#111110]',
      primaryBtnTransfer:
        'bg-[#F4B942] text-[#1e1e1c] border-2 border-[#111110] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45),0_4px_0_#111110] active:shadow-[0_2px_0_#111110]',
      divider: 'border-[#363632]',
      stickyHeader: 'bg-[#1e1e1c]'
    };
  }

  return {
    bg: 'bg-[#EFE7DA] text-[#1e1e1c]',
    appFrame: 'sm:border-x sm:border-[#1e1e1c]/12 sm:shadow-[0_12px_48px_rgba(30,30,28,0.1)]',
    ambientGlow: 'tapx-ambient-light',
    dockScrim: 'tapx-dock-scrim-light',
    sheetBg: 'bg-[#FAF6EE] border-2 border-[#1e1e1c] text-[#1e1e1c] shadow-[0_8px_0_rgba(30,30,28,0.22)]',
    sheetHandle: 'bg-[#1e1e1c]/20',
    heroCard:
      'bg-[#FAF6EE] hero-sheen-light border-2 border-[#1e1e1c] shadow-[inset_0_1.5px_0_#ffffff,0_5px_0_#1e1e1c]',
    heroCardIncome:
      'bg-[#FAF6EE] hero-sheen-light border-2 border-[#52B788] shadow-[inset_0_1.5px_0_#ffffff,0_5px_0_#2D7A56]',
    heroCardTransfer:
      'bg-[#FAF6EE] hero-sheen-light border-2 border-[#D99B1C] shadow-[inset_0_1.5px_0_#ffffff,0_5px_0_#B57D0E]',
    heroCardWarning:
      'bg-[#FAF6EE] hero-sheen-light border-2 border-[#D94F3D] shadow-[inset_0_1.5px_0_#ffffff,0_5px_0_#D94F3D]',
    walletCardHero: 'wallet-sheen border-2 border-[#1e1e1c] shadow-[0_4px_0_#1e1e1c]',
    card: 'bg-[#FAF6EE] border border-[#1e1e1c]/14 shadow-[inset_0_1px_0_#ffffff,0_2px_0_rgba(30,30,28,0.08)]',
    cardElevated:
      'bg-[#FFFFFF] border-[1.5px] border-[#1e1e1c]/35 shadow-[0_3px_0_rgba(30,30,28,0.16)] active:shadow-[0_1px_0_rgba(30,30,28,0.16)]',
    cardSubtle: 'bg-[#E6DEC9]/75 border border-[#1e1e1c]/8',
    listRow: 'bg-[#FAF6EE] border border-[#1e1e1c]/12 hover:bg-[#FFFFFF]',
    notePill: 'bg-[#EFE7DA]/85 border border-[#1e1e1c]/14 focus-within:border-[#1e1e1c]/50',
    input:
      'bg-[#FFFFFF] border-[1.5px] border-[#1e1e1c]/22 focus-within:border-[#1e1e1c] focus:border-[#1e1e1c] text-[#1e1e1c] placeholder-[#877D6E]',
    pillIdle:
      'bg-[#FAF6EE] border border-[#1e1e1c]/18 text-[#1e1e1c] shadow-[inset_0_1px_0_#ffffff,0_2px_0_rgba(30,30,28,0.1)] active:shadow-none',
    pillActive:
      'bg-[#1e1e1c] border-2 border-[#1e1e1c] text-[#D8CBB3] font-bold shadow-[0_3px_0_#6B655B] active:shadow-[0_1px_0_#6B655B]',
    pillSelectedBorder:
      'border-2 border-[#1e1e1c] shadow-[0_3px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
    chipSoft:
      'bg-[#FAF6EE] border border-[#1e1e1c]/18 text-[#1e1e1c] shadow-[0_2px_0_rgba(30,30,28,0.1)] active:shadow-none hover:bg-[#FFFFFF]',
    numpadKey:
      'bg-[#FAF6EE] border-[1.5px] border-[#1e1e1c]/80 text-[#1e1e1c] shadow-[inset_0_1.5px_0_#ffffff,0_3px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c] hover:bg-[#FFFFFF]',
    numpadKeySpecial:
      'bg-[#E4DBCA] border-[1.5px] border-[#1e1e1c]/80 text-[#1e1e1c] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.6),0_3px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
    segmentedBg:
      'bg-[#E2D9C6] border border-[#1e1e1c]/14 shadow-[inset_0_1px_2px_rgba(30,30,28,0.08)]',
    segmentedThumb: 'bg-[#1e1e1c] border-[1.5px] border-[#1e1e1c] shadow-[0_2px_0_rgba(30,30,28,0.22)]',
    segmentedTextActive: 'text-[#D8CBB3] font-extrabold',
    outline: 'border-[#1e1e1c]',
    outlineSubtle: 'border-[#1e1e1c]/20',
    badgeBorder: 'border-[#1e1e1c]/70',
    iconBadge: 'border border-[#1e1e1c]/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_0_rgba(30,30,28,0.18)]',
    trackBg: 'bg-[#E2D9C6] border border-[#1e1e1c]/12',
    trackActiveBg: 'bg-[#EFE7DA] border-[1.5px] border-[#1e1e1c]',
    dashBorder: 'border-[#1e1e1c]/28',
    toastBg: 'bg-[#1e1e1c] text-[#D8CBB3] border-2 border-[#1e1e1c] shadow-[0_4px_0_#6B655B]',
    dangerBtn:
      'bg-[#F26B5B] text-[#1e1e1c] border-2 border-[#1e1e1c] shadow-[0_3px_0_#1e1e1c] active:shadow-[0_1px_0_#1e1e1c]',
    dangerSoftBtn: 'bg-[#F26B5B]/15 text-[#B83224] border border-[#D94F3D]/40',
    warningBanner: 'bg-[#F26B5B]/15 border border-[#D94F3D]/45 text-[#B83224]',
    textPrimary: 'text-[#1e1e1c]',
    textSand: 'text-[#1e1e1c]',
    textSecondary: 'text-[#524E46]',
    textMuted: 'text-[#6E675C]',
    islandBar: 'cartoon-dock-light',
    islandLens: 'cartoon-pill-lens-light',
    islandTextActive: 'text-[#D8CBB3]',
    islandTextIdle: 'text-[#524E46]',
    primaryBtnExpense:
      'bg-[#1e1e1c] text-[#D8CBB3] border-2 border-[#1e1e1c] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.16),0_4px_0_#6B655B] active:shadow-[0_2px_0_#6B655B]',
    primaryBtnIncome:
      'bg-[#52B788] text-[#1e1e1c] border-2 border-[#1e1e1c] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45),0_4px_0_#1e1e1c] active:shadow-[0_2px_0_#1e1e1c]',
    primaryBtnTransfer:
      'bg-[#F4B942] text-[#1e1e1c] border-2 border-[#1e1e1c] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.5),0_4px_0_#1e1e1c] active:shadow-[0_2px_0_#1e1e1c]',
    divider: 'border-[#1e1e1c]/15',
    stickyHeader: 'bg-[#EFE7DA]'
  };
}