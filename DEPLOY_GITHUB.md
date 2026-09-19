# Panduan Mengatasi Gagal Deploy di GitHub Pages (100% Berhasil)

Workflow `.github/workflows/deploy.yml` kini telah diperbarui dengan **Dual Deployment Protection**:
1. Otomatis push build ke branch **`gh-pages`** (*metode anti-gagal*).
2. Otomatis deploy ke **GitHub Actions Pages** jika sudah diaktifkan.
3. Ditambahkan file `.nojekyll` dan `404.html` agar tidak diblokir Jekyll.

---

## 2 Langkah Wajib di Pengaturan Repositori GitHub Anda:

Jika deploy Anda sebelumnya gagal (tanda silang merah ❌ di GitHub Actions), ikuti 2 langkah cepat berikut di web GitHub:

### Langkah 1: Berikan Izin Tulis untuk GitHub Actions (Penyebab Utama Gagal)
Secara default, GitHub membatasi Actions hanya boleh membaca (*Read-only*). Anda perlu mengizinkannya menulis:
1. Buka repositori Anda di GitHub.
2. Klik tab **Settings** (ikon gerigi di atas).
3. Di menu sebelah kiri, klik **Actions** -> lalu pilih **General**.
4. Gulir ke bawah sampai menemukan bagian **Workflow permissions**.
5. Ubah pilihan dari *"Read repository contents permission"* menjadi:
   👉 **"Read and write permissions"**
6. Centang juga kotak *"Allow GitHub Actions to approve pull requests"* (jika ada).
7. Klik tombol hijau **Save**.

---

### Langkah 2: Aktifkan GitHub Pages
1. Di tab **Settings** repositori Anda, klik menu **Pages** di sebelah kiri.
2. Di bagian **Build and deployment**:
   - **Opsi Paling Mudah**: 
     - Di dropdown **Source**, pilih **Deploy from a branch**.
     - Di bawahnya (Branch), pilih branch **`gh-pages`** dan folder **`/(root)`**, lalu klik **Save**.
   - **ATAU Opsi GitHub Actions**:
     - Di dropdown **Source**, ubah menjadi **GitHub Actions**.
3. Selesai!

---

### Langkah 3: Jalankan Ulang / Re-run Workflow
1. Klik tab **Actions** di bagian atas repositori GitHub Anda.
2. Klik proses yang gagal sebelumnya.
3. Di sudut kanan atas, klik tombol **"Re-run all jobs"** (atau lakukan commit/ekspor baru dari AI Studio).
4. Workflow akan berjalan dan centang hijau **✓**.
5. Buka link website Anda di **Settings -> Pages** (misalnya `https://<username>.github.io/<nama-repo>/`).

---

## Catatan Khusus Pengguna Vercel (PENTING)
Jika repositori GitHub Anda terhubung ke **Vercel**:
1. Buka dashboard Vercel Anda ➔ pilih proyek Anda ➔ klik tab **Settings** ➔ **Git**.
2. Pastikan **Production Branch** diatur ke branch **`main`** (BUKAN `gh-pages`).
   - Branch `main` adalah sumber kode utama lengkap dengan `package.json`.
   - Branch `gh-pages` adalah output statis khusus GitHub Pages.
3. Kami juga telah menambahkan injeksi `package.json` dan `vercel.json` otomatis ke branch `gh-pages` agar jika Vercel tetap memicu build pada branch `gh-pages`, prosesnya tidak akan lagi mengalami error `ENOENT package.json`.


