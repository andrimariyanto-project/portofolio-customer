# Panduan bikin Google Form

Supaya jawaban customer bisa otomatis di-convert jadi halaman portofolio, buat Google
Form dengan pertanyaan-pertanyaan berikut, **persis urutan dan format ini**. Nama
pertanyaan gak harus 100% sama persis, tapi harus mengandung kata kunci yang disebut
di kolom "Kata kunci wajib ada" (script mencari kolom berdasarkan kata kunci ini).

Field bertanda **(wajib)** harus diisi customer, sisanya boleh dikosongkan.

| # | Pertanyaan di Form | Tipe | Kata kunci wajib ada | Format jawaban |
|---|---|---|---|---|
| 1 | Nama Lengkap | Jawaban singkat | `nama lengkap` | Bebas |
| 2 | Jabatan / Peran | Jawaban singkat | `jabatan` | contoh: `Product Designer` |
| 3 | Upload Foto Profil | **Unggah file** | `foto` | Wajib format persegi, min 400x400px |
| 4 | Nomor HP / WhatsApp | Jawaban singkat | `no hp` | Bebas |
| 5 | Email | Jawaban singkat | `email` | Bebas |
| 6 | Lokasi / Domisili | Jawaban singkat | `lokasi` | contoh: `Bandung, Jawa Barat` |
| 7 | Tahun Pengalaman | Jawaban singkat | `tahun pengalaman` | contoh: `5+` |
| 8 | Profil Singkat / Tentang Kamu | Paragraf | `profil singkat` | 2-4 kalimat |
| 9 | Pengalaman Kerja | Paragraf | `pengalaman kerja` | **Lihat format khusus di bawah** |
| 10 | Kompetensi / Skill Utama | Jawaban singkat | `kompetensi` | Pisahkan koma: `Figma, UX Research, Prototyping` |
| 11 | Pendidikan | Paragraf | `pendidikan` | **Lihat format khusus di bawah** |
| 12 | Keahlian Teknis dengan Level | Paragraf | `keahlian teknis` | **Lihat format khusus di bawah** |
| 13 | Sertifikasi | Paragraf | `sertifikasi` | **Lihat format khusus di bawah** |
| 14 | Soft Skills | Jawaban singkat | `soft skill` | Pisahkan koma: `Leadership, Komunikasi` |
| 15 | Link LinkedIn | Jawaban singkat | `linkedin` | URL lengkap |
| 16 | Link GitHub (opsional) | Jawaban singkat | `github` | URL lengkap |
| 17 | Link Website (opsional) | Jawaban singkat | `website` | URL lengkap |
| 18 | Status | Jawaban singkat | `status` | contoh: `Terbuka untuk Peluang Baru` |

## Format khusus (penting!)

Untuk field yang punya banyak entri (pengalaman, pendidikan, skill, sertifikasi),
minta customer isi **1 entri per baris**, dengan bagian dipisahkan tanda `|`.
Tambahkan contoh ini persis di deskripsi pertanyaan Google Form-nya biar customer
gak bingung.

### 9. Pengalaman Kerja
Deskripsi di form:
> Isi 1 pengalaman per baris (Enter untuk baris baru), format:
> `Nama Perusahaan | Jabatan | Periode | Lokasi | Poin pencapaian dipisah titik koma (;)`

Contoh isian customer:
```
Fintech Nusantara | Senior Product Designer | 2023 - Sekarang | Jakarta | Memimpin desain fitur pembayaran; Membangun design system
Toko Online ABC | Product Designer | 2021 - 2023 | Bandung | Merancang ulang flow checkout, konversi naik 18%
```

### 11. Pendidikan
Deskripsi di form:
> Isi 1 jenjang per baris, format: `Jenjang - Jurusan | Nama Sekolah`

Contoh:
```
S1 - Desain Komunikasi Visual | Institut Teknologi Bandung
```

### 12. Keahlian Teknis dengan Level
Deskripsi di form:
> Isi 1 skill per baris, format: `Nama Skill | Level (Expert/Advanced/Intermediate) | Persentase angka 0-100`

Contoh:
```
UI/UX Design | Expert | 95
User Research | Advanced | 85
```

### 13. Sertifikasi
Deskripsi di form:
> Isi 1 sertifikasi per baris, format: `Nama Sertifikasi | Penerbit`

Contoh:
```
Google UX Design | Coursera
Design Sprint Master | AJ&Smart
```

## Setelah form dibuat

1. Klik tab **Respons** di Google Form → klik ikon Sheets hijau untuk buat Google
   Sheet yang otomatis terisi tiap ada jawaban baru.
2. Di Google Sheet itu: **File > Share > Publish to web** → pilih sheet respons →
   format **CSV** → Publish → copy link yang muncul.
3. Jalankan:
   ```bash
   node scripts/import-from-sheet.js "<link_csv_yang_dicopy>"
   ```
4. File JSON baru otomatis muncul di `data/customers/`.
5. Jalankan `node build.js` untuk generate halamannya.

## Soal foto

Google Form "Unggah file" nyimpen file di Google Drive milik pemilik form, dan
jawabannya berupa link share Drive. Script `import-from-sheet.js` otomatis
mengubah link itu jadi link gambar langsung (`drive.google.com/uc?export=view&id=...`).

Satu syarat: pastikan setting sharing foto itu **"Anyone with the link"**, kalau
tidak, foto gak akan muncul di halaman portofolio maupun preview LinkedIn. Kalau
mau lebih aman/cepat, kamu juga bisa minta customer upload foto ke imgur atau
langsung kirim link foto lewat pertanyaan "Jawaban singkat" biasa.

## Alternatif: import dari data export resmi LinkedIn

Kalau customer nggak mau isi Google Form, mereka bisa download data profil
LinkedIn mereka sendiri lewat **Settings & Privacy > Data privacy > Get a copy
of your data**, lalu kamu jalankan:

```bash
node scripts/import-from-linkedin.js /path/ke/folder/hasil/extract
```

Kelebihan: customer nggak perlu isi ulang data yang udah ada di LinkedIn mereka.

Kekurangan yang perlu kamu lengkapi manual setelah import:
- **Foto profil** — export resmi LinkedIn tidak menyertakan file foto
- **Nomor HP** dan **link LinkedIn** itu sendiri — tidak ada di data export
- **Level/persentase skill** — LinkedIn tidak mengekspor angka proficiency,
  semua otomatis di-set "Advanced" 80% sebagai default
- **Soft skills** — LinkedIn tidak memisahkan soft skill dari skill teknis,
  jadi semuanya masuk ke satu list `skills`, perlu kamu pilah manual

Setelah lengkapi field yang kosong itu di file JSON hasilnya, baru jalankan
`node build.js`.

## Cek hasil sebelum di-build massal

Buka salah satu file JSON hasil import di `data/customers/`, cek datanya masuk
dengan benar (terutama field pengalaman/pendidikan/skill yang formatnya agak
ketat). Kalau ada yang salah parsing, edit manual file JSON-nya — gampang karena
formatnya jelas per field.
