// build.js
// Membaca semua file JSON di data/customers/, generate 1 halaman portofolio
// per customer ke folder dist/<slug>/index.html
//
// Jalankan: node build.js

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data', 'customers');
const DIST_DIR = path.join(__dirname, 'dist');
const SITE_URL = process.env.SITE_URL || 'https://portofolioku.com'; // ganti ke domain kamu

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Highlight kata terakhir dari nama pakai warna accent, mirip referensi "Andri <span>Mariyanto</span>"
function renderName(name = '') {
  const parts = name.trim().split(' ');
  if (parts.length < 2) return esc(name);
  const last = parts.pop();
  return `${esc(parts.join(' '))} <span>${esc(last)}</span>`;
}

function renderContact(c = {}) {
  const items = [];
  if (c.phone) items.push(`<div class="contact-item"><span class="dot"></span>${esc(c.phone)}</div>`);
  if (c.email) items.push(`<div class="contact-item"><span class="dot"></span>${esc(c.email)}</div>`);
  if (c.location) items.push(`<div class="contact-item"><span class="dot"></span>${esc(c.location)}</div>`);
  return items.join('\n');
}

function renderExperience(exp = []) {
  if (!exp.length) return '';
  return exp.map((e, i) => `
        <div class="job">
          <div class="job-dot" style="background:${esc(e.color || '#00d4ff')}; box-shadow:0 0 10px ${esc(e.color || '#00d4ff')}99"></div>
          <div class="job-header">
            <span class="job-company">${esc(e.company)}</span>
            <span class="job-period">${esc(e.period)}</span>
          </div>
          <div class="job-role" style="color:${esc(e.color || '#00d4ff')}">${esc(e.role)}</div>
          ${e.location ? `<div class="job-location">${esc(e.location)}</div>` : ''}
          ${e.bullets && e.bullets.length ? `<ul>${e.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        </div>`).join('');
}

function renderCompetencies(list = []) {
  if (!list.length) return '';
  return `
      <div class="section" style="margin-bottom:0">
        <div class="section-header">
          <div class="section-icon icon-purple">&#128295;</div>
          <h2 class="section-title">Kompetensi Unggulan</h2>
        </div>
        <div class="tag-cloud">
          ${list.map(t => `<span class="tag tag-${esc(t.color || 'blue')}">${esc(t.name)}</span>`).join('')}
        </div>
      </div>`;
}

function renderEducation(list = []) {
  if (!list.length) return '';
  return `
      <div class="section">
        <div class="section-header">
          <div class="section-icon icon-purple">&#127891;</div>
          <h2 class="section-title">Pendidikan</h2>
        </div>
        ${list.map(e => `
        <div class="edu-block" style="margin-bottom:14px">
          <div class="edu-icon">${e.icon || '&#127891;'}</div>
          <div>
            <div class="edu-degree">${esc(e.degree)}</div>
            <div class="edu-field">${esc(e.field)}${e.school ? ' · ' + esc(e.school) : ''}</div>
          </div>
        </div>`).join('')}
      </div>`;
}

function renderSkills(list = []) {
  if (!list.length) return '';
  return `
      <div class="section">
        <div class="section-header">
          <div class="section-icon icon-blue">&#128202;</div>
          <h2 class="section-title">Keahlian Teknis</h2>
        </div>
        ${list.map(s => `
        <div class="skill-item">
          <div class="skill-name">${esc(s.name)} <span>${esc(s.level || '')}</span></div>
          <div class="skill-bar"><div class="skill-fill" style="width:${Number(s.percent) || 0}%"></div></div>
        </div>`).join('')}
      </div>`;
}

function renderCertifications(list = []) {
  if (!list.length) return '';
  return `
      <div class="section">
        <div class="section-header">
          <div class="section-icon icon-amber">&#127942;</div>
          <h2 class="section-title">Sertifikasi</h2>
        </div>
        ${list.map(c => `
        <div class="cert-item">
          <div class="cert-icon">${c.icon || '&#128994;'}</div>
          <div>
            <div class="cert-name">${esc(c.name)}</div>
            <div class="cert-issuer">${esc(c.issuer)}</div>
          </div>
        </div>`).join('')}
      </div>`;
}

function renderSoftSkills(list = []) {
  if (!list.length) return '';
  return `
      <div class="section" style="margin-bottom:0">
        <div class="section-header">
          <div class="section-icon icon-green">&#127775;</div>
          <h2 class="section-title">Soft Skills</h2>
        </div>
        <div class="soft-grid">
          ${list.map(s => `<div class="soft-item"><span class="soft-dot"></span>${esc(s)}</div>`).join('')}
        </div>
      </div>`;
}

function renderFooterLinks(d) {
  const links = [];
  if (d.linkedin) links.push(`<a href="${esc(d.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`);
  if (d.github) links.push(`<a href="${esc(d.github)}" target="_blank" rel="noopener">GitHub</a>`);
  if (d.website) links.push(`<a href="${esc(d.website)}" target="_blank" rel="noopener">Website</a>`);
  return links.join('');
}

// Foto bisa berupa URL eksternal penuh (https://...) atau nama file lokal yang
// sudah di-download & disimpan di assets/photos/ (hasil dari import-from-sheet.js).
// Kalau lokal, path-nya perlu di-resolve beda buat <img> di halaman vs meta og:image.
function resolvePhoto(d) {
  if (!d.photo) return { imgSrc: '', ogImage: `${SITE_URL}/assets/og-default.jpg` };
  if (/^https?:\/\//i.test(d.photo)) {
    return { imgSrc: d.photo, ogImage: d.photo };
  }
  return {
    imgSrc: `../assets/photos/${d.photo}`,
    ogImage: `${SITE_URL}/assets/photos/${d.photo}`,
  };
}

function renderPage(d) {
  const pageUrl = `${SITE_URL}/${d.slug}/`;
  const { imgSrc, ogImage } = resolvePhoto(d);
  const contact = d.contact || {};

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(d.name)} — ${esc(d.title)}</title>
<meta name="description" content="${esc(d.title)}">

<!-- Open Graph: biar preview di LinkedIn bagus -->
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(d.name)} — ${esc(d.title)}">
<meta property="og:description" content="${esc(d.title)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta name="twitter:card" content="summary_large_image">

<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<div class="wrap">

  <!-- HERO -->
  <div class="hero">
    <div class="hero-grid">
      ${d.photo ? `
      <div class="photo-wrap">
        <div class="photo-frame"><img src="${esc(imgSrc)}" alt="${esc(d.name)}"></div>
      </div>` : '<div></div>'}
      <div>
        <div class="label-tag">// portofolio</div>
        <h1>${renderName(d.name)}</h1>
        <p class="hero-title">${esc(d.title)}</p>
        <div class="contact-row">${renderContact(contact)}</div>
      </div>
      ${d.yearsExperience ? `
      <div class="exp-badge">
        <span class="num">${esc(d.yearsExperience)}</span>
        <span class="sub">${esc(d.yearsLabel || 'Tahun Pengalaman')}</span>
      </div>` : ''}
    </div>
  </div>

  <div class="body-grid">
    <!-- MAIN -->
    <div class="main">

      ${d.summary ? `
      <div class="section">
        <div class="section-header">
          <div class="section-icon icon-blue">&#9889;</div>
          <h2 class="section-title">Profil Singkat</h2>
        </div>
        <p class="profile-text">${esc(d.summary)}</p>
      </div>` : ''}

      ${d.experience && d.experience.length ? `
      <div class="section">
        <div class="section-header">
          <div class="section-icon icon-blue">&#128188;</div>
          <h2 class="section-title">Pengalaman</h2>
        </div>
        ${renderExperience(d.experience)}
      </div>` : ''}

      ${renderCompetencies(d.competencies)}
    </div>

    <!-- SIDEBAR -->
    <div class="sidebar">
      ${renderEducation(d.education)}
      ${renderSkills(d.skills)}
      ${renderCertifications(d.certifications)}
      ${renderSoftSkills(d.softSkills)}
    </div>
  </div>

  <div class="footer-strip">
    <p>// ${esc(contact.email || '')}${contact.location ? ' — ' + esc(contact.location) : ''}</p>
    <div class="footer-links">${renderFooterLinks(d)}</div>
    ${d.status ? `<div class="status"><span class="pulse"></span><span>${esc(d.status)}</span></div>` : ''}
  </div>

</div>
</body>
</html>`;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const t = path.join(dest, item);
    if (fs.statSync(s).isDirectory()) copyDir(s, t);
    else fs.copyFileSync(s, t);
  }
}

function build() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Folder data tidak ditemukan: ${DATA_DIR}`);
    process.exit(1);
  }

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
  copyDir(path.join(__dirname, 'assets'), path.join(DIST_DIR, 'assets'));

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const built = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`JSON tidak valid di ${file}: ${err.message}`);
      continue;
    }
    if (!data.slug) {
      console.error(`Lewati ${file}: field "slug" wajib ada`);
      continue;
    }
    const outDir = path.join(DIST_DIR, data.slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), renderPage(data));
    built.push(data.slug);
    console.log(`Dibuat: /${data.slug}/`);
  }

  const indexHtml = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Daftar portofolio</title>
<link rel="stylesheet" href="assets/style.css"></head>
<body><div class="wrap"><h1 style="font-family:var(--display);color:#fff">Daftar portofolio</h1><ul style="margin-top:20px;color:var(--text-dim)">
${built.map(slug => `<li style="margin-bottom:8px"><a href="/${slug}/">${slug}</a></li>`).join('\n')}
</ul></div></body></html>`;
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);

  console.log(`\nSelesai. ${built.length} halaman ter-generate di /dist`);
}

build();
