require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Load models — register with Mongoose
require('./models/Statement');
require('./models/Invoice');
require('./models/Verification');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Root — quick sanity check
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'Trace API' });
});

// Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'trace',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ============================================
// ROUTES
// ============================================
// These files have full paths inside (/parse-statement, /parse-claim) → mount on /api
app.use('/api', require('./routes/statements'));
app.use('/api', require('./routes/claims'));

// This file has path "/" → mount on /api/claim-to-verdict
app.use('/api/claim-to-verdict', require('./routes/claimToVerdict'));

// These files have short paths (/, /:id) → mount on distinct prefixes
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/verify', require('./routes/verify'));
app.use('/api/subscriptions', require('./routes/subscriptions'));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Trace backend on http://localhost:${PORT}`);
});