export type Currency = 'IDR' | 'USD';

export type WalletType = 'cash' | 'bank' | 'ewallet' | 'saving' | 'other';

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  icon?: string;
  accountNumber?: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  categoryName: string;
  walletId: string;
  walletName: string;
  toWalletId?: string; // For transfer
  toWalletName?: string;
  date: string; // YYYY-MM-DD
  note?: string;
  receiptUrl?: string; // photo/receipt base64 or storage
  createdAt: number;
}

export type DebtType = 'debt' | 'receivable'; // debt: saya berutang, receivable: orang berutang ke saya
export type DebtStatus = 'unpaid' | 'partial' | 'paid';

export interface DebtPayment {
  id: string;
  amount: number;
  walletId: string;
  walletName: string;
  date: string;
  note?: string;
  createdAt: number;
}

export interface Debt {
  id: string;
  userId: string;
  type: DebtType;
  personName: string;
  amount: number;
  remainingAmount: number;
  dueDate?: string;
  notes?: string;
  status: DebtStatus;
  payments: DebtPayment[];
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  userId?: string; // optional if system default
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  budgetMonthly?: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  currency: string;
  primaryColor: string; // custom accent color
  theme: 'light' | 'dark' | 'system';
  fontFamily?: string;
  reminderEnabled: boolean;
  reminderTime?: string;
}

export interface OCRScanResult {
  merchant?: string;
  date?: string;
  total: number;
  suggestedCategory?: string;
  items?: Array<{ name: string; price: number }>;
  rawText?: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // YYYY-MM-DD
  emoji: string;
  color: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}
