require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Root — quick sanity check
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'Trace API' });
});

// Health — for Render + uptime monitors later
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'trace',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Trace backend on http://localhost:${PORT}`);
});