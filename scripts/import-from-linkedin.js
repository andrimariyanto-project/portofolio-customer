// scripts/import-from-linkedin.js
//
// Convert data export resmi LinkedIn (folder hasil ekstrak zip "Get a copy of
// your data") jadi 1 file JSON customer di data/customers/.
//
// CARA CUSTOMER DAPAT FILE INI:
//   1. Login LinkedIn > Settings & Privacy > Data privacy > Get a copy of your data
//   2. Pilih "Download larger data archive" (centang: Profile, Positions,
//      Education, Skills, Certifications)
//   3. Tunggu email dari LinkedIn (bisa beberapa menit - jam), download link zip-nya
//   4. Extract file zip itu (klik kanan > Extract, di semua OS)
//
// CARA PAKAI SCRIPT INI:
//   node scripts/import-from-linkedin.js <path_ke_folder_hasil_extract>
//
// Contoh:
//   node scripts/import-from-linkedin.js ./Basic_LinkedInDataExport
//
// Catatan: export resmi LinkedIn TIDAK menyertakan foto profil. Kamu tetap
// perlu tambahkan field "photo" manual di file JSON hasilnya (link gambar publik).

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'data', 'customers');
const args = process.argv.slice(2);
const inputDir = args.find(a => !a.startsWith('--'));
const overwrite = args.includes('--overwrite');

if (!inputDir) {
  console.error('Kasih path folder hasil extract data export LinkedIn.');
  console.error('Contoh: node scripts/import-from-linkedin.js ./Basic_LinkedInDataExport');
  process.exit(1);
}

if (inputDir.endsWith('.zip')) {
  console.error('Ini masih file zip. Extract dulu (klik kanan > Extract Here / Extract All),');
  console.error('lalu jalankan ulang script ini arahkan ke folder hasil extract-nya.');
  process.exit(1);
}

if (!fs.existsSync(inputDir)) {
  console.error(`Folder tidak ditemukan: ${inputDir}`);
  process.exit(1);
}

// ---------- CSV parser (sama seperti import-from-sheet.js) ----------
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

function readCSVFile(filename) {
  // Nama file di export LinkedIn kadang beda kapitalisasi/spasi, cari yang paling cocok
  const files = fs.readdirSync(inputDir);
  const match = files.find(f => f.toLowerCase().replace(/[\s_]/g, '') === filename.toLowerCase().replace(/[\s_]/g, ''));
  if (!match) return [];
  const text = fs.readFileSync(path.join(inputDir, match), 'utf-8');
  return parseCSV(text);
}

function findCol(rowObj, keywords) {
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

function formatDate(raw) {
  // LinkedIn biasanya kasih "Mon YYYY" atau "YYYY" — biarkan apa adanya kalau sudah rapi
  return (raw || '').trim();
}

function formatPeriod(started, finished) {
  const start = formatDate(started);
  const end = formatDate(finished);
  if (!start && !end) return '';
  return `${start || '?'} - ${end || 'Sekarang'}`;
}

const EXP_COLORS = ['#00d4ff', '#7c3aed', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'];

function run() {
  const profileRows = readCSVFile('Profile.csv');
  const positionRows = readCSVFile('Positions.csv');
  const educationRows = readCSVFile('Education.csv');
  const skillRows = readCSVFile('Skills.csv');
  const certRows = readCSVFile('Certifications.csv');
  const emailRows = readCSVFile('Email Addresses.csv');

  if (!profileRows.length) {
    console.error('Profile.csv tidak ditemukan di folder itu. Pastikan kamu extract folder hasil download LinkedIn yang benar.');
    process.exit(1);
  }

  const profile = profileRows[0];
  const firstName = findCol(profile, ['first name']);
  const lastName = findCol(profile, ['last name']);
  const name = `${firstName} ${lastName}`.trim();

  if (!name) {
    console.error('Nama tidak ketemu di Profile.csv.');
    process.exit(1);
  }

  const experience = positionRows.map((p, i) => ({
    company: findCol(p, ['company name']),
    role: findCol(p, ['title']),
    period: formatPeriod(findCol(p, ['started on']), findCol(p, ['finished on'])),
    location: findCol(p, ['location']),
    color: EXP_COLORS[i % EXP_COLORS.length],
    bullets: findCol(p, ['description']).split('\n').map(s => s.trim()).filter(Boolean),
  })).filter(e => e.company || e.role);

  const education = educationRows.map(e => ({
    degree: findCol(e, ['degree name']),
    field: findCol(e, ['field of study']),
    school: findCol(e, ['school name']),
    icon: '🎓',
  })).filter(e => e.school || e.degree);

  // LinkedIn export gak nyertain level/persentase skill, jadi kita kasih default
  // yang bisa kamu edit manual belakangan di file JSON-nya.
  const skills = skillRows.map(s => ({
    name: findCol(s, ['name']),
    level: 'Advanced',
    percent: 80,
  })).filter(s => s.name);

  const certifications = certRows.map((c, i) => ({
    name: findCol(c, ['name']),
    issuer: findCol(c, ['authority']),
    icon: ['🔵', '🟣', '🟢', '🟡'][i % 4],
  })).filter(c => c.name);

  // Kompetensi utama diambil dari 6 skill teratas biar tag di halaman gak kebanyakan
  const compColors = ['blue', 'purple', 'green', 'amber'];
  const competencies = skills.slice(0, 6).map((s, i) => ({ name: s.name, color: compColors[i % compColors.length] }));

  const email = emailRows.length ? findCol(emailRows[0], ['email address']) : '';

  const customer = {
    slug: slugify(name),
    name,
    title: findCol(profile, ['headline']),
    photo: '', // LinkedIn data export tidak menyertakan foto — isi manual link foto di sini
    yearsExperience: '',
    yearsLabel: 'Tahun Pengalaman',
    contact: {
      phone: '',
      email,
      location: findCol(profile, ['geo location']),
    },
    summary: findCol(profile, ['summary']),
    experience,
    competencies,
    education,
    skills,
    certifications,
    softSkills: [],
    linkedin: '',
    github: '',
    website: '',
    status: 'Terbuka untuk Peluang Baru',
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let slug = customer.slug;
  const usedSlugs = new Set(fs.readdirSync(OUT_DIR).map(f => f.replace('.json', '')));
  if (usedSlugs.has(slug) && !overwrite) {
    let i = 2;
    while (usedSlugs.has(`${slug}-${i}`)) i++;
    slug = `${slug}-${i}`;
  }
  customer.slug = slug;

  const outPath = path.join(OUT_DIR, `${slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(customer, null, 2));

  console.log(`Dibuat: data/customers/${slug}.json`);
  console.log('\nPerlu dilengkapi manual sebelum build:');
  console.log('  - "photo": link foto (LinkedIn export tidak menyertakan foto)');
  console.log('  - "contact.phone", "linkedin", "yearsExperience": tidak ada di data export');
  console.log('  - "softSkills": LinkedIn tidak memisahkan soft skill dari skill lain, cek ulang isi "skills"');
  console.log('  - Cek "skills[].percent": semua di-set 80 default, sesuaikan kalau perlu');
  console.log('\nJalankan "node build.js" setelah melengkapi data di atas.');
}

run();
