const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  date: Date,
  description: String,
  amount: Number,
  balance: Number,
  type: { type: String, enum: ['debit', 'credit', 'unknown'], default: 'unknown' },
  raw: mongoose.Schema.Types.Mixed,
});

const statementSchema = new mongoose.Schema({
  filename: String,
  bank: String,
  accountNumber: String,
  uploadDate: { type: Date, default: Date.now },
  periodStart: Date,
  periodEnd: Date,
  transactions: [transactionSchema],
}, { timestamps: true });

module.exports = mongoose.model('Statement', statementSchema);