const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');

// POST /api/invoices — create new invoice
router.post('/', async (req, res) => {
  try {
    const { clientName, clientEmail, amount, currency, issueDate, dueDate, description, notes } = req.body;

    if (!clientName || !amount || !issueDate) {
      return res.status(400).json({
        error: 'Missing required fields: clientName, amount, issueDate',
      });
    }

    const invoice = await Invoice.create({
      clientName,
      clientEmail,
      amount,
      currency: currency || 'CAD',
      issueDate: new Date(issueDate),
      dueDate: dueDate ? new Date(dueDate) : null,
      description,
      notes,
      status: 'sent',
    });

    res.status(201).json({
      ok: true,
      invoiceId: invoice._id,
      invoice,
    });
  } catch (err) {
    console.error('POST /invoices error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices — list all
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 }).lean();
    res.json(invoices);
  } catch (err) {
    console.error('GET /invoices error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id — get one
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    console.error('GET /invoices/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/invoices/:id — update
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['clientName', 'clientEmail', 'amount', 'currency', 'issueDate', 'dueDate', 'description', 'notes', 'status'];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (updates.issueDate) updates.issueDate = new Date(updates.issueDate);
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ ok: true, invoice });
  } catch (err) {
    console.error('PATCH /invoices/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/invoices/:id — delete
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ ok: true, deletedId: invoice._id });
  } catch (err) {
    console.error('DELETE /invoices/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;