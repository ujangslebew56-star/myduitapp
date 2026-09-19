import { Category } from '../types';

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  // Expense
  { name: 'Makanan & Minuman', type: 'expense', icon: 'Utensils', color: '#EF4444' },
  { name: 'Belanja & Groceries', type: 'expense', icon: 'ShoppingCart', color: '#F97316' },
  { name: 'Transportasi', type: 'expense', icon: 'Car', color: '#F59E0B' },
  { name: 'Tagihan & Utilitas', type: 'expense', icon: 'Receipt', color: '#8B5CF6' },
  { name: 'Hiburan & Liburan', type: 'expense', icon: 'Film', color: '#EC4899' },
  { name: 'Kesehatan & Medis', type: 'expense', icon: 'HeartPulse', color: '#10B981' },
  { name: 'Pendidikan & Kursus', type: 'expense', icon: 'GraduationCap', color: '#3B82F6' },
  { name: 'Keluarga & Donasi', type: 'expense', icon: 'Heart', color: '#6366F1' },
  { name: 'Investasi & Tabungan', type: 'expense', icon: 'TrendingUp', color: '#06B6D4' },
  { name: 'Lainnya', type: 'expense', icon: 'MoreHorizontal', color: '#64748B' },

  // Income
  { name: 'Gaji Pokok', type: 'income', icon: 'Briefcase', color: '#10B981' },
  { name: 'Bonus & Insentif', type: 'income', icon: 'Award', color: '#059669' },
  { name: 'Hasil Usaha / Freelance', type: 'income', icon: 'Laptop', color: '#3B82F6' },
  { name: 'Investasi / Dividen', type: 'income', icon: 'Coins', color: '#8B5CF6' },
  { name: 'Hadiah / Uang Saku', type: 'income', icon: 'Gift', color: '#F59E0B' },
  { name: 'Pengembalian / Refund', type: 'income', icon: 'RotateCcw', color: '#64748B' },
  { name: 'Pemasukan Lainnya', type: 'income', icon: 'PlusCircle', color: '#0EA5E9' },
];

export const DEFAULT_WALLETS = [
  { name: 'Uang Tunai (Cash)', type: 'cash' as const, balance: 250000, color: '#10B981' },
  { name: 'Bank BCA', type: 'bank' as const, balance: 2500000, color: '#2563EB', accountNumber: '***4821' },
  { name: 'GoPay / OVO', type: 'ewallet' as const, balance: 350000, color: '#00AED6' },
  { name: 'Tabungan Khusus', type: 'saving' as const, balance: 5000000, color: '#8B5CF6' },
];

export const COLOR_PALETTES = [
  { name: 'Emerald Modern', hex: '#10B981', light: '#ECFDF5' },
  { name: 'Royal Blue', hex: '#2563EB', light: '#EFF6FF' },
  { name: 'Electric Violet', hex: '#8B5CF6', light: '#F5F3FF' },
  { name: 'Amber Gold', hex: '#F59E0B', light: '#FFFBEB' },
  { name: 'Sunset Rose', hex: '#F43F5E', light: '#FFF1F2' },
  { name: 'Deep Teal', hex: '#0D9488', light: '#F0FDFA' },
  { name: 'Midnight Indigo', hex: '#4F46E5', light: '#EEF2FF' },
  { name: 'Obsidian Black', hex: '#0F172A', light: '#F8FAFC' },
];

export interface FontOption {
  id: string;
  name: string;
  family: string;
  category: string;
  preview: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'plus-jakarta', name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", category: 'Modern Tech', preview: 'Rp 1.250.000' },
  { id: 'inter', name: 'Inter', family: "'Inter', sans-serif", category: 'Clean Neutral', preview: 'Rp 1.250.000' },
  { id: 'poppins', name: 'Poppins', family: "'Poppins', sans-serif", category: 'Geometric Rounded', preview: 'Rp 1.250.000' },
  { id: 'outfit', name: 'Outfit', family: "'Outfit', sans-serif", category: 'Futuristic Avant', preview: 'Rp 1.250.000' },
  { id: 'syne', name: 'Syne', family: "'Syne', sans-serif", category: 'Artistic Contemporary', preview: 'Rp 1.250.000' },
  { id: 'jetbrains', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", category: 'Developer Monospace', preview: 'Rp 1.250.000' },
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif", category: 'Luxury Editorial', preview: 'Rp 1.250.000' },
];

export const formatCurrency = (amount: number, currency: string = 'IDR'): string => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format a number or digits-only string with Indonesian thousand separator dots (.)
 * Example: "1000000" -> "1.000.000"
 */
export const formatNumberWithDots = (val: string | number): string => {
  if (val === undefined || val === null || val === '') return '';
  const clean = val.toString().replace(/\D/g, '');
  if (!clean) return '';
  return new Intl.NumberFormat('id-ID').format(parseInt(clean, 10));
};

/**
 * Extract pure integer from a string formatted with dots
 * Example: "1.000.000" -> 1000000
 */
export const parseNumberFromDots = (val: string | number): number => {
  if (val === undefined || val === null || val === '') return 0;
  const clean = val.toString().replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
};

export const formatDateIndo = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatFullDateIndo = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

export const getCategoryEmoji = (categoryName?: string, type?: string): string => {
  if (!categoryName) return type === 'income' ? '💵' : '💸';
  const name = categoryName.toLowerCase();
  if (name.includes('makan') || name.includes('minum') || name.includes('kuliner') || name.includes('kopi') || name.includes('food')) return '🍔';
  if (name.includes('belanja') || name.includes('groceries') || name.includes('pasar') || name.includes('mall') || name.includes('supermarket')) return '🛍️';
  if (name.includes('trans') || name.includes('bensin') || name.includes('ojek') || name.includes('gojek') || name.includes('grab') || name.includes('parkir') || name.includes('tol') || name.includes('kereta')) return '🚗';
  if (name.includes('tagih') || name.includes('listrik') || name.includes('air') || name.includes('wifi') || name.includes('internet') || name.includes('pulsa') || name.includes('util')) return '💡';
  if (name.includes('hibur') || name.includes('nonton') || name.includes('game') || name.includes('libur') || name.includes('wisata') || name.includes('hobi')) return '🎮';
  if (name.includes('sehat') || name.includes('obat') || name.includes('dokter') || name.includes('rs') || name.includes('medis') || name.includes('klinik') || name.includes('apotek')) return '💊';
  if (name.includes('didik') || name.includes('sekolah') || name.includes('kuliah') || name.includes('buku') || name.includes('kursus')) return '🎓';
  if (name.includes('keluarga') || name.includes('donasi') || name.includes('amal') || name.includes('sedekah') || name.includes('zakat')) return '🤲';
  if (name.includes('invest') || name.includes('saham') || name.includes('reksadana') || name.includes('kripto') || name.includes('crypto')) return '📈';
  if (name.includes('gaji') || name.includes('salary') || name.includes('upah')) return '💼';
  if (name.includes('bonus') || name.includes('thr') || name.includes('insentif')) return '🎁';
  if (name.includes('freelance') || name.includes('proyek') || name.includes('usaha') || name.includes('jualan')) return '💻';
  if (name.includes('dividen') || name.includes('bunga') || name.includes('profit')) return '🪙';
  if (name.includes('hadiah') || name.includes('saku') || name.includes('angpao')) return '🎉';
  if (name.includes('refund') || name.includes('kembali')) return '🔄';
  if (name.includes('hutang') || name.includes('utang') || name.includes('cicilan') || name.includes('pinjam')) return '🤝';
  if (name.includes('piutang')) return '💰';
  if (name.includes('transfer')) return '🔁';
  return type === 'income' ? '📈' : '📉';
};

export const getWalletTypeEmoji = (type: string): string => {
  switch (type) {
    case 'cash': return '💵';
    case 'bank': return '🏦';
    case 'ewallet': return '📱';
    case 'saving': return '📈';
    case 'other': return '💳';
    default: return '👛';
  }
};

