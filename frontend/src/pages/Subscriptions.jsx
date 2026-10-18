import { useEffect, useState } from 'react';
import { fetchStatements, fetchSubscriptions } from '../api';

export default function Subscriptions() {
  const [statements, setStatements] = useState([]);
  const [statementId, setStatementId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchStatements()
      .then((list) => {
        setStatements(list);
        if (list.length > 0) setStatementId(list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function handleScan() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await fetchSubscriptions(statementId);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Subscription Leaks</h1>
      <p className="text-gray-600 text-sm mb-6">Find recurring charges in your bank statement.</p>

      {/* Controls */}
      <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Statement</label>
          <select
            value={statementId}
            onChange={(e) => setStatementId(e.target.value)}
            className="w-full border rounded p-2 bg-white"
          >
            {statements.map((s) => (
              <option key={s.id} value={s.id}>
                {s.bank} — {s.filename}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleScan}
          disabled={loading || !statementId}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 h-10"
        >
          {loading ? 'Scanning…' : 'Scan for Subscriptions'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded mb-4">{error}</div>}

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-green-900 flex flex-wrap gap-4 justify-between">
            <div>
              <div className="text-xs uppercase font-semibold opacity-70">Subscriptions found</div>
              <div className="text-2xl font-bold">{result.count || 0}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold opacity-70">Monthly cost</div>
              <div className="text-2xl font-bold">${result.totalMonthly || 0}/mo</div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold opacity-70">Total paid so far</div>
              <div className="text-2xl font-bold">${result.totalSpent || 0}</div>
            </div>
          </div>

          {/* Cards */}
          {result.subscriptions?.length === 0 && (
            <div className="bg-gray-50 border text-gray-700 p-4 rounded">
              No recurring subscriptions detected in this statement.
            </div>
          )}

          {result.subscriptions?.map((sub, i) => (
            <div key={i} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-gray-900">{sub.merchant}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {sub.occurrences} charges · {sub.frequency}
                    {sub.confidence != null && (
                      <span className="ml-2 text-green-700">
                        {(sub.confidence * 100).toFixed(0)}% confidence
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-semibold">
                    ${sub.monthlySpent?.toFixed(2)}
                    <span className="text-sm text-gray-500">/mo</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    ${sub.totalSpent?.toFixed(2)} total
                  </div>
                </div>
              </div>

              {sub.charges?.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                    View {sub.charges.length} charges
                  </summary>
                  <div className="mt-2 space-y-1">
                    {sub.charges.map((c, j) => (
                      <div key={j} className="flex justify-between text-xs text-gray-600 border-l-2 border-gray-200 pl-2">
                        <span>{String(c.date).slice(0, 10)}</span>
                        <span>{c.description}</span>
                        <span className="font-mono">${c.amount}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}