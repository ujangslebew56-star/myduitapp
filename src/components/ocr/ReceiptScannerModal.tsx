import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  X, 
  Check, 
  Loader2, 
  ArrowRight, 
  RotateCcw, 
  Image as ImageIcon, 
  Store, 
  Calendar, 
  DollarSign, 
  Tag 
} from 'lucide-react';
import { scanReceiptWithGemini } from '../../lib/ocrService';
import { OCRScanResult } from '../../types';
import { formatCurrency, formatNumberWithDots, parseNumberFromDots } from '../../lib/constants';
import { useTheme } from '../../context/ThemeContext';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiptScanned: (result: OCRScanResult, previewImage?: string) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onReceiptScanned,
}) => {
  const { primaryColor } = useTheme();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<OCRScanResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Editable fields in result
  const [editMerchant, setEditMerchant] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      processOCR(result);
    };
    reader.readAsDataURL(file);
  };

  const processOCR = async (base64Img: string) => {
    setScanning(true);
    setScanResult(null);
    try {
      const result = await scanReceiptWithGemini(base64Img);
      setScanResult(result);
      setEditMerchant(result.merchant || 'Struk Belanja');
      setEditTotal(formatNumberWithDots(result.total));
      setEditDate(result.date || new Date().toISOString().split('T')[0]);
      setEditCategory(result.suggestedCategory || 'Belanja & Groceries');
    } catch (err) {
      console.error('OCR Process failed:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleUseResult = () => {
    if (!scanResult) return;
    const parsedTotal = parseNumberFromDots(editTotal) || scanResult.total;
    const finalResult: OCRScanResult = {
      ...scanResult,
      merchant: editMerchant,
      total: parsedTotal,
      date: editDate,
      suggestedCategory: editCategory,
    };
    onReceiptScanned(finalResult, imagePreview || undefined);
    onClose();
  };

  const resetAll = () => {
    setImagePreview(null);
    setScanResult(null);
    setScanning(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Scan Struk AI</h3>
              <p className="text-[11px] text-slate-400">Ekstrak otomatis struk belanja menjadi transaksi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Hidden file inputs */}
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
            className="hidden"
          />
          <input
            type="file"
            ref={galleryInputRef}
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
            className="hidden"
          />

          {!imagePreview ? (
            <div className="space-y-3">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-sm"
                  style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                >
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Pilih Struk Belanja
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Bisa ambil foto langsung dengan kamera HP atau pilih gambar struk dari galeri/folder.
                </p>

                {/* Direct Action Buttons */}
                <div className="mt-5 grid grid-cols-2 gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Buka Kamera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-transform active:scale-95 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <span>Pilih Galeri</span>
                  </button>
                </div>
              </div>

              {/* Tips */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  💡 Tips Foto Struk Terbaik:
                </span>
                <p>• Pastikan teks total belanja dan tanggal terlihat jelas.</p>
                <p>• Gunakan pencahayaan yang cukup dan hindari pantulan cahaya tajam.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview Thumbnail */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-48 bg-slate-950 flex items-center justify-center">
                <img src={imagePreview} alt="Struk" className="w-full h-48 object-contain" />
                {scanning && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" style={{ color: primaryColor }} />
                    <span className="text-xs font-bold">AI Sedang Membaca Struk...</span>
                    <span className="text-[11px] text-slate-300 mt-1">
                      Mengekstrak total harga, tanggal, nama toko & rincian barang
                    </span>
                  </div>
                )}
              </div>

              {/* Scanned Card Details with Direct Edit Support */}
              {scanResult && !scanning && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                      style={{ color: primaryColor }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Hasil Deteksi AI
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                      style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                    >
                      Terverifikasi
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Nama Toko / Merchant:
                      </label>
                      <div className="relative">
                        <Store className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={editMerchant}
                          onChange={(e) => setEditMerchant(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                          Total Pembayaran (Rp):
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editTotal}
                          onChange={(e) => setEditTotal(formatNumberWithDots(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                          Tanggal Transaksi:
                        </label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Kategori Terdeteksi:
                      </label>
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Scanned Items list if any */}
                  {scanResult.items && scanResult.items.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Rincian Item ({scanResult.items.length}):
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {scanResult.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300"
                          >
                            <span className="truncate pr-2">{item.name}</span>
                            <span className="font-mono shrink-0">{formatCurrency(item.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ulangi</span>
                </button>
                <button
                  type="button"
                  disabled={!scanResult || scanning}
                  onClick={handleUseResult}
                  className="flex-1 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>Gunakan Transaksi</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
