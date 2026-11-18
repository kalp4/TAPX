import React, { useState, useMemo } from 'react';
import { WALLET_COLORS, ICON_CATALOG, ICON_GROUPS } from '../constants';

export function TapxLogo({ className = 'w-16 h-16' }) {
  return (
    <svg
      viewBox="70 50 375 415"
      className={`${className} shrink-0 select-none`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="108" y="224" width="316" height="220" rx="44" fill="#111110" />
      <rect x="164" y="144" width="56" height="116" rx="14" fill="#F26B5B" stroke="#111110" strokeWidth="10" />
      <rect x="236" y="106" width="56" height="154" rx="14" fill="#52B788" stroke="#111110" strokeWidth="10" />
      <rect x="308" y="68" width="56" height="192" rx="14" fill="#F4B942" stroke="#111110" strokeWidth="10" />
      <rect x="96" y="212" width="316" height="216" rx="44" fill="#D8CBB3" stroke="#111110" strokeWidth="11" />
      <rect x="324" y="290" width="102" height="64" rx="32" fill="#282825" stroke="#111110" strokeWidth="10" />
      <circle cx="358" cy="322" r="13" fill="#F4B942" stroke="#111110" strokeWidth="7" />
    </svg>
  );
}

export function NavIcon({ id, active }) {
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

export function IconLibraryPicker({ selectedIcon, onSelectIcon, ui, defaultGroup = 'All' }) {
  const [activeGroup, setActiveGroup] = useState(defaultGroup);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIcons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ICON_CATALOG.filter((entry) => {
      if (activeGroup !== 'All' && entry.group !== activeGroup && !q) {
        return false;
      }
      if (!q) return true;
      return (
        entry.tags.includes(q) ||
        entry.group.toLowerCase().includes(q) ||
        entry.icon.includes(q)
      );
    });
  }, [activeGroup, searchQuery]);

  const handleCustomEmojiInput = (e) => {
    const raw = e.target.value;
    if (!raw) return;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      const segments = Array.from(segmenter.segment(raw.trim()));
      if (segments.length > 0) {
        onSelectIcon(segments[segments.length - 1].segment);
        return;
      }
    }
    const chars = Array.from(raw.trim());
    if (chars.length > 0) {
      onSelectIcon(chars[chars.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
          Icon ({ICON_CATALOG.length}+ or type any emoji)
        </label>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-semibold ${ui.textSecondary}`}>Custom:</span>
          <input
            type="text"
            value={selectedIcon}
            onChange={handleCustomEmojiInput}
            placeholder="😀"
            title="Tap to type any emoji from your keyboard"
            className={`w-11 h-8 text-center rounded-xl text-base font-bold focus:outline-none ${ui.input}`}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl w-32 shrink-0 ${ui.input}`}>
          <span className="text-[11px] opacity-60">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search icon..."
            className="w-full bg-transparent text-xs focus:outline-none scale-[0.85] origin-left"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`text-[10px] font-bold ${ui.textMuted}`}
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
          {ICON_GROUPS.map((grp) => {
            const active = activeGroup === grp && !searchQuery;
            return (
              <button
                key={grp}
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveGroup(grp);
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-cartoon font-bold shrink-0 key-press ${
                  active ? ui.pillActive : ui.pillIdle
                }`}
              >
                {grp}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`grid grid-cols-7 gap-1.5 max-h-36 overflow-y-auto custom-scroll p-2 rounded-2xl ${ui.cardSubtle}`}
      >
        {filteredIcons.length === 0 ? (
          <div className={`col-span-7 py-4 text-center text-xs font-cartoon ${ui.textMuted}`}>
            No match—type Type it in the custom box above!
          </div>
        ) : (
          filteredIcons.map((item, idx) => {
            const isSelected = selectedIcon === item.icon;
            return (
              <button
                key={`${item.icon}-${idx}`}
                type="button"
                onClick={() => onSelectIcon(item.icon)}
                className={`h-10 rounded-xl flex items-center justify-center text-lg key-press ${
                  isSelected ? ui.pillActive : ui.pillIdle
                }`}
              >
                {item.icon}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function LoginScreen({ ui, savedAccounts, onGoogleLogin, onRemoveSavedAccount }) {
  return (
    <div
      className={`h-full w-full ${ui.bg} flex flex-col justify-between px-7 max-w-md mx-auto overflow-hidden select-none relative`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 20px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 20px)'
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
                  onClick={() => onGoogleLogin(acc.email)}
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
                      <p className={`text-xs font-bold truncate ${ui.textPrimary}`}>{acc.name}</p>
                      <p className={`text-[11px] truncate ${ui.textSecondary}`}>{acc.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => onRemoveSavedAccount(acc.email, e)}
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
          onClick={() => onGoogleLogin('')}
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
          <a href="/privacy.html" className={`underline font-bold ${ui.textSecondary}`}>
            Privacy Policy
          </a>
          {' · '}
          <a href="mailto:kalppatel132008@gmail.com" className={`underline font-bold ${ui.textSecondary}`}>
            Support
          </a>
        </p>
      </div>
    </div>
  );
}

export function WalletModal({
  ui,
  editingWalletId,
  newWalletName,
  setNewWalletName,
  newWalletType,
  setNewWalletType,
  newWalletBalance,
  setNewWalletBalance,
  newWalletColor,
  setNewWalletColor,
  newWalletIcon,
  setNewWalletIcon,
  confirmDeleteId,
  onSave,
  onDelete,
  onClose
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSave}
        className={`w-full max-w-md max-h-[88vh] overflow-y-auto custom-scroll rounded-3xl p-5 space-y-3.5 shadow-[0_8px_0_#111110] animate-sheet-up ${ui.sheetBg}`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
      >
        <div className="w-12 h-1.5 rounded-full bg-[#D8CBB3]/40 mx-auto" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-9 h-9 rounded-xl border-2 border-[#111110] shadow-[0_2px_0_#111110] flex items-center justify-center text-base"
              style={{ backgroundColor: newWalletColor }}
            >
              {newWalletIcon}
            </span>
            <h3 className={`text-base font-cartoon font-bold ${ui.textPrimary}`}>
              {editingWalletId ? 'Edit Account' : 'New Account'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`text-xs font-cartoon font-bold px-3 py-1 rounded-full key-press ${ui.pillIdle}`}
          >
            Close
          </button>
        </div>

        <div className="space-y-1">
          <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Account Name</label>
          <input
            type="text"
            placeholder="e.g. UPI, Cash, Bank, Etc."
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
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>Sticker Color</label>
            <label className="flex items-center gap-1 text-[10px] font-cartoon font-bold cursor-pointer">
              <span className={ui.textSecondary}>Custom Hex</span>
              <input
                type="color"
                value={newWalletColor}
                onChange={(e) => setNewWalletColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
              />
            </label>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {WALLET_COLORS.map((hex) => (
              <button
                type="button"
                key={hex}
                onClick={() => setNewWalletColor(hex)}
                style={{ backgroundColor: hex }}
                className={`w-7 h-7 rounded-full border-2 border-[#111110] shrink-0 transition-transform key-press ${
                  newWalletColor === hex ? 'scale-110 ring-2 ring-[#D8CBB3] shadow-[0_2px_0_#111110]' : 'opacity-75'
                }`}
              />
            ))}
          </div>
        </div>

        <IconLibraryPicker
          selectedIcon={newWalletIcon}
          onSelectIcon={setNewWalletIcon}
          ui={ui}
          defaultGroup="Money"
        />

        <div className="flex items-center gap-2 pt-1">
          {editingWalletId && (
            <button
              type="button"
              onClick={() => onDelete(editingWalletId)}
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
  );
}

export function CategoryModal({
  ui,
  editingCatId,
  newCatName,
  setNewCatName,
  newCatType,
  setNewCatType,
  newCatIcon,
  setNewCatIcon,
  newCatBudget,
  setNewCatBudget,
  onSave,
  onClose
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSave}
        className={`w-full max-w-md max-h-[88vh] overflow-y-auto custom-scroll rounded-3xl p-5 space-y-3.5 shadow-[0_8px_0_#111110] animate-sheet-up ${ui.sheetBg}`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
      >
        <div className="w-12 h-1.5 rounded-full bg-[#D8CBB3]/40 mx-auto" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-[#D8CBB3] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_2px_0_#111110] flex items-center justify-center text-base">
              {newCatIcon}
            </span>
            <h3 className={`text-base font-cartoon font-bold ${ui.textPrimary}`}>
              {editingCatId ? 'Edit Category' : 'New Category'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
              Monthly Limit (Optional)
            </label>
            <input
              type="number"
              placeholder="No limit"
              value={newCatBudget}
              onChange={(e) => setNewCatBudget(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none ${ui.input}`}
            />
          </div>
        </div>

        <IconLibraryPicker
          selectedIcon={newCatIcon}
          onSelectIcon={setNewCatIcon}
          ui={ui}
          defaultGroup="All"
        />

        <button
          type="submit"
          className={`w-full py-3 rounded-xl text-xs font-cartoon font-bold key-press ${ui.primaryBtnExpense}`}
        >
          {editingCatId ? 'Update Category' : 'Save Category'}
        </button>
      </form>
    </div>
  );
}

export function EditTransactionModal({
  ui,
  editingTx,
  currencySymbol,
  editTxAmount,
  setEditTxAmount,
  editTxWalletId,
  setEditTxWalletId,
  editTxToWalletId,
  setEditTxToWalletId,
  editTxCategoryId,
  setEditTxCategoryId,
  editTxNote,
  setEditTxNote,
  wallets,
  categories,
  onSave,
  onDelete,
  onClose
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSave}
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
            onClick={onClose}
            className={`text-xs font-cartoon font-bold px-3 py-1 rounded-full key-press ${ui.pillIdle}`}
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
              Amount ({currencySymbol})
            </label>
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
            onClick={() => onDelete(editingTx.id)}
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
  );
}