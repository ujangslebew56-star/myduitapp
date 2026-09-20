import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  handleFirestoreError,
  OperationType 
} from '../../lib/firebase';
import { Debt } from '../../types';
import { formatCurrency } from '../../lib/constants';
import { HandCoins, ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';

interface DebtsOverviewSectionProps {
  onViewAllDebts: () => void;
}

export const DebtsOverviewSection: React.FC<DebtsOverviewSectionProps> = ({ onViewAllDebts }) => {
  const { currentUser } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'debts'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Debt[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Debt, 'id'>) }));
        setDebts(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'debts');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const totalReceivable = debts
    .filter((d) => d.type === 'receivable' && d.status !== 'paid')
    .reduce((acc, d) => acc + (d.remainingAmount ?? d.amount), 0);

  const totalDebt = debts
    .filter((d) => d.type === 'debt' && d.status !== 'paid')
    .reduce((acc, d) => acc + (d.remainingAmount ?? d.amount), 0);

  const activeCount = debts.filter((d) => d.status !== 'paid').length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base">⚖️</span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Catatan Hutang & Piutang
          </h2>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              {activeCount} Aktif
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onViewAllDebts}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
        >
          <span>Kelola</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Piutang (Uang di Orang Lain) */}
        <div 
          onClick={onViewAllDebts}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>📥</span>
              <span>Piutang Saya</span>
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalReceivable)}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
            Uang Anda yang dipinjam orang
          </span>
        </div>

        {/* Hutang (Kewajiban Bayar) */}
        <div 
          onClick={onViewAllDebts}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-rose-300 dark:hover:border-rose-700/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span>📤</span>
              <span>Hutang Saya</span>
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
            {formatCurrency(totalDebt)}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
            Pinjaman yang harus dilunasi
          </span>
        </div>
      </div>
    </div>
  );
};
