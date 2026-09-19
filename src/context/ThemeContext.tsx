import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { FONT_OPTIONS } from '../lib/constants';

export type Theme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  primaryColor: string;
  currentFont: string;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setPrimaryColor: (hex: string) => void;
  setFont: (fontFamily: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Helper to adjust color brightness for hover state
function adjustBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  const newR = clamp(Math.round(r * (1 + percent / 100)));
  const newG = clamp(Math.round(g * (1 + percent / 100)));
  const newB = clamp(Math.round(b * (1 + percent / 100)));
  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, updateThemePreference, updatePrimaryColor, updateFontPreference } = useAuth();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [theme, setTheme] = useState<Theme>('light');
  const [primaryColor, setPrimaryColorState] = useState<string>('#10B981');
  const [currentFont, setCurrentFontState] = useState<string>("'Plus Jakarta Sans', sans-serif");

  // Load initial preferences
  useEffect(() => {
    if (userProfile?.theme) {
      setThemeModeState(userProfile.theme);
    } else {
      const savedMode = (localStorage.getItem('myduit_theme_mode') as ThemeMode) || 'light';
      setThemeModeState(savedMode);
    }

    if (userProfile?.primaryColor) {
      setPrimaryColorState(userProfile.primaryColor);
    } else {
      const savedColor = localStorage.getItem('myduit_primary_color');
      if (savedColor) setPrimaryColorState(savedColor);
    }

    if (userProfile?.fontFamily) {
      setCurrentFontState(userProfile.fontFamily);
    } else {
      const savedFont = localStorage.getItem('myduit_font_family');
      if (savedFont) setCurrentFontState(savedFont);
    }
  }, [userProfile]);

  // Compute effective theme (light / dark) based on themeMode
  useEffect(() => {
    if (themeMode === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      setTheme(themeMode);
    }
  }, [themeMode]);

  // Apply dark class to <html> and <body>
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
    localStorage.setItem('myduit_theme_mode', themeMode);
    localStorage.setItem('myduit_theme', theme);
  }, [theme, themeMode]);

  // Apply dynamic color calculations
  useEffect(() => {
    try {
      const rgb = hexToRgb(primaryColor);
      const hover = adjustBrightness(primaryColor, -12);
      const light = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${theme === 'dark' ? 0.2 : 0.12})`;
      const border = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${theme === 'dark' ? 0.4 : 0.25})`;

      const root = document.documentElement;
      root.style.setProperty('--primary-color', primaryColor);
      root.style.setProperty('--primary-hover', hover);
      root.style.setProperty('--primary-light', light);
      root.style.setProperty('--primary-border', border);
      root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);

      localStorage.setItem('myduit_primary_color', primaryColor);
    } catch (e) {
      console.error('Invalid primary color:', e);
    }
  }, [primaryColor, theme]);

  // Apply dynamic font
  useEffect(() => {
    document.documentElement.style.setProperty('--font-family-current', currentFont);
    document.body.style.fontFamily = currentFont;
    localStorage.setItem('myduit_font_family', currentFont);
  }, [currentFont]);

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setThemeModeState(next);
    updateThemePreference(next).catch(() => {});
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    updateThemePreference(mode).catch(() => {});
  };

  const setPrimaryColor = (hex: string) => {
    setPrimaryColorState(hex);
    updatePrimaryColor(hex).catch(() => {});
  };

  const setFont = (fontFamily: string) => {
    setCurrentFontState(fontFamily);
    updateFontPreference(fontFamily).catch(() => {});
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        primaryColor,
        currentFont,
        toggleTheme,
        setThemeMode,
        setPrimaryColor,
        setFont,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

