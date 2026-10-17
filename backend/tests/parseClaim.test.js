require('dotenv').config();

const { parseClaim } = require('../services/parseClaim');

// AI API calls take time, so we give it 20 seconds timeout
jest.setTimeout(20000); 

describe('AI Claim Parser (parseClaim)', () => {

  test('should extract all fields from a clear claim', async () => {
    const text = "BLUE OCEAN DESIGN paid 3357 on Sep 20 via e-transfer";
    const result = await parseClaim(text);

    expect(result.clientName).toContain('BLUE OCEAN');
    expect(result.amount).toBe(3357);
    // Date will depend on current year logic (2026)
    expect(result.paidDate).toMatch(/2026-09-20/); 
    expect(result.claimsPaid).toBe(true);
    expect(result.warnings.length).toBe(0);
  });

  test('should detect negative intent (haven\'t paid)', async () => {
    const text = "I haven't paid yet, will send next week";
    const result = await parseClaim(text);

    expect(result.claimsPaid).toBe(false);
    expect(result.amount).toBeNull();
  });

  test('should flag ambiguous dates', async () => {
    const text = "Payment sent on 05/09/2026";
    const result = await parseClaim(text);

    // 05/09/2026 is ambiguous (May 9 or Sep 5). Prompt should add a warning.
    expect(result.warnings).toContain('date_format_ambiguous');
  });

});