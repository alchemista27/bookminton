# Bookminton

Bookminton adalah aplikasi web untuk pemesanan lapangan badminton dengan panel admin dan user. Aplikasi ini dibuat dengan React + Vite dan menggunakan Supabase untuk autentikasi dan penyimpanan data.

Fitur utama
- Panel admin untuk mengelola lapangan, jadwal, dan laporan
- Panel user untuk mendaftar, login, dan memesan lapangan
- Integrasi Supabase (Auth & Database)
- Ekspor/print transaksi ke PDF dan dukungan QR code

Teknologi
- React 19 + Vite
- Tailwind CSS
- Supabase (via `@supabase/supabase-js`)
- React Router, date-fns, jspdf, html2canvas, qrcode.react

Quickstart
1. Install dependensi

```bash
npm install
```

2. Buat file environment `.env` di root proyek dan tambahkan variabel Supabase:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

3. Jalankan development server

```bash
npm run dev
```

Perintah penting
- `npm run dev` — jalankan server pengembangan
- `npm run build` — build untuk produksi
- `npm run preview` — preview build produksi
- `npm run lint` — jalankan ESLint

Struktur proyek (singkat)
- `src/main.jsx` — entry aplikasi
- `src/App.jsx` — root layout / routing
- `src/supabaseClient.js` — inisialisasi Supabase (pakai `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`)
- `src/pages/` — halaman untuk `admin/` dan `user/`
- `src/components/` — komponen UI (mis. `Navbar.jsx`, `ProtectedRoute.jsx`)

Catatan lingkungan
- Pastikan variabel environment Supabase tersedia (lihat `src/supabaseClient.js`)
- Jika menggunakan GitHub/Vercel/Netlify, tambahkan variabel environment yang sama di dashboard deploy

Kontribusi
- Buka issue atau buat PR untuk perbaikan fitur/bug

Lisensi
- (Tambahkan lisensi jika diperlukan)

Jika Anda ingin, saya bisa menambahkan contoh `.env.example`, menyiapkan skrip deploy, atau membuat dokumentasi lebih rinci untuk setiap halaman.