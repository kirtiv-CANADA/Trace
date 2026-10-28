const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  clientEmail: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'CAD' },
  issueDate: { type: Date, required: true },
  dueDate: Date,
  description: String,
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'disputed'],
    default: 'draft',
  },
  notes: String,

  // --- PayPal (added) ---
  paypalInvoiceId: { type: String, index: true },
  paypalStatus: String,
  paypalUrl: String,
  paidAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
