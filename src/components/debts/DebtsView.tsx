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
  deleteDoc, 
  doc,
  handleFirestoreError,
  OperationType
} from '../../lib/firebase';
import { Debt, DebtType, DebtStatus, Wallet } from '../../types';
import { formatCurrency, formatDateIndo, formatNumberWithDots, parseNumberFromDots } from '../../lib/constants';
import { ConfirmModal } from '../ui/ConfirmModal';
import { 
  HandCoins, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  X, 
  Check, 
  Trash2, 
  Calendar 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const DebtsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [activeTab, setActiveTab] = useState<'all' | 'debt' | 'receivable'>('all');

  // Add Debt Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [type, setType] = useState<DebtType>('receivable');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pay Debt Modal
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payWalletId, setPayWalletId] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'debts'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Debt[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Debt, 'id'>) }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setDebts(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'debts');
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
        if (list.length > 0 && !payWalletId) {
          setPayWalletId(list[0].id);
        }
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

  const filteredDebts = debts.filter((d) => activeTab === 'all' || d.type === activeTab);

  // Totals
  const totalReceivables = debts
    .filter((d) => d.type === 'receivable' && d.status !== 'paid')
    .reduce((acc, d) => acc + (d.remainingAmount || d.amount), 0);

  const totalDebts = debts
    .filter((d) => d.type === 'debt' && d.status !== 'paid')
    .reduce((acc, d) => acc + (d.remainingAmount || d.amount), 0);

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !personName.trim()) return;
    const numAmount = parseNumberFromDots(amount);
    if (numAmount <= 0) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'debts'), {
        userId: currentUser.uid,
        type,
        personName,
        amount: numAmount,
        remainingAmount: numAmount,
        dueDate: dueDate || null,
        notes: notes || null,
        status: 'unpaid' as DebtStatus,
        payments: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setIsAddOpen(false);
      setPersonName('');
      setAmount('');
      setDueDate('');
      setNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPay = (d: Debt) => {
    setPayingDebt(d);
    setPayAmount(formatNumberWithDots(d.remainingAmount));
  };

  const handleConfirmPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt || !currentUser) return;
    const payNum = parseNumberFromDots(payAmount);
    if (payNum <= 0) return;

    const targetWallet = wallets.find((w) => w.id === payWalletId);
    if (!targetWallet) {
      alert('Pilih dompet untuk integrasi saldo');
      return;
    }

    setPaySubmitting(true);
    try {
      const newRemaining = Math.max(0, payingDebt.remainingAmount - payNum);
      const newStatus: DebtStatus = newRemaining === 0 ? 'paid' : 'partial';

      const newPayment = {
        id: Date.now().toString(),
        amount: payNum,
        walletId: targetWallet.id,
        walletName: targetWallet.name,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
      };

      // 1. Update debt record
      await updateDoc(doc(db, 'debts', payingDebt.id), {
        remainingAmount: newRemaining,
        status: newStatus,
        payments: [...(payingDebt.payments || []), newPayment],
        updatedAt: Date.now(),
      });

      // 2. Adjust wallet balance
      // If paying someone's debt (saya berhutang dan melunasi) -> dompet berkurang (expense)
      // If someone paying to me (piutang saya dibayar orang) -> dompet bertambah (income)
      const isReceivable = payingDebt.type === 'receivable';
      const newBalance = isReceivable
        ? Number(targetWallet.balance) + payNum
        : Number(targetWallet.balance) - payNum;

      await updateDoc(doc(db, 'wallets', targetWallet.id), {
        balance: newBalance,
        updatedAt: Date.now(),
      });

      // 3. Record transaction for transparency
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        type: isReceivable ? 'income' : 'expense',
        amount: payNum,
        categoryId: isReceivable ? 'receivable_payment' : 'debt_payment',
        categoryName: isReceivable ? 'Pembayaran Piutang' : 'Pembayaran Hutang',
        walletId: targetWallet.id,
        walletName: targetWallet.name,
        date: new Date().toISOString().split('T')[0],
        note: isReceivable
          ? `Cicilan/Lunas dari ${payingDebt.personName}`
          : `Bayar hutang ke ${payingDebt.personName}`,
        createdAt: Date.now(),
      });

      if (newStatus === 'paid') {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      }

      setPayAmount('');
      setPayingDebt(null);
    } catch (err) {
      console.error('Pay debt error:', err);
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleDeletePrompt = (d: Debt) => {
    setDebtToDelete(d);
  };

  const executeDeleteDebt = async () => {
    if (!debtToDelete) return;
    try {
      await deleteDoc(doc(db, 'debts', debtToDelete.id));
      setDebtToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🤝</span>
            <span>Hutang & Piutang</span>
          </h1>
          <p className="text-xs text-slate-400">Pantau pinjaman & tagihan yang harus dibayar/diterima</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Catat Baru</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold mb-1">
            <span>📤</span>
            <span>Total Hutang Saya</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalDebts)}
          </div>
          <span className="text-[10px] text-slate-400">Harus Anda bayarkan</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-semibold mb-1">
            <span>📥</span>
            <span>Total Piutang Saya</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalReceivables)}
          </div>
          <span className="text-[10px] text-slate-400">Harus Anda terima</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'Semua', emoji: '✨' },
          { id: 'receivable', label: 'Piutang', emoji: '📥' },
          { id: 'debt', label: 'Hutang', emoji: '📤' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === t.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Debt List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Memuat hutang piutang...</div>
      ) : filteredDebts.length === 0 ? (
        <div className="py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center p-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <HandCoins className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Tidak Ada Catatan</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Belum ada catatan hutang atau piutang yang tercatat. Klik "Catat Baru" untuk memulai.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredDebts.map((d) => {
            const isReceivable = d.type === 'receivable';
            const isPaid = d.status === 'paid';

            return (
              <div
                key={d.id}
                className={`p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all ${
                  isPaid
                    ? 'border-slate-200 dark:border-slate-800 opacity-75'
                    : isReceivable
                    ? 'border-emerald-200/60 dark:border-emerald-950/60'
                    : 'border-rose-200/60 dark:border-rose-950/60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isPaid
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : isReceivable
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'
                      }`}
                    >
                      {isReceivable ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                          {d.personName}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isPaid
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              : d.status === 'partial'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {isPaid ? 'LUNAS' : d.status === 'partial' ? 'DICICIL' : 'BELUM LUNAS'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {isReceivable ? 'Meminjam dari Anda' : 'Anda meminjam dari dia'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {formatCurrency(d.remainingAmount)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Awal: {formatCurrency(d.amount)}
                    </span>
                  </div>
                </div>

                {/* Due Date & Notes */}
                {(d.dueDate || d.notes) && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    {d.dueDate && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Jatuh tempo: {formatDateIndo(d.dueDate)}</span>
                      </span>
                    )}
                    {d.notes && <span className="italic truncate max-w-[150px]">"{d.notes}"</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleDeletePrompt(d)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {!isPaid && (
                    <button
                      type="button"
                      onClick={() => handleOpenPay(d)}
                      className="py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isReceivable ? 'Terima Pembayaran' : 'Bayar Cicilan'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Debt Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Catat Hutang / Piutang
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="space-y-3">
              {/* Type Switch */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setType('receivable')}
                  className={`py-1.5 rounded-lg text-xs font-semibold ${
                    type === 'receivable' ? 'bg-emerald-600 text-white' : 'text-slate-500'
                  }`}
                >
                  Piutang (Dipinjamkan)
                </button>
                <button
                  type="button"
                  onClick={() => setType('debt')}
                  className={`py-1.5 rounded-lg text-xs font-semibold ${
                    type === 'debt' ? 'bg-rose-600 text-white' : 'text-slate-500'
                  }`}
                >
                  Hutang (Saya Pinjam)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Orang / Kontak
                </label>
                <input
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Contoh: Andi Pratama"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nominal (Rp)
                  </label>
                  {amount && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Rp {amount}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-bold font-mono text-xs text-slate-400 pointer-events-none select-none">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(formatNumberWithDots(e.target.value))}
                    placeholder="0"
                    className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                    required
                  />
                  {amount && (
                    <button
                      type="button"
                      onClick={() => setAmount('')}
                      className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Jatuh Tempo (Opsional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Pinjam buat beli tiket"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Debt Modal */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                {payingDebt.type === 'receivable' ? 'Terima Pembayaran' : 'Bayar Hutang'}
              </h3>
              <button
                type="button"
                onClick={() => setPayingDebt(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                <span className="text-slate-400 block">Pihak Terkait:</span>
                <strong className="text-slate-800 dark:text-slate-200">{payingDebt.personName}</strong>
                <div className="mt-1 text-slate-400">
                  Sisa Hutang: <strong className="text-slate-900 dark:text-white">{formatCurrency(payingDebt.remainingAmount)}</strong>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nominal Pembayaran (Rp)
                  </label>
                  {payAmount && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Rp {payAmount}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-bold font-mono text-xs text-slate-400 pointer-events-none select-none">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={payAmount}
                    onChange={(e) => setPayAmount(formatNumberWithDots(e.target.value))}
                    className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                    required
                  />
                  {payAmount && (
                    <button
                      type="button"
                      onClick={() => setPayAmount('')}
                      className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Integrasi ke Dompet
                </label>
                <select
                  value={payWalletId}
                  onChange={(e) => setPayWalletId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Saldo dompet ini akan otomatis diperbarui dan dicatat ke riwayat.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                >
                  {paySubmitting ? 'Memproses...' : 'Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Debt Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(debtToDelete)}
        title="Hapus Catatan?"
        message={`Apakah Anda yakin ingin menghapus catatan ${
          debtToDelete?.type === 'receivable' ? 'piutang dari' : 'hutang ke'
        } "${debtToDelete?.personName}" sebesar ${
          debtToDelete ? formatCurrency(debtToDelete.remainingAmount) : ''
        }?`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isDanger={true}
        onConfirm={executeDeleteDebt}
        onCancel={() => setDebtToDelete(null)}
      />
    </div>
  );
};
