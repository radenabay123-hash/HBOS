# 🚀 Panduan Deploy HBOS ke Vercel

## ⚠️ PENTING: Database Migration

Aplikasi ini menggunakan **SQLite** untuk development (file-based). Vercel **TIDAK mendukung SQLite** karena serverless functions tidak memiliki filesystem yang persistent.

**Anda harus beralih ke PostgreSQL** sebelum deploy ke Vercel.

---

## Langkah 1: Buat Database PostgreSQL Gratis

### Opsi A: Neon (Recommended - Gratis & Cepat)
1. Daftar di https://neon.tech
2. Buat project baru
3. Copy connection string (format: `postgresql://...`)
4. Simpan sebagai `DATABASE_URL`

### Opsi B: Supabase
1. Daftar di https://supabase.com
2. Buat project baru
3. Settings → Database → Connection string
4. Copy connection string

### Opsi C: Vercel Postgres
1. Di Vercel dashboard → Storage → Create Database
2. Pilih Postgres
3. Copy connection string

---

## Langkah 2: Update Prisma Schema untuk PostgreSQL

Edit `prisma/schema.prisma`, ubah provider dari `sqlite` ke `postgresql`:

```prisma
datasource db {
  provider = "postgresql"  // ubah dari "sqlite"
  url      = env("DATABASE_URL")
}
```

**Tidak ada perubahan model lain yang diperlukan** — semua model sudah compatible dengan PostgreSQL.

---

## Langkah 3: Setup Environment Variables Lokal

1. Update `.env` dengan PostgreSQL URL:
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

2. Generate VAPID keys untuk push notifications:
```bash
npx web-push generate-vapid-keys
```

3. Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

4. Push schema ke PostgreSQL:
```bash
npm run db:push
```

---

## Langkah 4: Deploy ke Vercel

### Opsi A: Via Vercel Dashboard
1. Push kode ke GitHub/GitLab/Bitbucket
2. Buka https://vercel.com → New Project
3. Import repository
4. Set Environment Variables:
   - `DATABASE_URL` = PostgreSQL connection string
   - `NEXTAUTH_SECRET` = random string
   - `NEXTAUTH_URL` = https://your-app.vercel.app
   - `VAPID_PUBLIC_KEY` = dari step 3
   - `VAPID_PRIVATE_KEY` = dari step 3
   - `VAPID_SUBJECT` = mailto:your-email@example.com
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = sama dengan VAPID_PUBLIC_KEY
5. Click **Deploy**

### Opsi B: Via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add VAPID_PUBLIC_KEY
vercel env add VAPID_PRIVATE_KEY
vercel env add VAPID_SUBJECT
vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY
vercel --prod
```

---

## Langkah 5: Migrasi Data (Opsional)

Jika ingin memindahkan data dari SQLite ke PostgreSQL:

```bash
# 1. Export data dari SQLite
npx prisma db pull  # dari SQLite lama

# 2. Atau gunakan script export:
# Bunyi: buat script untuk export semua tabel ke JSON

# 3. Import ke PostgreSQL
# Set DATABASE_URL ke PostgreSQL, lalu jalankan import script
```

---

## Catatan Penting

### ✅ Yang Sudah Siap untuk Vercel:
- `next.config.ts` — sudah di-config tanpa standalone output
- `package.json` — sudah ada `postinstall: prisma generate` dan `vercel-build`
- `vercel.json` — sudah ada konfigurasi
- `.env.example` — template env vars
- Semua API routes menggunakan `export const runtime = "nodejs"` (compatible dengan Vercel)

### ⚠️ Yang Perlu Diubah Sebelum Deploy:
1. **Prisma schema** — ubah `provider` dari `sqlite` ke `postgresql`
2. **Database URL** — gunakan PostgreSQL connection string
3. **Upload directory** — Vercel tidak punya filesystem persistent. Gunakan Vercel Blob / Cloudinary / S3 untuk upload file. Untuk saat ini, file upload disimpan di `/public/uploads/` yang TIDAK akan persistent di Vercel.

### 🔧 Optimasi untuk Vercel:
- API routes sudah set `maxDuration: 60` detik (untuk operasi berat seperti AI)
- Build menggunakan `prisma generate && next build` untuk memastikan Prisma client ter-generate
- No standalone output (Vercel handle sendiri)

---

## Troubleshooting

### Error: "Prisma Client not found"
Pastikan `postinstall: "prisma generate"` ada di package.json (sudah ada).

### Error: "Database connection failed"
Pastikan `DATABASE_URL` menggunakan format PostgreSQL dan database sudah running.

### Error: "File upload tidak tersimpan"
Vercel tidak support filesystem persistent. Gunakan Vercel Blob Storage atau external storage untuk upload file.

### Build timeout
Vercel free tier: max 45 detik build. Jika build timeout, upgrade ke Pro plan atau optimize import.
