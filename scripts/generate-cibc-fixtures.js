const fs = require('fs');
const path = require('path');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const subs = [
  { m: 'NETFLIX.COM', a: 22.99, d: 15 },
  { m: 'SPOTIFY', a: 10.99, d: 8 },
  { m: 'ADOBE', a: 22.99, d: 3 },
];

const rows = ['"Date","Description","Debit","Credit","Balance"'];
const now = new Date();
let bal = 6500;

for (let o = 3; o >= 0; o--) {
  const start = new Date(now.getFullYear(), now.getMonth() - o, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - o + 1, 0);
  const txns = [];
  for (const s of subs) {
    if (s.d > end.getDate()) continue;
    const d = new Date(start.getFullYear(), start.getMonth(), s.d);
    if (d > now) continue;
    txns.push({ date: d, desc: s.m, amt: s.a, type: 'debit' });
  }
  for (let i = 0; i < 10; i++) {
    const day = Math.floor(Math.random() * end.getDate()) + 1;
    const d = new Date(start.getFullYear(), start.getMonth(), day);
    if (d > now) continue;
    txns.push({ date: d, desc: 'TIM HORTONS', amt: (Math.random() * 50 + 5).toFixed(2) * 1, type: 'debit' });
  }
  for (let i = 0; i < 2; i++) {
    const day = Math.floor(Math.random() * end.getDate()) + 1;
    const d = new Date(start.getFullYear(), start.getMonth(), day);
    if (d > now) continue;
    txns.push({ date: d, desc: 'SUMMIT CONSULTING PAYMENT', amt: Math.floor(Math.random() * 3000) + 1000, type: 'credit' });
  }
  txns.sort((a, b) => a.date - b.date);
  for (const t of txns) {
    if (t.type === 'credit') { bal += t.amt; rows.push(`"${fmt(t.date)}","${t.desc}","","${t.amt.toFixed(2)}","${bal.toFixed(2)}"`); }
    else { bal -= t.amt; rows.push(`"${fmt(t.date)}","${t.desc}","${t.amt.toFixed(2)}","","${bal.toFixed(2)}"`); }
  }
}

fs.writeFileSync(path.join(FIXTURES_DIR, 'statement-cibc-1.csv'), rows.join('\n'));
console.log(`✅ CIBC fixture: ${rows.length - 1} transactions`);