
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  createPayPalInvoice,
  syncPayPalInvoice,
  fetchPayPalInvoices,
  syncAllPendingInvoices,
} from '../api';

export default function Invoices() {
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    amount: '',
    currency: 'CAD',
    description: 'Created with Trace',
    dueDate: '',
  });

  const [invoice, setInvoice] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingOne, setSyncingOne] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadInvoices = useCallback(async () => {
    setLoadingList(true);
    try {
      const result = await fetchPayPalInvoices();
      setInvoices(result.invoices || []);
    } catch (err) {
      setError(err.message || 'Could not load invoices.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    setInvoice(null);

    try {
      const result = await createPayPalInvoice({
        ...form,
        amount: Number(form.amount),
      });

      const created = result.invoice || result;
      setInvoice(created);
      setNotice('Invoice created successfully.');
      await loadInvoices();
    } catch (err) {
      setError(err.message || 'Invoice creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOne = async (id) => {
    if (!id) return;

    setSyncingOne(id);
    setError('');
    setNotice('');

    try {
      const result = await syncPayPalInvoice(id);
      const updated = result.invoice || result;

      setInvoice((current) =>
        current?._id === id ? updated : current
      );

      await loadInvoices();
      setNotice('Invoice status refreshed from PayPal.');
    } catch (err) {
      setError(err.message || 'Could not sync invoice status.');
    } finally {
      setSyncingOne('');
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setError('');
    setNotice('');

    try {
      const result = await syncAllPendingInvoices();
      setInvoices(result.invoices || []);

      setNotice(
        `Refresh complete: ${result.synced || 0} synced, ${result.failed || 0} failed.`
      );

      if (result.failed > 0) {
        setError(
          result.errors?.map((item) => item.error).filter(Boolean).join('; ') ||
          'Some invoices could not be refreshed.'
        );
      }
    } catch (err) {
      setError(err.message || 'Could not refresh pending invoices.');
    } finally {
      setSyncing(false);
    }
  };

  const currencySummary = useMemo(() => {
    const summary = {};

    invoices.forEach((item) => {
      const currency = item.currency || 'USD';
      const amount = Number(item.amount) || 0;

      if (!summary[currency]) {
        summary[currency] = { received: 0, pending: 0 };
      }

      if (item.status === 'paid') {
        summary[currency].received += amount;
      } else {
        summary[currency].pending += amount;
      }
    });

    return summary;
  }, [invoices]);

  const clientSummary = useMemo(() => {
    const summary = {};

    invoices.forEach((item) => {
      const currency = item.currency || 'USD';
      const name = item.clientName || 'Unknown client';
      const email = item.clientEmail || '';
      const key = `${name.toLowerCase()}|${email.toLowerCase()}|${currency}`;

      if (!summary[key]) {
        summary[key] = {
          name,
          email,
          currency,
          received: 0,
          pending: 0,
        };
      }

      const amount = Number(item.amount) || 0;

      if (item.status === 'paid') {
        summary[key].received += amount;
      } else {
        summary[key].pending += amount;
      }
    });

    return Object.values(summary).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [invoices]);

  const getStatus = (item) => {
    if (item.displayStatus) return item.displayStatus;

    if (
      item.status !== 'paid' &&
      item.dueDate &&
      new Date(item.dueDate) < new Date()
    ) {
      return 'overdue';
    }

    return item.status || 'draft';
  };

  const statusClass = (status) => {
    const styles = {
      paid: 'bg-green-100 text-green-800',
      sent: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-700',
      overdue: 'bg-red-100 text-red-800',
      disputed: 'bg-orange-100 text-orange-800',
    };

    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const formatAmount = (currency, amount) =>
    `${currency} ${Number(amount || 0).toFixed(2)}`;

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Trace Payments
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Payment Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Create invoices, track payments and monitor pending amounts.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Payment Summary
        </h2>

        {loadingList ? (
          <p className="text-gray-500">Loading payment summary...</p>
        ) : Object.keys(currencySummary).length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-5 text-gray-500">
            No invoices yet. Create your first invoice below.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(currencySummary).map(([currency, totals]) => (
              <div
                key={currency}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <h3 className="mb-4 font-semibold text-gray-900">
                  {currency}
                </h3>
                <p className="text-sm text-gray-500">Total Received</p>
                <p className="mb-3 text-2xl font-bold text-green-700">
                  {formatAmount(currency, totals.received)}
                </p>
                <p className="text-sm text-gray-500">Total Pending</p>
                <p className="text-2xl font-bold text-orange-700">
                  {formatAmount(currency, totals.pending)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">All Invoices</h2>
            <p className="mt-1 text-sm text-gray-500">
              Paid, pending and overdue payment records.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncAll}
            disabled={syncing || loadingList}
            className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {syncing ? 'Refreshing...' : 'Refresh from PayPal'}
          </button>
        </div>

        {loadingList ? (
          <p className="py-5 text-gray-500">Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-5 text-sm text-gray-500">
            No invoices found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Due date</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">PayPal</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((item) => {
                  const status = getStatus(item);

                  return (
                    <tr key={item._id} className="border-b border-gray-100">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-gray-900">
                          {item.clientName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.clientEmail}
                        </p>
                      </td>
                      <td className="px-3 py-3 font-semibold text-gray-900">
                        {formatAmount(item.currency || 'USD', item.amount)}
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {item.dueDate
                          ? new Date(item.dueDate).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(status)}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {item.paypalStatus || '—'}
                      </td>
                      <td className="px-3 py-3">
                        {item.paypalInvoiceId && item.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleSyncOne(item._id)}
                            disabled={syncingOne === item._id}
                            className="font-semibold text-blue-700 hover:underline disabled:opacity-50"
                          >
                            {syncingOne === item._id ? 'Checking...' : 'Refresh'}
                          </button>
                        )}
                        {item.paypalUrl && (
                          <a
                            href={item.paypalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-3 font-semibold text-gray-700 hover:underline"
                          >
                            Open
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Client-wise Summary
        </h2>

        {clientSummary.length === 0 ? (
          <p className="text-sm text-gray-500">
            Client summaries will appear when invoices are created.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Currency</th>
                  <th className="px-3 py-3">Received</th>
                  <th className="px-3 py-3">Pending</th>
                </tr>
              </thead>
              <tbody>
                {clientSummary.map((client) => (
                  <tr
                    key={`${client.name}-${client.email}-${client.currency}`}
                    className="border-b border-gray-100"
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold text-gray-900">
                        {client.name}
                      </p>
                      <p className="text-xs text-gray-500">{client.email}</p>
                    </td>
                    <td className="px-3 py-3">{client.currency}</td>
                    <td className="px-3 py-3 font-semibold text-green-700">
                      {formatAmount(client.currency, client.received)}
                    </td>
                    <td className="px-3 py-3 font-semibold text-orange-700">
                      {formatAmount(client.currency, client.pending)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Create an Invoice
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Client name
              </label>
              <input
                className={inputClass}
                name="clientName"
                value={form.clientName}
                onChange={updateField}
                placeholder="Client or business name"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Client email
              </label>
              <input
                className={inputClass}
                type="email"
                name="clientEmail"
                value={form.clientEmail}
                onChange={updateField}
                placeholder="client@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <input
                  className={inputClass}
                  type="number"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={updateField}
                  placeholder="100.00"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  className={inputClass}
                  name="currency"
                  value={form.currency}
                  onChange={updateField}
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                className={inputClass}
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="What is this invoice for?"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Due date (optional)
              </label>
              <input
                className={inputClass}
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={updateField}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating invoice...' : 'Create PayPal invoice'}
          </button>

          <p className="mt-3 text-xs text-gray-500">
            Sandbox testing only. No real payment is required.
          </p>
        </form>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Latest Invoice
          </h2>

          {!invoice ? (
            <div className="rounded-lg bg-gray-50 p-5 text-sm text-gray-500">
              Newly generated invoice details will appear here.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-semibold text-gray-900">
                  {invoice.clientName || form.clientName}
                </p>
                <p className="text-sm text-gray-600">
                  {invoice.clientEmail || form.clientEmail}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatAmount(
                    invoice.currency || form.currency,
                    invoice.amount ?? form.amount
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">PayPal status</p>
                <span className="mt-1 inline-block rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                  {invoice.paypalStatus || invoice.status || 'Created'}
                </span>
              </div>

              {invoice.paypalInvoiceId && (
                <div>
                  <p className="text-sm text-gray-500">PayPal invoice ID</p>
                  <p className="break-all text-sm text-gray-800">
                    {invoice.paypalInvoiceId}
                  </p>
                </div>
              )}

              {invoice.paypalUrl && (
                <a
                  href={invoice.paypalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-blue-200 px-4 py-3 text-center font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Open PayPal Sandbox invoice
                </a>
              )}

              {invoice._id && invoice.status !== 'paid' && (
                <button
                  type="button"
                  onClick={() => handleSyncOne(invoice._id)}
                  disabled={syncingOne === invoice._id}
                  className="w-full rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  {syncingOne === invoice._id
                    ? 'Checking status...'
                    : 'Refresh payment status'}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
