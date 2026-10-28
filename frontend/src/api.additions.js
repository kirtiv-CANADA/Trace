// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
// COPY these functions to the END of your existing frontend/src/api.js
// (use the same API base variable your file already uses; here it is API_BASE).

export async function scanTraps(statementId, { cancelMerchant, cancelRequest } = {}) {
  const qs = new URLSearchParams();
  if (cancelMerchant) qs.set('cancelMerchant', cancelMerchant);
  if (cancelRequest) qs.set('cancelRequest', cancelRequest);
  const res = await fetch(`${API_BASE}/api/trap-scan/${statementId}?${qs}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Scan failed');
  }
  return res.json();
}

// ---- Tomorrow (PayPal) ----
export async function createPayPalInvoice(data) {
  const res = await fetch(`${API_BASE}/api/paypal/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Could not create invoice');
  return body;
}

export async function syncPayPalInvoice(id) {
  const res = await fetch(`${API_BASE}/api/paypal/invoices/${id}/sync`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Sync failed');
  return body;
}
