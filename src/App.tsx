/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthModal } from './components/auth/AuthModal';
import { Header } from './components/navigation/Header';
import { BottomNav, TabType } from './components/navigation/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionHistoryView } from './components/transactions/TransactionHistoryView';
import { DebtsView } from './components/debts/DebtsView';
import { ReportsView } from './components/analytics/ReportsView';
import { AddTransactionModal } from './components/transactions/AddTransactionModal';
import { ReceiptScannerModal } from './components/ocr/ReceiptScannerModal';
import { ProfileModal } from './components/auth/ProfileModal';
import { OCRScanResult } from './types';
import { Loader2 } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Scanned draft pass-through
  const [scannedData, setScannedData] = useState<{ result: OCRScanResult; receiptUrl?: string } | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-2" />
        <span className="text-xs font-semibold">Memuat MY DUIT...</span>
      </div>
    );
  }

  // If not logged in, render the Auth view
  if (!currentUser) {
    return <AuthModal />;
  }

  const handleReceiptScanned = (result: OCRScanResult, previewImage?: string) => {
    setScannedData({ result, receiptUrl: previewImage });
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setScannedData(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Mobile-first sticky top bar */}
      <Header
        activeTab={activeTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3 pb-24">
        {activeTab === 'dashboard' && (
          <DashboardView
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onViewAllTransactions={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'history' && <TransactionHistoryView />}

        {activeTab === 'debts' && <DebtsView />}

        {activeTab === 'reports' && <ReportsView />}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenScannerModal={() => setIsScannerOpen(true)}
      />

      {/* Add Transaction Dialog */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        initialScanData={scannedData}
      />

      {/* Smart OCR Receipt Scanner Dialog */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onReceiptScanned={handleReceiptScanned}
      />

      {/* User Profile & Theme Settings Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </AuthProvider>
  );
}
