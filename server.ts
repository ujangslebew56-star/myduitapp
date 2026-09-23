import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase payload limit for receipt images
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Explicitly serve public assets (manifest, pwa icons, service worker) with proper headers
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('manifest.json') || filePath.endsWith('manifest.webmanifest')) {
      res.setHeader('Content-Type', 'application/manifest+json');
    }
  }
}));

// Lazy initialize Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: key });
  }
  return geminiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
  });
});

// Accurate Receipt Scanner OCR API
app.post('/api/scan-receipt', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'Data gambar tidak valid' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      console.warn('GEMINI_API_KEY not configured on server. Advising client fallback.');
      res.status(503).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di server',
        fallbackNeeded: true,
      });
      return;
    }

    // Clean base64 and extract mimeType
    let mimeType = 'image/jpeg';
    let base64Data = image;

    const dataMatch = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (dataMatch) {
      mimeType = dataMatch[1];
      base64Data = dataMatch[2];
    }

    const prompt = `Anda adalah asisten OCR AI yang sangat ahli dan presisi dalam menganalisis struk belanja, nota, bon kasir, kwitansi, atau faktur belanja di Indonesia (seperti Indomaret, Alfamart, Superindo, Hypermart, warung, restoran, cafe, apotek, SPBU, PLN, dll).

Tugas Anda:
1. Bacalah gambar struk ini dengan cermat dan ekstrak informasi berikut:
   - "merchant": Nama toko, merchant, atau kasir. Bersihkan dari nomor registrasi/PT/CV jika ada (contoh: "Indomaret", "Alfamart", "Starbucks Coffee", "Apotek K-24"). Jika tidak jelas, gunakan nama jenis tempat yang paling masuk akal atau "Struk Belanja".
   - "date": Tanggal transaksi dalam format YYYY-MM-DD. Jika tahun hanya 2 digit (misal: 25 atau 26), ubah menjadi 4 digit (2025/2026). Jika tanggal tidak tertera jelas, gunakan tanggal hari ini (${new Date().toISOString().split('T')[0]}).
   - "total": TOTAL NOMINAL AKHIR pembayaran (grand total / total bayar / tagihan yang dibayarkan) dalam angka bulat (integer) rupiah tanpa titik/koma. PENTING: Jangan tertukar dengan uang tunai yang diserahkan ("CASH" / "TUNAI") jika ada uang kembalian ("KEMBALI" / "CHANGE"). Pastikan ini adalah nilai belanja riil.
   - "suggestedCategory": Pilih SATU kategori yang paling relevan dari daftar berikut:
     * "Makanan & Minuman" (restoran, cafe, warung makan, jajan, bakery)
     * "Belanja & Groceries" (supermarket, minimarket, pasar, pakaian, kebutuhan rumah)
     * "Transportasi" (bensin SPBU, tiket, parkir, ojek)
     * "Tagihan & Utilitas" (listrik PLN, PDAM, pulsa/kuota, internet/wifi)
     * "Kesehatan & Medis" (apotek, klinik, obat, dokter, vitamin)
     * "Hiburan & Liburan" (nonton bioskop, game, rekreasi)
     * "Pendidikan & Kursus" (buku, alat tulis, kursus)
     * "Keluarga & Donasi" (amal, sedekah, infak)
     * "Investasi & Tabungan"
     * "Lainnya"
   - "items": Array rincian barang/produk yang dibeli. Setiap item memiliki properti "name" (nama produk ringkas) dan "price" (harga total untuk item tersebut).
   - "rawText": Teks ringkas yang terbaca dari bagian penting struk (nama toko, tanggal, item, total).

Kembalikan HANYA format JSON valid tanpa tanda kutip markdown dan tanpa teks lain di luar JSON:
{
  "merchant": "Nama Merchant",
  "date": "YYYY-MM-DD",
  "total": 50000,
  "suggestedCategory": "Belanja & Groceries",
  "items": [
    { "name": "Item 1", "price": 25000 },
    { "name": "Item 2", "price": 25000 }
  ],
  "rawText": "Teks ringkasan struk"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = response.text || '';
    // Clean potential markdown wrappers
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7);
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    const parsed = JSON.parse(cleanJson);

    // Validate numbers
    const finalTotal = Math.max(0, Math.round(Number(parsed.total) || 0));

    res.json({
      merchant: parsed.merchant || 'Struk Belanja',
      date: parsed.date || new Date().toISOString().split('T')[0],
      total: finalTotal,
      suggestedCategory: parsed.suggestedCategory || 'Belanja & Groceries',
      items: Array.isArray(parsed.items)
        ? parsed.items.map((i: any) => ({
            name: String(i.name || 'Produk Belanja'),
            price: Math.max(0, Math.round(Number(i.price) || 0)),
          }))
        : [],
      rawText: parsed.rawText || responseText.slice(0, 300),
    });
  } catch (error: any) {
    console.error('Server OCR error:', error);
    res.status(500).json({
      error: error?.message || 'Gagal memproses struk dengan AI',
      fallbackNeeded: true,
    });
  }
});

// Vite middleware configuration
async function start() {
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MY DUIT Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
