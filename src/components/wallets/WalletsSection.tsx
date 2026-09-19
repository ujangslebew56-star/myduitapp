import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Wallet, WalletType } from '../../types';
import { formatCurrency, formatNumberWithDots, parseNumberFromDots, getWalletTypeEmoji } from '../../lib/constants';
import { ConfirmModal } from '../ui/ConfirmModal';
import { 
  Wallet as WalletIcon, 
  Building2, 
  Smartphone, 
  PiggyBank, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  CreditCard,
  Settings,
  Sparkles
} from 'lucide-react';

interface WalletsSectionProps {
  onSelectWallet?: (wallet: Wallet) => void;
}

export const WalletsSection: React.FC<WalletsSectionProps> = ({ onSelectWallet }) => {
  const { currentUser } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageAllOpen, setIsManageAllOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<Wallet | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('bank');
  const [balance, setBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'wallets'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Wallet[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Wallet, 'id'>) });
        });
        setWallets(items);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'wallets');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const totalBalance = wallets.reduce((acc, w) => acc + (Number(w.balance) || 0), 0);

  const handleOpenAdd = () => {
    setEditingWallet(null);
    setName('');
    setType('bank');
    setBalance('');
    setAccountNumber('');
    setColor('#2563EB');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (w: Wallet, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWallet(w);
    setName(w.name);
    setType(w.type);
    setBalance(formatNumberWithDots(w.balance));
    setAccountNumber(w.accountNumber || '');
    setColor(w.color || '#2563EB');
    setIsModalOpen(true);
  };

  const handleDeletePrompt = (w: Wallet, e: React.MouseEvent) => {
    e.stopPropagation();
    setWalletToDelete(w);
  };

  const executeDeleteWallet = async () => {
    if (!walletToDelete) return;
    try {
      await deleteDoc(doc(db, 'wallets', walletToDelete.id));
      setWalletToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !name.trim()) return;
    setSubmitting(true);
    try {
      const parsedBalance = parseNumberFromDots(balance);
      if (editingWallet) {
        await updateDoc(doc(db, 'wallets', editingWallet.id), {
          name,
          type,
          balance: parsedBalance,
          accountNumber,
          color,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'wallets'), {
          userId: currentUser.uid,
          name,
          type,
          balance: parsedBalance,
          accountNumber,
          color,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      // Reset form state so former numbers leave no trace
      setName('');
      setBalance('');
      setAccountNumber('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save wallet error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getWalletIcon = (t: WalletType) => {
    switch (t) {
      case 'bank': return Building2;
      case 'ewallet': return Smartphone;
      case 'saving': return PiggyBank;
      default: return WalletIcon;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>💳</span>
            <span>Sumber Dana & Dompet</span>
          </h2>
          <span className="text-[11px] text-slate-400">
            Total {wallets.length} dompet tersimpan 👛
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="btn-manage-wallets"
            onClick={() => setIsManageAllOpen(true)}
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs"
            title="Kelola & edit semua dompet"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Kelola ⚙️</span>
          </button>
          <button
            type="button"
            id="btn-add-wallet"
            onClick={handleOpenAdd}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 cursor-pointer shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah ✨</span>
          </button>
        </div>
      </div>

      {/* Horizontal Carousel of Wallets */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
        {wallets.map((wallet) => {
          const Icon = getWalletIcon(wallet.type);
          const typeEmoji = getWalletTypeEmoji(wallet.type);
          return (
            <div
              key={wallet.id}
              onClick={(e) => {
                if (onSelectWallet) {
                  onSelectWallet(wallet);
                } else {
                  handleOpenEdit(wallet, e);
                }
              }}
              className="min-w-[190px] sm:min-w-[210px] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all relative group cursor-pointer shrink-0 snap-start flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: wallet.color || '#2563EB' }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                    {typeEmoji} {wallet.type.toUpperCase()}
                  </span>
                </div>

                <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate flex items-center gap-1">
                  <span className="truncate">{wallet.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mb-1.5 font-mono">
                  {wallet.accountNumber ? wallet.accountNumber : 'Rekening Utama'}
                </div>
                <div className="font-bold text-base text-slate-900 dark:text-white font-mono">
                  {formatCurrency(wallet.balance)}
                </div>
              </div>

              {/* Explicit Large Edit & Delete Action Buttons (Mobile-First Touch Target) */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5">
                <button
                  type="button"
                  id={`btn-edit-wallet-${wallet.id}`}
                  onClick={(e) => handleOpenEdit(wallet, e)}
                  className="flex-1 py-1.5 px-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-blue-200/60 dark:border-blue-800/60 shadow-2xs active:scale-95 cursor-pointer"
                  title="Edit Nama & Saldo Dompet"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Edit Dompet</span>
                </button>
                <button
                  type="button"
                  id={`btn-delete-wallet-${wallet.id}`}
                  onClick={(e) => handleDeletePrompt(wallet, e)}
                  className="py-1.5 px-2.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-rose-200/60 dark:border-rose-900/60 shadow-2xs active:scale-95 cursor-pointer"
                  title="Hapus Dompet"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Card Placeholder */}
        <button
          type="button"
          onClick={handleOpenAdd}
          className="min-w-[140px] p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer snap-start"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-center">Tambah Dompet ✨</span>
        </button>
      </div>

      {/* Modal Kelola Semua Dompet (Full List View) */}
      {isManageAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    Kelola Semua Dompet & Sumber Dana
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Edit saldo, ubah nama, atau tambah dompet baru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageAllOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of wallets */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {wallets.map((w) => {
                const Icon = getWalletIcon(w.type);
                const typeEmoji = getWalletTypeEmoji(w.type);
                return (
                  <div
                    key={w.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: w.color || '#2563EB' }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                          <span>{typeEmoji}</span>
                          <span className="truncate">{w.name}</span>
                        </div>
                        <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {formatCurrency(w.balance)}
                        </div>
                        {w.accountNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            No. {w.accountNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          setIsManageAllOpen(false);
                          handleOpenEdit(w, e);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1 border border-blue-200 dark:border-blue-800 cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit ✏️</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          setIsManageAllOpen(false);
                          handleDeletePrompt(w, e);
                        }}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 cursor-pointer shadow-2xs active:scale-95"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setIsManageAllOpen(false);
                  handleOpenAdd();
                }}
                className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Dompet Baru ✨</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Wallet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-1.5">
                <span>{editingWallet ? '✏️' : '💳'}</span>
                <span>{editingWallet ? 'Edit Dompet' : 'Tambah Dompet / Bank'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  🏷️ Nama Dompet / Bank
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Bank BCA, Dompet Tunai"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  🏦 Jenis Sumber Dana
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as WalletType)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                >
                  <option value="cash">💵 Tunai (Cash Fisik)</option>
                  <option value="bank">🏦 Bank / Rekening (BCA, Mandiri, BRI, dll)</option>
                  <option value="ewallet">📱 E-Wallet (GoPay, OVO, Dana, ShopeePay)</option>
                  <option value="saving">📈 Tabungan Khusus / Deposito / Investasi</option>
                  <option value="other">💳 Sumber Lainnya</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    💰 Saldo Saat Ini
                  </label>
                  {balance && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Rp {balance}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-bold font-mono text-xs text-slate-400 pointer-events-none select-none">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={balance}
                    onChange={(e) => setBalance(formatNumberWithDots(e.target.value))}
                    placeholder="0"
                    className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-mono"
                    required
                  />
                  {balance && (
                    <button
                      type="button"
                      onClick={() => setBalance('')}
                      className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Rekening / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Contoh: 1234-5678-90"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Warna Identitas
                </label>
                <div className="flex gap-2">
                  {['#10B981', '#2563EB', '#8B5CF6', '#F59E0B', '#F43F5E', '#06B6D4'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-transform ${
                        color === c ? 'scale-110 ring-2 ring-slate-400' : 'opacity-80'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md shadow-emerald-600/20"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Wallet Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(walletToDelete)}
        title="Hapus Dompet?"
        message={`Apakah Anda yakin ingin menghapus dompet "${walletToDelete?.name}"? Transaksi yang berkaitan tidak akan terhapus namun saldo dompet ini akan hilang.`}
        confirmText="Ya, Hapus Dompet"
        cancelText="Batal"
        isDanger={true}
        onConfirm={executeDeleteWallet}
        onCancel={() => setWalletToDelete(null)}
      />
    </div>
  );
};
