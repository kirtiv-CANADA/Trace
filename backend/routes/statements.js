const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const { parseStatement } = require('../services/parseStatement');
const Statement = require('../models/Statement');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`;
    cb(null, unique);
  },
});

const upload = multer({ storage });

// POST /api/parse-statement — upload CSV, parse, save
router.post('/parse-statement', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    }

    const parsed = await parseStatement(req.file.path);

    const doc = await Statement.create({
      filename: parsed.filename,
      bank: parsed.bank,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      transactions: parsed.transactions,
    });

    return res.json({
      ok: true,
      statementId: doc._id,
      bank: parsed.bank,
      dateFormat: parsed.dateFormat,
      totalTransactions: parsed.totalTransactions,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
    });
  } catch (err) {
    console.error('parse-statement error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/statements — list all (frontend calls this)
router.get('/statements', async (req, res) => {
  try {
    const list = await Statement.find({}, 'filename bank uploadDate transactions').lean();
    res.json(
      list.map((s) => ({
        id: s._id,
        filename: s.filename,
        bank: s.bank,
        uploadDate: s.uploadDate,
        transactionCount: s.transactions?.length || 0,
      }))
    );
  } catch (err) {
    console.error('GET /statements error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api — alias (same as above)
router.get('/', async (req, res) => {
  try {
    const list = await Statement.find({}, 'filename bank uploadDate transactions').lean();
    res.json(
      list.map((s) => ({
        id: s._id,
        filename: s.filename,
        bank: s.bank,
        uploadDate: s.uploadDate,
        transactionCount: s.transactions?.length || 0,
      }))
    );
  } catch (err) {
    console.error('GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;