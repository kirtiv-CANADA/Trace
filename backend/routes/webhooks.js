// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
const express = require('express');
const Invoice = require('../models/Invoice');
const WebhookEvent = require('../models/WebhookEvent');
const { verifyWebhook } = require('../services/paypal/webhookVerify');

const router = express.Router();

// POST /api/webhooks/paypal
router.post('/paypal', async (req, res) => {
  try {
    const event = req.body;

    // 1. signature check: reject anything not from PayPal
    const ok = await verifyWebhook(req.headers, event);
    if (!ok) return res.status(400).json({ error: 'Invalid webhook signature' });

    // 2. idempotency: PayPal may deliver the same event more than once
    if (await WebhookEvent.exists({ eventId: event.id })) {
      return res.json({ ok: true, duplicate: true });
    }

    const inv = event.resource?.invoice || event.resource || {};
    const record = await WebhookEvent.create({
      eventId: event.id,
      eventType: event.event_type,
      resourceId: inv.id,
      verified: true,
      payload: event,
    });

    // 3. act on the event (code decides, not AI)
    if (event.event_type === 'INVOICING.INVOICE.PAID' && inv.id) {
      const local = await Invoice.findOne({ paypalInvoiceId: inv.id });
      if (local && local.status !== 'paid') {
        local.status = 'paid';
        local.paypalStatus = 'PAID';
        local.paidAt = new Date();
        await local.save();
      }
      record.handled = !!local;
      await record.save();
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/webhooks/paypal error:', err);
    res.status(500).json({ error: err.message }); // non-2xx => PayPal retries
  }
});

module.exports = router;
