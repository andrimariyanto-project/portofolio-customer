// scripts/import-from-sheet.js
//
// Convert jawaban Google Form (lewat CSV Google Sheet) jadi file JSON
// per customer di data/customers/.
//
// CARA PAKAI:
//   1. Buka Google Sheet hasil Google Form kamu.
//   2. File > Share > Publish to web > pilih sheet respons > format CSV > Publish.
//   3. Copy link CSV yang muncul.
//   4. Jalankan:
//        node scripts/import-from-sheet.js "<link_csv>"
//      atau kalau sudah download filenya:
//        node scripts/import-from-sheet.js ./responses.csv
//
// Lihat FORM_GUIDE.md untuk daftar pertanyaan & format yang harus dipakai di Google Form
// supaya parsing di sini akurat.
//
// Flag:
//   --overwrite   timpa file JSON yang sudah ada (default: dilewati kalau slug sudah ada)

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT_DIR = path.join(__dirname, '..', 'data', 'customers');
const args = process.argv.slice(2);
const source = args.find(a => !a.startsWith('--'));
const overwrite = args.includes('--overwrite');

if (!source) {
  console.error('Kasih link CSV atau path file CSV.\nContoh: node scripts/import-from-sheet.js "https://docs.google.com/.../pub?output=csv"');
  process.exit(1);
}

// ---------- CSV parser (handle quoted field, koma & newline di dalam kutip) ----------
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const headers = rows.shift().map(h => h.trim());
  return rows.filter(r => r.some(v => v && v.trim())).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
    return obj;
  });
}

// ---------- Cari kolom berdasarkan kata kunci (fleksibel, gak perlu nama persis) ----------
function findValue(rowObj, keywords) {
  const keys = Object.keys(rowObj);
  for (const kw of keywords) {
    const found = keys.find(k => k.toLowerCase().includes(kw.toLowerCase()));
    if (found) return rowObj[found].trim();
  }
  return '';
}

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Ubah link share Google Drive jadi link gambar yang bisa langsung ditampilkan
function normalizeDriveLink(url) {
  if (!url) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  return url;
}

// "A | B | C | D | E" -> {a,b,c,d,e}, beberapa baris = beberapa entri
function parseMultiField(text, fieldNames) {
  if (!text) return [];
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const parts = line.split('|').map(p => p.trim());
    const obj = {};
    fieldNames.forEach((name, i) => { obj[name] = parts[i] || ''; });
    return obj;
  });
}

function parseList(text) {
  if (!text) return [];
  return text.split(',').map(s => s.trim()).filter(Boolean);
}

const EXP_COLORS = ['#00d4ff', '#7c3aed', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'];

// ---------- Mapping 1 baris jawaban form -> skema JSON customer ----------
function mapRowToCustomer(row) {
  const name = findValue(row, ['nama lengkap', 'nama']);
  if (!name) return null;

  const experienceRaw = findValue(row, ['pengalaman kerja', 'pengalaman']);
  const experience = parseMultiField(experienceRaw, ['company', 'role', 'period', 'location', 'bulletsRaw'])
    .map((e, i) => ({
      company: e.company,
      role: e.role,
      period: e.period,
      location: e.location,
      color: EXP_COLORS[i % EXP_COLORS.length],
      bullets: (e.bulletsRaw || '').split(';').map(b => b.trim()).filter(Boolean),
    }));

  const educationRaw = findValue(row, ['pendidikan']);
  const education = parseMultiField(educationRaw, ['degree', 'field', 'school'])
    .map(e => ({ ...e, icon: '🎓' }));

  const skillsRaw = findValue(row, ['keahlian teknis', 'keahlian dengan level', 'skill level']);
  const skills = parseMultiField(skillsRaw, ['name', 'level', 'percentRaw'])
    .map(s => ({ name: s.name, level: s.level, percent: parseInt(s.percentRaw, 10) || 70 }));

  const certRaw = findValue(row, ['sertifikasi']);
  const certifications = parseMultiField(certRaw, ['name', 'issuer'])
    .map((c, i) => ({ ...c, icon: ['🔵', '🟣', '🟢', '🟡'][i % 4] }));

  const competenciesList = parseList(findValue(row, ['kompetensi', 'skill utama']));
  const compColors = ['blue', 'purple', 'green', 'amber'];
  const competencies = competenciesList.map((name, i) => ({ name, color: compColors[i % compColors.length] }));

  const baseSlug = slugify(name);

  return {
    slug: baseSlug,
    name,
    title: findValue(row, ['jabatan', 'peran', 'posisi']),
    photo: normalizeDriveLink(findValue(row, ['foto', 'photo'])),
    yearsExperience: findValue(row, ['tahun pengalaman']),
    yearsLabel: 'Tahun Pengalaman',
    contact: {
      phone: findValue(row, ['no hp', 'nomor hp', 'whatsapp', 'telepon']),
      email: findValue(row, ['email']),
      location: findValue(row, ['lokasi', 'kota', 'domisili']),
    },
    summary: findValue(row, ['profil singkat', 'tentang', 'summary']),
    experience,
    competencies,
    education,
    skills,
    certifications,
    softSkills: parseList(findValue(row, ['soft skill'])),
    linkedin: findValue(row, ['linkedin']),
    github: findValue(row, ['github']),
    website: findValue(row, ['website', 'portfolio url']),
    status: findValue(row, ['status']) || 'Terbuka untuk Peluang Baru',
  };
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const csvText = source.startsWith('http')
    ? await fetchUrl(source)
    : fs.readFileSync(source, 'utf-8');

  const rows = parseCSV(csvText);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const usedSlugs = new Set(fs.readdirSync(OUT_DIR).map(f => f.replace('.json', '')));
  let created = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const customer = mapRowToCustomer(row);
    if (!customer) { failed++; continue; }

    let slug = customer.slug;
    if (usedSlugs.has(slug) && !overwrite) {
      let i = 2;
      while (usedSlugs.has(`${slug}-${i}`)) i++;
      slug = `${slug}-${i}`;
    }
    customer.slug = slug;
    usedSlugs.add(slug);

    const outPath = path.join(OUT_DIR, `${slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(customer, null, 2));
    console.log(`Dibuat: data/customers/${slug}.json`);
    created++;
  }

  console.log(`\nSelesai. ${created} customer diproses, ${failed} baris dilewati (nama kosong).`);
  console.log('Jalankan "node build.js" untuk generate halamannya.');
}

run().catch(err => {
  console.error('Gagal:', err.message);
  process.exit(1);
});
