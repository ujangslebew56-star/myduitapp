import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Bell, Sun, Moon, RotateCw } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { TabType } from './BottomNav';

interface HeaderProps {
  onOpenScanner?: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  activeTab: TabType;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenProfile, 
  onOpenNotifications,
  unreadCount = 0,
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

  const displayName = userProfile?.displayName || currentUser?.displayName || 'Ujang';
  const firstName = displayName.split(' ')[0] || 'Ujang';

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Avatar + Warm Greeting matching Design Photo */}
        <div 
          onClick={onOpenProfile}
          className="flex items-center gap-3 cursor-pointer group"
          title="Buka Profil Pengguna"
        >
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-xs overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform"
            >
              {userProfile?.photoURL || currentUser?.photoURL ? (
                <img
                  src={userProfile?.photoURL || currentUser?.photoURL || ''}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full text-white font-bold text-sm flex items-center justify-center uppercase"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                  }}
                >
                  {firstName[0]}
                </div>
              )}
            </div>
            {/* Active Online Indicator & App Logo Stamp */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full overflow-hidden bg-white ring-2 ring-white dark:ring-slate-900 shadow-xs flex items-center justify-center">
              <img
                src="/pwa-192x192.png"
                alt="MY DUIT"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <span>Selamat datang di</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">MY DUIT</span>
            </div>
            <div className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-tight">
              <span>Halo, {firstName}</span>
              <span className="text-base">👋</span>
            </div>
          </div>
        </div>

        {/* Right: Clean Action Icons matching Design Photo */}
        <div className="flex items-center gap-1.5">
          {/* Refresh Data */}
          <button
            type="button"
            id="btn-header-hard-refresh"
            onClick={handleHardRefresh}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Segarkan Data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          {/* Theme Mode Switcher */}
          <button
            type="button"
            id="btn-toggle-theme"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Functional Notification Bell */}
          <button
            type="button"
            id="btn-header-bell"
            onClick={onOpenNotifications}
            className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 shadow-2xs hover:shadow-xs transition-all cursor-pointer relative"
            title="Buka Notifikasi & Pengingat"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
