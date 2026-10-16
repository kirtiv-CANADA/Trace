// backend/services/claimToVerdict.js
// Orchestrates the core loop:
//   claim text → parse → invoice → match → verdict + evidence

const { parseClaim } = require('./parseClaim');
const { matchInvoice } = require('./matchInvoice');
const Invoice = require('../models/Invoice');

/**
 * Takes a claim text + statementId, returns the full pipeline result.
 * Never throws for logical failures — returns { ok: true, canVerify: false, reason }.
 * Only throws for programmer errors.
 */
async function claimToVerdict(claimText, statementId, options = {}) {
  // ---- Step 1: Parse the claim ----
  const parsed = await parseClaim(claimText);

  // ---- Step 2: Decide whether we can verify ----
  const blockers = [];

  if (parsed.claimsPaid === false) {
    return {
      ok: true,
      canVerify: false,
      reason: 'CLAIM_DENIED_BY_SENDER',
      message:
        'The sender states they have not paid yet. Nothing to verify against the statement.',
      claim: parsed,
      invoice: null,
      verdict: null,
      evidence: null,
    };
  }

  if (!parsed.clientName) blockers.push('clientName');
  if (parsed.amount == null) blockers.push('amount');
  if (!parsed.paidDate && !parsed.reference) {
    // If no date AND no reference, we cannot anchor the search window meaningfully
    blockers.push('paidDate_or_reference');
  }

  if (blockers.length > 0) {
    return {
      ok: true,
      canVerify: false,
      reason: 'CLAIM_INCOMPLETE',
      message: `Cannot verify: missing ${blockers.join(', ')}.`,
      missingFields: blockers,
      claim: parsed,
      invoice: null,
      verdict: null,
      evidence: null,
    };
  }

  // ---- Step 3: Create an Invoice from the claim ----
  const invoice = await Invoice.create({
    clientName: parsed.clientName,
    amount: parsed.amount,
    currency: parsed.currency || 'CAD',
    issueDate: parsed.paidDate ? new Date(parsed.paidDate) : new Date(),
    reference: parsed.reference || null,
    status: 'sent',
    notes: `Auto-created from claim: "${claimText.slice(0, 200)}"`,
    clientClaimsPaid: true,
    claimText: claimText,
    sourceProvider: parsed.raw.provider,
    sourceModel: parsed.raw.model,
  });

  // ---- Step 4: Match against statement ----
  const match = await matchInvoice(invoice, statementId);

  // ---- Step 5: Return the full pipeline ----
  return {
    ok: true,
    canVerify: true,
    claim: parsed,
    invoice: {
      _id: invoice._id,
      clientName: invoice.clientName,
      amount: invoice.amount,
      currency: invoice.currency,
      issueDate: invoice.issueDate,
      reference: invoice.reference,
    },
    verdict: match.verdict,
    confidence: match.confidence,
    evidence: match.evidence,
    statementId,
  };
}

module.exports = { claimToVerdict };