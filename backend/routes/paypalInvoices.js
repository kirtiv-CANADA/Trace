// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
const express = require('express');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const { createAndSendInvoice, getInvoice } = require('../services/paypal/invoices');

const router = express.Router();

// POST /api/paypal/invoices
// body: { clientName, clientEmail, amount, currency, description, dueDate }
router.post('/', async (req, res) => {
  try {
    const { clientName, clientEmail, amount, currency = 'USD', description, dueDate } = req.body || {};
    if (!clientName || !clientEmail || !amount) {
      return res.status(400).json({ error: 'clientName, clientEmail and amount are required' });
    }

    // 1. local record first
    const local = await Invoice.create({
      clientName,
      clientEmail,
      amount: Number(amount),
      currency,
      description,
      issueDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: 'draft',
    });

    // 2. PayPal
    let pp;
    try {
      pp = await createAndSendInvoice({ clientName, clientEmail, amount, currency, description, dueDate });
    } catch (e) {
      console.error('PayPal create invoice failed:', e.message, e.details || '');
      return res.status(502).json({ error: e.message, invoiceId: local._id });
    }

    // 3. link
    local.paypalInvoiceId = pp.paypalInvoiceId;
    local.paypalStatus = pp.status;
    local.paypalUrl = pp.recipientViewUrl;
    local.status = 'sent';
    await local.save();

    res.status(201).json(local);
  } catch (err) {
    console.error('POST /api/paypal/invoices error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/paypal/invoices/:id/sync   (use this when webhooks cannot reach localhost)
router.get('/:id/sync', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const inv = await Invoice.findById(req.params.id);
    if (!inv || !inv.paypalInvoiceId) return res.status(404).json({ error: 'No PayPal invoice for this id' });

    const info = await getInvoice(inv.paypalInvoiceId);
    inv.paypalStatus = info.status;
    if (info.status === 'PAID' && inv.status !== 'paid') {
      inv.status = 'paid';
      inv.paidAt = new Date();
    }
    await inv.save();
    res.json(inv);
  } catch (err) {
    console.error('GET sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
