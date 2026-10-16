// backend/routes/claimToVerdict.js
// POST /api/claim-to-verdict
// Body: { claimText, statementId }
// One-shot: parse → create invoice → verify → return verdict + evidence.

const express = require('express');
const router = express.Router();

const { claimToVerdict } = require('../services/claimToVerdict');

router.post('/', async (req, res) => {
  try {
    const { claimText, statementId } = req.body;

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
    if (!statementId || typeof statementId !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Missing required field: statementId (string)',
      });
    }

    const result = await claimToVerdict(claimText, statementId);

    // Logical "cannot verify" is still a 200 — the request was valid.
    res.json(result);
  } catch (err) {
    console.error('POST /claim-to-verdict error:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

module.exports = router;