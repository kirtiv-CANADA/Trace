// backend/services/schemaMapper.js
// Smart column mapper — identifies semantic meaning of CSV columns
// regardless of exact naming (Date vs Transaction Date vs Posting Date).

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreMatch(header, patterns) {
  const h = normalize(header);
  let best = 0;
  for (const p of patterns) {
    const pn = normalize(p);
    if (h === pn) return 1.0;
    if (h.includes(pn) || pn.includes(h)) best = Math.max(best, 0.8);
    const hw = h.split(' ');
    const pw = pn.split(' ');
    const overlap = hw.filter((w) => pw.includes(w)).length;
    if (overlap > 0) best = Math.max(best, 0.5 + 0.3 * (overlap / Math.max(hw.length, pw.length)));
  }
  return best;
}

function mapSchema(headers) {
  const patterns = {
    date: ['date', 'transaction date', 'posting date', 'txn date', 'value date', 'value dt'],
    description: ['description', 'narration', 'details', 'particulars', 'remarks', 'transaction remarks', 'memo'],
    debit: ['debit', 'withdrawal', 'withdrawal amt', 'withdrawal amount', 'amount out', 'paid out'],
    credit: ['credit', 'deposit', 'deposit amt', 'deposit amount', 'amount in', 'paid in'],
    amount: ['amount', 'transaction amount', 'amt'],
    balance: ['balance', 'closing balance', 'running balance', 'available balance'],
  };

  const result = {
    date: null,
    description: null,
    debit: null,
    credit: null,
    amount: null,
    balance: null,
  };

  for (const header of headers) {
    let bestKey = null;
    let bestScore = 0.4;

    for (const [key, pats] of Object.entries(patterns)) {
      const score = scoreMatch(header, pats);
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }

    if (bestKey && !result[bestKey]) {
      result[bestKey] = header;
    }
  }

  return result;
}

module.exports = { mapSchema, normalize, scoreMatch };