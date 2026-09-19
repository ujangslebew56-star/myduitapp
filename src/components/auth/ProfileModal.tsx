import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { COLOR_PALETTES, FONT_OPTIONS } from '../../lib/constants';
import { 
  X, 
  LogOut, 
  Check, 
  Palette, 
  Shield, 
  Mail, 
  Sparkles, 
  Sun, 
  Moon, 
  Laptop, 
  Type, 
  Pipette
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userProfile, logout, updateProfileData } = useAuth();
  const { 
    theme, 
    themeMode, 
    setThemeMode, 
    primaryColor, 
    setPrimaryColor, 
    currentFont, 
    setFont 
  } = useTheme();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || currentUser?.displayName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customHexInput, setCustomHexInput] = useState(primaryColor);

  if (!isOpen) return null;

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updateProfileData(displayName);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyCustomHex = (hex: string) => {
    setCustomHexInput(hex);
    if (/^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{3}$/i.test(hex)) {
      setPrimaryColor(hex);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">Profil & Kustomisasi</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Avatar & User Details */}
          <div className="flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-full p-1 mb-2.5 transition-all shadow-md"
              style={{
                border: `2px solid ${primaryColor}`,
                boxShadow: `0 0 16px ${primaryColor}30`,
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {userProfile?.photoURL || currentUser?.photoURL ? (
                  <img
                    src={userProfile?.photoURL || currentUser?.photoURL || ''}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span
                    className="text-2xl font-black uppercase"
                    style={{ color: primaryColor }}
                  >
                    {(displayName || currentUser?.email || 'U')[0]}
                  </span>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2 w-full max-w-xs mt-1">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-center text-slate-900 dark:text-white"
                  placeholder="Nama Lengkap"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={saving}
                  className="px-3 py-1.5 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  Simpan
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  {displayName || 'Pengguna MY DUIT'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs hover:underline cursor-pointer"
                  style={{ color: primaryColor }}
                >
                  Ubah
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{currentUser?.email || 'Akun Aktif'}</span>
            </div>
          </div>

          {/* Theme Mode Segmented Picker */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Sun className="w-4 h-4" style={{ color: primaryColor }} />
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Mode Tampilan (Dark / Light)
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Terang</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-slate-900 text-white shadow-sm border border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gelap</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('system')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  themeMode === 'system'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-slate-500" />
                <span>Otomatis</span>
              </button>
            </div>
          </div>

          {/* Color Customization (Presets + Full Custom Picker) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" style={{ color: primaryColor }} />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Warna Tema Aplikasi
                </label>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {primaryColor.toUpperCase()}
              </span>
            </div>

            {/* Preset Color Swatches */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {COLOR_PALETTES.map((palette) => {
                const isSelected = primaryColor.toLowerCase() === palette.hex.toLowerCase();
                return (
                  <button
                    key={palette.hex}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(palette.hex);
                      setCustomHexInput(palette.hex);
                    }}
                    className={`flex flex-col items-center p-2 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800 ring-2'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    style={isSelected ? { borderColor: palette.hex } : {}}
                  >
                    <div
                      className="w-6 h-6 rounded-full shadow-xs flex items-center justify-center text-white"
                      style={{ backgroundColor: palette.hex }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 mt-1 text-center truncate w-full">
                      {palette.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input / Color Wheel */}
            <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 shrink-0 shadow-inner flex items-center justify-center">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => handleApplyCustomHex(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Pilih warna bebas"
                />
                <div
                  className="w-full h-full flex items-center justify-center text-white pointer-events-none"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Pipette className="w-4 h-4 drop-shadow-md" />
                </div>
              </div>

              <div className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                    HEX
                  </span>
                  <input
                    type="text"
                    value={customHexInput}
                    onChange={(e) => handleApplyCustomHex(e.target.value)}
                    placeholder="#10B981"
                    maxLength={7}
                    className="w-full pl-10 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono uppercase text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyCustomHex(customHexInput)}
                  className="py-1.5 px-3 rounded-xl text-xs font-semibold text-white shadow-xs cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>

          {/* Font Family Selection */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Type className="w-4 h-4" style={{ color: primaryColor }} />
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pilihan Jenis Font
              </label>
            </div>
            <div className="space-y-1.5">
              {FONT_OPTIONS.map((font) => {
                const isSelected = currentFont.includes(font.name);
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setFont(font.family)}
                    className={`w-full p-2.5 rounded-2xl border transition-all flex items-center justify-between text-left cursor-pointer ${
                      isSelected
                        ? 'border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 ring-1'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                    style={isSelected ? { borderColor: primaryColor } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          backgroundColor: isSelected ? `${primaryColor}20` : undefined,
                          color: isSelected ? primaryColor : undefined,
                        }}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : 'Aa'}
                      </div>
                      <div>
                        <div
                          className="text-xs font-semibold text-slate-800 dark:text-slate-100"
                          style={{ fontFamily: font.family }}
                        >
                          {font.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {font.category} • <span style={{ fontFamily: font.family }}>{font.preview}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cloud & AI Status */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Shield className="w-4 h-4 text-emerald-500" /> Database Firestore
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Tersinkronisasi</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-4 h-4 text-cyan-500" /> OCR Scanner AI
              </span>
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">Gemini Vision Siap</span>
            </div>
          </div>

          {/* Logout button */}
          <button
            type="button"
            id="btn-logout"
            onClick={handleLogout}
            className="w-full py-3 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>
    </div>
  );
};
