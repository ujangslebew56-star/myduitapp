import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../ui/Logo';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  Chrome, 
  AlertCircle, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  KeyRound
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { signInWithGoogle, signInEmail, signUpEmail, resetPassword } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Nama lengkap wajib diisi');
        if (cleanPassword.length < 6) throw new Error('Password minimal 6 karakter');
        await signUpEmail(name.trim(), cleanEmail, cleanPassword);
      } else {
        await signInEmail(cleanEmail, cleanPassword);
      }
    } catch (err: any) {
      console.error('Auth submit error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Email atau kata sandi tidak cocok. Jika Anda belum pernah mendaftar, silakan klik "Daftar gratis" di bawah.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email ini sudah pernah terdaftar. Silakan pilih "Masuk di sini".');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain (${window.location.hostname}) belum diizinkan di Firebase Console. Tambahkan domain ini di Firebase Console > Authentication > Settings > Authorized domains.`);
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Penyedia login Email belum diaktifkan di Firebase Console. Buka Firebase Console > Authentication > Sign-in method > Aktifkan Email/Password.');
      } else {
        setError(err.message || 'Terjadi kesalahan saat masuk.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain (${window.location.hostname}) belum diizinkan di Firebase Console. Tambahkan domain ini di Firebase Console > Authentication > Settings > Authorized domains.`);
      } else {
        setError(err.message || 'Gagal login menggunakan akun Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Silakan isi kolom email di bawah terlebih dahulu untuk mengatur ulang kata sandi.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setResetting(true);
    try {
      await resetPassword(cleanEmail);
      setSuccessMsg(`Tautan reset kata sandi telah dikirim ke ${cleanEmail}. Silakan periksa kotak masuk atau spam email Anda.`);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('Email ini belum terdaftar di aplikasi. Silakan buat akun baru.');
      } else {
        setError(err.message || 'Gagal mengirim email reset kata sandi.');
      }
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Subtle modern backdrop gradient glow */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8 relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size="lg" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-4">
            {isRegister ? 'Buat Akun Baru' : 'Selamat Datang Kembali'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola dompet, catat transaksi & scan struk AI dengan aman di cloud.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex flex-col gap-2 text-rose-700 dark:text-rose-300 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {!isRegister && error.includes('belum pernah mendaftar') && (
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className="self-start text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 underline cursor-pointer pl-6 hover:text-emerald-700"
              >
                Klik di sini untuk mendaftar akun sekarang →
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google OAuth Login Button */}
        <button
          type="button"
          id="btn-google-login"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all duration-200 flex items-center justify-center gap-3 font-medium text-slate-700 dark:text-slate-200 text-sm shadow-xs cursor-pointer disabled:opacity-60"
        >
          <Chrome className="w-5 h-5 text-emerald-500" />
          <span>Lanjutkan dengan Google</span>
        </button>

        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
          <span className="px-3 text-xs uppercase font-medium text-slate-400 tracking-wider">
            atau email
          </span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Budi Santoso"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                id="input-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kata Sandi
              </label>
              {!isRegister && (
                <button
                  type="button"
                  id="btn-forgot-password"
                  onClick={handleForgotPassword}
                  disabled={resetting}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>{resetting ? 'Mengirim...' : 'Lupa sandi?'}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="input-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-900 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="btn-submit-auth"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            <span>{loading ? 'Memproses...' : isRegister ? 'Daftar Sekarang' : 'Masuk ke Akun'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
          <button
            type="button"
            id="btn-toggle-auth-mode"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setSuccessMsg(null);
            }}
            className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            {isRegister ? 'Masuk di sini' : 'Daftar gratis'}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Keamanan Cloud Firestore & Firebase Auth</span>
        </div>
      </div>
    </div>
  );
};
