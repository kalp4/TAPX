import React from 'react';
import { getCategoryAccentColor } from '../utils/formatters';

export default function SettingsTab({
  ui,
  tabAnimClass,
  themePref,
  setThemePref,
  settingsSection,
  setSettingsSection,
  personalApiUrl,
  copyToClipboard,
  copiedField,
  handleOneTapShortcut,
  settings,
  handleRegenerateToken,
  categories,
  currentMonthSpendByCat,
  currencySymbol,
  onOpenNewCategory,
  openEditCategory,
  handleDeleteCategory,
  confirmDeleteId,
  session,
  onSync,
  handleLogout
}) {
  const settingsSubIndex = settingsSection === 'shortcut' ? 0 : 1;

  return (
    <div className={`flex-1 min-h-0 flex flex-col gap-3 overflow-hidden ${tabAnimClass}`}>
      {/* Appearance Mode Selector */}
      <div className={`p-3.5 rounded-2xl flex items-center justify-between shrink-0 ${ui.card}`}>
        <div>
          <p className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>Theme Vibe</p>
          <p className={`text-[10px] font-medium ${ui.textMuted}`}>Charcoal #1e1e1c &amp; Sand #D8CBB3</p>
        </div>
        <div className={`flex p-0.5 rounded-xl ${ui.segmentedBg}`}>
          {[
            { id: 'system', label: 'Auto' },
            { id: 'light', label: 'Sand' },
            { id: 'dark', label: 'Charcoal' }
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setThemePref(m.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-cartoon font-bold transition-all duration-200 ${
                themePref === m.id ? `${ui.segmentedThumb} ${ui.segmentedTextActive}` : ui.textSecondary
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Animated Sliding Sub-Section Switcher */}
      <div className={`relative grid grid-cols-2 p-1 rounded-2xl shrink-0 ${ui.segmentedBg}`}>
        <div
          className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl transition-transform duration-300 ios-spring ${ui.segmentedThumb}`}
          style={{ transform: `translate3d(${settingsSubIndex * 100}%, 0, 0)` }}
        />
        <button
          type="button"
          onClick={() => setSettingsSection('shortcut')}
          className={`relative z-10 py-1.5 rounded-xl text-xs font-cartoon transition-colors duration-200 ${
            settingsSection === 'shortcut' ? ui.segmentedTextActive : `${ui.textSecondary} font-semibold`
          }`}
        >
          ⚡ Back Tap Setup
        </button>
        <button
          type="button"
          onClick={() => setSettingsSection('budgets')}
          className={`relative z-10 py-1.5 rounded-xl text-xs font-cartoon transition-colors duration-200 ${
            settingsSection === 'budgets' ? ui.segmentedTextActive : `${ui.textSecondary} font-semibold`
          }`}
        >
          🏷️ Categories
        </button>
      </div>

      {/* SUB-VIEW 1: BACK TAP SHORTCUT */}
      {settingsSection === 'shortcut' && (
        <div key="sub-shortcut" className="flex-1 min-h-0 custom-scroll space-y-3 pr-0.5 pb-1 animate-tab-left">
          <div className={`p-4 rounded-2xl space-y-3 ${ui.card}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-xs font-cartoon font-bold ${ui.textPrimary}`}>1-Tap Back Tap Installer</h3>
                <p className={`text-[10px] font-medium ${ui.textMuted}`}>
                  Log from Lock Screen with double-tap on the back of your iPhone
                </p>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#D8CBB3] text-[#1e1e1c] border-2 border-[#111110] font-cartoon font-bold">
                iOS
              </span>
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
                Your Personal Shortcut URL
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={personalApiUrl}
                  className={`flex-1 rounded-xl px-2.5 py-2 text-[11px] font-mono ${ui.input}`}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(personalApiUrl, 'apiUrl')}
                  className={`px-3 py-2 rounded-xl text-xs font-cartoon font-bold shrink-0 key-press ${ui.pillIdle}`}
                >
                  {copiedField === 'apiUrl' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOneTapShortcut}
              className={`w-full py-3 px-4 rounded-xl font-cartoon font-bold text-xs key-press ${ui.primaryBtnExpense}`}
            >
              Copy Personal URL &amp; Install Shortcut
            </button>

            <div className={`pt-2 border-t-2 border-dashed space-y-1.5 text-[11px] ${ui.divider} ${ui.textSecondary}`}>
              <p className={`font-cartoon font-bold ${ui.textPrimary}`}>Quick Setup (10 Seconds):</p>
              <ol className="list-decimal list-inside space-y-1 leading-relaxed font-medium">
                <li>Tap the button above (your Personal URL copies automatically).</li>
                <li>
                  When Apple Shortcuts opens, tap <strong>Paste</strong> into the setup prompt and tap{' '}
                  <strong>Add Shortcut</strong>.
                </li>
                <li>
                  Go to iPhone <strong>Settings → Accessibility → Touch → Back Tap → Double Tap</strong> and select{' '}
                  <strong>Log to TAPX</strong>.
                </li>
              </ol>
            </div>
          </div>

          {/* Token Box */}
          <div className={`p-3.5 rounded-2xl space-y-1.5 ${ui.card}`}>
            <label className={`text-[10px] font-cartoon font-bold uppercase ${ui.textMuted}`}>
              Shortcut Security Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={settings?.shortcut_token || ''}
                className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-mono ${ui.input}`}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(settings?.shortcut_token, 'token')}
                className={`px-3 py-1.5 rounded-xl text-xs font-cartoon font-bold key-press ${ui.pillIdle}`}
              >
                {copiedField === 'token' ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={handleRegenerateToken}
                className={`px-3 py-1.5 rounded-xl text-xs font-cartoon font-bold key-press ${ui.pillIdle}`}
                title="Regenerate Token"
              >
                ↻
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: CATEGORIES */}
      {settingsSection === 'budgets' && (
        <div key="sub-budgets" className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden animate-tab-right">
          <div className="flex items-center justify-between shrink-0">
            <span className={`text-[11px] font-cartoon font-bold ${ui.textMuted}`}>
              {categories.length} Categories
            </span>
            <button
              type="button"
              onClick={onOpenNewCategory}
              className={`text-xs px-3 py-1 rounded-full font-cartoon font-bold key-press ${ui.pillActive}`}
            >
              + Add Category
            </button>
          </div>

          <div className="flex-1 min-h-0 custom-scroll space-y-2 pr-0.5 pb-1">
            {categories.map((c, idx) => {
              const spent = currentMonthSpendByCat[c.id] || 0;
              const budget = Number(c.monthly_budget) || 0;
              const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
              const accent = getCategoryAccentColor(c, idx);

              return (
                <div
                  key={c.id}
                  onClick={() => openEditCategory(c)}
                  className={`p-3 rounded-2xl space-y-2 cursor-pointer key-press ${ui.card}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-8 h-8 rounded-xl border-2 border-[#111110] flex items-center justify-center text-sm shrink-0"
                        style={{ backgroundColor: accent }}
                      >
                        {c.icon}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-cartoon font-bold truncate ${ui.textPrimary}`}>{c.name}</p>
                        <p className={`text-[10px] font-semibold capitalize ${ui.textMuted}`}>
                          {c.type} {budget > 0 ? `· ${pct}% of limit` : ''}
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1.5 tabular-nums shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.type === 'expense' && (
                        <span className={`text-xs font-cartoon font-bold mr-1 ${ui.textSand}`}>
                          {currencySymbol}
                          {spent.toLocaleString('en-IN')}
                          {budget > 0 ? ` / ${currencySymbol}${budget.toLocaleString('en-IN')}` : ''}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditCategory(c)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-cartoon font-bold key-press ${ui.pillIdle}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-cartoon font-bold key-press ${
                          confirmDeleteId === c.id
                            ? 'bg-[#F26B5B] text-[#1e1e1c] border-2 border-[#111110]'
                            : `${ui.textMuted} hover:text-[#F26B5B]`
                        }`}
                      >
                        {confirmDeleteId === c.id ? 'Sure?' : '✕'}
                      </button>
                    </div>
                  </div>
                  {budget > 0 && c.type === 'expense' && (
                    <div className="w-full h-2.5 rounded-full overflow-hidden bg-[#181816] border border-[#111110] p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ios-spring ${
                          pct >= 90 ? 'bg-[#F26B5B]' : pct >= 75 ? 'bg-[#F4B942]' : 'bg-[#52B788]'
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

      {/* Account Footer */}
      <div className={`pt-2 border-t-2 border-dashed flex items-center justify-between shrink-0 ${ui.divider}`}>
        <span className={`text-[11px] font-semibold truncate max-w-[180px] ${ui.textMuted}`}>
          {session?.user?.email}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSync}
            className={`px-3 py-1.5 rounded-full text-xs font-cartoon font-bold key-press ${ui.pillIdle}`}
          >
            Sync
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-full bg-[#F26B5B] text-[#1e1e1c] border-2 border-[#111110] shadow-[0_3px_0_#111110] text-xs font-cartoon font-bold key-press"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
