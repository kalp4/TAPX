import React from 'react';
import TapxLogo from './TapxLogo';

export default function LoginScreen({
  ui,
  savedAccounts,
  onGoogleLogin,
  onRemoveSavedAccount
}) {
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
                      <p className={`text-xs font-bold truncate ${ui.textPrimary}`}>
                        {acc.name}
                      </p>
                      <p className={`text-[11px] truncate ${ui.textSecondary}`}>
                        {acc.email}
                      </p>
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
