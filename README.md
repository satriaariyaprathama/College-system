# 🎓 Kuliah Hub (College System)
### *Commercial-Grade Academic Flight Deck & Student Operating System*

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.6_(Turbopack)-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.8-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase SSR](https://img.shields.io/badge/Supabase-PostgreSQL_%26_RLS-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel_Ready-000000?style=flat&logo=vercel)](https://vercel.com/)

---

## 📌 Executive Overview

**Kuliah Hub (College System)** adalah platform *Personal Academic Operating System* berstandar komersial yang dirancang khusus bagi mahasiswa modern dan civitas akademika (teroptimasi penuh untuk ekosistem Universitas Ahmad Dahlan / UAD). 

Berbeda dari aplikasi manajemen tugas atau catatan konvensional yang terisolasi, **Kuliah Hub** bertindak sebagai **Cockpit / Flight Deck** yang menjembatani operasional perkuliahan harian, sistem LMS kampus (SIMERU & Moodle E-Learning), radar presensi kehadiran 75%, pemantauan bimbingan DPA, serta inkubasi proyek portofolio profesional siap kerja.

---

## 🏛️ Arsitektur 5 Pilar Komersial (5 Core Pillars)

Sistem ditransformasikan ke dalam 5 modul pilar mandiri yang terpadu secara holistik:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KULIAH HUB FLIGHT DECK                          │
├──────────────┬──────────────┬──────────────┬─────────────┬─────────────┤
│ 1. Dashboard │ 2. Academics │   3. Tasks   │ 4. Projects │  5. Review  │
│  (Command    │   (SIMERU &  │  (Submission │ (Portfolio  │    (DPA &   │
│   Center)    │  Presensi)   │   Pipeline)  │  & Skills)  │  Timeline)  │
└──────────────┴──────────────┴──────────────┴─────────────┴─────────────┘
```

### 1. Command Center (`/dashboard`)
- **Interactive Heuristic Engine**: Algoritma skor kesehatan akademik waktu nyata ($0 - 100$) berbasis bukti telemetri.
- **Snapshot Time-Travel Simulator**: Pengguna dapat melompat mundur/maju tanggal (`<`, `>`, `Hari Ini`) untuk menginspeksi kondisi masa lalu atau mensimulasikan dampak beban tugas di masa mendatang.
- **Critical Action Radar**: Peringatan otomatis tugas E-Learning berdeadline $\le 48$ jam yang belum berstatus `submitted`.
- **Today's Classes SIMERU HUD**: Jadwal kuliah hari ini lengkap dengan ruang lab, jam, tautan cepat Moodle, grup WhatsApp, dan pintasan absensi.

### 2. Academics & SIMERU Operations (`/academics`)
- **Master Jadwal & SIMERU**: Pengelolaan jadwal kuliah berulang (Senin–Minggu), bobot SKS, dosen pengampu, ruang kelas, link grup WhatsApp, dan direct link Moodle E-Learning.
- **Radar Presensi 75% UAD**: Standar 14 pertemuan. Ambang batas maksimal 3 kali absen ($14 \times 0.25 = 3.5 \rightarrow 3$). Dilengkapi alarm otomatis *"Cekal UAS"* jika $\ge 4$ kali tidak hadir, counter cepat $\pm 1$ presensi, serta status aman/waspada/bahaya.
- **Catatan Kuliah Terstruktur**: Dokumentasi materi per pertemuan yang terhubung langsung ke mata kuliah dan proyek terkait.

### 3. Task & Submission Pipeline (`/tasks`)
- **Multi-View Modes**: Tampilan List, Kanban (5 kolom), dan Kalender Bulanan.
- **4-Stage Submission Pipeline**: 
  `not_started` (Belum Mulai) $\rightarrow$ `drafting` (Pengerjaan) $\rightarrow$ `ready_to_upload` (File Siap) $\rightarrow$ `submitted` (Sudah Terunggah ke LMS).
- **Direct Link & Filter**: Pemfilteran berdasarkan semester, status pengerjaan, dan mata kuliah SIMERU.

### 4. Projects, Skills & Portfolio Showcase (`/projects`)
- **Project Lifecycle Tracking**: Mengelola ide, perencanaan, pengerjaan, hingga penyelesaian proyek riil.
- **Self-Learning Matrix**: Pelacak penguasaan keahlian mandiri di luar kurikulum kelas.
- **Portfolio Showcase**: Kurasi otomatis karya-karya terbaik mahasiswa (`portfolio_status = yes/maybe`) yang siap dipresentasikan ke industri atau klien.

### 5. Review, DPA & Academic Timeline (`/review`)
- **3x Milestone Bimbingan DPA UAD**:
  1. *Bimbingan 1*: Perwalian KRS & Rencana Studi Awal Semester.
  2. *Bimbingan 2*: Evaluasi Tengah Semester (Pasca-UTS) & Capaian Belajar.
  3. *Bimbingan 3*: Evaluasi Akhir Semester, Hasil UAS & Refleksi IPK.
- **Kalender & Milestone Akademik**: Timeline visual jadwal UTS, UAS, KRS, pembayaran cicilan SPP, dan libur resmi universitas.
- **Evaluasi Periodik**: Refleksi mingguan, bulanan, dan akhir semester.

---

## 🧮 Formula Mesin Evaluasi Heuristik (Evidence-Based Heuristic)

Skor performa akademik dihitung secara deterministik melalui berkas `src/lib/heuristic.ts`:

$$\text{Score} = 100 - \sum \text{Penalti} + \sum \text{Bonus} \quad (\text{dibatasi } 0 \le \text{Score} \le 100)$$

| Komponen Evaluasi | Logika Bobot & Penalti | Status & Dampak |
|---|---|---|
| **Tugas Overdue** | $-15$ per tugas high, $-10$ medium, $-5$ low. Dikalikan faktor SKS matkul. | Memicu zona krisis jika akumulasi $> 30$. |
| **Radar E-Learning $\le 48$ Jam** | $-8$ per tugas yang belum berstatus `submitted`. | Mengurangi ketenangan menjelang deadline LMS. |
| **Presensi UAD (75%)** | Absen $\ge 4$: $-30$ per matkul (**Cekal UAS**). Absen $= 3$: $-15$ (Kritis). Absen $= 2$: $-5$ (Waspada). | Perlindungan mutlak hak mengikuti ujian akhir. |
| **Retensi Pengetahuan** | $-8$ jika rata-rata rasio catatan perkuliahan $< 0.4$ per matkul aktif. | Mendorong dokumentasi aktif tiap pertemuan. |
| **Milestone DPA** | $+3$ bonus kepatuhan per bimbingan yang diselesaikan. | Apresiasi ketertiban administrasi perwalian. |

---

## 🗄️ Kamus Data Database V4 Komersial (`supabase/`)

Database dibangun di atas PostgreSQL dengan enkripsi Supabase Row Level Security (RLS) dan indeks B-Tree performa tinggi.

```
                              auth.users (Supabase Auth)
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
          public.profiles                               public.semesters
                │                                             │
                │        ┌────────────────────────────────────┼────────────────────────┐
                │        │                                    │                        │
                ▼        ▼                                    ▼                        ▼
          public.courses ◄────────┐                     public.tasks             public.projects
         (SIMERU, Presensi)      │                      (Submission)             (Portfolio)
                │                │                            │                        │
                ├────────────────┼────────────────────────────┤                        │
                ▼                │                            ▼                        ▼
       public.dpa_guidance       │                   public.lecture_notes       public.project_updates
        (Milestone 3x)           │                    (Catatan Kuliah)
                                 │
                                 └─────────────────── public.learning_items
                                                       (Self-Learning)
```

### Ringkasan Entitas & Patch Migrasi:
1. `public.semesters`: Master periode akademik (`academic_year`, `semester_number`, `is_current`).
2. `public.courses`: Master mata kuliah SIMERU, bobot SKS, jadwal hari (`1=Senin..7=Minggu`), jam, ruang, link E-Learning, WA grup, dan presensi (`total_meetings = 14`, `absent_count`).
3. `public.tasks`: Pelacak tugas dengan relasi `course_id`, `project_id`, `source` (`elearning`/`dosen`/`personal`), prioritas, dan `submission_state` (`not_started`/`drafting`/`ready_to_upload`/`submitted`).
4. `public.lecture_notes`: Catatan kuliah per pertemuan dengan relasi ganda ke `courses` dan `projects`.
5. `public.dpa_guidance`: Rekam jejak 3 kali bimbingan DPA per semester dengan constraint `unique (user_id, semester_id, meeting_number)`.
6. `public.projects` & `project_updates`: Portfolio tracking dan log harian progres pengerjaan karya.
7. `public.learning_items`: Roadmap skill & materi belajar otodidak di luar perkuliahan.
8. `public.academic_events`: Kalender milestone penting universitas (UTS, UAS, KRS, SPP, Libur).
9. `public.monthly_plans` & `public.semester_plans`: Perencanaan target capaian akademik & proyek.
10. `public.weekly_reviews`, `monthly_reviews`, `semester_reviews`: Evaluasi periodik terstruktur.

> **Catatan Deployment Database:** Gunakan berkas `supabase/complete_schema.sql` untuk instalasi basis data baru yang utuh dan idempotent, atau jalankan `supabase/schema_patch_v4_commercial.sql` untuk upgrade dari skema v3.

---

## 🛠️ Panduan Instalasi Lokal (Local Setup)

### Prasyarat
- Node.js versi 18.18+ atau 20+
- Akun Supabase (Tersedia tier gratis)
- Akun GitHub & Vercel (Opsional untuk deployment)

### 1. Kloning & Pemasangan Dependensi
```bash
git clone <url-repository-anda>
cd college-system
npm install
```

### 2. Konfigurasi Environment Variables
Salin berkas template environment:
```bash
cp .env.local.example .env.local
```
Sesuaikan kredensial Supabase Anda di `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Inisialisasi Database Supabase
1. Masuk ke [Supabase Dashboard](https://supabase.com/dashboard) $\rightarrow$ Buka proyek Anda.
2. Akses menu **SQL Editor**.
3. Buka file `supabase/complete_schema.sql` di repository ini, salin seluruh isinya, dan klik tombol **Run**.
4. Di menu **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Email**, Anda dapat menonaktifkan *"Confirm email"* jika ingin langsung login tanpa verifikasi inbox saat pengujian lokal.

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🚀 Panduan Deployment ke Vercel

Sistem ini telah dikonfigurasi secara *zero-config* untuk berjalan di infrastruktur Vercel Edge & Serverless:

### Opsi 1: Melalui Vercel CLI
```bash
npm i -g vercel
vercel
```

### Opsi 2: Melalui Git Integration Dashboard
1. Hubungkan repositori GitHub Anda ke [Vercel Dashboard](https://vercel.com/new).
2. Tentukan Root Directory sebagai `./` (atau `college-system` jika monorepo).
3. Masukkan Environment Variables pada pengaturan proyek:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Klik tombol **Deploy**.

---

## 🔒 Keamanan, Hak Akses & Privasi (Security Architecture)

- **Strict Row Level Security (RLS)**: Setiap tabel database memiliki kebijakan RLS berbasis `auth.uid() = user_id`. Pengguna tidak dapat membaca atau memodifikasi data milik pengguna lain.
- **Sanitasi URL**: Seluruh tautan eksternal (portofolio, E-Learning, grup WA) divalidasi dan disanitasi menggunakan helper `sanitizeUrl` untuk mencegah eksploitasi `javascript:` URI / XSS.
- **Strict TypeScript Typing**: Bebas dari tipe `any`, meminimalisir bug runtime pada level kompilasi.

---

## 📄 Lisensi & Hak Cipta

Dikembangkan dengan standar rekayasa perangkat lunak modern untuk mendukung akselerasi prestasi akademik mahasiswa. Hak Cipta © 2026 **Kuliah Hub Team**. Semua hak dilindungi undang-undang.
