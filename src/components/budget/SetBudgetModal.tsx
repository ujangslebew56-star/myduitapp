import React, { useState, useEffect } from 'react';
import { Target, X, Check, Trash2, HelpCircle } from 'lucide-react';
import { formatCurrency, formatNumberWithDots, parseNumberFromDots } from '../../lib/constants';
import { useTheme } from '../../context/ThemeContext';

interface SetBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
  currentExpense: number;
  onSaveBudget: (amount: number) => Promise<void>;
}

export const SetBudgetModal: React.FC<SetBudgetModalProps> = ({
  isOpen,
  onClose,
  currentBudget,
  currentExpense,
  onSaveBudget,
}) => {
  const { primaryColor } = useTheme();
  const [budgetString, setBudgetString] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBudgetString(currentBudget > 0 ? formatNumberWithDots(currentBudget) : '');
    }
  }, [isOpen, currentBudget]);

  if (!isOpen) return null;

  const currentNumericValue = parseNumberFromDots(budgetString) || 0;
  const simulatedPercent =
    currentNumericValue > 0 ? Math.round((currentExpense / currentNumericValue) * 100) : 0;

  const quickPresets = [1500000, 3000000, 5000000, 7500000, 10000000, 15000000];

  const handleQuickSelect = (val: number) => {
    setBudgetString(formatNumberWithDots(val));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveBudget(currentNumericValue);
      onClose();
    } catch (err) {
      console.error('Failed to save budget:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBudget = async () => {
    setIsSaving(true);
    try {
      await onSaveBudget(0);
      onClose();
    } catch (err) {
      console.error('Failed to remove budget:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const now = new Date();
  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const currentMonthName = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Atur Anggaran Bulanan
              </h3>
              <p className="text-[11px] text-slate-400">Periode {currentMonthName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Current Spend Context */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Pengeluaran Saat Ini:</span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                {formatCurrency(currentExpense)}
              </span>
            </div>
            {currentNumericValue > 0 && (
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Estimasi Terpakai:</span>
                <span
                  className={`text-xs font-bold font-mono ${
                    simulatedPercent > 100
                      ? 'text-rose-600 dark:text-rose-400'
                      : simulatedPercent > 80
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {simulatedPercent}%
                </span>
              </div>
            )}
          </div>

          {/* Budget Input Field */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Batas Maksimal Pengeluaran (Rupiah):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={budgetString}
                onChange={(e) => setBudgetString(formatNumberWithDots(e.target.value))}
                placeholder="0"
                className="w-full pl-11 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              <span>Masukkan nominal batas pengeluaran yang ingin Anda jaga setiap bulan.</span>
            </p>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
              Pilihan Cepat Nominal:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {quickPresets.map((val) => {
                const isSelected = currentNumericValue === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickSelect(val)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {val >= 1000000 ? `${val / 1000000} Juta` : formatNumberWithDots(val)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          {currentBudget > 0 ? (
            <button
              type="button"
              onClick={handleRemoveBudget}
              disabled={isSaving}
              className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Batasan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Batal
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || currentNumericValue <= 0}
            className="py-2.5 px-5 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 transition-transform active:scale-95"
            style={{ backgroundColor: primaryColor }}
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Batasan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
