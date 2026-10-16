// frontend/src/pages/VerifyClaim.jsx
import { useEffect, useState } from 'react';
import { fetchStatements, claimToVerdict } from '../api';

const VERDICT_STYLES = {
  VERIFIED:     'bg-green-50 border-green-300 text-green-800',
  CONTRADICTED: 'bg-red-50 border-red-300 text-red-800',
  DUPLICATE:    'bg-orange-50 border-orange-300 text-orange-800',
  PARTIAL:      'bg-yellow-50 border-yellow-300 text-yellow-800',
  AMBIGUOUS:    'bg-purple-50 border-purple-300 text-purple-800',
  NOT_FOUND:    'bg-gray-50 border-gray-300 text-gray-800',
};

const VERDICT_LABELS = {
  VERIFIED:     'Verified — payment received',
  CONTRADICTED: 'Contradicted — no matching transaction',
  DUPLICATE:    'Duplicate — possible double payment',
  PARTIAL:      'Partial match — check manually',
  AMBIGUOUS:    'Ambiguous — multiple candidates',
  NOT_FOUND:    'Not found',
};

export default function VerifyClaim() {
  const [statements, setStatements] = useState([]);
  const [statementId, setStatementId] = useState('');
  const [claimText, setClaimText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatements()
      .then((list) => {
        setStatements(list);
        if (list.length > 0) setStatementId(list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await claimToVerdict(claimText, statementId);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Trace</h1>
      <p className="text-gray-600 mb-6">
        Every dollar has a story. Trace reads it, and tells the truth with evidence.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Statement
        </label>
        <select
          value={statementId}
          onChange={(e) => setStatementId(e.target.value)}
          className="w-full border rounded p-2 mb-4"
          required
        >
          {statements.map((s) => (
            <option key={s.id} value={s.id}>
              {s.bank} — {s.filename} ({s.transactionCount} transactions)
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Client's payment claim
        </label>
        <textarea
          value={claimText}
          onChange={(e) => setClaimText(e.target.value)}
          placeholder='e.g. "BLUE OCEAN DESIGN paid 3357 on Sep 20 via e-transfer"'
          rows={3}
          className="w-full border rounded p-2 mb-4 font-mono text-sm"
          required
        />

        <button
          type="submit"
          disabled={loading || !claimText || !statementId}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Verify claim'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {result && <ResultCard result={result} />}
    </div>
  );
}

function ResultCard({ result }) {
  const { canVerify, verdict, confidence, claim, evidence, reason, message } = result;

  // Case 1 — cannot verify (denied or incomplete)
  if (!canVerify) {
    return (
      <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-300">
        <div className="font-semibold text-yellow-900 mb-2">
          Cannot verify
        </div>
        <div className="text-sm text-yellow-900">{message}</div>
        <div className="text-xs text-yellow-700 mt-2">
          Reason: <code>{reason}</code>
        </div>
        {claim?.warnings?.length > 0 && (
          <div className="mt-3 text-xs text-yellow-800">
            AI warnings: {claim.warnings.join(', ')}
          </div>
        )}
      </div>
    );
  }

  // Case 2 — verdict returned
  const style = VERDICT_STYLES[verdict] || 'bg-gray-50 border-gray-300';
  const label = VERDICT_LABELS[verdict] || verdict;

  return (
    <div className="space-y-4">
      {/* Verdict header */}
      <div className={`border rounded-lg p-4 ${style}`}>
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">{label}</div>
          {confidence != null && (
            <div className="text-sm opacity-80">
              Confidence: {(confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
        {evidence?.reason && (
          <div className="text-sm mt-2 opacity-90">{evidence.reason}</div>
        )}
      </div>

      {/* Claim summary */}
      <div className="border rounded-lg p-4 bg-white">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Parsed claim
        </div>
        <div className="text-sm grid grid-cols-2 gap-y-1">
          <div className="text-gray-600">Client</div>
          <div>{claim.clientName || '—'}</div>
          <div className="text-gray-600">Amount</div>
          <div>
            {claim.amount != null
              ? `${claim.currency || 'CAD'} ${claim.amount}`
              : '—'}
          </div>
          <div className="text-gray-600">Claimed date</div>
          <div>{claim.paidDate || '—'}</div>
          <div className="text-gray-600">Reference</div>
          <div>{claim.reference || '—'}</div>
        </div>
      </div>

      {/* Evidence */}
      {evidence?.matchedRows?.length > 0 && (
        <div className="border rounded-lg p-4 bg-white">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Matched transactions ({evidence.matchedRows.length})
          </div>
          <div className="space-y-2">
            {evidence.matchedRows.map((row, i) => (
              <div key={i} className="text-sm border-l-4 border-green-400 pl-3 py-1">
                <div className="font-mono">
                  {String(row.date).slice(0, 10)} · {row.description} · {row.amount}
                </div>
                <div className="text-xs text-gray-500">{row.matchReason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {evidence?.closestRows?.length > 0 && (
        <div className="border rounded-lg p-4 bg-white">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Closest transactions (no match)
          </div>
          <div className="space-y-2">
            {evidence.closestRows.map((row, i) => (
              <div key={i} className="text-sm border-l-4 border-gray-300 pl-3 py-1">
                <div className="font-mono">
                  {String(row.date).slice(0, 10)} · {row.description} · {row.amount}
                </div>
                <div className="text-xs text-gray-500">{row.matchReason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}