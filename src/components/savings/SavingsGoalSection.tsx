import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  db, 
  collection, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  handleFirestoreError, 
  OperationType 
} from '../../lib/firebase';
import { SavingsGoal, Wallet } from '../../types';
import { formatCurrency } from '../../lib/constants';
import { 
  Target, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  Coins,
  ArrowUpRight,
  Flame,
  Award
} from 'lucide-react';

const PRESET_EMOJIS = ['🎯', '💰', '🛡️', '📱', '💻', '🚗', '🏍️', '🏖️', '✈️', '🏠', '💍', '🎓', '🕋', '🎁'];

const PRESET_COLORS = [
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#3B82F6', name: 'Ocean' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#EC4899', name: 'Rose' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#6366F1', name: 'Indigo' },
];

const PRESET_TEMPLATES = [
  { title: 'Dana Darurat 🚨', emoji: '🛡️', target: 10000000, color: '#10B981', note: 'Amunisi dana tak terduga 3-6 bulan' },
  { title: 'Gadget / HP Baru 📱', emoji: '📱', target: 6000000, color: '#3B82F6', note: 'Upgrade alat kerja / smartphone' },
  { title: 'Liburan & Healing 🏖️', emoji: '🏖️', target: 4500000, color: '#EC4899', note: 'Tiket liburan akhir tahun' },
  { title: 'DP Rumah / Kendaraan 🚗', emoji: '🚗', target: 25000000, color: '#F59E0B', note: 'Tabungan jangka panjang' },
];

export const SavingsGoalSection: React.FC = () => {
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);

  // Add Funds Modal
  const [fundingGoal, setFundingGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState('#10B981');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time Savings Goals Listener
  useEffect(() => {
    if (!currentUser) return;

    const qGoals = query(
      collection(db, 'savingsGoals'),
      where('userId', '==', currentUser.uid)
    );

    const unsubGoals = onSnapshot(
      qGoals,
      (snapshot) => {
        const list: SavingsGoal[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<SavingsGoal, 'id'>) });
        });
        // Sort by completion percentage or created date
        list.sort((a, b) => {
          const pctA = a.targetAmount > 0 ? a.currentAmount / a.targetAmount : 0;
          const pctB = b.targetAmount > 0 ? b.currentAmount / b.targetAmount : 0;
          return pctB - pctA;
        });
        setGoals(list);
        setLoading(false);
      },
      (error) => {
        console.warn('Savings goals snapshot notice:', error);
        setLoading(false);
      }
    );

    // Wallets listener for deposit option
    const qWallets = query(
      collection(db, 'wallets'),
      where('userId', '==', currentUser.uid)
    );
    const unsubWallets = onSnapshot(
      qWallets,
      (snapshot) => {
        const list: Wallet[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<Wallet, 'id'>) });
        });
        setWallets(list);
        if (list.length > 0 && !selectedWalletId) {
          setSelectedWalletId(list[0].id);
        }
      },
      (error) => {
        console.warn('Savings goals wallets notice:', error);
      }
    );

    return () => {
      unsubGoals();
      unsubWallets();
    };
  }, [currentUser]);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('0');
    setDeadline('');
    setEmoji('🎯');
    setColor('#10B981');
    setNote('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleApplyTemplate = (tpl: typeof PRESET_TEMPLATES[0]) => {
    setEditingGoal(null);
    setTitle(tpl.title);
    setTargetAmount(tpl.target.toString());
    setCurrentAmount('0');
    setDeadline('');
    setEmoji(tpl.emoji);
    setColor(tpl.color);
    setNote(tpl.note);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: SavingsGoal) => {
    setEditingGoal(g);
    setTitle(g.title);
    setTargetAmount(g.targetAmount.toString());
    setCurrentAmount(g.currentAmount.toString());
    setDeadline(g.deadline || '');
    setEmoji(g.emoji || '🎯');
    setColor(g.color || '#10B981');
    setNote(g.note || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!title.trim()) {
      setFormError('Nama target tabungan wajib diisi');
      return;
    }

    const tAmt = Number(targetAmount.replace(/[^0-9]/g, ''));
    if (isNaN(tAmt) || tAmt <= 0) {
      setFormError('Target nominal harus lebih dari Rp 0');
      return;
    }

    const cAmt = Number(currentAmount.replace(/[^0-9]/g, '')) || 0;

    setIsSubmitting(true);
    setFormError('');

    try {
      const now = Date.now();
      if (editingGoal) {
        // Update
        const goalRef = doc(db, 'savingsGoals', editingGoal.id);
        await updateDoc(goalRef, {
          title: title.trim(),
          targetAmount: tAmt,
          currentAmount: cAmt,
          deadline: deadline || null,
          emoji,
          color,
          note: note.trim() || null,
          updatedAt: now,
        });
      } else {
        // Create
        await addDoc(collection(db, 'savingsGoals'), {
          userId: currentUser.uid,
          title: title.trim(),
          targetAmount: tAmt,
          currentAmount: cAmt,
          deadline: deadline || null,
          emoji,
          color,
          note: note.trim() || null,
          createdAt: now,
          updatedAt: now,
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingGoal ? OperationType.UPDATE : OperationType.CREATE, 'savingsGoals');
      setFormError('Gagal menyimpan target tabungan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!goalToDelete || !currentUser) return;
    try {
      await deleteDoc(doc(db, 'savingsGoals', goalToDelete.id));
      setGoalToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `savingsGoals/${goalToDelete.id}`);
    }
  };

  const handleOpenDeposit = (g: SavingsGoal) => {
    setFundingGoal(g);
    setDepositAmount('');
    if (wallets.length > 0 && !selectedWalletId) {
      setSelectedWalletId(wallets[0].id);
    }
  };

  const handleConfirmDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundingGoal || !currentUser) return;

    const amt = Number(depositAmount.replace(/[^0-9]/g, ''));
    if (isNaN(amt) || amt <= 0) return;

    setSubmittingDeposit(true);
    try {
      const now = Date.now();
      const updatedAmount = Number(fundingGoal.currentAmount || 0) + amt;

      // Update goal
      await updateDoc(doc(db, 'savingsGoals', fundingGoal.id), {
        currentAmount: updatedAmount,
        updatedAt: now,
      });

      // Optionally deduct from chosen wallet if user selected one
      if (selectedWalletId) {
        const wallet = wallets.find((w) => w.id === selectedWalletId);
        if (wallet) {
          const newWalletBalance = (Number(wallet.balance) || 0) - amt;
          await updateDoc(doc(db, 'wallets', wallet.id), {
            balance: newWalletBalance,
            updatedAt: now,
          });
        }
      }

      setFundingGoal(null);
      setDepositAmount('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `savingsGoals/${fundingGoal.id}`);
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Quick stats summary
  const totalTarget = goals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  const totalCurrent = goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  const overallPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0;

  return (
    <div className="space-y-3">
      {/* Header with Title and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>🎯</span>
            <span>Target Tabungan & Impian</span>
          </h2>
          <span className="text-[11px] text-slate-400">
            {goals.length > 0 
              ? `${goals.length} target aktif (${overallPercentage}% terkumpul)` 
              : 'Wujudkan target & impian finansialmu ✨'}
          </span>
        </div>

        <button
          type="button"
          id="btn-add-savings-goal"
          onClick={handleOpenAdd}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 cursor-pointer shadow-2xs active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat Target ✨</span>
        </button>
      </div>

      {/* Empty State with Quick Start Templates */}
      {goals.length === 0 && !loading && (
        <div className="p-4 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-gradient-to-b from-slate-50/80 to-white dark:from-slate-900/50 dark:to-slate-900 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-xs">
            🎯
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Mulai Target Tabungan Pertamamu!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Tetapkan target menabung untuk impianmu dan pantau progresnya secara otomatis.
            </p>
          </div>

          <div className="pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Pilih Cepat Template Impian:
            </span>
            <div className="grid grid-cols-2 gap-2 text-left">
              {PRESET_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.title}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-400 text-left transition-all active:scale-98 cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{tpl.emoji}</span>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                      {tpl.title}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(tpl.target)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List of Savings Goals */}
      {goals.length > 0 && (
        <div className="space-y-3">
          {goals.map((g) => {
            const target = Number(g.targetAmount) || 1;
            const current = Number(g.currentAmount) || 0;
            const percentage = Math.min(100, Math.round((current / target) * 100));
            const isCompleted = current >= target;
            const remaining = Math.max(0, target - current);

            // Deadline calculation
            let deadlineText = '';
            if (g.deadline) {
              const dDate = new Date(g.deadline);
              const now = new Date();
              const diffTime = dDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 0) {
                deadlineText = `📅 Sisa ${diffDays} hari`;
              } else if (diffDays === 0) {
                deadlineText = `📅 Hari ini batasnya!`;
              } else {
                deadlineText = `📅 Lewat ${Math.abs(diffDays)} hari`;
              }
            }

            return (
              <div
                key={g.id}
                className="p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all relative overflow-hidden"
              >
                {/* Top Glowing Edge according to Goal Color */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5 opacity-80"
                  style={{ backgroundColor: g.color || '#10B981' }}
                />

                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-xs"
                      style={{
                        backgroundColor: `${g.color || '#10B981'}20`,
                        border: `1px solid ${g.color || '#10B981'}40`,
                      }}
                    >
                      <span>{g.emoji || '🎯'}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {g.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {deadlineText && <span>{deadlineText}</span>}
                        {g.note && <span className="truncate italic">"{g.note}"</span>}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 flex items-center gap-1">
                    {isCompleted ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Award className="w-3 h-3 text-emerald-500" />
                        <span>Tercapai! 🎉</span>
                      </span>
                    ) : percentage >= 75 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-500" />
                        <span>{percentage}%</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {percentage}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar with High-Impact Visuals */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Terkumpul: <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(current)}</strong>
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      Target: {formatCurrency(target)}
                    </span>
                  </div>

                  {/* Visual Progress Bar Track */}
                  <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800/90 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-500 shadow-xs relative"
                      style={{
                        width: `${Math.max(4, percentage)}%`,
                        backgroundColor: g.color || '#10B981',
                        backgroundImage: isCompleted 
                          ? 'linear-gradient(90deg, #10B981, #059669)'
                          : `linear-gradient(90deg, ${g.color || '#10B981'}, ${g.color || '#10B981'}dd)`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>
                      {isCompleted 
                        ? 'Target telah terpenuhi 100%! Selamat! 🥳' 
                        : `Kurang ${formatCurrency(remaining)} lagi`}
                    </span>
                    <span className="font-bold" style={{ color: g.color || '#10B981' }}>
                      {percentage}%
                    </span>
                  </div>
                </div>

                {/* Action Buttons for Mobile Touch Target */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenDeposit(g)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tabung / Setor 💰</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(g)}
                    className="py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                    title="Edit Target Tabungan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGoalToDelete(g)}
                    className="py-1.5 px-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs transition-colors cursor-pointer active:scale-95"
                    title="Hapus Target"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Funds / Deposit to Savings Goal */}
      {fundingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{fundingGoal.emoji}</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    Tambah Tabungan
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {fundingGoal.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFundingGoal(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeposit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal Tambahan Tabungan (Rp)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={depositAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setDepositAmount(raw ? formatCurrency(Number(raw)) : '');
                  }}
                  placeholder="Rp 100.000"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Quick nominal chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[50000, 100000, 250000, 500000, 1000000].map((quickNom) => (
                  <button
                    key={quickNom}
                    type="button"
                    onClick={() => setDepositAmount(formatCurrency(quickNom))}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                  >
                    +{quickNom >= 1000000 ? `${quickNom / 1000000}jt` : `${quickNom / 1000}k`}
                  </button>
                ))}
              </div>

              {/* Source wallet option */}
              {wallets.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Potong dari Dompet (Opsional):
                  </label>
                  <select
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  >
                    <option value="">Jangan potong dompet (Hanya catat tabungan)</option>
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (Saldo: {formatCurrency(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFundingGoal(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingDeposit || !depositAmount}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{submittingDeposit ? 'Menyimpan...' : 'Konfirmasi Setor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create or Edit Savings Goal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-xs"
                  style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
                >
                  {emoji}
                </div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  {editingGoal ? 'Edit Target Tabungan' : 'Buat Target Tabungan Baru ✨'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveGoal} className="space-y-3.5">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Target Impian
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Liburan ke Jepang, Dana Darurat, Beli Laptop"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Target & Current Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Nominal (Rp)
                  </label>
                  <input
                    type="text"
                    required
                    value={targetAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setTargetAmount(raw ? formatCurrency(Number(raw)) : '');
                    }}
                    placeholder="Rp 10.000.000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Saldo Awal Terkumpul
                  </label>
                  <input
                    type="text"
                    value={currentAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setCurrentAmount(raw ? formatCurrency(Number(raw)) : '0');
                    }}
                    placeholder="Rp 0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Tanggal Tercapai (Batas Waktu / Opsional)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Emoji Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ikon Emoji
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all cursor-pointer ${
                        emoji === em
                          ? 'bg-emerald-100 dark:bg-emerald-950 border-2 border-emerald-500 scale-110 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:scale-105'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Warna Aksen Kartu
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setColor(col.hex)}
                      className={`w-7 h-7 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                        color.toLowerCase() === col.hex.toLowerCase()
                          ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={col.name}
                    >
                      {color.toLowerCase() === col.hex.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Motivasi (Opsional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Misal: Jangan boros ngopi, sisihkan 500rb per bulan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Target ✨'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 text-center space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl">
              🗑️
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Hapus Target Tabungan?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Apakah Anda yakin ingin menghapus target <strong>"{goalToDelete.title}"</strong>?
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteGoal}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
