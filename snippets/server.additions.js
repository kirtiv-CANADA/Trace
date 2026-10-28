// Add these lines in backend/server.js next to your other app.use(...) route lines:
app.use('/api/trap-scan', require('./routes/trapScan'));            // today
app.use('/api/paypal/invoices', require('./routes/paypalInvoices')); // tomorrow
app.use('/api/webhooks', require('./routes/webhooks'));              // tomorrow
