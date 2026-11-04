
// Trace — Copyright (c) 2026 <YOUR NAME>.
// Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.

const express = require('express');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');

const {
  createAndSendInvoice,
  getInvoice,
} = require('../services/paypal/invoices');

const router = express.Router();

// GET /api/paypal/invoices
// Fetch all invoices and calculate overdue status for display only.
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });

    // Compare calendar dates, not exact times.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = invoices.map((inv) => {
      const item = inv.toObject();

      const dueDate = item.dueDate
        ? new Date(item.dueDate)
        : null;

      if (dueDate) {
        dueDate.setHours(0, 0, 0, 0);
      }

      // Only sent invoices can become overdue.
      // Draft, paid and disputed statuses remain unchanged.
      item.displayStatus =
        item.status === 'sent' && dueDate && dueDate < today
          ? 'overdue'
          : item.status;

      return item;
    });

    res.json({ invoices: result });
  } catch (err) {
    console.error('GET invoices error:', err);
    res.status(500).json({ error: 'Could not load invoices' });
  }
});

// POST /api/paypal/invoices/sync-pending
// Refresh all unpaid invoices that have a PayPal invoice ID.
router.post('/sync-pending', async (req, res) => {
  try {
    const pending = await Invoice.find({
      status: { $ne: 'paid' },
      paypalInvoiceId: { $exists: true, $ne: '' },
    });

    let synced = 0;
    const errors = [];

    for (const inv of pending) {
      try {
        const info = await getInvoice(inv.paypalInvoiceId);

        inv.paypalStatus = info.status;

        if (info.status === 'PAID' && inv.status !== 'paid') {
          inv.status = 'paid';
          inv.paidAt = new Date();
        }

        await inv.save();
        synced += 1;
      } catch (err) {
        console.error(
          `PayPal sync failed for ${inv._id}:`,
          err.message
        );

        errors.push({
          invoiceId: inv._id,
          error: err.message,
        });
      }
    }

    const invoices = await Invoice.find().sort({ createdAt: -1 });

    res.json({
      synced,
      failed: errors.length,
      errors,
      invoices,
    });
  } catch (err) {
    console.error('POST sync-pending error:', err);

    res.status(500).json({
      error: 'Could not refresh pending invoices',
    });
  }
});

// POST /api/paypal/invoices
// Create a local invoice and send it through PayPal.
// Body: { clientName, clientEmail, amount, currency, description, dueDate }
router.post('/', async (req, res) => {
  try {
    const {
      clientName,
      clientEmail,
      amount,
      currency = 'USD',
      description,
      dueDate,
    } = req.body || {};

    // 1. Normalize and validate invoice details.
    const cleanName = String(clientName || '').trim();
    const cleanEmail = String(clientEmail || '').trim().toLowerCase();
    const cleanCurrency = String(currency || 'USD').toUpperCase();
    const numericAmount = Number(amount);

    const allowedCurrencies = ['CAD', 'USD', 'EUR', 'GBP', 'INR'];

    if (
      !cleanName ||
      !cleanEmail ||
      amount === undefined ||
      amount === null ||
      amount === ''
    ) {
      return res.status(400).json({
        error: 'clientName, clientEmail and amount are required',
      });
    }

    if (cleanName.length > 80) {
      return res.status(400).json({
        error: 'Client name must be 80 characters or fewer',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        error: 'Please provide a valid client email',
      });
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      numericAmount > 100000
    ) {
      return res.status(400).json({
        error: 'Amount must be greater than 0 and no more than 100,000',
      });
    }

    if (!allowedCurrencies.includes(cleanCurrency)) {
      return res.status(400).json({
        error: 'Unsupported currency',
      });
    }

    if (description && String(description).length > 200) {
      return res.status(400).json({
        error: 'Description must be 200 characters or fewer',
      });
    }

    // 2. Apply Net 30 if no due date was provided.
    const effectiveDueDate = dueDate || (() => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date.toISOString().slice(0, 10);
    })();

    // Validate YYYY-MM-DD and reject impossible calendar dates.
    const validDateFormat =
      /^\d{4}-\d{2}-\d{2}$/.test(effectiveDueDate);

    const parsedDueDate = validDateFormat
      ? new Date(`${effectiveDueDate}T00:00:00.000Z`)
      : null;

    if (
      !parsedDueDate ||
      Number.isNaN(parsedDueDate.getTime()) ||
      parsedDueDate.toISOString().slice(0, 10) !== effectiveDueDate
    ) {
      return res.status(400).json({
        error: 'Invalid due date. Use YYYY-MM-DD format',
      });
    }

    // 3. Create local invoice record first.
    const local = await Invoice.create({
      clientName: cleanName,
      clientEmail: cleanEmail,
      amount: numericAmount,
      currency: cleanCurrency,
      description,
      issueDate: new Date(),
      dueDate: parsedDueDate,
      status: 'draft',
    });

    // 4. Create and send the invoice through PayPal.
    let pp;

    try {
      pp = await createAndSendInvoice({
        clientName: cleanName,
        clientEmail: cleanEmail,
        amount: numericAmount,
        currency: cleanCurrency,
        description,
        dueDate: effectiveDueDate,
      });
    } catch (e) {
      console.error(
        'PayPal create invoice failed:',
        e.message,
        e.details || ''
      );

      // Keep the local draft for troubleshooting.
      return res.status(502).json({
        error: e.message,
        invoiceId: local._id,
      });
    }

    // 5. Link local invoice with PayPal invoice.
    local.paypalInvoiceId = pp.paypalInvoiceId;
    local.paypalStatus = pp.status;
    local.paypalUrl = pp.recipientViewUrl;
    local.status = 'sent';

    await local.save();

    res.status(201).json(local);
  } catch (err) {
    console.error('POST /api/paypal/invoices error:', err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// GET /api/paypal/invoices/:id/sync
// Refresh one invoice directly from PayPal.
router.get('/:id/sync', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid id',
      });
    }

    const inv = await Invoice.findById(req.params.id);

    if (!inv || !inv.paypalInvoiceId) {
      return res.status(404).json({
        error: 'No PayPal invoice for this id',
      });
    }

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

    res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;
