import React, { useState } from 'react';
import { LayoutDashboard, History, Plus, FileText, HandCoins, Camera, ArrowLeftRight, PenTool, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type TabType = 'dashboard' | 'history' | 'debts' | 'reports' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
  onOpenScannerModal: () => void;
  onOpenTransferModal?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenScannerModal,
  onOpenTransferModal,
}) => {
  const { primaryColor } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Beranda', emoji: '📊', icon: LayoutDashboard },
    { id: 'history' as TabType, label: 'Riwayat', emoji: '📜', icon: History },
    { id: 'debts' as TabType, label: 'Hutang', emoji: '🤝', icon: HandCoins },
    { id: 'reports' as TabType, label: 'Laporan', emoji: '📈', icon: FileText },
  ];

  const handleActionClick = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <>
      {/* Backdrop overlay when action menu is open */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Floating Speed Dial Action Menu */}
      {isMenuOpen && (
        <div className="fixed bottom-22 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-2.5 shadow-2xl space-y-1.5 animate-in slide-in-from-bottom-4 zoom-in-95 duration-200">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡</span>
              <span>Aksi Cepat</span>
            </span>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 1. Tambah Transaksi Manual */}
          <button
            type="button"
            onClick={() => handleActionClick(onOpenAddModal)}
            className="w-full p-2.5 rounded-2xl flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                <span>✍️ Catat Transaksi</span>
              </div>
              <p className="text-[10px] text-slate-400">Pemasukan atau pengeluaran harian</p>
            </div>
          </button>

          {/* 2. Scan Struk Belanja */}
          <button
            type="button"
            onClick={() => handleActionClick(onOpenScannerModal)}
            className="w-full p-2.5 rounded-2xl flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                <span>📸 Scan Struk Belanja</span>
              </div>
              <p className="text-[10px] text-slate-400">Pindai foto struk & nota belanja</p>
            </div>
          </button>

          {/* 3. Transfer Antar Dompet */}
          <button
            type="button"
            onClick={() => handleActionClick(onOpenTransferModal || onOpenAddModal)}
            className="w-full p-2.5 rounded-2xl flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                <span>🔁 Transfer Antar Dompet</span>
              </div>
              <p className="text-[10px] text-slate-400">Pindah dana antar rekening / e-wallet</p>
            </div>
          </button>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-md mx-auto px-3 py-1.5 sm:py-2 flex items-center justify-around relative">
          {/* Left 2 items: Beranda & Riwayat */}
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setActiveTab(item.id);
                }}
                className="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer"
                style={isActive ? { color: primaryColor } : undefined}
              >
                <div
                  className="p-1 rounded-lg transition-colors"
                  style={isActive ? { backgroundColor: `${primaryColor}20` } : undefined}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      !isActive ? 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200' : ''
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] mt-0.5 tracking-tight flex items-center gap-0.5 ${
                    isActive ? 'font-bold' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}

          {/* Center Unified Action Button */}
          <div className="relative -top-5 flex flex-col items-center">
            <button
              type="button"
              id="btn-bottom-add"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`w-13 h-13 rounded-2xl text-white flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer border-2 border-white dark:border-slate-900 ${
                isMenuOpen ? 'rotate-45' : 'hover:rotate-90'
              }`}
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                boxShadow: `0 8px 22px -4px ${primaryColor}60`,
              }}
              title="Aksi Tambah Cepat (Catat, Scan Struk, Transfer)"
              aria-expanded={isMenuOpen}
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </button>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {isMenuOpen ? 'Tutup' : '➕ Aksi'}
            </span>
          </div>

          {/* Right 2 items: Hutang & Laporan */}
          {navItems.slice(2, 4).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setActiveTab(item.id);
                }}
                className="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer"
                style={isActive ? { color: primaryColor } : undefined}
              >
                <div
                  className="p-1 rounded-lg transition-colors"
                  style={isActive ? { backgroundColor: `${primaryColor}20` } : undefined}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      !isActive ? 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200' : ''
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] mt-0.5 tracking-tight flex items-center gap-0.5 ${
                    isActive ? 'font-bold' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
