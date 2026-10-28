// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
// PayPal OAuth2 client-credentials token with in-memory cache. Requires Node 18+ (global fetch).

let cached = { token: null, expiresAt: 0 };

function config() {
  const { PAYPAL_CLIENT_ID, PAYPAL_SECRET } = process.env;
  const base = process.env.PAYPAL_BASE || 'https://api-m.sandbox.paypal.com';
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error('PAYPAL_CLIENT_ID / PAYPAL_SECRET are not set');
  }
  return { id: PAYPAL_CLIENT_ID, secret: PAYPAL_SECRET, base };
}

async function getAccessToken() {
  if (cached.token && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const { id, secret, base } = config();
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`PayPal auth failed (${res.status}): ${data.error_description || data.error || 'unknown'}`);
  }

  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 300) * 1000 };
  return cached.token;
}

// Authenticated request helper. Returns parsed JSON (or {} for empty bodies).
async function paypalFetch(path, options = {}) {
  const { base } = config();
  const token = await getAccessToken();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data.message || data.error_description || data.name || `HTTP ${res.status}`;
    const err = new Error(`PayPal ${options.method || 'GET'} ${path} failed: ${msg}`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

function _resetTokenCache() { cached = { token: null, expiresAt: 0 }; }

module.exports = { getAccessToken, paypalFetch, _resetTokenCache };
