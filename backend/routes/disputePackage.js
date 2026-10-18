// backend/routes/disputePackage.js
const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

const Statement = require('../models/Statement');

/**
 * POST /api/dispute-package
 * Body: { statementId, merchant }
 * Returns: PDF download
 */
router.post('/', async (req, res) => {
  try {
    const { statementId, merchant } = req.body;

    if (!statementId || !merchant) {
      return res.status(400).json({ error: 'Missing statementId or merchant' });
    }

    const statement = await Statement.findById(statementId).lean();
    if (!statement) {
      return res.status(404).json({ error: 'Statement not found' });
    }

    // Filter all transactions for this merchant
    const charges = (statement.transactions || [])
      .filter((t) => 
        String(t.description).toUpperCase().includes(String(merchant).toUpperCase())
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (charges.length === 0) {
      return res.status(404).json({ error: 'No charges found for this merchant' });
    }

    const total = charges.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // --- PDF Generation ---
    const doc = new PDFDocument({ margin: 50 });
    const filename = `dispute-${merchant.replace(/\s+/g, '-')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('Trace — Dispute Package', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#555').text(
      `Generated: ${new Date().toISOString().slice(0, 10)} | Statement: ${statement.filename}`
    );
    doc.moveDown(1.5);

    // Section: Merchant summary
    doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text('Disputed Charges');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').text(`Merchant: ${merchant}`);
    doc.text(`Total charges: ${charges.length}`);
    doc.text(`Total amount: $${total.toFixed(2)}`);
    doc.moveDown(1);

    // Section: Charges table
    doc.font('Helvetica-Bold').text('Charge history', { underline: true });
    doc.moveDown(0.5);

    charges.forEach((t, i) => {
      doc.font('Helvetica').fontSize(10).text(
        `${i + 1}. ${new Date(t.date).toISOString().slice(0, 10)} — ` +
        `${t.description} — $${Math.abs(t.amount).toFixed(2)}`
      );
    });

    doc.moveDown(1.5);

    // Section: Formal dispute letter
    doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text('Formal Dispute Notice');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(
      `I am formally disputing the recurring charges from ${merchant} listed above. ` +
      `These charges total $${total.toFixed(2)}. I am requesting a full investigation ` +
      `and the reversal of these unauthorized charges.`,
      { align: 'justify', lineGap: 2 }
    );

    doc.moveDown(1);
    doc.fontSize(9).fillColor('#777').text(
      'This document was generated automatically by Trace. Attach your bank statement ' +
      'and any relevant correspondence with the merchant.'
    );

    doc.end();
  } catch (err) {
    console.error('dispute-package error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

module.exports = router;