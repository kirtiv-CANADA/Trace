// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
// Verifies that a webhook really came from PayPal (never trust an unverified webhook).
const { paypalFetch } = require('./auth');

const REQUIRED = [
  'paypal-auth-algo',
  'paypal-cert-url',
  'paypal-transmission-id',
  'paypal-transmission-sig',
  'paypal-transmission-time',
];

async function verifyWebhook(headers, event) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error('PAYPAL_WEBHOOK_ID is not set');
  if (!event || typeof event !== 'object') return false;
  if (REQUIRED.some((h) => !headers[h])) return false;

  const data = await paypalFetch('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });

  return data.verification_status === 'SUCCESS';
}

module.exports = { verifyWebhook };
