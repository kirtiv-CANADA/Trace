// backend/services/matchInvoice.js
// Matching engine: compares an invoice against a statement's transactions
// Returns a verdict with evidence.

const Statement = require('../models/Statement');

// ---- Tunable constants ----
const AMOUNT_TOLERANCE_PCT = 0.05;   // ±5% amount match tolerance
const DATE_WINDOW_DAYS = 15;         // ±15 days around invoice issue date
const MIN_NAME_OVERLAP = 0.5;        // 50% of client name words must match

// ---- Helpers ----

/**
 * Normalizes a description string: uppercase, removes punctuation.
 */
function normalize(str) {
  return String(str || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scores how well the invoice client name matches a transaction description.
 * Returns 0..1.
 */
function nameScore(clientName, description) {
  const a = normalize(clientName);
  const b = normalize(description);
  if (!a || !b) return 0;

  const aWords = a.split(' ').filter((w) => w.length > 2);
  const bWords = b.split(' ').filter((w) => w.length > 2);

  if (aWords.length === 0) return 0;

  let hits = 0;
  for (const w of aWords) {
    if (bWords.includes(w)) hits++;
  }
  return hits / aWords.length;
}

/**
 * Checks if two amounts are within tolerance.
 */
function amountMatches(invoiceAmount, txnAmount) {
  if (!invoiceAmount || !txnAmount) return false;
  const diff = Math.abs(Math.abs(invoiceAmount) - Math.abs(txnAmount));
  const pct = diff / Math.abs(invoiceAmount);
  return pct <= AMOUNT_TOLERANCE_PCT;
}

/**
 * Checks if a date is within DATE_WINDOW_DAYS of the anchor date.
 */
function dateInWindow(txnDate, anchorDate) {
  if (!txnDate || !anchorDate) return false;
  const ms = Math.abs(new Date(txnDate) - new Date(anchorDate));
  const days = ms / (1000 * 60 * 60 * 24);
  return days <= DATE_WINDOW_DAYS;
}

// ---- Main matcher ----

/**
 * Matches an invoice against a statement.
 * @param {Object} invoice   - Mongoose Invoice document (or plain object)
 * @param {String} statementId - Statement _id
 * @returns {Object} verdict + evidence
 */
async function matchInvoice(invoice, statementId) {
  const statement = await Statement.findById(statementId).lean();
  if (!statement) {
    return {
      verdict: 'NOT_FOUND',
      confidence: 0,
      evidence: {
        reason: 'Statement not found',
        matchedRows: [],
        closestRows: [],
        searchWindow: null,
      },
    };
  }

  const txnList = statement.transactions || [];
  const issueDate = invoice.issueDate ? new Date(invoice.issueDate) : null;

  // Filter to only credit transactions (money coming in)
  const credits = txnList.filter((t) => t.type === 'credit' || (t.amount && t.amount > 0));

  // Score every credit transaction
  const scored = credits.map((t) => {
    const amtOk = amountMatches(invoice.amount, t.amount);
    const nameOk = nameScore(invoice.clientName, t.description);
    const dateOk = dateInWindow(t.date, issueDate);

    // Weighted score
    const score = (amtOk ? 0.5 : 0) + nameOk * 0.3 + (dateOk ? 0.2 : 0);

    return { txn: t, amtOk, nameOk, dateOk, score };
  });

  // Sort by score, best first
  scored.sort((a, b) => b.score - a.score);

  const searchWindow = issueDate
    ? {
        from: new Date(issueDate.getTime() - DATE_WINDOW_DAYS * 24 * 60 * 60 * 1000),
        to: new Date(issueDate.getTime() + DATE_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      }
    : null;

  // Case: no credits at all
  if (scored.length === 0) {
    return {
      verdict: 'NOT_FOUND',
      confidence: 0,
      evidence: {
        reason: 'No credit transactions found in statement',
        matchedRows: [],
        closestRows: [],
        searchWindow,
      },
    };
  }

  // Case: duplicates — two txns with same amount + same-ish name
  const strong = scored.filter((s) => s.amtOk && s.nameOk >= MIN_NAME_OVERLAP);
  if (strong.length > 1) {
    return {
      verdict: 'DUPLICATE',
      confidence: 0.7,
      evidence: {
        reason: `${strong.length} transactions match amount + client name. Possible duplicate payment.`,
        matchedRows: strong.map((s) => formatRow(s.txn, s)),
        closestRows: [],
        searchWindow,
      },
    };
  }

  // Case: exactly one strong match → VERIFIED
  if (strong.length === 1) {
    return {
      verdict: 'VERIFIED',
      confidence: 0.95,
      evidence: {
        reason: 'Exact amount + client name match found',
        matchedRows: [formatRow(strong[0].txn, strong[0])],
        closestRows: [],
        searchWindow,
      },
    };
  }

  // Case: amount matched but name weak → PARTIAL
  const partial = scored.filter((s) => s.amtOk && s.nameOk < MIN_NAME_OVERLAP);
  if (partial.length > 0 && partial[0].dateOk) {
    return {
      verdict: 'PARTIAL',
      confidence: 0.5,
      evidence: {
        reason: 'Amount matched but client name is a weak match',
        matchedRows: partial.map((s) => formatRow(s.txn, s)),
        closestRows: [],
        searchWindow,
      },
    };
  }

  // Case: name matched but amount off → AMBIGUOUS
  const ambiguous = scored.filter((s) => s.nameOk >= MIN_NAME_OVERLAP && !s.amtOk);
  if (ambiguous.length > 0) {
    return {
      verdict: 'AMBIGUOUS',
      confidence: 0.4,
      evidence: {
        reason: 'Client name matched but amount did not — check manually',
        matchedRows: [],
        closestRows: ambiguous.map((s) => formatRow(s.txn, s)),
        searchWindow,
      },
    };
  }

  // Case: nothing matched → NOT_FOUND (but return closest for evidence)
  
  // Case: nothing matched
// If client claimed "paid" but no match → CONTRADICTED
// Otherwise → NOT_FOUND
const clientClaimedPaid = 
  (invoice.notes || '').toLowerCase().includes('paid') || 
  invoice.status === 'paid';

const finalVerdict = clientClaimedPaid ? 'CONTRADICTED' : 'NOT_FOUND';
const finalReason = clientClaimedPaid
  ? 'Client claimed payment but no matching transaction found in statement'
  : 'No matching transaction found within tolerance';

return {
  verdict: finalVerdict,
  confidence: clientClaimedPaid ? 0.6 : 0.1,
  evidence: {
    reason: finalReason,
    matchedRows: [],
    closestRows: scored.slice(0, 3).map((s) => formatRow(s.txn, s)),
    searchWindow,
  },
};




}

/**
 * Formats a transaction + match metadata into an evidence row.
 */
function formatRow(txn, s) {
  return {
    date: txn.date,
    description: txn.description,
    amount: txn.amount,
    balance: txn.balance,
    matchReason: [
      s.amtOk ? 'amount ✓' : 'amount ✗',
      `name ${(s.nameOk * 100).toFixed(0)}%`,
      s.dateOk ? 'date ✓' : 'date ✗',
    ].join(' · '),
    score: Number(s.score.toFixed(3)),
  };
}

module.exports = { matchInvoice };