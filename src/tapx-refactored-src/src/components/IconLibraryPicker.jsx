import React, { useState, useMemo } from 'react';
import { ICON_CATALOG, ICON_GROUPS } from '../constants/icons';

export default function IconLibraryPicker({
  selectedIcon,
  onSelectIcon,
  ui,
  defaultGroup = 'All'
}) {
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

      {/* Search + Group Pills */}
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

      {/* Scrollable Multi-Row Icon Grid */}
      <div
        className={`grid grid-cols-7 gap-1.5 max-h-36 overflow-y-auto custom-scroll p-2 rounded-2xl ${ui.cardSubtle}`}
      >
        {filteredIcons.length === 0 ? (
          <div className={`col-span-7 py-4 text-center text-xs font-cartoon ${ui.textMuted}`}>
            No match—type any emoji in the Custom box above!
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
