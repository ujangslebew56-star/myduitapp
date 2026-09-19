import React from 'react';
import { LayoutDashboard, History, Plus, FileText, HandCoins } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type TabType = 'dashboard' | 'history' | 'debts' | 'reports' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
  onOpenScannerModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
}) => {
  const { primaryColor } = useTheme();

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', emoji: '📊', icon: LayoutDashboard },
    { id: 'history' as TabType, label: 'Riwayat', emoji: '📜', icon: History },
    { id: 'debts' as TabType, label: 'Hutang', emoji: '🤝', icon: HandCoins },
    { id: 'reports' as TabType, label: 'Laporan', emoji: '📈', icon: FileText },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto px-3 py-1.5 sm:py-2 flex items-center justify-around relative">
        {/* Left 2 items */}
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              type="button"
              onClick={() => setActiveTab(item.id)}
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

        {/* Center Floating Plus Action Button */}
        <div className="relative -top-5 flex flex-col items-center">
          <button
            type="button"
            id="btn-bottom-add"
            onClick={onOpenAddModal}
            className="w-13 h-13 rounded-2xl text-white flex items-center justify-center transition-all duration-300 active:scale-90 hover:rotate-90 cursor-pointer border-2 border-white dark:border-slate-900"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
              boxShadow: `0 8px 22px -4px ${primaryColor}60`,
            }}
            title="Tambah Transaksi / Scan Struk"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">➕ Catat</span>
        </div>

        {/* Right 2 items */}
        {navItems.slice(2, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              type="button"
              onClick={() => setActiveTab(item.id)}
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
  );
};
