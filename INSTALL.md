# Trace update — install & test guide

Everything here mirrors your repo folders. Copy each file to the SAME path inside D:\Trace.
Do NOT overwrite your existing files (server.js, api.js, App.jsx, Invoice.js): for those, follow the snippets/ folder.

## Part A: TODAY — Trap Scan
| File in this zip | Copy to |
|---|---|
| backend/services/trialTrap.js | D:\Trace\backend\services\trialTrap.js |
| backend/routes/trapScan.js | D:\Trace\backend\routes\trapScan.js |
| backend/tests/trialTrap.test.js | D:\Trace\backend\tests\trialTrap.test.js |
| scripts/generate-trap-fixtures.js | D:\Trace\scripts\generate-trap-fixtures.js |
| frontend/src/pages/TrapScan.jsx | D:\Trace\frontend\src\pages\TrapScan.jsx |
| NOTICE | D:\Trace\NOTICE |

Edits: snippets/server.additions.js (1 line), frontend/src/api.additions.js (paste at end of api.js), snippets/App.jsx.additions.txt.

Test:
1. cd D:\Trace\backend ; npm test            (old tests + new tests should pass)
2. cd D:\Trace ; node scripts/generate-trap-fixtures.js
3. cd D:\Trace\backend ; node server.js
4. Upload scripts/fixtures/statement-trap-rbc.csv (your upload route/UI), get the statement id from /api/statements
5. Open http://localhost:5000/api/trap-scan/<ID>?cancelMerchant=resume&cancelRequest=2025-06-28
   Expected: 2 traps (EXAMPLE RESUME CO with 4 flags, EXAMPLE VIDEO AI with 2 flags), STREAMBOX not flagged.
6. cd D:\Trace\frontend ; npm run dev  -> open /traps

## Part B: TOMORROW — PayPal invoice + webhook
| File in this zip | Copy to |
|---|---|
| backend/services/paypal/auth.js | D:\Trace\backend\services\paypal\auth.js |
| backend/services/paypal/invoices.js | D:\Trace\backend\services\paypal\invoices.js |
| backend/services/paypal/webhookVerify.js | D:\Trace\backend\services\paypal\webhookVerify.js |
| backend/models/WebhookEvent.js | D:\Trace\backend\models\WebhookEvent.js |
| backend/routes/paypalInvoices.js | D:\Trace\backend\routes\paypalInvoices.js |
| backend/routes/webhooks.js | D:\Trace\backend\routes\webhooks.js |
| backend/tests/paypal.test.js | D:\Trace\backend\tests\paypal.test.js |

Edits: snippets/Invoice.model.additions.txt, snippets/server.additions.js (2 more lines), snippets/env.additions.txt.
Needs Node 18+ (node --version).

PayPal setup (developer.paypal.com):
1. Apps & Credentials -> Sandbox -> create app -> copy Client ID + Secret into .env
2. In the app: Webhooks -> Add webhook
   URL: https://trace-bf22.onrender.com/api/webhooks/paypal
   Event: Invoicing -> Invoice paid
   Copy the Webhook ID into PAYPAL_WEBHOOK_ID (also in Render environment variables)
3. Redeploy backend on Render.

Test (sandbox):
1. npm test  (paypal tests use a fake fetch; no network)
2. Create invoice (PowerShell):
   curl.exe -X POST http://localhost:5000/api/paypal/invoices -H "Content-Type: application/json" -d "{\"clientName\":\"Test Client\",\"clientEmail\":\"buyer@example.com\",\"amount\":50,\"currency\":\"USD\",\"description\":\"Test service\"}"
   The response has paypalUrl. Open it, log in with your SANDBOX personal (buyer) account, pay.
3. Webhooks cannot reach localhost. Either test on the Render URL, or call:
   GET http://localhost:5000/api/paypal/invoices/<mongo invoice id>/sync   -> status becomes paid.

PayPal field names/events: confirm against the current PayPal docs if any call returns 4xx.
