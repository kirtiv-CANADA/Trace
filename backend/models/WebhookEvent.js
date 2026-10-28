// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
// Log of received webhooks. Unique eventId makes processing idempotent (PayPal retries).
const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  resourceId: String,
  verified: { type: Boolean, default: false },
  handled: { type: Boolean, default: false },
  payload: mongoose.Schema.Types.Mixed,
  receivedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
