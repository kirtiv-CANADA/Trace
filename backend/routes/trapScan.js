// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
const express = require('express');
const mongoose = require('mongoose');
const Statement = require('../models/Statement');
const { analyzeStatement } = require('../services/trialTrap');

const router = express.Router();

// GET /api/trap-scan/:statementId?cancelMerchant=resume&cancelRequest=2025-06-28
router.get('/:statementId', async (req, res) => {
  try {
    const { statementId } = req.params;
    if (!mongoose.isValidObjectId(statementId)) {
      return res.status(400).json({ error: 'Invalid statement id' });
    }

    const { cancelMerchant, cancelRequest } = req.query;
    if (cancelRequest && Number.isNaN(new Date(cancelRequest).getTime())) {
      return res.status(400).json({ error: 'cancelRequest must be a date like 2025-06-28' });
    }

    const statement = await Statement.findById(statementId).lean();
    if (!statement) return res.status(404).json({ error: 'Statement not found' });

    const result = analyzeStatement(statement.transactions || [], {
      cancelMerchant,
      cancelRequestDate: cancelRequest || null,
    });

    res.json({ statementId, ...result });
  } catch (err) {
    console.error('GET /api/trap-scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
