// backend/services/detectSubscriptions.js
// Detects recurring subscriptions from a statement's transactions
// Rules: same merchant, similar amount, monthly gap, 3+ occurrences

const Statement = require('../models/Statement');

// ---- Tunable constants ----
const AMOUNT_TOLERANCE_PCT = 0.02;   // ±2% amount tolerance
const MIN_GAP_DAYS = 25;
const MAX_GAP_DAYS = 35;
const MIN_OCCURRENCES = 3;

// ---- Helpers ----

/**
 * Normalize merchant names for grouping.
 * Strips transaction IDs, dates, and common noise.
 */
function normalizeMerchant(desc) {
  return String(desc || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\b(PAYMENT|PMT|PURCHASE|DEBIT|POS|ONLINE|WWW|COM|CA)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Average an array of numbers.
 */
function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Days between two dates.
 */
function daysBetween(a, b) {
  return Math.abs((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

/**
 * Checks if two amounts are within tolerance.
 */
function amountNear(a, b) {
  if (!a || !b) return false;
  const diff = Math.abs(Math.abs(a) - Math.abs(b));
  const ref = Math.max(Math.abs(a), Math.abs(b));
  return (diff / ref) <= AMOUNT_TOLERANCE_PCT;
}

/**
 * Detects subscriptions in a statement.
 * @param {String} statementId - Statement _id
 * @returns {Object} { subscriptions: [...], totalMonthly: Number }
 */
async function detectSubscriptions(statementId) {
  const statement = await Statement.findById(statementId).lean();
  if (!statement) {
    return { error: 'Statement not found', subscriptions: [], totalMonthly: 0 };
  }

  // Only look at debits (money going out)
  const debits = (statement.transactions || []).filter(
    (t) => t.type === 'debit' || (t.amount && t.amount < 0)
  );

  // Group by normalized merchant
  const groups = new Map();
  for (const txn of debits) {
    const key = normalizeMerchant(txn.description);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(txn);
  }

  const subscriptions = [];

  for (const [merchant, txns] of groups.entries()) {
    if (txns.length < MIN_OCCURRENCES) continue;

    // Sort chronologically
    const sorted = txns
      .filter((t) => t.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sorted.length < MIN_OCCURRENCES) continue;

    // Check if amounts are similar
    const amounts = sorted.map((t) => Math.abs(t.amount));
    const avgAmount = avg(amounts);
    const allSimilar = amounts.every((a) => amountNear(a, avgAmount));

    if (!allSimilar) continue;

    // Check monthly gaps
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    }

    // Most gaps should be in [25, 35]
    const monthlyGaps = gaps.filter((g) => g >= MIN_GAP_DAYS && g <= MAX_GAP_DAYS);
    const monthlyRatio = monthlyGaps.length / gaps.length;

    if (monthlyRatio < 0.6) continue;  // At least 60% gaps must be monthly

    // Confidence: combine amount stability + monthly regularity + count
    const confidence = Math.min(
      0.99,
      (monthlyRatio * 0.5) + 
      (Math.min(sorted.length, 6) / 6 * 0.3) + 
      (allSimilar ? 0.2 : 0)
    );

    // Totals
    const totalSpent = amounts.reduce((a, b) => a + b, 0);
    const monthlySpent = avgAmount;

    subscriptions.push({
      merchant: merchant,
      originalDescriptions: [...new Set(sorted.map((t) => t.description))],
      amount: Number(avgAmount.toFixed(2)),
      frequency: 'monthly',
      occurrences: sorted.length,
      charges: sorted.map((t) => ({
        date: t.date,
        amount: Number(Math.abs(t.amount).toFixed(2)),
        description: t.description,
      })),
      firstCharge: sorted[0].date,
      lastCharge: sorted[sorted.length - 1].date,
      totalSpent: Number(totalSpent.toFixed(2)),
      monthlySpent: Number(monthlySpent.toFixed(2)),
      confidence: Number(confidence.toFixed(3)),
    });
  }

  // Sort by totalSpent desc
  subscriptions.sort((a, b) => b.totalSpent - a.totalSpent);

  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.monthlySpent, 0);

  return {
    statementId,
    subscriptions,
    count: subscriptions.length,
    totalMonthly: Number(totalMonthly.toFixed(2)),
    totalSpent: Number(subscriptions.reduce((s, x) => s + x.totalSpent, 0).toFixed(2)),
  };
}

module.exports = { detectSubscriptions, normalizeMerchant };