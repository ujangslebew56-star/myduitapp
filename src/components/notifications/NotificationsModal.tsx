import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from '../../lib/firebase';
import { Debt, SavingsGoal, Transaction } from '../../types';
import { formatCurrency } from '../../lib/constants';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Target, 
  HandCoins, 
  ChevronRight,
  TrendingDown
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  type: 'debt' | 'budget' | 'goal' | 'system';
  title: string;
  message: string;
  time: string;
  date: Date;
  isUrgent?: boolean;
  actionText?: string;
  onAction?: () => void;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToDebts?: () => void;
  onNavigateToReports?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigateToDebts,
  onNavigateToReports,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('myduit_read_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 1. Separate independent real-time listener for debts (only active when modal is open and authenticated)
  useEffect(() => {
    if (!currentUser || !isOpen) return;
    const qDebts = query(collection(db, 'debts'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(
      qDebts,
      (snapshot) => {
        const list: Debt[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Debt, 'id'>) }));
        setDebts(list);
      },
      (error) => {
        console.warn('Debts notification listener notice:', error);
      }
    );
    return () => unsub();
  }, [currentUser, isOpen]);

  // 2. Separate independent real-time listener for transactions
  useEffect(() => {
    if (!currentUser || !isOpen) return;
    const qTx = query(collection(db, 'transactions'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(
      qTx,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Transaction, 'id'>) }));
        setTransactions(list);
      },
      (error) => {
        console.warn('Transactions notification listener notice:', error);
      }
    );
    return () => unsub();
  }, [currentUser, isOpen]);

  // 3. Separate independent real-time listener for savings goals
  useEffect(() => {
    if (!currentUser || !isOpen) return;
    const qGoals = query(collection(db, 'savingsGoals'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(
      qGoals,
      (snapshot) => {
        const list: SavingsGoal[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<SavingsGoal, 'id'>) }));
        setSavingsGoals(list);
      },
      (error) => {
        console.warn('Savings goals notification listener notice:', error);
      }
    );
    return () => unsub();
  }, [currentUser, isOpen]);

  // Compute notifications dynamically from independent state pieces
  const notifications: NotificationItem[] = React.useMemo(() => {
    const list: NotificationItem[] = [];
    const now = new Date();

    // Debts & receivables notifications
    debts.forEach((debt) => {
      if (debt.status === 'paid') return;
      const remaining = debt.remainingAmount ?? debt.amount;

      if (debt.dueDate) {
        const due = new Date(debt.dueDate);
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          list.push({
            id: `debt-overdue-${debt.id}`,
            type: 'debt',
            title: debt.type === 'debt' ? '⚠️ Tagihan Hutang Jatuh Tempo' : '⚠️ Piutang Lewat Jatuh Tempo',
            message: `${debt.type === 'debt' ? 'Hutang kepada' : 'Piutang dari'} ${debt.personName} sebesar ${formatCurrency(remaining)} telah melewati batas waktu ${Math.abs(diffDays)} hari.`,
            time: 'Lewat Jatuh Tempo',
            date: due,
            isUrgent: true,
            actionText: 'Lihat Hutang',
            onAction: () => {
              onClose();
              onNavigateToDebts?.();
            },
          });
        } else if (diffDays <= 3) {
          list.push({
            id: `debt-due-soon-${debt.id}`,
            type: 'debt',
            title: debt.type === 'debt' ? '⏰ Pengingat Hutang' : '⏰ Pengingat Piutang',
            message: `${debt.type === 'debt' ? 'Hutang Anda kepada' : 'Tagihan piutang dari'} ${debt.personName} sebesar ${formatCurrency(remaining)} jatuh tempo dalam ${diffDays === 0 ? 'hari ini' : `${diffDays} hari lagi`}.`,
            time: diffDays === 0 ? 'Hari ini' : `${diffDays} hari lagi`,
            date: due,
            isUrgent: diffDays <= 1,
            actionText: 'Kelola',
            onAction: () => {
              onClose();
              onNavigateToDebts?.();
            },
          });
        }
      }
    });

    // Monthly budget notifications
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const monthlyBudget = Number(userProfile?.monthlyBudget) || 0;

    let expenseSum = 0;
    transactions.forEach((t) => {
      if (t.date && t.type === 'expense') {
        const d = new Date(t.date);
        if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
          expenseSum += Number(t.amount) || 0;
        }
      }
    });

    if (monthlyBudget > 0) {
      const ratio = expenseSum / monthlyBudget;
      if (ratio >= 1.0) {
        list.push({
          id: `budget-over-${curYear}-${curMonth}`,
          type: 'budget',
          title: '🚨 Peringatan: Melebihi Anggaran!',
          message: `Pengeluaran bulan ini (${formatCurrency(expenseSum)}) telah melampaui batas anggaran (${formatCurrency(monthlyBudget)}). Segera batasi pengeluaran tambahan.`,
          time: 'Bulan Ini',
          date: now,
          isUrgent: true,
          actionText: 'Periksa Laporan',
          onAction: () => {
            onClose();
            onNavigateToReports?.();
          },
        });
      } else if (ratio >= 0.85) {
        list.push({
          id: `budget-warning-${curYear}-${curMonth}`,
          type: 'budget',
          title: '⚡ Anggaran Belanja Hampir Habis',
          message: `Anda telah menggunakan ${Math.round(ratio * 100)}% dari kuota anggaran bulan ini. Sisa: ${formatCurrency(monthlyBudget - expenseSum)}.`,
          time: 'Bulan Ini',
          date: now,
          isUrgent: false,
          actionText: 'Lihat Evaluasi',
          onAction: () => {
            onClose();
            onNavigateToReports?.();
          },
        });
      }
    }

    // Savings goals achievements
    savingsGoals.forEach((g) => {
      const target = Number(g.targetAmount) || 1;
      const current = Number(g.currentAmount) || 0;
      if (current >= target) {
        list.push({
          id: `goal-completed-${g.id}`,
          type: 'goal',
          title: `🎉 Target ${g.title} Telah Tercapai!`,
          message: `Selamat! Anda telah mengumpulkan ${formatCurrency(current)} untuk target ${g.title}. Impian Anda berhasil diraih!`,
          time: 'Target Selesai',
          date: new Date(g.updatedAt || Date.now()),
          isUrgent: false,
        });
      }
    });

    // Default welcome tip if no urgent alerts
    if (list.length === 0) {
      list.push({
        id: 'system-tip-1',
        type: 'system',
        title: '✨ Keuangan Anda Terkendali',
        message: 'Tidak ada tagihan mendesak atau peringatan anggaran. Tetap konsisten mencatat arus kas setiap hari.',
        time: 'Sistem',
        date: now,
        isUrgent: false,
      });
    }

    // Sort: urgent first, then newest
    list.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return b.date.getTime() - a.date.getTime();
    });

    return list;
  }, [debts, transactions, savingsGoals, userProfile?.monthlyBudget, onClose, onNavigateToDebts, onNavigateToReports]);

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('myduit_read_notifs', JSON.stringify(allIds));
    } catch {
      // Ignore localStorage error
    }
  };

  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const next = [...readIds, id];
      setReadIds(next);
      try {
        localStorage.setItem('myduit_read_notifs', JSON.stringify(next));
      } catch {
        // Ignore localStorage error
      }
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Pemberitahuan</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                    {unreadCount} Baru
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Pengingat tagihan, anggaran, & impian</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar (Mark all as read) */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="px-5 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Ada {unreadCount} pengingat aktif</span>
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tandai Semua Dibaca</span>
            </button>
          </div>
        )}

        {/* Notification List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {notifications.map((notif) => {
            const isRead = readIds.includes(notif.id);

            let Icon = Bell;
            let iconColorClass = 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400';

            if (notif.type === 'debt') {
              Icon = HandCoins;
              iconColorClass = notif.isUrgent
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400';
            } else if (notif.type === 'budget') {
              Icon = TrendingDown;
              iconColorClass = notif.isUrgent
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                : 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400';
            } else if (notif.type === 'goal') {
              Icon = Target;
              iconColorClass = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400';
            }

            return (
              <div
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`pt-3 first:pt-0 flex items-start gap-3 p-3 rounded-2xl transition-colors ${
                  isRead
                    ? 'opacity-70 hover:opacity-100 bg-transparent'
                    : 'bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColorClass}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h3 className={`text-xs font-bold truncate ${notif.isUrgent ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {notif.time}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>

                  {notif.actionText && (
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                          notif.onAction?.();
                        }}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer group"
                      >
                        <span>{notif.actionText}</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Belum dibaca" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
