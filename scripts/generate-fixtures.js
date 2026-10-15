// scripts/generate-fixtures.js
// Generates synthetic bank statement CSVs for RBC and TD
// Run: node scripts/generate-fixtures.js

const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

// Ensure fixtures dir exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// ---- Helpers ----
const pad = (n) => String(n).padStart(2, '0');

const fmtDate = (d, style) => {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  if (style === 'RBC') return `${m}/${day}/${y}`;       // MM/DD/YYYY
  if (style === 'TD')  return `${y}-${m}-${day}`;       // YYYY-MM-DD
  return `${y}-${m}-${day}`;
};

const csvRow = (cells) => cells.map((c) => `"${c}"`).join(',');

// ---- Data generators ----
const merchants = [
  'AMAZON.CA', 'NETFLIX.COM', 'SPOTIFY', 'ADOBE', 'FIGMA',
  'NOTION', 'GRAMMARLY', 'GOOGLE ONE', 'DROPBOX', 'SLACK',
  'GITHUB', 'VERCEL', 'OPENAI', 'ANTHROPIC', 'TELUS',
  'ROGERS', 'HYDRO ONE', 'LOBLAWS', 'TIM HORTONS', 'STARBUCKS',
];

const clients = [
  'ACME CORP', 'BLUE OCEAN DESIGN', 'NORTH STAR MEDIA',
  'GREENLEAF STUDIO', 'SUMMIT CONSULTING', 'PIXEL WORKS',
];

function generateRBC(monthOffset, filename) {
  const rows = [];
  rows.push(csvRow(['Date', 'Description', 'Debit', 'Credit', 'Balance']));

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0);

  let balance = 8500;
  const days = end.getDate();

  for (let d = 1; d <= days; d++) {
    // Random 1-3 transactions per day
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), d);
      const isCredit = Math.random() < 0.15;
      const merchant = isCredit
        ? clients[Math.floor(Math.random() * clients.length)] + ' PAYMENT'
        : merchants[Math.floor(Math.random() * merchants.length)];

      const amount = isCredit
        ? (Math.floor(Math.random() * 4000) + 500).toFixed(2)
        : (Math.floor(Math.random() * 300) + 5).toFixed(2);

      if (isCredit) {
        balance += parseFloat(amount);
        rows.push(csvRow([fmtDate(date, 'RBC'), merchant, '', amount, balance.toFixed(2)]));
      } else {
        balance -= parseFloat(amount);
        rows.push(csvRow([fmtDate(date, 'RBC'), merchant, amount, '', balance.toFixed(2)]));
      }
    }
  }

  fs.writeFileSync(path.join(FIXTURES_DIR, filename), rows.join('\n'));
  console.log(`✅ Wrote ${filename} (${rows.length - 1} transactions)`);
}

function generateTD(monthOffset, filename) {
  const rows = [];
  rows.push('Date,Description,Debit,Credit,Balance');

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0);

  let balance = 12000;
  const days = end.getDate();

  for (let d = 1; d <= days; d++) {
    const count = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < count; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), d);
      const isCredit = Math.random() < 0.15;
      const merchant = isCredit
        ? clients[Math.floor(Math.random() * clients.length)] + ' PAYMENT'
        : merchants[Math.floor(Math.random() * merchants.length)];

      const amount = isCredit
        ? (Math.floor(Math.random() * 4000) + 500).toFixed(2)
        : (Math.floor(Math.random() * 300) + 5).toFixed(2);

      if (isCredit) {
        balance += parseFloat(amount);
        rows.push(`${fmtDate(date, 'TD')},${merchant},,${amount},${balance.toFixed(2)}`);
      } else {
        balance -= parseFloat(amount);
        rows.push(`${fmtDate(date, 'TD')},${merchant},${amount},,${balance.toFixed(2)}`);
      }
    }
  }

  fs.writeFileSync(path.join(FIXTURES_DIR, filename), rows.join('\n'));
  console.log(`✅ Wrote ${filename} (${rows.length - 1} transactions)`);
}

// ---- Generate 6 files ----
console.log('\n📁 Generating fixtures in', FIXTURES_DIR, '\n');

for (let i = 1; i <= 3; i++) {
  generateRBC(i, `statement-rbc-${i}.csv`);
}
for (let i = 1; i <= 3; i++) {
  generateTD(i, `statement-td-${i}.csv`);
}

console.log('\n🎉 Done. 6 files generated.\n');