import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useTheme } from '../../context/ThemeContext';
import { 
  Download, 
  Smartphone, 
  Apple, 
  Monitor, 
  PackageCheck, 
  X, 
  CheckCircle2, 
  Share2, 
  PlusSquare, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const { primaryColor } = useTheme();

  const [activeDeviceTab, setActiveDeviceTab] = useState<'pwa' | 'android' | 'ios' | 'pc'>(
    isIOS ? 'ios' : isAndroid ? 'android' : 'pwa'
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Pasang & Jadikan Paket Aplikasi
              </h2>
              <p className="text-[11px] text-slate-400">
                Gunakan di Android, iPhone, Windows, Mac tanpa repot
              </p>
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
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Quick Install Action Banner if available */}
          {isInstalled ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                  Aplikasi Sudah Terpasang!
                </span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  Anda saat ini sedang menjalankan MY DUIT dalam mode aplikasi mandiri (*standalone*).
                </span>
              </div>
            </div>
          ) : isInstallable ? (
            <div
              className="p-4 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
              }}
            >
              <div className="text-center sm:text-left">
                <span className="font-bold text-sm block">Siap Dipasang di Perangkat Ini</span>
                <span className="text-[11px] text-slate-200">
                  Pasang langsung sebagai aplikasi layar utama dalam 1 detik.
                </span>
              </div>
              <button
                type="button"
                onClick={install}
                className="py-2 px-4 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-md hover:bg-slate-100 transition-transform active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Pasang Sekarang</span>
              </button>
            </div>
          ) : null}

          {/* Platform Tab Switcher */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveDeviceTab('android')}
              className={`py-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeDeviceTab === 'android'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-500" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDeviceTab('ios')}
              className={`py-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeDeviceTab === 'ios'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Apple className="w-4 h-4 text-indigo-400" />
              <span>iPhone/iPad</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDeviceTab('pc')}
              className={`py-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeDeviceTab === 'pc'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Monitor className="w-4 h-4 text-sky-500" />
              <span>Laptop/PC</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDeviceTab('pwa')}
              className={`py-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeDeviceTab === 'pwa'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <PackageCheck className="w-4 h-4 text-amber-500" />
              <span>Build APK</span>
            </button>
          </div>

          {/* Tab 1: Android Guide */}
          {activeDeviceTab === 'android' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  Cara Pasang di HP Android (Instan):
                </h4>
                <ol className="space-y-2 text-slate-600 dark:text-slate-300 list-decimal pl-4 leading-relaxed">
                  <li>Buka link website MY DUIT di browser <strong>Google Chrome</strong> HP Anda.</li>
                  <li>
                    Ketuk tombol titik tiga (<strong>⋮</strong>) di pojok kanan atas browser.
                  </li>
                  <li>
                    Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Instal Aplikasi"</strong>.
                  </li>
                  <li>
                    Konfirmasi klik <strong>"Instal"</strong>. Ikon aplikasi MY DUIT akan langsung muncul di menu dan layar beranda HP Anda layaknya aplikasi Play Store!
                  </li>
                </ol>
              </div>

              <div className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" /> Keunggulan PWA Android:
                </span>
                <p>• Sangat ringan (hemat memori tidak sampai 10MB).</p>
                <p>• Berjalan layar penuh (*full-screen*) tanpa bar browser.</p>
                <p>• Data otomatis tersinkronisasi ke Cloud Firestore.</p>
              </div>
            </div>
          )}

          {/* Tab 2: iPhone / iPad Guide */}
          {activeDeviceTab === 'ios' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Apple className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  Cara Pasang di iPhone / iPad (iOS Safari):
                </h4>
                <ol className="space-y-2.5 text-slate-600 dark:text-slate-300 list-decimal pl-4 leading-relaxed">
                  <li>Buka link aplikasi di browser <strong>Safari</strong> (bukan Chrome/in-app browser).</li>
                  <li>
                    Ketuk tombol <strong>Bagikan / Share</strong> (<Share2 className="w-3.5 h-3.5 inline mx-1 text-sky-500" /> kotak panah ke atas di bilah bawah).
                  </li>
                  <li>
                    Gulir sedikit ke bawah dan pilih <strong>"Tambah ke Layar Utama" (*Add to Home Screen*)</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-500" />).
                  </li>
                  <li>
                    Ketuk <strong>"Tambah" (*Add*)</strong> di sudut kanan atas. Selesai!
                  </li>
                </ol>
              </div>

              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                💡 Di iPhone, aplikasi akan langsung terbuka secara mandiri dengan ikon aplikasi resmi dan navigasi sentuh yang mulus.
              </div>
            </div>
          )}

          {/* Tab 3: PC / Desktop Guide */}
          {activeDeviceTab === 'pc' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-sky-500" />
                  Cara Pasang di Laptop / Komputer (Windows, Mac, Linux):
                </h4>
                <ol className="space-y-2 text-slate-600 dark:text-slate-300 list-decimal pl-4 leading-relaxed">
                  <li>Buka website MY DUIT di browser <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>.</li>
                  <li>
                    Lihat di ujung kanan kolom alamat web (URL bar). Anda akan melihat tombol <strong>"Instal Aplikasi"</strong> (<Download className="w-3.5 h-3.5 inline text-emerald-500" />).
                  </li>
                  <li>
                    Klik <strong>Instal</strong>. Aplikasi akan terbuka di jendela tersendiri dan pintasan muncul di Desktop serta Start Menu Windows / Launchpad Mac!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Tab 4: Export to Native APK Guide */}
          {activeDeviceTab === 'pwa' && (
            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-amber-500" />
                  Cara Menghasilkan File .APK (Android Package):
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Jika Anda ingin membagikan file instalasi berupa <strong>.APK</strong> ke teman via WhatsApp atau ingin mengunggahnya ke <strong>Google Play Store</strong>, Anda dapat menggunakan alat gratis resmi:
                </p>

                <div className="space-y-2 pt-1">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <strong className="text-slate-800 dark:text-slate-200 font-bold block">
                      Opsi 1: Menggunakan PWABuilder (Paling Mudah, Tanpa Coding)
                    </strong>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                      <li>Buka situs <span className="font-mono text-emerald-600 dark:text-emerald-400">pwabuilder.com</span> di komputer.</li>
                      <li>Masukkan URL website MY DUIT Anda, lalu klik <strong>Start</strong>.</li>
                      <li>Pilih platform <strong>Android</strong> lalu klik <strong>Package</strong>.</li>
                      <li>Download file <strong>.APK</strong> siap pakai atau paket <strong>.AAB</strong> untuk Play Store.</li>
                    </ol>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <strong className="text-slate-800 dark:text-slate-200 font-bold block">
                      Opsi 2: Menggunakan Capacitor CLI (Developer)
                    </strong>
                    <div className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-700 dark:text-slate-300 space-y-1 overflow-x-auto">
                      <div>npm install @capacitor/core @capacitor/cli @capacitor/android</div>
                      <div>npx cap init "MY DUIT" "com.myduit.app"</div>
                      <div>npx cap add android</div>
                      <div>npx cap open android</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cloud Synchronization Assurance */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Sinkronisasi Lintas Device
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Database Cloud Real-Time
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-white text-xs font-semibold shadow-xs cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
