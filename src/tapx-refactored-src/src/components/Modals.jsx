import React from 'react';
import { WALLET_COLORS } from '../constants/theme';
import IconLibraryPicker from './IconLibraryPicker';

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
            placeholder="e.g. UPI, Cash, FamPay, HDFC"
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
