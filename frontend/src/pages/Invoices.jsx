import { useState } from 'react';
import { createPayPalInvoice, syncPayPalInvoice } from '../api';

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
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setInvoice(null);

    try {
      const result = await createPayPalInvoice({
        ...form,
        amount: Number(form.amount),
      });
      setInvoice(result.invoice || result);
    } catch (err) {
      setError(err.message || 'Invoice creation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!invoice?._id) return;
    setSyncing(true);
    setError('');

    try {
      const result = await syncPayPalInvoice(invoice._id);
      setInvoice(result.invoice || result);
    } catch (err) {
      setError(err.message || 'Could not sync invoice status.');
    } finally {
      setSyncing(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Trace Payments
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Create an Invoice
        </h1>
        <p className="mt-2 text-gray-600">
          Generate a PayPal Sandbox invoice and track its status.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Invoice details
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
            Invoice status
          </h2>

          {!invoice && (
            <div className="rounded-lg bg-gray-50 p-5 text-sm text-gray-500">
              Your generated invoice details will appear here.
            </div>
          )}

          {invoice && (
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
                  {invoice.currency || form.currency}{' '}
                  {Number(invoice.amount ?? form.amount).toFixed(2)}
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

              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || !invoice._id}
                className="w-full rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {syncing ? 'Checking status...' : 'Refresh payment status'}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
