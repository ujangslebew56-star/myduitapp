import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  db, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc, 
  getDoc,
  handleFirestoreError,
  OperationType
} from '../../lib/firebase';
import { Transaction, Wallet } from '../../types';
import { formatCurrency, formatDateIndo, getCategoryEmoji } from '../../lib/constants';
import { ConfirmModal } from '../ui/ConfirmModal';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Trash2, 
  Receipt, 
  Search, 
  Filter, 
  Calendar 
} from 'lucide-react';

export const TransactionHistoryView: React.FC = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // In-app deletion state
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Transaction, 'id'>) });
        });
        // Sort in-memory to prevent complex missing index error
        list.sort((a, b) => b.createdAt - a.createdAt);
        setTransactions(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
        setLoading(false);
      }
    );

    const qW = query(collection(db, 'wallets'), where('userId', '==', currentUser.uid));
    const unsubW = onSnapshot(
      qW,
      (snap) => {
        const list: Wallet[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Wallet, 'id'>) }));
        setWallets(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'wallets');
      }
    );

    return () => {
      unsubscribe();
      unsubW();
    };
  }, [currentUser]);

  // Filter effect
  useEffect(() => {
    let result = [...transactions];
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.categoryName.toLowerCase().includes(term) ||
          (t.note && t.note.toLowerCase().includes(term)) ||
          t.walletName.toLowerCase().includes(term)
      );
    }
    setFilteredTransactions(result);
  }, [transactions, typeFilter, searchTerm]);

  const handleDeletePrompt = (t: Transaction) => {
    setTransactionToDelete(t);
  };

  const executeDelete = async () => {
    if (!transactionToDelete) return;
    const t = transactionToDelete;
    setIsDeleting(true);
    try {
      // Revert wallet balance
      const wRef = doc(db, 'wallets', t.walletId);
      const wSnap = await getDoc(wRef);
      if (wSnap.exists()) {
        const curBal = Number(wSnap.data().balance) || 0;
        const revertedBal =
          t.type === 'expense'
            ? curBal + Number(t.amount)
            : t.type === 'income'
            ? curBal - Number(t.amount)
            : curBal + Number(t.amount); // for transfer source
        await updateDoc(wRef, { balance: revertedBal, updatedAt: Date.now() });
      }

      // If transfer, revert target wallet too
      if (t.type === 'transfer' && t.toWalletId) {
        const toRef = doc(db, 'wallets', t.toWalletId);
        const toSnap = await getDoc(toRef);
        if (toSnap.exists()) {
          const toBal = Number(toSnap.data().balance) || 0;
          await updateDoc(toRef, { balance: toBal - Number(t.amount), updatedAt: Date.now() });
        }
      }

      await deleteDoc(doc(db, 'transactions', t.id));
      setTransactionToDelete(null);
    } catch (err) {
      console.error('Delete transaction failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Riwayat Transaksi</h1>
        <p className="text-xs text-slate-400">Daftar semua aliran pemasukan, pengeluaran & transfer</p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Cari transaksi, kategori, atau catatan..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'Semua', emoji: '✨' },
            { id: 'expense', label: 'Pengeluaran', emoji: '📉' },
            { id: 'income', label: 'Pemasukan', emoji: '📈' },
            { id: 'transfer', label: 'Transfer', emoji: '🔁' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                typeFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Memuat transaksi...</div>
      ) : filteredTransactions.length === 0 ? (
        <div className="py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center p-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl">
            🍃
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
            Belum Ada Transaksi Ditemukan
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Gunakan tombol (+) di menu bawah atau Scan Struk AI untuk mencatat pengeluaran pertama Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => {
            const isExp = tx.type === 'expense';
            const isInc = tx.type === 'income';
            const catEmoji = getCategoryEmoji(tx.categoryName, tx.type);

            return (
              <div
                key={tx.id}
                className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all flex items-center justify-between group"
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                        {tx.categoryName}
                      </span>
                      {tx.receiptUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(tx.receiptUrl!)}
                          className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold"
                          title="Lihat Struk Foto"
                        >
                          STRUK
                        </button>
                      )}
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

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <div className="text-right">
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

                  <button
                    type="button"
                    onClick={() => handleDeletePrompt(tx)}
                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    title="Hapus Transaksi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation In-App Modal */}
      <ConfirmModal
        isOpen={Boolean(transactionToDelete)}
        title="Hapus Transaksi?"
        message={`Apakah Anda yakin ingin menghapus transaksi "${transactionToDelete?.categoryName}" sebesar ${
          transactionToDelete ? formatCurrency(transactionToDelete.amount) : ''
        }? Saldo dompet "${transactionToDelete?.walletName}" akan otomatis disesuaikan kembali.`}
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelText="Batal"
        isDanger={true}
        onConfirm={executeDelete}
        onCancel={() => setTransactionToDelete(null)}
      />

      {/* Receipt Image Preview Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
          onClick={() => setSelectedReceipt(null)}
        >
          <div className="max-w-sm max-h-[85vh] overflow-hidden rounded-3xl bg-slate-900 p-2">
            <img src={selectedReceipt} alt="Struk Belanja" className="max-h-[80vh] w-auto object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};
