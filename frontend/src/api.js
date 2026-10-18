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