// Trace - Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
const { getAccessToken } = require('./auth');

async function verifyWebhook(headers = {}, event = {}) {
  try {
    const normalized = Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [
        key.toLowerCase(),
        value,
      ])
    );

    const transmissionId = normalized['paypal-transmission-id'];
    const transmissionTime = normalized['paypal-transmission-time'];
    const transmissionSig = normalized['paypal-transmission-sig'];
    const certUrl = normalized['paypal-cert-url'];
    const authAlgo = normalized['paypal-auth-algo'];
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (
      !transmissionId ||
      !transmissionTime ||
      !transmissionSig ||
      !certUrl ||
      !authAlgo ||
      !webhookId ||
      !event ||
      !event.id
    ) {
      return false;
    }

    const token = await getAccessToken();
    const base = (
      process.env.PAYPAL_BASE ||
      'https://api-m.sandbox.paypal.com'
    ).replace(/\/$/, '');

    const response = await fetch(
      `${base}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: event,
        }),
      }
    );

    if (!response.ok) {
      return false;
    }

    const result = await response.json().catch(() => ({}));
    return result.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('PayPal webhook verification failed:', error.message);
    return false;
  }
}

module.exports = { verifyWebhook };
