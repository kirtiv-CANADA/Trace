const { parseStatement, detectDateFormat, parseAmount } = require('../services/parseStatement');
const path = require('path');

describe('CSV Parser (parseStatement)', () => {
  
  test('detectDateFormat should parse standard formats', () => {
    expect(detectDateFormat('2026-09-12')).toBe('YYYY-MM-DD');
    expect(detectDateFormat('09/12/2026')).toBe('MM/DD/YYYY');
    expect(detectDateFormat('invalid')).toBe(null);
  });

  test('parseAmount should clean currency strings', () => {
    expect(parseAmount('$1,250.50')).toBe(1250.50);
    expect(parseAmount('1000')).toBe(1000);
    expect(parseAmount('')).toBe(0);
  });

  test('should correctly parse an RBC statement fixture', async () => {
    // Note: Root folder ke scripts mein ja rahe hain (2 baar ..)
    const filePath = path.join(__dirname, '..', '..', 'scripts', 'fixtures', 'statement-rbc-1.csv');
    const result = await parseStatement(filePath);

    expect(result.bank).toBe('RBC');
    expect(result.transactions.length).toBeGreaterThan(0);
    
    const tx = result.transactions[0];
    expect(tx).toHaveProperty('date');
    expect(tx).toHaveProperty('description');
    expect(tx).toHaveProperty('amount');
    expect(typeof tx.amount).toBe('number');
  });

});