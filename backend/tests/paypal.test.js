// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
// No real network calls: global.fetch is mocked.
process.env.PAYPAL_CLIENT_ID = 'test-id';
process.env.PAYPAL_SECRET = 'test-secret';
process.env.PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';
process.env.PAYPAL_WEBHOOK_ID = 'WH-TEST';

const { _resetTokenCache } = require('../services/paypal/auth');
const { createAndSendInvoice, splitName, lastPathSegment } = require('../services/paypal/invoices');
const { verifyWebhook } = require('../services/paypal/webhookVerify');

const jsonRes = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
  json: async () => body,
});

const goodHeaders = {
  'paypal-auth-algo': 'SHA256withRSA',
  'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
  'paypal-transmission-id': 'id-1',
  'paypal-transmission-sig': 'sig-1',
  'paypal-transmission-time': '2026-10-25T10:00:00Z',
};

beforeEach(() => { _resetTokenCache(); global.fetch = jest.fn(); });

describe('helpers', () => {
  test('splitName', () => {
    expect(splitName('Jane Q Doe')).toEqual({ given_name: 'Jane', surname: 'Q Doe' });
    expect(splitName('Madonna')).toEqual({ given_name: 'Madonna', surname: '.' });
  });
  test('lastPathSegment', () => {
    expect(lastPathSegment('https://api-m.sandbox.paypal.com/v2/invoicing/invoices/INV2-ABC')).toBe('INV2-ABC');
  });
});

describe('createAndSendInvoice', () => {
  test('runs token -> number -> draft -> send -> read, with correct payload', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonRes({ access_token: 'TOKEN', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonRes({ invoice_number: '0001' }))
      .mockResolvedValueOnce(jsonRes({ href: 'https://x/v2/invoicing/invoices/INV2-XYZ' }, 201))
      .mockResolvedValueOnce(jsonRes({}))
      .mockResolvedValueOnce(jsonRes({ status: 'SENT', detail: { metadata: { recipient_view_url: 'https://pay.example/inv' } } }));

    const r = await createAndSendInvoice({
      clientName: 'Blue Ocean Studio', clientEmail: 'client@example.com',
      amount: 1200, currency: 'usd', description: 'Logo design', dueDate: '2026-11-30',
    });

    expect(r).toEqual({
      paypalInvoiceId: 'INV2-XYZ', invoiceNumber: '0001', status: 'SENT', recipientViewUrl: 'https://pay.example/inv',
    });

    const draftCall = global.fetch.mock.calls[2];
    expect(draftCall[0]).toContain('/v2/invoicing/invoices');
    const body = JSON.parse(draftCall[1].body);
    expect(body.detail.currency_code).toBe('USD');
    expect(body.items[0].unit_amount.value).toBe('1200.00');
    expect(body.primary_recipients[0].billing_info.email_address).toBe('client@example.com');
    expect(draftCall[1].headers.Authorization).toBe('Bearer TOKEN');

    expect(global.fetch.mock.calls[3][0]).toContain('/INV2-XYZ/send');
  });

  test('rejects bad input before calling PayPal', async () => {
    await expect(createAndSendInvoice({ clientName: 'A', clientEmail: 'a@b.com', amount: -5 })).rejects.toThrow('positive');
    await expect(createAndSendInvoice({ amount: 5 })).rejects.toThrow('required');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('surfaces PayPal errors', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonRes({ access_token: 'T', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonRes({ name: 'INVALID', message: 'bad request' }, 400));
    await expect(createAndSendInvoice({ clientName: 'A B', clientEmail: 'a@b.com', amount: 5 })).rejects.toThrow('bad request');
  });
});

describe('verifyWebhook', () => {
  const event = { id: 'WH-EVT-1', event_type: 'INVOICING.INVOICE.PAID', resource: { invoice: { id: 'INV2-XYZ' } } };

  test('SUCCESS -> true, and sends the webhook id + event', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonRes({ access_token: 'T', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonRes({ verification_status: 'SUCCESS' }));
    expect(await verifyWebhook(goodHeaders, event)).toBe(true);
    const sent = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(sent.webhook_id).toBe('WH-TEST');
    expect(sent.webhook_event.id).toBe('WH-EVT-1');
    expect(sent.transmission_id).toBe('id-1');
  });

  test('FAILURE -> false', async () => {
    global.fetch
      .mockResolvedValueOnce(jsonRes({ access_token: 'T', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonRes({ verification_status: 'FAILURE' }));
    expect(await verifyWebhook(goodHeaders, event)).toBe(false);
  });

  test('missing headers -> false without calling PayPal', async () => {
    expect(await verifyWebhook({}, event)).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
