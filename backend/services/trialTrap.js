// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
// Detects "trial trap" patterns in recurring charges. Pure code, no AI.

const DAY = 86400000;

const PRICE_JUMP_RATIO = 5;       // latest / first >= 5
const TRIAL_WINDOW_DAYS = 14;     // trial -> big charge within 14 days
const FOUR_WEEK_MIN = 27;         // median gap between 27 and 29 days
const FOUR_WEEK_MAX = 29;
const MISSING_GAP_FACTOR = 1.7;   // gap >= 1.7 x normal gap => charge may be missing

const NOISE = new Set([
  'ON', 'ONT', 'CA', 'CAN', 'INC', 'LTD', 'POS', 'PURCHASE', 'PAYMENT',
  'VISA', 'DEBIT', 'WWW', 'HTTP', 'HTTPS', 'COM',
]);

// "EXAMPLE RESUME CO 8005550100" -> "EXAMPLE RESUME CO"
function merchantKey(description = '') {
  const words = String(description)
    .toUpperCase()
    .replace(/[^A-Z]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w));
  return words.slice(0, 3).join(' ');
}

// Date -> whole UTC day number (avoids timezone/DST problems)
function toDay(date) {
  const d = new Date(date);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY);
}

const dayToISO = (day) => new Date(day * DAY).toISOString().slice(0, 10);
const round2 = (n) => Math.round(n * 100) / 100;

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * charges: [{ date, amount }]  (one merchant)
 * opts.cancelRequestDate: 'YYYY-MM-DD' (optional)
 * returns: array of flags
 */
function analyzeMerchant(charges, opts = {}) {
  const c = charges
    .map((x) => ({ amount: Math.abs(Number(x.amount)), day: toDay(x.date) }))
    .filter((x) => Number.isFinite(x.amount) && x.amount > 0 && Number.isFinite(x.day))
    .sort((a, b) => a.day - b.day);

  const flags = [];
  if (c.length < 2) return flags;

  const first = c[0];
  const latest = c[c.length - 1];

  // 1. PRICE_JUMP
  const ratio = latest.amount / first.amount;
  const hasJump = ratio >= PRICE_JUMP_RATIO;
  if (hasJump) {
    flags.push({
      type: 'PRICE_JUMP',
      severity: 'high',
      ratio: Number(ratio.toFixed(1)),
      from: round2(first.amount),
      to: round2(latest.amount),
      message: `Charge grew from $${round2(first.amount)} to $${round2(latest.amount)} (${ratio.toFixed(1)}x).`,
    });
  }

  // 2. TRIAL_TO_BIG_CHARGE (short trial followed quickly by a big charge)
  const second = c[1];
  const daysBetween = second.day - first.day;
  if (daysBetween <= TRIAL_WINDOW_DAYS && second.amount / first.amount >= PRICE_JUMP_RATIO) {
    flags.push({
      type: 'TRIAL_TO_BIG_CHARGE',
      severity: 'high',
      days: daysBetween,
      trialAmount: round2(first.amount),
      bigAmount: round2(second.amount),
      message: `A $${round2(first.amount)} charge was followed ${daysBetween} day(s) later by a $${round2(second.amount)} charge.`,
    });
  }

  // Recurring charges: skip the small "trial" charge if there was a jump
  const base = hasJump ? c.slice(1) : c;
  const gaps = base.slice(1).map((x, i) => x.day - base[i].day);

  if (gaps.length >= 2) {
    const m = median(gaps);

    // 3. FOUR_WEEK_BILLING (13 charges/year instead of 12)
    if (m >= FOUR_WEEK_MIN && m <= FOUR_WEEK_MAX) {
      const perYear = Math.round(365 / m);
      const amt = median(base.map((x) => x.amount));
      flags.push({
        type: 'FOUR_WEEK_BILLING',
        severity: 'medium',
        gapDays: m,
        chargesPerYear: perYear,
        yearlyCost: round2(perYear * amt),
        message: `Billed every ~${m} days: ${perYear} charges a year instead of 12 (about $${round2(perYear * amt)}/year).`,
      });
    }

    // 4. POSSIBLE_MISSING_CHARGE (a regular charge is absent from the list)
    if (m >= 7 && m <= 40) {
      gaps.forEach((g, i) => {
        if (g >= m * MISSING_GAP_FACTOR) {
          flags.push({
            type: 'POSSIBLE_MISSING_CHARGE',
            severity: 'low',
            afterDate: dayToISO(base[i].day),
            expectedDate: dayToISO(base[i].day + m),
            missingCount: Math.round(g / m) - 1,
            message: `Gap of ${g} days (normal is ~${m}). A charge around ${dayToISO(base[i].day + m)} may be missing from your list.`,
          });
        }
      });
    }
  }

  // 5. CHARGED_AFTER_CANCEL_REQUEST
  if (opts.cancelRequestDate) {
    const cancelDay = toDay(opts.cancelRequestDate);
    const after = c.filter((x) => x.day > cancelDay);
    if (after.length) {
      const total = round2(after.reduce((s, x) => s + x.amount, 0));
      flags.push({
        type: 'CHARGED_AFTER_CANCEL_REQUEST',
        severity: 'high',
        count: after.length,
        amount: total,
        message: `${after.length} charge(s) totaling $${total} came after the cancellation request on ${opts.cancelRequestDate}.`,
      });
    }
  }

  return flags;
}

/**
 * transactions: statement.transactions[]  ({ date, description, amount, type })
 * opts: { cancelMerchant, cancelRequestDate }
 */
function analyzeStatement(transactions = [], opts = {}) {
  const groups = new Map();
  for (const t of transactions) {
    const isDebit = t.type ? t.type === 'debit' : Number(t.amount) < 0;
    if (!isDebit) continue;
    const key = merchantKey(t.description);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { sample: t.description, charges: [] });
    groups.get(key).charges.push({ date: t.date, amount: t.amount });
  }

  const cancelKey = opts.cancelMerchant ? String(opts.cancelMerchant).toUpperCase().trim() : null;
  const merchants = [];

  for (const [key, g] of groups) {
    if (g.charges.length < 2) continue;
    const useCancel = cancelKey && key.includes(cancelKey) ? opts.cancelRequestDate : null;
    const flags = analyzeMerchant(g.charges, { cancelRequestDate: useCancel });
    if (!flags.length) continue;
    const amounts = g.charges.map((x) => Math.abs(Number(x.amount)));
    merchants.push({
      merchant: key,
      chargeCount: g.charges.length,
      totalCharged: round2(amounts.reduce((s, x) => s + x, 0)),
      flags,
    });
  }

  merchants.sort((a, b) => b.flags.length - a.flags.length);
  return { merchantsScanned: groups.size, trapsFound: merchants.length, merchants };
}

module.exports = { merchantKey, analyzeMerchant, analyzeStatement };
