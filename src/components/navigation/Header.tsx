import React, { useState } from 'react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Sparkles, RotateCw } from 'lucide-react';
import { TabType } from './BottomNav';

interface HeaderProps {
  onOpenScanner: () => void;
  onOpenProfile: () => void;
  activeTab: TabType;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenScanner, 
  onOpenProfile, 
}) => {
  const { userProfile, currentUser } = useAuth();
  const { theme, toggleTheme, primaryColor } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleHardRefresh = () => {
    setIsRefreshing(true);
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
    } catch {
      // Ignore cache API errors
    }
    setTimeout(() => {
      window.location.reload();
    }, 250);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 transition-colors">
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
        <Logo size="sm" />

        <div className="flex items-center gap-1.5">
          {/* Smart Scan Quick Launcher */}
          <button
            type="button"
            id="btn-header-scan-ocr"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold border transition-all active:scale-95 cursor-pointer shadow-2xs"
            style={{
              backgroundColor: `${primaryColor}12`,
              color: primaryColor,
              borderColor: `${primaryColor}30`,
            }}
            title="Scan Struk dengan AI"
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: primaryColor }} />
            <span className="hidden xs:inline text-[11px] font-medium tracking-tight">Scan AI</span>
          </button>

          {/* Quick Refresh / Cache Buster Button */}
          <button
            type="button"
            id="btn-header-hard-refresh"
            onClick={handleHardRefresh}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-90"
            title="Segarkan Tampilan & Bersihkan Cache Versi Terbaru"
            aria-label="Refresh and Clear Cache"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            id="btn-toggle-theme"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Profile Avatar */}
          <button
            type="button"
            id="btn-header-profile"
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full border overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:ring-2 transition-all cursor-pointer shrink-0 shadow-2xs"
            style={{
              borderColor: `${primaryColor}40`,
            }}
          >
            {userProfile?.photoURL || currentUser?.photoURL ? (
              <img
                src={userProfile?.photoURL || currentUser?.photoURL || ''}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full text-white font-bold text-xs flex items-center justify-center uppercase"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                }}
              >
                {(userProfile?.displayName || currentUser?.displayName || currentUser?.email || 'U')[0]}
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

