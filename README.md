# Portfolio Service

Generator link portofolio untuk banyak customer dari 1 template. Setiap customer
punya 1 file data (JSON), lalu di-build otomatis jadi halaman HTML sendiri-sendiri
di 1 repo, 1 kali deploy.

Hasilnya: `domain-kamu.com/nama-customer` — siap dibagikan customer ke LinkedIn.

## Struktur folder

```
portfolio-service/
├── data/customers/       ← 1 file JSON per customer (ini yang kamu isi/tambah)
├── assets/style.css      ← desain, 1 file dipakai semua customer
├── build.js               ← script yang generate HTML dari data
├── dist/                  ← hasil build (jangan diedit manual, di-generate ulang tiap build)
└── .github/workflows/     ← auto build + deploy tiap push ke GitHub
```

## Cara pakai — tambah customer baru

Ada 3 cara, pilih yang paling cocok:

### Opsi A: Otomatis dari Google Form (rekomendasi kalau customer ngisi form sendiri)

1. Setup Google Form sesuai `FORM_GUIDE.md` (daftar pertanyaan + format yang harus dipakai).
2. Publish sheet respons Google Form sebagai CSV (caranya juga ada di `FORM_GUIDE.md`).
3. Jalankan:
   ```bash
   node scripts/import-from-sheet.js "<link_csv>"
   ```
4. File JSON tiap customer otomatis muncul di `data/customers/`.
5. Jalankan `node build.js` untuk generate halamannya.

Script ini otomatis convert link foto Google Drive jadi link gambar langsung, dan
generate slug dari nama customer (dengan penomoran otomatis kalau ada nama sama).

### Opsi B: Otomatis dari data export resmi LinkedIn

Minta customer download data profil mereka sendiri dari LinkedIn:
1. LinkedIn > Settings & Privacy > Data privacy > **Get a copy of your data**
2. Pilih "Download larger data archive", centang Profile, Positions, Education,
   Skills, Certifications
3. Tunggu email dari LinkedIn, download & extract file zip-nya
4. Jalankan:
   ```bash
   node scripts/import-from-linkedin.js /path/ke/folder/hasil/extract
   ```
5. File JSON customer otomatis dibuat di `data/customers/`.

**Penting:** export resmi LinkedIn TIDAK menyertakan foto profil, nomor HP, dan
link LinkedIn itu sendiri — field ini perlu kamu isi manual di file JSON hasilnya
sebelum di-build. Level skill juga di-default "Advanced" 80% karena LinkedIn
tidak mengekspor angka proficiency — sesuaikan manual kalau perlu.

Cek `FORM_GUIDE.md` bagian bawah untuk detail lengkap soal ini.

### Opsi C: Manual, 1 file 1 customer

1. Copy `data/customers/contoh-nama.json`, rename jadi slug customer, misal `budi-santoso.json`.
2. Isi semua field sesuai data customer (lihat penjelasan field di bawah).
3. Field `slug` WAJIB unik dan jadi bagian URL — pakai huruf kecil dan strip, contoh: `"budi-santoso"`.
4. Jalankan `node build.js` untuk generate ulang semua halaman ke folder `dist/`.
5. Push ke GitHub → otomatis ke-deploy (lihat bagian Deploy di bawah).

Link customer jadinya: `https://domain-kamu.com/budi-santoso/`

## Field yang bisa diisi (skema data)

| Field | Wajib | Keterangan |
|---|---|---|
| `slug` | Ya | Jadi bagian URL, unik, huruf kecil + strip |
| `name` | Ya | Nama lengkap. Kata terakhir otomatis diwarnai accent |
| `title` | Ya | Jabatan/peran, misal "Senior Product Designer" |
| `photo` | Tidak | URL foto (bukan file lokal — upload ke imgur/cloudinary/dst dulu) |
| `yearsExperience` | Tidak | Contoh: `"5+"` — muncul sebagai badge besar |
| `contact.phone/email/location` | Tidak | Muncul di baris kontak bawah nama |
| `summary` | Tidak | Paragraf profil singkat |
| `experience[]` | Tidak | Array pengalaman kerja: `company, period, role, location, color, bullets[]` |
| `competencies[]` | Tidak | Tag kompetensi: `{name, color}` — color: blue/purple/green/amber |
| `education[]` | Tidak | `{degree, field, school, icon}` |
| `skills[]` | Tidak | Skill bar: `{name, level, percent}` |
| `certifications[]` | Tidak | `{name, issuer, icon}` |
| `softSkills[]` | Tidak | Array string sederhana |
| `linkedin/github/website` | Tidak | Link muncul di footer |
| `status` | Tidak | Teks status, misal "Terbuka untuk Peluang Baru" |

Lihat `data/customers/contoh-nama.json` untuk contoh lengkap yang sudah terisi.

## Kenapa penting: foto (og:image) untuk preview LinkedIn

Field `photo` juga dipakai sebagai gambar preview waktu link di-paste ke LinkedIn/WhatsApp
(lewat meta tag Open Graph di `build.js`). Pastikan foto:
- Diupload ke hosting gambar publik dulu (imgur, cloudinary, atau folder assets di repo ini)
- Rasio disarankan 1:1 atau 1.91:1, minimal 400x400px

## Build manual (di komputer sendiri)

```bash
node build.js
```

Semua halaman akan muncul di folder `dist/`. Buka `dist/nama-slug/index.html`
langsung di browser untuk preview cepat.

## Deploy — 3 pilihan

### Opsi 1: GitHub Pages (gratis, sudah disiapkan otomatis)
1. Push repo ini ke GitHub.
2. Buka repo → Settings → Pages → Source: pilih "GitHub Actions".
3. (Opsional) Settings → Environments → github-pages → Variables → tambah `SITE_URL`
   dengan domain kamu, biar meta tag Open Graph akurat.
4. Tiap kamu push ke branch `main`, workflow di `.github/workflows/deploy.yml`
   otomatis build ulang dan deploy.
5. Link jadi: `https://username.github.io/nama-repo/nama-slug/`
   (atau domain custom kalau kamu setup di Settings → Pages → Custom domain)

### Opsi 2: Netlify / Vercel (gratis, lebih gampang custom domain)
1. Import repo ini di Netlify/Vercel.
2. Build command: `node build.js`
3. Publish/output directory: `dist`
4. Connect custom domain kamu di dashboard mereka.

### Opsi 3: Upload manual
Jalankan `node build.js`, lalu upload isi folder `dist/` ke hosting statis
manapun (cPanel, S3, dst).

## Alur kerja yang disarankan buat kamu sehari-hari

1. Customer isi form (Google Form/Typeform) berisi data portofolionya.
2. Kamu convert jawaban form itu jadi file JSON baru di `data/customers/`.
3. Push ke GitHub → otomatis live dalam ~1 menit.
4. Kirim link ke customer: `https://domain-kamu.com/slug-mereka/`

Kalau volume customer sudah tinggi, langkah 2 ini bisa diotomasi lagi
(script yang convert response Google Form langsung jadi JSON) — bilang aja
kalau mau dibantu bikin itu juga.
