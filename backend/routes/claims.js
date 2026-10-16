// backend/routes/claims.js
// API for parsing unstructured client claim text into structured data.

const express = require('express');
const router = express.Router();

const { parseClaim } = require('../services/parseClaim');

/**
 * POST /api/parse-claim
 * Body: { claimText: "..." }
 * Returns: { ok, claim, meta }
 */
router.post('/parse-claim', async (req, res) => {
  try {
    const { claimText } = req.body;

    if (!claimText || typeof claimText !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Missing required field: claimText (string)',
      });
    }

    if (claimText.trim().length < 3) {
      return res.status(400).json({
        ok: false,
        error: 'claimText is too short',
      });
    }

    const result = await parseClaim(claimText);

    res.json({
      ok: true,
      claim: {
        clientName: result.clientName,
        amount: result.amount,
        currency: result.currency,
        paidDate: result.paidDate,
        reference: result.reference,
        paymentMethod: result.paymentMethod,
        claimsPaid: result.claimsPaid,
        confidence: result.confidence,
        warnings: result.warnings,
      },
      meta: {
        provider: result.raw.provider,
        model: result.raw.model,
      },
    });
  } catch (err) {
    console.error('POST /parse-claim error:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

module.exports = router;