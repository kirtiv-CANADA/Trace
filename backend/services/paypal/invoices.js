// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
// PayPal Invoicing API v2 (sandbox). Verify field names against the current PayPal docs.
const { paypalFetch } = require('./auth');

function splitName(full = '') {
  const parts = String(full).trim().split(/\s+/);
  return { given_name: parts[0] || 'Client', surname: parts.slice(1).join(' ') || '.' };
}

function lastPathSegment(href = '') {
  return String(href).split('/').filter(Boolean).pop();
}

/**
 * Creates a draft invoice, then sends it.
 * input: { clientName, clientEmail, amount, currency='USD', description, dueDate('YYYY-MM-DD'), note }
 * returns: { paypalInvoiceId, invoiceNumber, status, recipientViewUrl }
 */
async function createAndSendInvoice(input) {
  const { clientName, clientEmail, amount, description, dueDate, note } = input;
  const currency = (input.currency || 'USD').toUpperCase();

  if (!clientName || !clientEmail) throw new Error('clientName and clientEmail are required');
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('amount must be a positive number');

  // 1. invoice number
  const gen = await paypalFetch('/v2/invoicing/generate-next-invoice-number', { method: 'POST' });
  const invoiceNumber = gen.invoice_number;

  // 2. draft
  const detail = {
    invoice_number: invoiceNumber,
    currency_code: currency,
    note: note || 'Created with Trace',
  };
  if (dueDate) {
    detail.payment_term = { term_type: 'DUE_ON_DATE_SPECIFIED', due_date: dueDate };
  }

  const draft = await paypalFetch('/v2/invoicing/invoices', {
    method: 'POST',
    body: JSON.stringify({
      detail,
      primary_recipients: [
        { billing_info: { name: splitName(clientName), email_address: clientEmail } },
      ],
      items: [
        {
          name: description || 'Services',
          quantity: '1',
          unit_amount: { currency_code: currency, value: value.toFixed(2) },
        },
      ],
    }),
  });
  const paypalInvoiceId = lastPathSegment(draft.href);
  if (!paypalInvoiceId) throw new Error('PayPal did not return an invoice id');

  // 3. send
  await paypalFetch(`/v2/invoicing/invoices/${paypalInvoiceId}/send`, {
    method: 'POST',
    body: JSON.stringify({ send_to_recipient: true, send_to_invoicer: false }),
  });

  // 4. read back for status + payer link
  const info = await getInvoice(paypalInvoiceId);
  return { paypalInvoiceId, invoiceNumber, status: info.status, recipientViewUrl: info.recipientViewUrl };
}

async function getInvoice(paypalInvoiceId) {
  const inv = await paypalFetch(`/v2/invoicing/invoices/${paypalInvoiceId}`);
  return {
    status: inv.status,                                   // DRAFT, SENT, PAID, ...
    recipientViewUrl: inv.detail?.metadata?.recipient_view_url || null,
    raw: inv,
  };
}

module.exports = { createAndSendInvoice, getInvoice, splitName, lastPathSegment };
