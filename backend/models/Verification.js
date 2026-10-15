const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  statementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Statement' },
  verdict: {
    type: String,
    enum: ['VERIFIED', 'CONTRADICTED', 'NOT_FOUND', 'DUPLICATE', 'PARTIAL', 'AMBIGUOUS'],
    required: true,
  },
  evidence: {
    matchedRows: [mongoose.Schema.Types.Mixed],
    closestRows: [mongoose.Schema.Types.Mixed],
    searchWindow: {
      from: Date,
      to: Date,
    },
    reason: String,
  },
  confidence: { type: Number, min: 0, max: 1, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Verification', verificationSchema);