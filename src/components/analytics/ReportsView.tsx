import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db, collection, query, where, onSnapshot, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Transaction } from '../../types';
import { formatCurrency, formatDateIndo, formatFullDateIndo, getCategoryEmoji } from '../../lib/constants';
import { 
  FileText, 
  Download, 
  PieChart as PieIcon, 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CalendarDays,
  Search,
  Wallet as WalletIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

const CHART_COLORS = [
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#14B8A6',
  '#6366F1',
  '#64748B',
];

interface DailySummary {
  dateStr: string;
  dayNum: number;
  weekday: string;
  formattedDate: string;
  income: number;
  expense: number;
  net: number;
  transactions: Transaction[];
}

export const ReportsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { primaryColor, theme } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'pie' | 'weekly' | 'daily'>('pie');
  const [activeTab, setActiveTab] = useState<'overview' | 'daily'>('overview');

  // Month and Year selector
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Daily filter and accordion state
  const [dailyFilter, setDailyFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'transactions'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Transaction, 'id'>) }));
        setTransactions(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // Filter transactions for selected month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const totalExpense = useMemo(() => {
    return monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [monthlyTransactions]);

  const totalIncome = useMemo(() => {
    return monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [monthlyTransactions]);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // Breakdown by Category for Pie Chart
  const categoryMap: { [name: string]: number } = {};
  monthlyTransactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const name = t.categoryName || 'Lainnya';
      categoryMap[name] = (categoryMap[name] || 0) + Number(t.amount);
    });

  const pieData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const sortedCategories = [...pieData];

  // Weekly breakdown for Bar Chart (Week 1 to Week 5)
  const weeklyData = [
    { name: 'Mgg 1', Pemasukan: 0, Pengeluaran: 0 },
    { name: 'Mgg 2', Pemasukan: 0, Pengeluaran: 0 },
    { name: 'Mgg 3', Pemasukan: 0, Pengeluaran: 0 },
    { name: 'Mgg 4', Pemasukan: 0, Pengeluaran: 0 },
    { name: 'Mgg 5', Pemasukan: 0, Pengeluaran: 0 },
  ];

  monthlyTransactions.forEach((t) => {
    if (!t.date) return;
    const day = new Date(t.date).getDate();
    let weekIndex = Math.floor((day - 1) / 7);
    if (weekIndex > 4) weekIndex = 4;
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') {
      weeklyData[weekIndex].Pemasukan += amount;
    } else if (t.type === 'expense') {
      weeklyData[weekIndex].Pengeluaran += amount;
    }
  });

  // Daily grouping logic for "Detail Per Hari"
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  // Daily data for chart
  const dailyChartData = useMemo(() => {
    const arr: { day: string; Pemasukan: number; Pengeluaran: number }[] = [];
    const dayIncomeMap: Record<number, number> = {};
    const dayExpenseMap: Record<number, number> = {};

    monthlyTransactions.forEach((t) => {
      if (!t.date) return;
      const day = new Date(t.date).getDate();
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        dayIncomeMap[day] = (dayIncomeMap[day] || 0) + amt;
      } else if (t.type === 'expense') {
        dayExpenseMap[day] = (dayExpenseMap[day] || 0) + amt;
      }
    });

    for (let d = 1; d <= daysInMonth; d++) {
      arr.push({
        day: `${d}`,
        Pemasukan: dayIncomeMap[d] || 0,
        Pengeluaran: dayExpenseMap[d] || 0,
      });
    }
    return arr;
  }, [monthlyTransactions, daysInMonth]);

  // Grouped daily summaries for the daily detail list
  const dailySummaries: DailySummary[] = useMemo(() => {
    const map: Record<string, { income: number; expense: number; txs: Transaction[] }> = {};

    monthlyTransactions.forEach((t) => {
      if (!t.date) return;
      const d = t.date;
      if (!map[d]) {
        map[d] = { income: 0, expense: 0, txs: [] };
      }
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        map[d].income += amt;
      } else if (t.type === 'expense') {
        map[d].expense += amt;
      }
      map[d].txs.push(t);
    });

    const weekdays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    return Object.entries(map)
      .map(([dateStr, data]) => {
        const dt = new Date(dateStr);
        const dayNum = dt.getDate();
        const weekday = weekdays[dt.getDay()];
        return {
          dateStr,
          dayNum,
          weekday,
          formattedDate: formatDateIndo(dateStr),
          income: data.income,
          expense: data.expense,
          net: data.income - data.expense,
          transactions: data.txs.sort((a, b) => b.createdAt - a.createdAt),
        };
      })
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr)); // Most recent date first
  }, [monthlyTransactions]);

  // Filtered daily summaries based on user selection
  const filteredDailySummaries = useMemo(() => {
    if (dailyFilter === 'expense') {
      return dailySummaries.filter((d) => d.expense > 0);
    }
    if (dailyFilter === 'income') {
      return dailySummaries.filter((d) => d.income > 0);
    }
    return dailySummaries;
  }, [dailySummaries, dailyFilter]);

  // Daily statistics
  const activeDaysCount = dailySummaries.length;
  const avgDailyExpense = activeDaysCount > 0 ? Math.round(totalExpense / activeDaysCount) : 0;
  const peakExpenseDay = useMemo(() => {
    if (dailySummaries.length === 0) return null;
    let peak = dailySummaries[0];
    dailySummaries.forEach((d) => {
      if (d.expense > peak.expense) {
        peak = d;
      }
    });
    return peak.expense > 0 ? peak : null;
  }, [dailySummaries]);

  const toggleDateExpand = (dateStr: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  const expandAllDates = () => {
    const next: Record<string, boolean> = {};
    dailySummaries.forEach((d) => {
      next[d.dateStr] = true;
    });
    setExpandedDates(next);
  };

  const collapseAllDates = () => {
    setExpandedDates({});
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (monthlyTransactions.length === 0) {
      alert('Tidak ada transaksi untuk diekspor pada bulan ini');
      return;
    }

    const headers = ['Tanggal', 'Hari', 'Jenis', 'Kategori', 'Nominal', 'Dompet', 'Catatan'];
    const rows = monthlyTransactions.map((t) => {
      const dt = new Date(t.date);
      const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(dt);
      return [
        t.date,
        dayName,
        t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        `"${t.categoryName || '-'}"`,
        t.amount,
        `"${t.walletName || '-'}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MY_DUIT_Laporan_${selectedYear}_${selectedMonth + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const isDark = theme === 'dark';

  return (
    <div className="space-y-4 pb-8">
      {/* Header & Export button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Laporan Keuangan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ringkasan arus kas, kategori, dan rincian per hari
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:border-slate-400 transition-all cursor-pointer shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Month & Year Filter */}
      <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="flex-1 px-3 py-1.5 text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
        >
          {months.map((m, idx) => (
            <option key={idx} value={idx} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              {m}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="w-24 px-3 py-1.5 text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 outline-none border-l border-slate-200 dark:border-slate-800 cursor-pointer"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Minimalist Financial Health Summary Card */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Arus Kas Bersih (Net Cash Flow)
          </span>
          <span
            className={`font-semibold px-2.5 py-0.5 rounded-full text-[10px] ${
              netSavings >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60'
            }`}
          >
            {netSavings >= 0 ? 'Surplus' : 'Defisit'}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(netSavings)}
          </div>
          {totalIncome > 0 && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Saving Rate: <strong className={netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{savingsRate}%</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] mb-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Total Pemasukan</span>
            </div>
            <div className="text-emerald-700 dark:text-emerald-300 font-mono font-bold text-sm">
              {formatCurrency(totalIncome)}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium text-[11px] mb-0.5">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Total Pengeluaran</span>
            </div>
            <div className="text-rose-700 dark:text-rose-300 font-mono font-bold text-sm">
              {formatCurrency(totalExpense)}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs: Overview vs Daily Breakdown */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <PieIcon className="w-3.5 h-3.5" />
          <span>Grafik & Kategori</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'daily'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Detail Per Hari ({dailySummaries.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW (Grafik & Kategori) */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Chart Card */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Visualisasi Keuangan
              </h3>

              {/* Minimalist Switcher */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setChartType('pie')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    chartType === 'pie'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <PieIcon className="w-3.5 h-3.5" />
                  <span>Kategori</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('weekly')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    chartType === 'weekly'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Mingguan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('daily')}
                  className={`py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    chartType === 'daily'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Harian</span>
                </button>
              </div>
            </div>

            {monthlyTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Belum ada data transaksi di bulan {months[selectedMonth]} {selectedYear}.
              </div>
            ) : chartType === 'pie' ? (
              <div>
                {pieData.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada data pengeluaran untuk ditampilkan di diagram lingkaran.
                  </div>
                ) : (
                  <div className="h-64 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={88}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                              stroke={isDark ? '#0f172a' : '#ffffff'}
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0];
                              const percent =
                                totalExpense > 0
                                  ? ((Number(data.value) / totalExpense) * 100).toFixed(1)
                                  : '0';
                              return (
                                <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700">
                                  <span className="font-semibold block">{data.name}</span>
                                  <div className="font-mono text-emerald-400 font-bold mt-0.5">
                                    {formatCurrency(Number(data.value))} ({percent}%)
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-slate-400 font-medium">Total Beban</span>
                      <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                        {formatCurrency(totalExpense)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : chartType === 'weekly' ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                      tickFormatter={(val) =>
                        val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`
                      }
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700 space-y-1">
                              <span className="font-bold text-slate-300 block">{label}</span>
                              <div className="text-emerald-400 font-mono">
                                Masuk: {formatCurrency(Number(payload[0]?.value) || 0)}
                              </div>
                              <div className="text-rose-400 font-mono">
                                Keluar: {formatCurrency(Number(payload[1]?.value) || 0)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      formatter={(value) => (
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{value}</span>
                      )}
                    />
                    <Bar dataKey="Pemasukan" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="Pengeluaran" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              /* Daily Bar Chart */
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                      tickFormatter={(val) =>
                        val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`
                      }
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700 space-y-1">
                              <span className="font-bold text-slate-300 block">Tgl {label} {months[selectedMonth]}</span>
                              <div className="text-emerald-400 font-mono">
                                Masuk: {formatCurrency(Number(payload[0]?.value) || 0)}
                              </div>
                              <div className="text-rose-400 font-mono">
                                Keluar: {formatCurrency(Number(payload[1]?.value) || 0)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      formatter={(value) => (
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{value}</span>
                      )}
                    />
                    <Bar dataKey="Pemasukan" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={12} />
                    <Bar dataKey="Pengeluaran" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Category Expenses Breakdown List */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Rincian Kategori Pengeluaran
              </h3>
              <span className="text-xs text-slate-400 font-medium">{sortedCategories.length} Kategori</span>
            </div>

            {sortedCategories.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Tidak ada pengeluaran di periode {months[selectedMonth]} {selectedYear}.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {sortedCategories.map((item, index) => {
                  const percent = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0;
                  const barColor = CHART_COLORS[index % CHART_COLORS.length];
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: barColor }}
                          />
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(item.value)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono w-8 text-right">
                            {percent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(percent, 100)}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DETAIL PER HARI (Daily Breakdown Section) */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Daily Quick Summary Highlights */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] text-slate-400 block mb-0.5">Hari Aktif</span>
              <strong className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                {activeDaysCount} hari
              </strong>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] text-slate-400 block mb-0.5">Rata-rata Keluar</span>
              <strong className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                {formatCurrency(avgDailyExpense)}
              </strong>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] text-slate-400 block mb-0.5">Hari Terboros</span>
              <strong className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 font-mono truncate block">
                {peakExpenseDay ? `Tgl ${peakExpenseDay.dayNum} (${formatCurrency(peakExpenseDay.expense)})` : '-'}
              </strong>
            </div>
          </div>

          {/* Filter Bar & Expand/Collapse All Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Filter pills */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDailyFilter('all')}
                className={`py-1 px-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  dailyFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Semua Hari ({dailySummaries.length})
              </button>
              <button
                type="button"
                onClick={() => setDailyFilter('expense')}
                className={`py-1 px-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  dailyFilter === 'expense'
                    ? 'bg-rose-600 text-white font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Ada Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setDailyFilter('income')}
                className={`py-1 px-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  dailyFilter === 'income'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Ada Pemasukan
              </button>
            </div>

            {/* Expand / Collapse All buttons */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={expandAllDates}
                className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer underline decoration-dotted"
              >
                Buka Semua
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={collapseAllDates}
                className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer underline decoration-dotted"
              >
                Tutup Semua
              </button>
            </div>
          </div>

          {/* Daily Groups List */}
          {filteredDailySummaries.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs text-xs text-slate-400 space-y-1">
              <Calendar className="w-6 h-6 mx-auto opacity-40 mb-1" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Tidak ada data transaksi harian
              </p>
              <p className="text-[11px]">
                Belum ada catatan aktivitas pada filter yang dipilih untuk periode ini.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDailySummaries.map((summary) => {
                const isExpanded = expandedDates[summary.dateStr] ?? true; // Default expanded for great glanceability
                return (
                  <div
                    key={summary.dateStr}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden transition-all"
                  >
                    {/* Day Header Accordion Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleDateExpand(summary.dateStr)}
                      className="w-full p-3 sm:p-3.5 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Day pill badge */}
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">
                            {summary.weekday.slice(0, 3)}
                          </span>
                          <span className="text-sm font-black font-mono text-slate-900 dark:text-white leading-tight">
                            {summary.dayNum}
                          </span>
                        </div>

                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{summary.formattedDate}</span>
                            <span className="text-[10px] font-normal text-slate-400">
                              ({summary.transactions.length} transaksi)
                            </span>
                          </div>
                          {/* Net indicator for the day */}
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            Bersih: <span className={summary.net >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                              {summary.net >= 0 ? '+' : ''}{formatCurrency(summary.net)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Totals for that day */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {summary.expense > 0 && (
                            <div className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                              -{formatCurrency(summary.expense)}
                            </div>
                          )}
                          {summary.income > 0 && (
                            <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(summary.income)}
                            </div>
                          )}
                        </div>

                        <div className="text-slate-400 p-1">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Collapsible Transactions Breakdown for this Day */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                        {summary.transactions.map((tx) => {
                          const isExpense = tx.type === 'expense';
                          return (
                            <div
                              key={tx.id}
                              className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 flex items-center justify-between text-xs hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm ${
                                    isExpense
                                      ? 'bg-rose-100 dark:bg-rose-950/50'
                                      : 'bg-emerald-100 dark:bg-emerald-950/50'
                                  }`}
                                >
                                  {getCategoryEmoji(tx.categoryName, tx.type)}
                                </div>

                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {tx.categoryName || (isExpense ? 'Pengeluaran' : 'Pemasukan')}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                                    {tx.walletName && (
                                      <span className="flex items-center gap-0.5">
                                        <WalletIcon className="w-2.5 h-2.5 inline" />
                                        {tx.walletName}
                                      </span>
                                    )}
                                    {tx.note && <span>• {tx.note}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span
                                  className={`font-mono font-bold text-xs ${
                                    isExpense
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  {isExpense ? '-' : '+'} {formatCurrency(Number(tx.amount))}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
