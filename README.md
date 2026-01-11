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
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
