// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
import { useEffect, useState } from 'react';
import { fetchStatements, scanTraps } from '../api';

const BADGE = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-700',
};

const cleanName = (f = '') => f.replace(/^\d+-/, '');

export default function TrapScan() {
  const [statements, setStatements] = useState([]);
  const [statementId, setStatementId] = useState('');
  const [cancelMerchant, setCancelMerchant] = useState('');
  const [cancelRequest, setCancelRequest] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatements()
      .then((list) => {
        setStatements(list);
        if (list[0]) setStatementId(list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function handleScan() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await scanTraps(statementId, { cancelMerchant, cancelRequest }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Trap Scan</h1>
      <p className="text-slate-600 mt-1">
        Finds small-offer-then-big-charge patterns in your statement, with the evidence.
      </p>

      <div className="bg-white border rounded-xl p-5 mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Statement</label>
          <select
            className="w-full border rounded-lg p-2"
            value={statementId}
            onChange={(e) => setStatementId(e.target.value)}
          >
            {statements.map((s) => (
              <option key={s.id} value={s.id}>
                {s.bank} — {cleanName(s.filename)} ({s.transactionCount} transactions)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Merchant you asked to cancel (optional)
            </label>
            <input
              className="w-full border rounded-lg p-2"
              placeholder="e.g. resume"
              value={cancelMerchant}
              onChange={(e) => setCancelMerchant(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cancellation request date (optional)
            </label>
            <input
              type="date"
              className="w-full border rounded-lg p-2"
              value={cancelRequest}
              onChange={(e) => setCancelRequest(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={!statementId || loading}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Scanning…' : 'Scan for traps'}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">{error}</div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <p className="text-slate-700">
            Scanned {result.merchantsScanned} merchants — <b>{result.trapsFound}</b> with warning patterns.
          </p>

          {result.merchants.length === 0 && (
            <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
              No trap patterns found in this statement.
            </div>
          )}

          {result.merchants.map((m) => (
            <div key={m.merchant} className="bg-white border rounded-xl p-5">
              <div className="flex justify-between items-baseline">
                <h2 className="text-lg font-semibold">{m.merchant}</h2>
                <span className="text-sm text-slate-500">
                  {m.chargeCount} charges · ${m.totalCharged.toFixed(2)} total
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {m.flags.map((f, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${BADGE[f.severity]}`}>
                      {f.type.replaceAll('_', ' ')}
                    </span>
                    <span className="text-slate-700 text-sm">{f.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p className="text-xs text-slate-500">
            Trace flags patterns in your data. It is not legal or financial advice, and refunds are
            decided by your bank or the merchant.
          </p>
        </div>
      )}
    </div>
  );
}
