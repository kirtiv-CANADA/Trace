// backend/routes/subscriptions.js
// API for detecting subscriptions in statements

const express = require('express');
const router = express.Router();

const { detectSubscriptions } = require('../services/detectSubscriptions');

/**
 * GET /api/subscriptions/:statementId
 * Detect subscriptions in a statement.
 */
router.get('/:statementId', async (req, res) => {
  try {
    const { statementId } = req.params;
    const result = await detectSubscriptions(statementId);

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result);
  } catch (err) {
    console.error('GET /subscriptions error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;