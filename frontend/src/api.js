// frontend/src/api.js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export async function fetchStatements() {
  const res = await fetch(`${API_BASE}/api/statements`);
  if (!res.ok) throw new Error('Failed to load statements');
  return res.json();
}

export async function claimToVerdict(claimText, statementId) {
  const res = await fetch(`${API_BASE}/api/claim-to-verdict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claimText, statementId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Yahan change kiya gaya hai: POST se GET kiya, aur ID URL path mein bheji
export async function fetchSubscriptions(statementId) {
  const res = await fetch(`${API_BASE}/api/subscriptions/${statementId}`, {
    method: 'GET',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to detect subscriptions');
  return data;
}
export async function downloadDisputePackage(statementId, merchant) {
  const res = await fetch(`${API_BASE}/api/dispute-package`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statementId, merchant }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate PDF');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dispute-${merchant.replace(/\s+/g, '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// NEW: Trap Scan
// ============================================
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

// ============================================
// NEW: PayPal invoices (used from the Invoices page, built next)
// ============================================
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
