const { matchInvoice } = require('../services/matchInvoice');
const Statement = require('../models/Statement');

jest.mock('../models/Statement');

describe('Matching Engine (matchInvoice)', () => {
  let mockStatement;

  beforeEach(() => {
    mockStatement = {
      _id: 'stat123',
      transactions: [
        { date: new Date('2026-09-20'), description: 'BLUE OCEAN DESIGN PAYMENT', amount: 3357, type: 'credit' },
        { date: new Date('2026-09-12'), description: 'ACME CORP PAYMENT', amount: 2589, type: 'credit' },
        { date: new Date('2026-09-14'), description: 'ACME CORP PAYMENT', amount: 2496, type: 'credit' },
      ]
    };
    
    // Mongoose Query object ko mock karne ka sahi tarika
    Statement.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockStatement)
    });
  });

  test('should return VERIFIED for exact amount and name match', async () => {
    const invoice = { clientName: 'BLUE OCEAN DESIGN', amount: 3357, issueDate: new Date('2026-09-20') };
    const result = await matchInvoice(invoice, 'stat123');
    
    expect(result.verdict).toBe('VERIFIED');
    expect(result.evidence.matchedRows.length).toBe(1);
  });

  test('should return DUPLICATE if multiple strong matches exist', async () => {
    const invoice = { clientName: 'ACME DESIGN', amount: 2589, issueDate: new Date('2026-09-12') };
    const result = await matchInvoice(invoice, 'stat123');
    
    expect(result.verdict).toBe('DUPLICATE');
  });

  test('should return CONTRADICTED if no match and client claimed paid', async () => {
    // THIRD TEST FIX: matchInvoice code 'notes' ya 'status' check karta hai
    const invoice = { 
      clientName: 'UNKNOWN CLIENT', 
      amount: 9999, 
      issueDate: new Date('2026-10-10'), 
      notes: 'Client says paid' // <-- Yahan notes daala hai
    };
    const result = await matchInvoice(invoice, 'stat123');
    
    expect(result.verdict).toBe('CONTRADICTED');
  });
});