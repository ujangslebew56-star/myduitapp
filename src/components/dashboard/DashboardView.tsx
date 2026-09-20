import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  handleFirestoreError, 
  OperationType,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from '../../lib/firebase';
import { Wallet, Transaction } from '../../types';
import { formatCurrency, formatDateIndo, getCategoryEmoji } from '../../lib/constants';
import { WalletsSection } from '../wallets/WalletsSection';
import { SavingsGoalSection } from '../savings/SavingsGoalSection';
import { DebtsOverviewSection } from '../debts/DebtsOverviewSection';
import { MonthlyBudgetCard } from '../budget/MonthlyBudgetCard';
import { ConfirmModal } from '../ui/ConfirmModal';
import { EditTransactionModal } from '../transactions/EditTransactionModal';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  ChevronRight, 
  Eye,
  EyeOff,
  Table as TableIcon,
  LayoutList,
  Trash2,
  Edit2,
  Wallet as WalletIcon
} from 'lucide-react';

interface DashboardViewProps {
  onOpenAddModal: () => void;
  onOpenScanner: () => void;
  onViewAllTransactions: () => void;
  onViewAllDebts?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddModal,
  onOpenScanner,
  onViewAllTransactions,
  onViewAllDebts = () => {},
}) => {
  const { currentUser, userProfile, updateMonthlyBudget } = useAuth();
  const { primaryColor } = useTheme();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Toggle hide / show balance
  const [showBalance, setShowBalance] = useState<boolean>(() => {
    return localStorage.getItem('myduit_show_balance') !== 'false';
  });

  // Transaction Edit & Delete State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Totals for current month
  const [thisMonthIncome, setThisMonthIncome] = useState(0);
  const [thisMonthExpense, setThisMonthExpense] = useState(0);

  // Layout preference
  const [tableLayout, setTableLayout] = useState<'table' | 'cards'>('cards');

  const toggleShowBalance = () => {
    setShowBalance((prev) => {
      const next = !prev;
      localStorage.setItem('myduit_show_balance', String(next));
      return next;
    });
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    const t = transactionToDelete;
    setIsDeleting(true);

    try {
      // 1. Revert wallet balance
      if (t.walletId) {
        try {
          const wRef = doc(db, 'wallets', t.walletId);
          const wSnap = await getDoc(wRef);
          if (wSnap.exists()) {
            const wData = wSnap.data();
            const curBal = Number(wData.balance) || 0;
            const revertedBal =
              t.type === 'expense'
                ? curBal + Number(t.amount)
                : t.type === 'income'
                ? curBal - Number(t.amount)
                : curBal + Number(t.amount);

            await updateDoc(wRef, {
              balance: revertedBal,
              updatedAt: Date.now(),
              userId: wData.userId || currentUser?.uid,
            });
          }
        } catch (wErr) {
          console.warn('Reverting wallet balance notice:', wErr);
        }
      }

      // 2. If transfer, revert destination wallet
      if (t.type === 'transfer' && t.toWalletId) {
        try {
          const toRef = doc(db, 'wallets', t.toWalletId);
          const toSnap = await getDoc(toRef);
          if (toSnap.exists()) {
            const toData = toSnap.data();
            const toBal = Number(toData.balance) || 0;
            await updateDoc(toRef, {
              balance: toBal - Number(t.amount),
              updatedAt: Date.now(),
              userId: toData.userId || currentUser?.uid,
            });
          }
        } catch (toErr) {
          console.warn('Reverting destination wallet notice:', toErr);
        }
      }

      // 3. Delete document from Firestore
      await deleteDoc(doc(db, 'transactions', t.id));

      // 4. Update local state immediately
      setRecentTransactions((prev) => prev.filter((item) => item.id !== t.id));
      setTransactionToDelete(null);
    } catch (err: any) {
      console.error('Delete transaction failed:', err);
      alert('Gagal menghapus transaksi: ' + (err?.message || 'Silakan coba lagi'));
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    // 1. Wallets listener
    const qW = query(collection(db, 'wallets'), where('userId', '==', currentUser.uid));
    const unsubW = onSnapshot(
      qW,
      (snapshot) => {
        const list: Wallet[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Wallet, 'id'>) }));
        setWallets(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'wallets');
      }
    );

    // 2. Transactions listener
    const qT = query(collection(db, 'transactions'), where('userId', '==', currentUser.uid));
    const unsubT = onSnapshot(
      qT,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Transaction, 'id'>) }));
        list.sort((a, b) => b.createdAt - a.createdAt);

        setRecentTransactions(list.slice(0, 5));

        // Calculate this month totals
        const curMonth = new Date().getMonth();
        const curYear = new Date().getFullYear();

        let inc = 0;
        let exp = 0;

        list.forEach((t) => {
          if (!t.date) return;
          const d = new Date(t.date);
          if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
            if (t.type === 'income') inc += Number(t.amount) || 0;
            if (t.type === 'expense') exp += Number(t.amount) || 0;
          }
        });

        setThisMonthIncome(inc);
        setThisMonthExpense(exp);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
        setLoading(false);
      }
    );

    return () => {
      unsubW();
      unsubT();
    };
  }, [currentUser]);

  const totalAccumulatedBalance = wallets.reduce((acc, w) => acc + (Number(w.balance) || 0), 0);

  return (
    <div className="space-y-4 pb-6">
      {/* 1. TOTAL SALDO CARD - Exact replica of design photo: Sleek card with subtle gradient background and eye toggle */}
      <div 
        className="relative p-5 rounded-3xl text-white shadow-lg overflow-hidden transition-all"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, #064e3b 50%, #0f172a 100%)`,
        }}
      >
        {/* Subtle decorative mesh background */}
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-24 h-24 rounded-full bg-black/20 blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center">
                <WalletIcon className="w-3.5 h-3.5 text-white/90" />
              </div>
              <span className="text-xs font-semibold text-white/80 tracking-wide">
                Total Saldo Keseluruhan
              </span>
            </div>

            <button
              type="button"
              onClick={toggleShowBalance}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors cursor-pointer"
              title={showBalance ? 'Sembunyikan Saldo' : 'Tampilkan Saldo'}
            >
              {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-medium">{showBalance ? 'Sembunyikan' : 'Tampilkan'}</span>
            </button>
          </div>

          {/* Big Crisp Typography */}
          <div className="font-mono font-black text-3xl sm:text-4xl text-white tracking-tight">
            {showBalance ? formatCurrency(totalAccumulatedBalance) : 'Rp ••••••••'}
          </div>

          {/* In & Out Chips */}
          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/15">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-1 text-emerald-300 text-[11px] font-semibold mb-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Pemasukan Bulan Ini</span>
              </div>
              <div className="font-mono font-bold text-xs sm:text-sm text-white">
                {showBalance ? `+${formatCurrency(thisMonthIncome)}` : '••••••'}
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-1 text-rose-300 text-[11px] font-semibold mb-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Pengeluaran Bulan Ini</span>
              </div>
              <div className="font-mono font-bold text-xs sm:text-sm text-white">
                {showBalance ? `-${formatCurrency(thisMonthExpense)}` : '••••••'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DOMPET SAYA (Horizontal Carousel with Edit & Delete on Cards) */}
      <WalletsSection />

      {/* 3. ANGGARAN BULANAN (Progress Bar) */}
      <MonthlyBudgetCard
        monthlyBudget={Number(userProfile?.monthlyBudget) || 0}
        currentExpense={thisMonthExpense}
        onUpdateBudget={updateMonthlyBudget}
      />

      {/* 4. TARGET IMPIAN & TABUNGAN (Progress Bar) */}
      <SavingsGoalSection />

      {/* 5. CATATAN HUTANG & PIUTANG */}
      <DebtsOverviewSection onViewAllDebts={onViewAllDebts} />

      {/* 6. TRANSAKSI TERAKHIR (Clean List with Category Emojis, Edit ✏️ & Delete 🗑️) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🕒</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Transaksi Terakhir
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setTableLayout('cards')}
                className={`p-1 rounded-md text-xs transition-all ${
                  tableLayout === 'cards'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Tampilan Kartu Bersih"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTableLayout('table')}
                className={`p-1 rounded-md text-xs transition-all ${
                  tableLayout === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Tampilan Tabel Rapi"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              id="btn-view-all-transactions"
              onClick={onViewAllTransactions}
              className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <span>Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Transactions Display */}
        {recentTransactions.length === 0 ? (
          <div className="py-8 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center p-4">
            <span className="text-2xl block mb-1">🍃</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              Belum ada transaksi bulan ini
            </span>
            <span className="text-[11px] text-slate-400">
              Tekan tombol (+) di tengah bawah untuk mencatat pengeluaran ✨
            </span>
          </div>
        ) : tableLayout === 'table' ? (
          /* Clean Minimalist Table */
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="grid grid-cols-12 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="col-span-5">Keterangan</div>
              <div className="col-span-3">Dompet</div>
              <div className="col-span-2 text-right">Nominal</div>
              <div className="col-span-2 text-center">Aksi</div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.map((tx) => {
                const isExp = tx.type === 'expense';
                const isInc = tx.type === 'income';
                const catEmoji = getCategoryEmoji(tx.categoryName, tx.type);

                return (
                  <div
                    key={tx.id}
                    className="grid grid-cols-12 px-3.5 py-2.5 items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="col-span-5 flex items-center gap-2 min-w-0 pr-1">
                      <span className="text-sm shrink-0">{catEmoji}</span>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                          {tx.categoryName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {formatDateIndo(tx.date)}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 min-w-0 pr-1">
                      <span className="inline-block max-w-full truncate px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        {tx.walletName}
                      </span>
                    </div>

                    <div className="col-span-2 text-right">
                      <div
                        className={`font-mono font-bold text-xs ${
                          isExp
                            ? 'text-rose-600 dark:text-rose-400'
                            : isInc
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {isExp ? '-' : isInc ? '+' : ''}
                        {formatCurrency(tx.amount)}
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingTransaction(tx)}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                        title="Edit Transaksi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionToDelete(tx)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Clean Minimalist Cards */
          <div className="space-y-2">
            {recentTransactions.map((tx) => {
              const isExp = tx.type === 'expense';
              const isInc = tx.type === 'income';
              const catEmoji = getCategoryEmoji(tx.categoryName, tx.type);

              return (
                <div
                  key={tx.id}
                  className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base shadow-2xs ${
                        isExp
                          ? 'bg-rose-50 dark:bg-rose-950/50'
                          : isInc
                          ? 'bg-emerald-50 dark:bg-emerald-950/50'
                          : 'bg-blue-50 dark:bg-blue-950/50'
                      }`}
                    >
                      {catEmoji}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                        {tx.categoryName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span>{formatDateIndo(tx.date)}</span>
                        <span>•</span>
                        <span>{tx.walletName}</span>
                        {tx.toWalletName && <span> ➔ {tx.toWalletName}</span>}
                      </div>
                      {tx.note && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic truncate mt-0.5">
                          "{tx.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="text-right">
                      <div
                        className={`font-mono font-bold text-xs sm:text-sm ${
                          isExp
                            ? 'text-rose-600 dark:text-rose-400'
                            : isInc
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {isExp ? '-' : isInc ? '+' : ''}
                        {formatCurrency(tx.amount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setEditingTransaction(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                        title="Edit Transaksi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionToDelete(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Edit Transaksi */}
      <EditTransactionModal
        isOpen={Boolean(editingTransaction)}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
      />

      {/* Modal Konfirmasi Hapus Transaksi */}
      <ConfirmModal
        isOpen={Boolean(transactionToDelete)}
        title="Hapus Transaksi?"
        message={`Apakah Anda yakin ingin menghapus transaksi "${transactionToDelete?.categoryName}" sebesar ${
          transactionToDelete ? formatCurrency(transactionToDelete.amount) : ''
        }? Saldo dompet "${transactionToDelete?.walletName}" akan otomatis disesuaikan kembali.`}
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelText="Batal"
        isDanger={true}
        onConfirm={handleDeleteTransaction}
        onCancel={() => setTransactionToDelete(null)}
      />
    </div>
  );
};
