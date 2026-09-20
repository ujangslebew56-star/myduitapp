import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  getDoc,
  doc, 
  handleFirestoreError,
  OperationType 
} from '../../lib/firebase';
import { Wallet, Category, Transaction, TransactionType } from '../../types';
import { formatNumberWithDots, parseNumberFromDots, formatCurrency } from '../../lib/constants';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Check, AlertCircle } from 'lucide-react';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const { currentUser } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form State
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [selectedToWalletId, setSelectedToWalletId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    // Load wallets
    const qW = query(collection(db, 'wallets'), where('userId', '==', currentUser.uid));
    const unsubW = onSnapshot(
      qW,
      (snap) => {
        const list: Wallet[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Wallet, 'id'>) }));
        setWallets(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'wallets')
    );

    // Load categories
    const qC = query(collection(db, 'categories'), where('userId', '==', currentUser.uid));
    const unsubC = onSnapshot(
      qC,
      (snap) => {
        const list: Category[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
        setCategories(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
    );

    return () => {
      unsubW();
      unsubC();
    };
  }, [currentUser]);

  // Populate data when transaction changes
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(formatNumberWithDots(transaction.amount));
      setSelectedWalletId(transaction.walletId);
      setSelectedToWalletId(transaction.toWalletId || '');
      setSelectedCategoryId(transaction.categoryId || '');
      setDate(transaction.date || new Date().toISOString().split('T')[0]);
      setNote(transaction.note || '');
      setErrorMessage('');
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const filteredCategories = categories.filter((c) => c.type === (type === 'transfer' ? 'expense' : type));

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberWithDots(e.target.value);
    setAmount(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !transaction) return;

    const newAmount = parseNumberFromDots(amount);
    if (!newAmount || newAmount <= 0) {
      setErrorMessage('Nominal harus lebih besar dari 0');
      return;
    }

    const currentWallet = wallets.find((w) => w.id === selectedWalletId);
    if (!currentWallet && type !== 'transfer') {
      setErrorMessage('Pilih dompet sumber');
      return;
    }

    const toWallet = type === 'transfer' ? wallets.find((w) => w.id === selectedToWalletId) : null;
    if (type === 'transfer' && !toWallet) {
      setErrorMessage('Pilih dompet tujuan transfer');
      return;
    }

    const selectedCat = filteredCategories.find((c) => c.id === selectedCategoryId);
    const oldAmount = Number(transaction.amount) || 0;
    const oldType = transaction.type;
    const oldWalletId = transaction.walletId;
    const oldToWalletId = transaction.toWalletId;

    setSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Revert previous wallet changes safely
      try {
        if (oldWalletId) {
          const oldWRef = doc(db, 'wallets', oldWalletId);
          const oldWSnap = await getDoc(oldWRef);
          if (oldWSnap.exists()) {
            const oldWData = oldWSnap.data();
            const currBal = Number(oldWData.balance) || 0;
            let revertedBal = currBal;
            if (oldType === 'expense' || oldType === 'transfer') {
              revertedBal += oldAmount; // kembalikan pengeluaran
            } else if (oldType === 'income') {
              revertedBal -= oldAmount; // kurangi kembali pemasukan
            }
            await updateDoc(oldWRef, {
              balance: revertedBal,
              updatedAt: Date.now(),
              userId: oldWData.userId || currentUser.uid,
            });
          }
        }

        if (oldType === 'transfer' && oldToWalletId) {
          const oldToRef = doc(db, 'wallets', oldToWalletId);
          const oldToSnap = await getDoc(oldToRef);
          if (oldToSnap.exists()) {
            const oldToData = oldToSnap.data();
            const currBal = Number(oldToData.balance) || 0;
            await updateDoc(oldToRef, {
              balance: currBal - oldAmount,
              updatedAt: Date.now(),
              userId: oldToData.userId || currentUser.uid,
            });
          }
        }
      } catch (revErr) {
        console.warn('Notice reverting previous wallet state:', revErr);
      }

      // 2. Apply new wallet balance
      if (selectedWalletId) {
        const newWRef = doc(db, 'wallets', selectedWalletId);
        const newWSnap = await getDoc(newWRef);
        if (newWSnap.exists()) {
          const wData = newWSnap.data();
          const currentBal = Number(wData.balance) || 0;
          let nextBal = currentBal;
          if (type === 'expense' || type === 'transfer') {
            nextBal -= newAmount;
          } else if (type === 'income') {
            nextBal += newAmount;
          }
          await updateDoc(newWRef, {
            balance: nextBal,
            updatedAt: Date.now(),
            userId: wData.userId || currentUser.uid,
          });
        }
      }

      if (type === 'transfer' && selectedToWalletId) {
        const newToRef = doc(db, 'wallets', selectedToWalletId);
        const newToSnap = await getDoc(newToRef);
        if (newToSnap.exists()) {
          const toData = newToSnap.data();
          const currentBal = Number(toData.balance) || 0;
          await updateDoc(newToRef, {
            balance: currentBal + newAmount,
            updatedAt: Date.now(),
            userId: toData.userId || currentUser.uid,
          });
        }
      }

      // 3. Update transaction document in Firestore
      const txRef = doc(db, 'transactions', transaction.id);
      await updateDoc(txRef, {
        type,
        amount: newAmount,
        walletId: selectedWalletId,
        walletName: currentWallet?.name || transaction.walletName,
        toWalletId: type === 'transfer' ? selectedToWalletId : null,
        toWalletName: type === 'transfer' ? toWallet?.name : null,
        categoryId: type === 'transfer' ? 'transfer' : selectedCat?.id || 'other',
        categoryName: type === 'transfer' ? 'Transfer Antar Dompet' : selectedCat?.name || 'Lain-lain',
        date,
        note: note.trim() || null,
        updatedAt: Date.now(),
        userId: currentUser.uid,
      });

      onClose();
    } catch (err: any) {
      console.error('Update transaction error:', err);
      setErrorMessage(err?.message || 'Gagal memperbarui transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Edit Transaksi
              </h2>
              <p className="text-[11px] text-slate-400">
                Perbarui catatan, nominal, atau dompet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Type Selector Pills */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>
          </div>

          {/* Nominal Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nominal (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-slate-400">
                Rp
              </span>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Wallet Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {type === 'transfer' ? 'Dari Dompet (Sumber)' : 'Dompet Akun'}
            </label>
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="" disabled>
                -- Pilih Dompet --
              </option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatCurrency(w.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Destination Wallet for Transfer */}
          {type === 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ke Dompet (Tujuan)
              </label>
              <select
                value={selectedToWalletId}
                onChange={(e) => setSelectedToWalletId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="" disabled>
                  -- Pilih Dompet Tujuan --
                </option>
                {wallets
                  .filter((w) => w.id !== selectedWalletId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatCurrency(w.balance)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Category Selector (if not transfer) */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Pilih Kategori --</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Keterangan (Opsional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Belanja bulanan di minimarket..."
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
