# Kuliah Hub — Personal College Management System

Aplikasi web pribadi untuk mengatur tugas, catatan kuliah, self-learning, project,
portfolio, timeline akademik, dan review mingguan/semester — dibuat untuk mahasiswa UAD.

Aplikasi ini **tidak menduplikasi** Portal Akademik/Adisty (jadwal, presensi, nilai, KRS,
pembayaran) atau E-Learning (materi, assignment resmi). Ia hanya menangani hal-hal yang
memang perlu dikelola sendiri.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth), free tier
- Deploy ke Vercel

## 1. Setup Supabase (gratis)

1. Buat project baru di [supabase.com](https://supabase.com) (free tier).
2. Buka **SQL Editor**, tempel isi file `supabase/schema.sql`, lalu Run.
   Ini membuat semua tabel, Row Level Security (data hanya bisa diakses oleh
   akun pemiliknya), dan trigger pembuatan profil otomatis saat signup.
3. Buka **Project Settings → API**, salin `Project URL` dan `anon public key`.

## 2. Setup lokal

```bash
npm install
cp .env.local.example .env.local
# isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local
npm run dev
```

Buka http://localhost:3000, daftar akun baru (email + password), lalu login.

> Supabase Auth default mewajibkan verifikasi email. Untuk pemakaian pribadi,
> Anda bisa mematikan "Confirm email" di Supabase → Authentication → Providers → Email
> agar bisa langsung login setelah daftar.

## 3. Pemakaian pertama kali

Setelah login, buka **Settings** dan tambahkan semester pertama Anda
(mis. Academic Year `2026/2027`, Semester `1`), tandai sebagai semester aktif.
Setelah itu Dashboard, Tasks, Notes, Projects, dsb. otomatis mengikuti semester
yang dipilih di sidebar (atau pilih "Semua Semester" untuk melihat semuanya).

## 4. Deploy ke Vercel (gratis)

```bash
npm i -g vercel   # jika belum ada
vercel
```

Atau lewat dashboard Vercel: **Import Project** dari repo Git, lalu tambahkan
Environment Variables `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
di Project Settings sebelum deploy.

## Struktur modul (V1)

| Modul | Fungsi |
|---|---|
| Dashboard | Ringkasan: task hari ini, minggu ini, project berjalan |
| Tasks | List / Kanban / Calendar view, sumber: E-Learning, Dosen, Personal |
| Lecture Notes | Catatan pemahaman pribadi per mata kuliah/pertemuan |
| Self-Learning | Skill yang sedang dipelajari di luar kuliah, dengan progress |
| Projects | Semua project (kuliah, self-learning, personal, komunitas) |
| Portfolio | Otomatis dari Projects yang ditandai portfolio_status = yes/maybe |
| Academic Timeline | Milestone: UTS, UAS, KRS, pembayaran, dsb. (bukan jadwal harian) |
| Weekly Review | Review cepat tiap minggu |
| Semester Review | Review akhir tiap semester |
| Settings | Kelola daftar semester (Academic Year + Semester ke-) dan akun |

Struktur database (lihat `supabase/schema.sql`) sudah dirancang memakai konsep
`semesters` sehingga bisa dipakai sampai semester 8 tanpa perlu mengubah struktur —
tinggal menambah baris semester baru.

## Prinsip pengembangan

V1 fokus pada functionality yang benar-benar dipakai sehari-hari: sederhana, cepat,
dan bisa langsung dipakai dari laptop maupun HP (responsive: sidebar di desktop,
bottom navigation di HP). Fitur lanjutan (kalender lebih canggih, attachment upload,
analytics semester, dsb.) sengaja belum dibuat — tambahkan nanti hanya jika memang
terasa perlu setelah V1 dipakai dengan nyaman.
