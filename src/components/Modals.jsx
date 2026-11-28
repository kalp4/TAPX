import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { WALLET_TYPES, WALLET_COLORS, CHART_COLORS, ICON_CATALOG, ICON_GROUPS } from '../constants';
import { getCategoryAccentColor } from '../analytics';
import { playQuickChip } from '../sounds';

export function TapxLogo({ className = 'w-16 h-16' }) {
  return (
    <svg
      viewBox="70 50 375 415"
      className={`${className} shrink-0 select-none`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
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
      <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
        aria-hidden="true"
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
        aria-hidden="true"
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
      aria-hidden="true"
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

function BottomSheet({
  ui,
  title,
  headerIcon,
  headerIconBg,
  capitalizeTitle = false,
  onClose,
  onSubmit,
  busy,
  children
}) {
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => {
      cancelAnimationFrame(raf);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const triggerClose = useCallback(() => {
    if (closing || busy) return;
    setClosing(true);
    setEntered(false);
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 210);
  }, [busy, closing, onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') triggerClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerClose]);

  const handleDragStart = (clientY) => {
    touchStartYRef.current = clientY;
    touchStartTimeRef.current = Date.now();
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handleDragMove = (clientY) => {
    if (!isDraggingRef.current) return;
    const delta = Math.max(0, clientY - touchStartYRef.current);
    setDragY(delta);
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const elapsed = Math.max(1, Date.now() - touchStartTimeRef.current);
    const velocity = dragY / elapsed;
    setIsDragging(false);

    if (dragY > 85 || velocity > 0.55) {
      triggerClose();
    } else {
      setDragY(0);
    }
  };

  const sheetTransform = !entered
    ? 'translate3d(0, 100%, 0)'
    : dragY > 0
    ? `translate3d(0, ${dragY}px, 0)`
    : 'translate3d(0, 0, 0)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={triggerClose}
      className={`fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end justify-center p-3 transition-opacity duration-200 ${
        entered && !closing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        aria-busy={busy}
        className={`w-full max-w-md max-h-[88dvh] overflow-y-auto custom-scroll rounded-3xl p-5 pt-2.5 space-y-3.5 ${ui.sheetBg}`}
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
          transform: sheetTransform,
          transition: isDragging
            ? 'none'
            : 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)'
        }}
      >
        {/* Swipe-down Handle Zone */}
        <div
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
          onTouchEnd={handleDragEnd}
          onTouchCancel={handleDragEnd}
          onPointerDown={(e) => {
            if (e.pointerType !== 'touch') {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleDragStart(e.clientY);
            }
          }}
          onPointerMove={(e) => {
            if (e.pointerType !== 'touch' && isDraggingRef.current) handleDragMove(e.clientY);
          }}
          onPointerUp={(e) => {
            if (e.pointerType !== 'touch') handleDragEnd();
          }}
          className="pt-1 pb-2 -mx-5 px-5 flex justify-center cursor-grab active:cursor-grabbing touch-none"
          aria-label="Swipe down to close"
        >
          <div className={`w-12 h-1.5 rounded-full ${ui.sheetHandle}`} />
        </div>

        <fieldset disabled={busy || closing} className="min-w-0 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {headerIcon && (
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${ui.iconBadge}`}
                  style={{ backgroundColor: headerIconBg || '#D8CBB3' }}
                >
                  {headerIcon}
                </span>
              )}
              <h3
                className={`text-base font-cartoon font-bold truncate ${
                  capitalizeTitle ? 'capitalize' : ''
                } ${ui.textPrimary}`}
              >
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={triggerClose}
              aria-label="Close modal"
              className={`text-xs font-cartoon font-bold px-3 py-1.5 rounded-full shrink-0 key-press ${ui.pillIdle}`}
            >
              Close
            </button>
          </div>

          {children}
        </fieldset>
      </form>
    </div>
  );
}

function ColorSwatchPicker({ ui, label = 'Sticker Color', colors, value, onChange }) {
  const isCustomHex = !colors.some((hex) => hex.toLowerCase() === String(value || '').toLowerCase());

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
          {label}
        </label>
        <span className={`text-[11px] font-mono font-bold uppercase ${ui.textMuted}`}>{value}</span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5">
        {colors.map((hex) => {
          const selected = String(value || '').toLowerCase() === hex.toLowerCase();
          return (
            <button
              type="button"
              key={hex}
              aria-label={`Select color ${hex}`}
              aria-pressed={selected}
              onClick={() => {
                playQuickChip();
                onChange(hex);
              }}
              style={{ backgroundColor: hex }}
              className={`w-8 h-8 rounded-full border-2 shrink-0 transition-transform key-press ${ui.badgeBorder} ${
                selected ? 'scale-110 ring-2 ring-[#D8CBB3]' : 'opacity-80'
              }`}
            />
          );
        })}
        <label
          title="Pick custom hex color"
          className={`relative w-8 h-8 rounded-full border-2 shrink-0 flex items-center justify-center cursor-pointer key-press ${
            ui.badgeBorder
          } ${isCustomHex ? 'scale-110 ring-2 ring-[#D8CBB3]' : ''}`}
          style={{
            background: isCustomHex
              ? value
              : 'conic-gradient(from 0deg, #F26B5B, #F4B942, #52B788, #5C9EAD, #9B7EDE, #F26B5B)'
          }}
        >
          <span
            className={`w-3.5 h-3.5 rounded-full border text-[10px] font-bold flex items-center justify-center bg-[#FAF6EE] text-[#1e1e1c] ${ui.badgeBorder}`}
            aria-hidden="true"
          >
            +
          </span>
          <input
            type="color"
            aria-label="Custom sticker hex color"
            value={value || colors[0]}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        </label>
      </div>
    </div>
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
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
          Icon ({ICON_CATALOG.length}+ or any emoji)
        </label>
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-semibold ${ui.textSecondary}`}>Custom:</span>
          <input
            type="text"
            value={selectedIcon}
            onChange={handleCustomEmojiInput}
            placeholder="😀"
            aria-label="Custom emoji"
            title="Tap to type any emoji from your keyboard"
            className={`w-12 h-10 text-center rounded-xl text-[16px] font-bold focus:outline-none ${ui.input}`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${ui.input}`}>
          <span className="text-sm opacity-65" aria-hidden="true">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search icons (coffee, fuel, gym)..."
            aria-label="Search icons"
            className="w-full bg-transparent text-[16px] leading-snug font-medium focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear icon search"
              className={`p-1 text-xs font-bold ${ui.textMuted}`}
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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
                className={`px-3 py-1.5 rounded-xl text-[11px] font-cartoon font-bold shrink-0 key-press ${
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
            No match — type any emoji in the custom box above!
          </div>
        ) : (
          filteredIcons.map((item, idx) => {
            const isSelected = selectedIcon === item.icon;
            return (
              <button
                key={`${item.icon}-${idx}`}
                type="button"
                aria-label={`Select ${item.icon} icon`}
                aria-pressed={isSelected}
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

export function LoginScreen({ ui, savedAccounts, loginError, onGoogleLogin, onRemoveSavedAccount }) {
  return (
    <div
      className={`h-full w-full ${ui.bg} ${ui.appFrame} flex flex-col justify-between gap-3 px-7 max-w-md mx-auto custom-scroll select-none relative`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 20px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)'
      }}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-72 z-0 ${ui.ambientGlow}`}
      />
      {loginError && <p role="alert" className={`relative z-10 p-3 rounded-2xl text-sm ${ui.warningBanner}`}>{loginError}</p>}

      <div className="relative z-10 flex flex-col items-center text-center space-y-3">
        <div className="p-3 rounded-[32px] bg-[#282825] border-2 border-[#111110] shadow-[0_6px_0_#111110] mb-1">
          <TapxLogo className="w-24 h-24" />
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-cartoon font-bold uppercase tracking-wider bg-[#D8CBB3] text-[#1e1e1c] border-2 shadow-[0_2px_0_#111110] ${ui.outline}`}
        >
          Pocket Expense Buddy
        </span>
        <h1 className={`text-4xl font-cartoon font-bold tracking-tight ${ui.textPrimary}`}>
          TAPX
        </h1>
        <p className={`text-sm max-w-[260px] font-medium leading-relaxed ${ui.textSecondary}`}>
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
                  className={`w-full p-3 rounded-2xl flex items-center justify-between cursor-pointer key-press ${ui.cardElevated}`}
                >
                  <button type="button" onClick={() => onGoogleLogin(acc.email)} className="flex flex-1 items-center gap-3 min-w-0 text-left">
                    {acc.avatar ? (
                      <img
                        src={acc.avatar}
                        alt={acc.name}
                        className={`w-10 h-10 rounded-full object-cover shrink-0 border-2 ${ui.badgeBorder}`}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full bg-[#D8CBB3] text-[#1e1e1c] border-2 font-cartoon font-bold text-sm flex items-center justify-center shrink-0 ${ui.badgeBorder}`}
                      >
                        {String(acc.name || acc.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <p className={`text-xs font-bold truncate ${ui.textPrimary}`}>{acc.name}</p>
                      <p className={`text-[11px] truncate ${ui.textSecondary}`}>{acc.email}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${acc.email} from saved accounts`}
                    onClick={(e) => onRemoveSavedAccount(acc.email, e)}
                    className={`p-2 text-xs rounded-xl font-bold ${ui.textMuted} hover:text-[#F26B5B]`}
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
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
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
  busy,
  onSave,
  onDelete,
  onClose
}) {
  const walletTypeOptions = WALLET_TYPES.includes(newWalletType)
    ? WALLET_TYPES
    : [newWalletType, ...WALLET_TYPES].filter(Boolean);

  return (
    <BottomSheet
      ui={ui}
      title={editingWalletId ? 'Edit Account' : 'New Account'}
      headerIcon={newWalletIcon || '💳'}
      headerIconBg={newWalletColor}
      onClose={onClose}
      busy={busy}
      onSubmit={onSave}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
            Account Name
          </label>
          <input
            type="text"
            placeholder="e.g. UPI, Cash"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            className={`w-full rounded-xl px-3 py-2.5 text-[16px] leading-snug font-semibold focus:outline-none ${ui.input}`}
            required
          />
        </div>
        <div className="space-y-1">
          <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
            Balance
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={newWalletBalance}
            onChange={(e) => setNewWalletBalance(e.target.value)}
            className={`w-full rounded-xl px-3 py-2.5 text-[16px] leading-snug font-semibold tabular-nums focus:outline-none ${ui.input}`}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
          Account Type
        </label>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {walletTypeOptions.map((wt) => {
            const active = newWalletType === wt;
            return (
              <button
                key={wt}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  playQuickChip();
                  setNewWalletType(wt);
                }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-cartoon font-bold shrink-0 key-press ${
                  active ? ui.pillActive : ui.pillIdle
                }`}
              >
                {wt}
              </button>
            );
          })}
        </div>
      </div>

      <ColorSwatchPicker
        ui={ui}
        colors={WALLET_COLORS}
        value={newWalletColor}
        onChange={setNewWalletColor}
      />

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
            className={`px-4 py-3 rounded-xl text-xs font-cartoon font-bold key-press ${
              confirmDeleteId === editingWalletId ? ui.dangerBtn : ui.dangerSoftBtn
            }`}
          >
            {confirmDeleteId === editingWalletId ? 'Tap to Confirm' : 'Delete'}
          </button>
        )}
        <button
          type="submit"
          className={`flex-1 py-3 rounded-xl text-xs font-cartoon font-bold key-press ${ui.primaryBtnExpense}`}
        >
          {busy ? 'Working…' : editingWalletId ? 'Save Changes' : 'Create Account'}
        </button>
      </div>
    </BottomSheet>
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
  newCatColor,
  setNewCatColor,
  newCatBudget,
  setNewCatBudget,
  confirmDeleteId,
  busy,
  onSave,
  onDelete,
  onClose
}) {
  return (
    <BottomSheet
      ui={ui}
      title={editingCatId ? 'Edit Category' : 'New Category'}
      headerIcon={newCatIcon || '🍔'}
      headerIconBg={newCatColor || '#D8CBB3'}
      onClose={onClose}
      busy={busy}
      onSubmit={onSave}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
            Category Name
          </label>
          <input
            type="text"
            placeholder="e.g. Dining Out"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className={`w-full rounded-xl px-3 py-2.5 text-[16px] leading-snug font-semibold focus:outline-none ${ui.input}`}
            required
          />
        </div>
        <div className="space-y-1">
          <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
            Monthly Limit
          </label>
          <input
            type="number"
            placeholder="No limit"
            value={newCatBudget}
            onChange={(e) => setNewCatBudget(e.target.value)}
            className={`w-full rounded-xl px-3 py-2.5 text-[16px] leading-snug font-semibold tabular-nums focus:outline-none ${ui.input}`}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
          Category Type
        </label>
        <div className={`relative grid grid-cols-2 p-1 rounded-2xl ${ui.segmentedBg}`}>
          <div
            aria-hidden="true"
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl transition-transform duration-300 ios-spring ${ui.segmentedThumb}`}
            style={{ transform: `translate3d(${newCatType === 'income' ? 100 : 0}%, 0, 0)` }}
          />
          {[
            { id: 'expense', label: '💸 Expense' },
            { id: 'income', label: '💰 Income' }
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={newCatType === opt.id}
              onClick={() => {
                if (newCatType !== opt.id) playQuickChip();
                setNewCatType(opt.id);
              }}
              className={`relative z-10 py-1.5 rounded-xl text-xs font-cartoon transition-colors duration-200 ${
                newCatType === opt.id ? ui.segmentedTextActive : `${ui.textSecondary} font-semibold`
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <ColorSwatchPicker
        ui={ui}
        colors={CHART_COLORS}
        value={newCatColor || CHART_COLORS[0]}
        onChange={setNewCatColor}
      />

      <IconLibraryPicker
        selectedIcon={newCatIcon}
        onSelectIcon={setNewCatIcon}
        ui={ui}
        defaultGroup="All"
      />

      <div className="flex items-center gap-2 pt-1">
        {editingCatId && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(editingCatId)}
            className={`px-4 py-3 rounded-xl text-xs font-cartoon font-bold key-press ${
              confirmDeleteId === editingCatId ? ui.dangerBtn : ui.dangerSoftBtn
            }`}
          >
            {confirmDeleteId === editingCatId ? 'Tap to Confirm' : 'Delete'}
          </button>
        )}
        <button
          type="submit"
          className={`flex-1 py-3 rounded-xl text-xs font-cartoon font-bold key-press ${ui.primaryBtnExpense}`}
        >
          {busy ? 'Saving…' : editingCatId ? 'Update Category' : 'Save Category'}
        </button>
      </div>
    </BottomSheet>
  );
}

export function EditTransactionModal({
  ui,
  editingTx,
  currencySymbol,
  editTxAmount,
  setEditTxAmount,
  editTxDate,
  setEditTxDate,
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
  busy,
  onSave,
  onDelete,
  onClose
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const handleDeleteTap = () => {
    if (!confirmDelete) {
      playQuickChip();
      setConfirmDelete(true);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    onDelete(editingTx.id);
  };

  const matchingCategories = categories.filter((c) => c.type === editingTx.type);
  const selectedCatIdx = matchingCategories.findIndex((c) => c.id === editTxCategoryId);
  const selectedCatObj = selectedCatIdx >= 0 ? matchingCategories[selectedCatIdx] : null;
  const headerIcon =
    editingTx.type === 'transfer'
      ? '⇄'
      : selectedCatObj?.icon || (editingTx.type === 'income' ? '💰' : '💸');
  const headerIconBg =
    editingTx.type === 'transfer'
      ? '#F4B942'
      : editingTx.type === 'income'
      ? '#52B788'
      : getCategoryAccentColor(selectedCatObj, Math.max(0, selectedCatIdx));

  const handleSelectFromWallet = (walletId) => {
    playQuickChip();
    if (editingTx.type === 'transfer' && walletId === editTxToWalletId) {
      setEditTxToWalletId(editTxWalletId);
    }
    setEditTxWalletId(walletId);
  };

  const handleSwapEditTransferWallets = () => {
    if (!editTxWalletId || !editTxToWalletId || editTxWalletId === editTxToWalletId) return;
    playQuickChip();
    const prevFrom = editTxWalletId;
    setEditTxWalletId(editTxToWalletId);
    setEditTxToWalletId(prevFrom);
  };

  return (
    <BottomSheet
      ui={ui}
      title={`Edit ${editingTx.type}`}
      headerIcon={headerIcon}
      headerIconBg={headerIconBg}
      capitalizeTitle
      onClose={onClose}
      busy={busy}
      onSubmit={onSave}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
            Amount ({currencySymbol})
          </label>
          <input
            type="number"
            step="0.01"
            value={editTxAmount}
            onChange={(e) => setEditTxAmount(e.target.value)}
            className={`w-full rounded-xl px-3 py-2.5 text-[16px] leading-snug font-cartoon font-bold tabular-nums focus:outline-none ${ui.input}`}
            required
          />
        </div>
        <div className="space-y-1">
          <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
            Date
          </label>
          <input
            type="date"
            value={editTxDate}
            onChange={(e) => setEditTxDate(e.target.value)}
            className={`w-full rounded-xl px-3 py-2.5 text-[16px] leading-snug font-semibold focus:outline-none ${ui.input}`}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
            {editingTx.type === 'transfer' ? 'From Account' : 'Account'}
          </label>
          {editingTx.type === 'transfer' && wallets.length > 1 && (
            <button
              type="button"
              onClick={handleSwapEditTransferWallets}
              className="text-[11px] font-cartoon font-bold text-[#F4B942] key-press"
            >
              ⇄ Swap
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {wallets.map((w, idx) => {
            const active = editTxWalletId === w.id;
            const wColor = w.color || WALLET_COLORS[idx % WALLET_COLORS.length];
            return (
              <button
                key={w.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleSelectFromWallet(w.id)}
                style={active ? { backgroundColor: wColor, color: '#1e1e1c' } : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold flex items-center gap-1.5 shrink-0 key-press ${
                  active ? ui.pillSelectedBorder : ui.pillIdle
                }`}
              >
                <span>{w.icon}</span>
                <span>{w.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {editingTx.type === 'transfer' ? (
        <div className="space-y-1.5">
          <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
            To Account
          </label>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {wallets
              .filter((w) => w.id !== editTxWalletId)
              .map((w) => {
                const active = editTxToWalletId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      playQuickChip();
                      setEditTxToWalletId(w.id);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold flex items-center gap-1 shrink-0 key-press ${
                      active ? ui.pillActive : ui.pillIdle
                    }`}
                  >
                    <span>→ {w.icon}</span>
                    <span>{w.name}</span>
                  </button>
                );
              })}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
            Category
          </label>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              aria-pressed={!selectedCatObj}
              onClick={() => {
                playQuickChip();
                setEditTxCategoryId('');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold shrink-0 key-press ${
                !selectedCatObj ? ui.pillActive : ui.pillIdle
              }`}
            >
              Uncategorized
            </button>
            {matchingCategories.map((c, idx) => {
              const active = editTxCategoryId === c.id;
              const accent = getCategoryAccentColor(c, idx);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    playQuickChip();
                    setEditTxCategoryId(c.id);
                  }}
                  style={active ? { backgroundColor: accent, color: '#1e1e1c' } : undefined}
                  className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold flex items-center gap-1.5 shrink-0 key-press ${
                    active ? ui.pillSelectedBorder : ui.pillIdle
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

      <div className="space-y-1">
        <label className={`text-[11px] font-cartoon font-bold uppercase tracking-wide ${ui.textMuted}`}>
          Note
        </label>
        <input
          type="text"
          placeholder="Optional note"
          value={editTxNote}
          onChange={(e) => setEditTxNote(e.target.value)}
          className={`w-full rounded-xl px-3.5 py-2.5 text-[16px] leading-snug font-semibold focus:outline-none ${ui.input}`}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleDeleteTap}
          className={`px-4 py-3 rounded-xl text-xs font-cartoon font-bold key-press ${
            confirmDelete ? ui.dangerBtn : ui.dangerSoftBtn
          }`}
        >
          {confirmDelete ? 'Tap to Confirm' : 'Delete'}
        </button>
        <button
          type="submit"
          className={`flex-1 py-3 rounded-xl text-xs font-cartoon font-bold key-press ${ui.primaryBtnExpense}`}
        >
          {busy ? 'Working…' : 'Save Changes'}
        </button>
      </div>
    </BottomSheet>
  );
}