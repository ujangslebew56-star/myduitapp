import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  handleFirestoreError,
  OperationType 
} from '../../lib/firebase';
import { Wallet, Category, TransactionType, OCRScanResult } from '../../types';
import { formatCurrency, formatNumberWithDots, parseNumberFromDots } from '../../lib/constants';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Sparkles } from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScanData?: { result: OCRScanResult; receiptUrl?: string } | null;
  onSuccess?: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  initialScanData,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form State
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [selectedToWalletId, setSelectedToWalletId] = useState(''); // for transfer
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Clean reset form state so no trace is left
  const resetForm = () => {
    setAmount('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setType('expense');
  };

  // Sync with initialScanData or reset cleanly on modal open
  useEffect(() => {
    if (isOpen) {
      if (initialScanData && initialScanData.result) {
        setType('expense');
        setAmount(formatNumberWithDots(initialScanData.result.total));
        setDate(initialScanData.result.date || new Date().toISOString().split('T')[0]);
        setNote(initialScanData.result.merchant ? `Belanja di ${initialScanData.result.merchant}` : 'Hasil Scan Struk AI');
      } else {
        // Completely reset on fresh opening so former numbers don't linger
        resetForm();
      }
    }
  }, [isOpen, initialScanData]);

  // Load wallets & categories
  useEffect(() => {
    if (!currentUser) return;
    const qW = query(collection(db, 'wallets'), where('userId', '==', currentUser.uid));
    const unsubW = onSnapshot(
      qW,
      (snap) => {
        const list: Wallet[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Wallet, 'id'>) }));
        setWallets(list);
        if (list.length > 0 && !selectedWalletId) {
          setSelectedWalletId(list[0].id);
          if (list.length > 1) setSelectedToWalletId(list[1].id);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'wallets');
      }
    );

    const qC = query(collection(db, 'categories'), where('userId', '==', currentUser.uid));
    const unsubC = onSnapshot(
      qC,
      (snap) => {
        const list: Category[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
        setCategories(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    );

    return () => {
      unsubW();
      unsubC();
    };
  }, [currentUser]);

  // Auto-match suggested category from OCR
  useEffect(() => {
    if (initialScanData?.result?.suggestedCategory && categories.length > 0) {
      const match = categories.find(c => c.name.toLowerCase().includes(initialScanData.result.suggestedCategory!.toLowerCase()));
      if (match) setSelectedCategoryId(match.id);
    }
  }, [initialScanData, categories]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === (type === 'transfer' ? 'expense' : type));

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberWithDots(e.target.value);
    setAmount(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const numAmount = parseNumberFromDots(amount);
    if (!numAmount || numAmount <= 0) {
      alert('Masukkan nominal transaksi yang valid');
      return;
    }

    const currentWallet = wallets.find((w) => w.id === selectedWalletId);
    if (!currentWallet) {
      alert('Silakan pilih dompet / sumber dana');
      return;
    }

    setSubmitting(true);
    try {
      if (type === 'transfer') {
        const toWallet = wallets.find((w) => w.id === selectedToWalletId);
        if (!toWallet) {
          alert('Pilih dompet tujuan transfer');
          setSubmitting(false);
          return;
        }
        if (selectedWalletId === selectedToWalletId) {
          alert('Dompet asal dan tujuan tidak boleh sama');
          setSubmitting(false);
          return;
        }

        // Add transfer transaction
        await addDoc(collection(db, 'transactions'), {
          userId: currentUser.uid,
          type: 'transfer',
          amount: numAmount,
          categoryId: 'transfer',
          categoryName: 'Transfer Antar Dompet',
          walletId: currentWallet.id,
          walletName: currentWallet.name,
          toWalletId: toWallet.id,
          toWalletName: toWallet.name,
          date,
          note: note || `Transfer ke ${toWallet.name}`,
          createdAt: Date.now(),
        });

        // Update balances
        await updateDoc(doc(db, 'wallets', currentWallet.id), {
          balance: Number(currentWallet.balance) - numAmount,
          updatedAt: Date.now(),
        });
        await updateDoc(doc(db, 'wallets', toWallet.id), {
          balance: Number(toWallet.balance) + numAmount,
          updatedAt: Date.now(),
        });
      } else {
        const cat = categories.find((c) => c.id === selectedCategoryId) || {
          name: type === 'expense' ? 'Pengeluaran Umum' : 'Pemasukan Umum',
        };

        // Add standard expense or income transaction
        await addDoc(collection(db, 'transactions'), {
          userId: currentUser.uid,
          type,
          amount: numAmount,
          categoryId: selectedCategoryId || 'general',
          categoryName: cat.name,
          walletId: currentWallet.id,
          walletName: currentWallet.name,
          date,
          note,
          receiptUrl: initialScanData?.receiptUrl || null,
          createdAt: Date.now(),
        });

        // Update wallet balance automatically
        const newBalance =
          type === 'expense'
            ? Number(currentWallet.balance) - numAmount
            : Number(currentWallet.balance) + numAmount;

        await updateDoc(doc(db, 'wallets', currentWallet.id), {
          balance: newBalance,
          updatedAt: Date.now(),
        });
      }

      // Clean reset after saving so former data leaves no trace
      resetForm();
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error('Save transaction error:', err);
      alert('Gagal menyimpan transaksi: ' + (err as any).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Catat Transaksi</h3>
            {initialScanData && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/20">
                <Sparkles className="w-3 h-3" /> Auto Draft OCR
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Type Selector Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Pengeluaran</span>
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Pemasukan</span>
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>
          </div>

          {/* Amount Input with Auto Dots & Clean Minimalist Styling */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nominal Transaksi
              </label>
              {amount && (
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Rp {amount}
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 font-bold font-mono text-sm text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                autoFocus
                className="w-full pl-11 pr-9 py-3 text-xl font-bold font-mono tracking-tight bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/80 text-slate-900 dark:text-white transition-all shadow-2xs"
                required
              />
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Hapus nominal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Nominal Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
              {[10000, 25000, 50000, 100000, 200000, 500000].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => {
                    const current = parseNumberFromDots(amount);
                    setAmount(formatNumberWithDots(current + inc));
                  }}
                  className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer shadow-2xs"
                >
                  +{formatNumberWithDots(inc)}
                </button>
              ))}
            </div>
          </div>

          {/* Wallet Source Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {type === 'transfer' ? 'Dari Dompet (Asal)' : 'Sumber Dana / Dompet'}
            </label>
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              required
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} - (Saldo: {formatCurrency(w.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Target Wallet */}
          {type === 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ke Dompet (Tujuan)
              </label>
              <select
                value={selectedToWalletId}
                onChange={(e) => setSelectedToWalletId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                required
              >
                {wallets
                  .filter((w) => w.id !== selectedWalletId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} - (Saldo: {formatCurrency(w.balance)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Category Selector (For Expense & Income) */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
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

          {/* Date & Note Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Makan siang"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

