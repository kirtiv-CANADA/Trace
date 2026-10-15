// scripts/generate-subscription-fixtures.js
// Generates a fixture with realistic recurring subscriptions

const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

const pad = (n) => String(n).padStart(2, '0');
const fmtRBC = (d) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;

// Real subscriptions with consistent amounts and monthly cadence
const subscriptions = [
  { merchant: 'NETFLIX.COM',       amount: 22.99, dayOfMonth: 15, category: 'streaming' },
  { merchant: 'SPOTIFY',           amount: 10.99, dayOfMonth: 8,  category: 'music' },
  { merchant: 'ADOBE',             amount: 22.99, dayOfMonth: 3,  category: 'design' },
  { merchant: 'FIGMA',             amount: 18.00, dayOfMonth: 12, category: 'design' },
  { merchant: 'NOTION',            amount: 12.00, dayOfMonth: 5,  category: 'productivity' },
  { merchant: 'GITHUB',            amount: 4.00,  dayOfMonth: 20, category: 'dev' },
  { merchant: 'GOOGLE ONE',        amount: 2.99,  dayOfMonth: 1,  category: 'storage' },
];

// Regular transactions (non-subscription noise)
const noise = [
  'TIM HORTONS', 'STARBUCKS', 'LOBLAWS', 'SHOPPERS DRUG MART',
  'AMAZON.CA', 'BEST BUY', 'DOLLARAMA', 'CANADIAN TIRE',
];

// Client payments (credits)
const clients = [
  'SUMMIT CONSULTING PAYMENT',
  'ACME CORP PAYMENT',
  'BLUE OCEAN DESIGN PAYMENT',
];

function generateStatement() {
  const rows = [];
  rows.push('"Date","Description","Debit","Credit","Balance"');

  const now = new Date();
  let balance = 8500;

  // Generate 4 months of data (so 3+ occurrences per subscription)
  for (let monthOffset = 3; monthOffset >= 0; monthOffset--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0);
    const daysInMonth = monthEnd.getDate();

    const monthTxns = [];

    // Add subscription charges
    for (const sub of subscriptions) {
      if (sub.dayOfMonth > daysInMonth) continue;
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), sub.dayOfMonth);
      // Skip if it's in the future (for the current month)
      if (date > now) continue;
      monthTxns.push({
        date,
        merchant: sub.merchant,
        amount: sub.amount,
        type: 'debit',
      });
    }

    // Add 10-20 noise transactions
    const noiseCount = Math.floor(Math.random() * 10) + 10;
    for (let i = 0; i < noiseCount; i++) {
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      if (date > now) continue;

      const merchant = noise[Math.floor(Math.random() * noise.length)];
      const amount = (Math.floor(Math.random() * 150) + 5).toFixed(2);

      monthTxns.push({
        date,
        merchant,
        amount: parseFloat(amount),
        type: 'debit',
      });
    }

    // Add 2-3 client payments (credits)
    const creditCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < creditCount; i++) {
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      if (date > now) continue;

      const client = clients[Math.floor(Math.random() * clients.length)];
      const amount = (Math.floor(Math.random() * 20) * 500 + 1500).toFixed(2);

      monthTxns.push({
        date,
        merchant: client,
        amount: parseFloat(amount),
        type: 'credit',
      });
    }

    // Sort by date
    monthTxns.sort((a, b) => a.date - b.date);

    // Add to rows
    for (const t of monthTxns) {
      if (t.type === 'credit') {
        balance += t.amount;
        rows.push(`"${fmtRBC(t.date)}","${t.merchant}","","${t.amount.toFixed(2)}","${balance.toFixed(2)}"`);
      } else {
        balance -= t.amount;
        rows.push(`"${fmtRBC(t.date)}","${t.merchant}","${t.amount.toFixed(2)}","","${balance.toFixed(2)}"`);
      }
    }
  }

  return rows.join('\n');
}

// Generate the file
const filename = 'statement-subscriptions.csv';
const csv = generateStatement();
fs.writeFileSync(path.join(FIXTURES_DIR, filename), csv);

const lineCount = csv.split('\n').length - 1;
console.log(`✅ Wrote ${filename} (${lineCount} transactions)`);
console.log('');
console.log('Includes real subscriptions:');
for (const s of subscriptions) {
  console.log(`  - ${s.merchant}: $${s.amount}/month on day ${s.dayOfMonth}`);
}