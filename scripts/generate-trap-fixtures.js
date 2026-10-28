// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
// Synthetic data only. No real merchants, no real people.
const fs = require('fs');
const path = require('path');

const rows = [];
const add = (date, desc, debit = 0, credit = 0) => rows.push({ date, desc, debit, credit });
const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Trap 1: tiny sign-up, then big charge every 28 days (March one missing from list)
add('2025-01-02', 'EXAMPLE RESUME CO 8005550100', 1.95);
let d = '2025-01-23';
for (let i = 0; i < 7; i++) {
  if (i !== 2) add(d, 'EXAMPLE RESUME CO 8005550100', 34.85);
  d = addDays(d, 28);
}

// Trap 2: trial then annual plan 6 days later
add('2025-10-19', 'EXAMPLE VIDEO AI SG', 3.28);
add('2025-10-25', 'EXAMPLE VIDEO AI SG', 108.47);

// Normal subscription (every 30 days) - should NOT be flagged
d = '2025-01-05';
for (let i = 0; i < 8; i++) {
  add(d, 'STREAMBOX.COM 800-555-0111 ON', 22.99);
  d = addDays(d, 30);
}

// Noise: salary, groceries, transit
for (let m = 1; m <= 11; m++) {
  const mm = String(m).padStart(2, '0');
  add(`2025-${mm}-01`, 'PAYROLL DEPOSIT EXAMPLE EMPLOYER', 0, 2500);
  add(`2025-${mm}-09`, 'FRESH MART GROCERY', 86.4 + m);
  add(`2025-${mm}-22`, 'CITY TRANSIT PASS', 45);
}

rows.sort((a, b) => a.date.localeCompare(b.date));

let balance = 4000;
const lines = ['Date,Description,Debit,Credit,Balance'];
for (const r of rows) {
  balance = Math.round((balance - r.debit + r.credit) * 100) / 100;
  lines.push(
    [r.date, r.desc, r.debit ? r.debit.toFixed(2) : '', r.credit ? r.credit.toFixed(2) : '', balance.toFixed(2)].join(',')
  );
}

const outDir = path.join(__dirname, 'fixtures');
fs.mkdirSync(outDir, { recursive: true });
// "rbc" in the name so detectBank() accepts it
const out = path.join(outDir, 'statement-trap-rbc.csv');
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log('Wrote', out, `(${rows.length} rows)`);
