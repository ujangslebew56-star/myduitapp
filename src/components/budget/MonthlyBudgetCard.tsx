import React, { useState } from 'react';
import { Target, AlertTriangle, ShieldCheck, ChevronRight, SlidersHorizontal, Sparkles, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../lib/constants';
import { useTheme } from '../../context/ThemeContext';
import { SetBudgetModal } from './SetBudgetModal';

interface MonthlyBudgetCardProps {
  monthlyBudget: number;
  currentExpense: number;
  onUpdateBudget: (amount: number) => Promise<void>;
}

export const MonthlyBudgetCard: React.FC<MonthlyBudgetCardProps> = ({
  monthlyBudget,
  currentExpense,
  onUpdateBudget,
}) => {
  const { primaryColor } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Month & Day calculations
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
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const remainingDays = Math.max(1, totalDaysInMonth - currentDay);

  const hasBudget = monthlyBudget > 0;
  const percentage = hasBudget ? (currentExpense / monthlyBudget) * 100 : 0;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const remainingBudget = monthlyBudget - currentExpense;
  const isOverBudget = remainingBudget < 0;

  // Daily pace calculation
  const suggestedDailySpend = hasBudget && remainingBudget > 0 ? Math.round(remainingBudget / remainingDays) : 0;

  // Visual status styling
  let statusColor = primaryColor;
  let statusBg = `${primaryColor}15`;
  let statusText = 'Aman & Terkendali';
  let StatusIcon = ShieldCheck;

  if (isOverBudget) {
    statusColor = '#EF4444';
    statusBg = 'rgba(239, 68, 68, 0.15)';
    statusText = 'Melebihi Anggaran!';
    StatusIcon = AlertTriangle;
  } else if (percentage >= 90) {
    statusColor = '#F97316';
    statusBg = 'rgba(249, 115, 22, 0.15)';
    statusText = 'Hampir Habis';
    StatusIcon = AlertTriangle;
  } else if (percentage >= 75) {
    statusColor = '#F59E0B';
    statusBg = 'rgba(245, 158, 11, 0.15)';
    statusText = 'Waspada Pengeluaran';
    StatusIcon = AlertTriangle;
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5 transition-all space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>Anggaran Bulanan</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {currentMonthName}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {hasBudget
                  ? 'Pantau batas pengeluaran agar tidak defisit'
                  : 'Tetapkan batas maksimal belanja bulanan Anda'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-edit-monthly-budget"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
            title="Ubah batasan anggaran pengeluaran"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{hasBudget ? 'Ubah' : 'Atur'}</span>
          </button>
        </div>

        {hasBudget ? (
          <div className="space-y-3.5">
            {/* Main Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Batasan Anggaran */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-medium block mb-0.5">
                  🎯 Batas Anggaran:
                </span>
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                  {formatCurrency(monthlyBudget)}
                </span>
              </div>

              {/* Total Pengeluaran */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-medium block mb-0.5 flex items-center gap-1">
                  <span>📉 Terpakai ({Math.round(percentage)}%):</span>
                </span>
                <span className="font-mono font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
                  {formatCurrency(currentExpense)}
                </span>
              </div>

              {/* Sisa / Defisit Anggaran */}
              <div
                className="col-span-2 sm:col-span-1 p-3 rounded-2xl border transition-colors"
                style={{
                  backgroundColor: isOverBudget ? 'rgba(239, 68, 68, 0.08)' : `${primaryColor}0d`,
                  borderColor: isOverBudget ? 'rgba(239, 68, 68, 0.25)' : `${primaryColor}30`,
                }}
              >
                <span className="text-[10px] text-slate-400 font-medium block mb-0.5">
                  {isOverBudget ? '⚠️ Melebihi Anggaran:' : '💰 Sisa Anggaran:'}
                </span>
                <span
                  className={`font-mono font-bold text-xs sm:text-sm ${
                    isOverBudget
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isOverBudget ? `+${formatCurrency(Math.abs(remainingBudget))}` : formatCurrency(remainingBudget)}
                </span>
              </div>
            </div>

            {/* Bilah Kemajuan (Progress Bar) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold flex items-center gap-1" style={{ color: statusColor }}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span>{statusText}</span>
                </span>
                <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                  {percentage.toFixed(1)}% terpakai
                </span>
              </div>

              {/* Multi-tier Progress Bar Track */}
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out shadow-xs"
                  style={{
                    width: `${clampedPercentage}%`,
                    backgroundColor: statusColor,
                  }}
                />
              </div>
            </div>

            {/* Recommendations & Daily Pace */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Sisa <strong>{remainingDays} hari</strong> di bulan ini
                </span>
              </div>
              {!isOverBudget && (
                <div>
                  Batas belanja harian:{' '}
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {formatCurrency(suggestedDailySpend)} / hari
                  </strong>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty State - Quick Setup Prompt */
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-center sm:justify-start gap-1">
                <span>🎯 Mulai Kontrol Keuangan Bulan Ini</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              </span>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 max-w-sm">
                Tentukan batasan pengeluaran bulanan agar aplikasi dapat memberikan peringatan dini dan menjaga keuangan Anda.
              </p>
            </div>

            <button
              type="button"
              id="btn-set-initial-budget"
              onClick={() => setIsModalOpen(true)}
              className="py-2 px-4 rounded-xl text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
              style={{ backgroundColor: primaryColor }}
            >
              + Tetapkan Anggaran
            </button>
          </div>
        )}
      </div>

      <SetBudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentBudget={monthlyBudget}
        currentExpense={currentExpense}
        onSaveBudget={onUpdateBudget}
      />
    </>
  );
};
