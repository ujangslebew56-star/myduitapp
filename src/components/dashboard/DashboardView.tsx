import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db, collection, query, where, onSnapshot, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Wallet, Transaction } from '../../types';
import { formatCurrency, formatDateIndo, getCategoryEmoji, getWalletTypeEmoji } from '../../lib/constants';
import { WalletsSection } from '../wallets/WalletsSection';
import { SavingsGoalSection } from '../savings/SavingsGoalSection';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Sparkles, 
  Plus, 
  Receipt, 
  ChevronRight, 
  ChevronDown,
  Palette,
  Table as TableIcon,
  LayoutList,
  Check
} from 'lucide-react';

export const DASHBOARD_THEMES = [
  { 
    id: 'emerald', 
    name: 'Emerald', 
    hex: '#10B981', 
    emoji: '🌿',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.5) 0%, #064e3b 45%, #022c22 100%)',
    glow: '#10B981',
    border: 'rgba(16, 185, 129, 0.5)',
    badgeBg: 'rgba(16, 185, 129, 0.25)',
    badgeText: '#6ee7b7'
  },
  { 
    id: 'blue', 
    name: 'Ocean', 
    hex: '#3B82F6', 
    emoji: '🌊',
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.5) 0%, #1e3a8a 45%, #0f172a 100%)',
    glow: '#3B82F6',
    border: 'rgba(59, 130, 246, 0.5)',
    badgeBg: 'rgba(59, 130, 246, 0.25)',
    badgeText: '#93c5fd'
  },
  { 
    id: 'purple', 
    name: 'Violet', 
    hex: '#8B5CF6', 
    emoji: '🍇',
    gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, #4c1d95 45%, #1e1b4b 100%)',
    glow: '#8B5CF6',
    border: 'rgba(139, 92, 246, 0.5)',
    badgeBg: 'rgba(139, 92, 246, 0.25)',
    badgeText: '#c4b5fd'
  },
  { 
    id: 'amber', 
    name: 'Amber', 
    hex: '#F59E0B', 
    emoji: '🍊',
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.5) 0%, #78350f 45%, #1c1917 100%)',
    glow: '#F59E0B',
    border: 'rgba(245, 158, 11, 0.5)',
    badgeBg: 'rgba(245, 158, 11, 0.25)',
    badgeText: '#fde68a'
  },
  { 
    id: 'rose', 
    name: 'Rose', 
    hex: '#EC4899', 
    emoji: '🌹',
    gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.5) 0%, #831843 45%, #1f1724 100%)',
    glow: '#EC4899',
    border: 'rgba(236, 72, 153, 0.5)',
    badgeBg: 'rgba(236, 72, 153, 0.25)',
    badgeText: '#fbcfe8'
  },
  { 
    id: 'cyan', 
    name: 'Cyan', 
    hex: '#06B6D4', 
    emoji: '🩵',
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.5) 0%, #164e63 45%, #082f49 100%)',
    glow: '#06B6D4',
    border: 'rgba(6, 182, 212, 0.5)',
    badgeBg: 'rgba(6, 182, 212, 0.25)',
    badgeText: '#a5f3fc'
  },
  { 
    id: 'slate', 
    name: 'Slate', 
    hex: '#475569', 
    emoji: '🖤',
    gradient: 'linear-gradient(135deg, rgba(71, 85, 105, 0.6) 0%, #1e293b 45%, #0f172a 100%)',
    glow: '#64748b',
    border: 'rgba(100, 116, 139, 0.5)',
    badgeBg: 'rgba(100, 116, 139, 0.25)',
    badgeText: '#cbd5e1'
  },
];

export const TABLE_COLOR_OPTIONS = DASHBOARD_THEMES;

interface DashboardViewProps {
  onOpenAddModal: () => void;
  onOpenScanner: () => void;
  onViewAllTransactions: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddModal,
  onOpenScanner,
  onViewAllTransactions,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { primaryColor, setPrimaryColor } = useTheme();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Totals for the current month
  const [thisMonthIncome, setThisMonthIncome] = useState(0);
  const [thisMonthExpense, setThisMonthExpense] = useState(0);

  // Dashboard Table Customization
  const [tableColor, setTableColor] = useState<string>(() => {
    return localStorage.getItem('myduit_dash_table_color') || primaryColor || '#10B981';
  });
  const [tableLayout, setTableLayout] = useState<'table' | 'cards'>(() => {
    return (localStorage.getItem('myduit_dash_table_layout') as 'table' | 'cards') || 'table';
  });
  const [showColorPicker, setShowColorPicker] = useState(false);

  const activeTheme = DASHBOARD_THEMES.find(
    (t) => t.hex.toLowerCase() === tableColor.toLowerCase()
  ) || DASHBOARD_THEMES[0];

  const handleSelectColor = (hex: string) => {
    setTableColor(hex);
    localStorage.setItem('myduit_dash_table_color', hex);
    setPrimaryColor(hex);
  };

  const handleSelectLayout = (layout: 'table' | 'cards') => {
    setTableLayout(layout);
    localStorage.setItem('myduit_dash_table_layout', layout);
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
    <div className="space-y-5 pb-6">
      {/* Welcome & Balance Hero Card with Dynamic Theme Palette */}
      <div 
        className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-6 shadow-xl border transition-all duration-300"
        style={{
          background: activeTheme.gradient,
          borderColor: activeTheme.border,
          boxShadow: `0 16px 36px -10px ${activeTheme.hex}45`,
        }}
      >
        {/* Dynamic glowing ambient orbs */}
        <div 
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-colors duration-500" 
          style={{ backgroundColor: `${activeTheme.glow}40` }}
        />
        <div 
          className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full blur-2xl pointer-events-none transition-colors duration-500" 
          style={{ backgroundColor: `${activeTheme.glow}30` }}
        />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs text-slate-300 font-medium">
                Halo, {userProfile?.displayName || currentUser?.displayName || 'Sahabat'} 👋
              </span>
              <h1 
                className="text-xs font-bold uppercase tracking-wider block mt-0.5 flex items-center gap-1.5"
                style={{ color: activeTheme.badgeText }}
              >
                <span>💰</span>
                <span>Total Akumulasi Saldo</span>
              </h1>
            </div>

            {/* Prominent Quick Theme Color Switcher Button */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-switch-hero-theme"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
                style={{
                  backgroundColor: activeTheme.badgeBg,
                  borderColor: activeTheme.border,
                  color: '#ffffff',
                }}
                title="Ganti warna tema dashboard & total saldo"
              >
                <span>🎨</span>
                <span className="font-semibold">{activeTheme.emoji} {activeTheme.name}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showColorPicker ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow-xs">
            {formatCurrency(totalAccumulatedBalance)}
          </div>

          {/* Collapsible Color Theme Palette Selector */}
          {showColorPicker && (
            <div className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between text-[11px] font-semibold text-white/90">
                <span className="flex items-center gap-1.5">
                  <span>🎨</span>
                  <span>Pilih Warna Tema Dashboard & Saldo:</span>
                </span>
                <span className="text-[10px] text-white/60">7 Pilihan</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {DASHBOARD_THEMES.map((themeItem) => {
                  const isSelected = activeTheme.id === themeItem.id;
                  return (
                    <button
                      key={themeItem.id}
                      type="button"
                      onClick={() => handleSelectColor(themeItem.hex)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-white shadow-md scale-105 bg-white/20'
                          : 'bg-black/30 hover:bg-white/10'
                      }`}
                      style={{
                        borderColor: themeItem.hex,
                        color: isSelected ? '#ffffff' : themeItem.badgeText,
                      }}
                    >
                      <span>{themeItem.emoji}</span>
                      <span>{themeItem.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly In & Out Pills */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
              <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-bold mb-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>📈 Pemasukan Bulan Ini</span>
              </div>
              <div className="font-mono font-bold text-sm text-white">
                {formatCurrency(thisMonthIncome)}
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
              <div className="flex items-center gap-1.5 text-rose-300 text-[11px] font-bold mb-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>📉 Pengeluaran Bulan Ini</span>
              </div>
              <div className="font-mono font-bold text-sm text-white">
                {formatCurrency(thisMonthExpense)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions (Smart OCR Scan & Add Manual) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          id="btn-quick-ocr-scan"
          onClick={onOpenScanner}
          className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-400 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <strong className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
            <span>📸 Smart Scan Struk</span>
            <span>✨</span>
          </strong>
          <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
            Deteksi struk instan AI
          </span>
        </button>

        <button
          type="button"
          id="btn-quick-add-tx"
          onClick={onOpenAddModal}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-xs">
            <Plus className="w-4 h-4" />
          </div>
          <strong className="block text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
            <span>✍️ Input Transaksi</span>
            <span>⚡</span>
          </strong>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Pemasukan, keluar & transfer
          </span>
        </button>
      </div>

      {/* Target Tabungan & Impian dengan Progress Bar */}
      <SavingsGoalSection />

      {/* Customizable Wallets Carousel */}
      <WalletsSection />

      {/* Recent Transactions Section with Customizable Table Theme Color */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>🕒</span>
            <span>Transaksi Terakhir</span>
          </h2>

          <div className="flex items-center gap-1.5">
            {/* Toggle Table Color Picker */}
            <button
              type="button"
              id="btn-toggle-table-color"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs"
              style={{
                backgroundColor: `${tableColor}15`,
                borderColor: `${tableColor}50`,
                color: tableColor,
              }}
              title="Ubah warna tema tabel dashboard"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden xs:inline text-[11px]">Warna Tabel</span>
            </button>

            {/* Layout Toggle (Table vs Cards) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSelectLayout('table')}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  tableLayout === 'table'
                    ? 'bg-white dark:bg-slate-700 shadow-2xs text-slate-800 dark:text-white font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Tampilan Tabel"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSelectLayout('cards')}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  tableLayout === 'cards'
                    ? 'bg-white dark:bg-slate-700 shadow-2xs text-slate-800 dark:text-white font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Tampilan Kartu"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View All */}
            <button
              type="button"
              onClick={onViewAllTransactions}
              className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer pl-1"
            >
              <span>Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Color Palette Selector Panel (Collapsible) */}
        {showColorPicker && (
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
              <span className="flex items-center gap-1.5 font-semibold">
                <span>🎨</span>
                <span>Pilih Warna Aksen Tabel:</span>
              </span>
              <span className="text-[10px] text-slate-400">Tersimpan otomatis</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {TABLE_COLOR_OPTIONS.map((item) => {
                const isSelected = tableColor.toLowerCase() === item.hex.toLowerCase();
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectColor(item.hex)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-offset-1 dark:ring-offset-slate-900 shadow-xs scale-105'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: item.hex,
                      backgroundColor: isSelected ? `${item.hex}25` : 'transparent',
                      color: item.hex,
                    }}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center text-white"
                      style={{ backgroundColor: item.hex }}
                    >
                      {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                    </span>
                    <span>{item.emoji}</span>
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Transactions Display */}
        {recentTransactions.length === 0 ? (
          <div className="py-8 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center p-4">
            <Receipt className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              🍃 Belum ada transaksi bulan ini
            </span>
            <span className="text-[11px] text-slate-400">
              Yuk mulai catat pengeluaran Anda hari ini! ✨
            </span>
          </div>
        ) : tableLayout === 'table' ? (
          /* Modern Themed Table Layout */
          <div 
            className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border shadow-2xs transition-colors"
            style={{ borderColor: `${tableColor}35` }}
          >
            <div 
              className="grid grid-cols-12 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider border-b"
              style={{ 
                backgroundColor: `${tableColor}12`, 
                borderColor: `${tableColor}25`,
                color: tableColor 
              }}
            >
              <div className="col-span-6 flex items-center gap-1">
                <span>🏷️</span>
                <span>Kategori & Tanggal</span>
              </div>
              <div className="col-span-3 text-left flex items-center gap-1">
                <span>💳</span>
                <span>Dompet</span>
              </div>
              <div className="col-span-3 text-right flex items-center justify-end gap-1">
                <span>💰</span>
                <span>Nominal</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentTransactions.map((tx) => {
                const isExp = tx.type === 'expense';
                const isInc = tx.type === 'income';
                const catEmoji = getCategoryEmoji(tx.categoryName, tx.type);

                return (
                  <div
                    key={tx.id}
                    className="grid grid-cols-12 px-3.5 py-2.5 items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="col-span-6 flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm shadow-2xs ${
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
                        <div className="text-[10px] text-slate-400 truncate">
                          🗓️ {formatDateIndo(tx.date)}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 min-w-0 pr-1">
                      <span className="inline-block max-w-full truncate px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        {tx.walletName}
                      </span>
                    </div>

                    <div className="col-span-3 text-right">
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
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Card View Layout */
          <div className="space-y-2">
            {recentTransactions.map((tx) => {
              const isExp = tx.type === 'expense';
              const isInc = tx.type === 'income';
              const catEmoji = getCategoryEmoji(tx.categoryName, tx.type);

              return (
                <div
                  key={tx.id}
                  className="p-3 bg-white dark:bg-slate-900 rounded-2xl border shadow-2xs flex items-center justify-between transition-colors"
                  style={{ 
                    borderLeftColor: tableColor, 
                    borderLeftWidth: '3.5px',
                    borderColor: `${tableColor}25`
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${
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
                      <div className="text-[11px] text-slate-400 truncate">
                        🗓️ {formatDateIndo(tx.date)} • 💳 {tx.walletName}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
