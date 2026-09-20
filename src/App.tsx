import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/navigation/Header';
import { BottomNav, TabType } from './components/navigation/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionHistoryView } from './components/transactions/TransactionHistoryView';
import { DebtsView } from './components/debts/DebtsView';
import { ReportsView } from './components/analytics/ReportsView';
import { AddTransactionModal } from './components/transactions/AddTransactionModal';
import { ReceiptScannerModal } from './components/ocr/ReceiptScannerModal';
import { ProfileModal } from './components/auth/ProfileModal';
import { NotificationsModal } from './components/notifications/NotificationsModal';
import { AuthModal } from './components/auth/AuthModal';
import { OCRScanResult } from './types';
import { Loader2 } from 'lucide-react';
import { db, collection, query, where, onSnapshot } from './lib/firebase';

const MainApp: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Scanned draft pass-through
  const [scannedData, setScannedData] = useState<{ result: OCRScanResult; receiptUrl?: string } | null>(null);

  // Check urgent unread notifications count for header badge
  useEffect(() => {
    if (!currentUser) return;

    const qDebts = query(collection(db, 'debts'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(
      qDebts, 
      (snap) => {
        let count = 0;
        const now = new Date();
        snap.forEach((d) => {
          const debt = d.data();
          if (debt.status !== 'paid' && debt.dueDate) {
            const due = new Date(debt.dueDate);
            const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) count++;
          }
        });
        setUnreadCount(count);
      },
      (error) => {
        console.warn('Notice querying debts count:', error);
      }
    );

    return () => unsub();
  }, [currentUser]);

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
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenNotifications={() => setIsNotifOpen(true)}
        unreadCount={unreadCount}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3 pb-24">
        {activeTab === 'dashboard' && (
          <DashboardView
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onViewAllTransactions={() => setActiveTab('history')}
            onViewAllDebts={() => setActiveTab('debts')}
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

      {/* Notifications & Reminders Modal */}
      <NotificationsModal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onNavigateToDebts={() => setActiveTab('debts')}
        onNavigateToReports={() => setActiveTab('reports')}
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
