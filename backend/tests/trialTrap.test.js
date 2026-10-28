// Trace — Copyright (c) 2026 <YOUR NAME>. Licensed under the GNU AGPL-3.0. See LICENSE and NOTICE.
const { merchantKey, analyzeMerchant, analyzeStatement } = require('../services/trialTrap');

const ch = (date, amount) => ({ date, amount });

// Same pattern as the fixture (28-day cycle, March charge missing)
const resumePattern = [
  ch('2025-01-02', 1.95),
  ch('2025-01-23', 34.85),
  ch('2025-02-20', 34.85),
  ch('2025-04-17', 34.85),
  ch('2025-05-15', 34.85),
  ch('2025-06-12', 34.85),
  ch('2025-07-10', 34.85),
];

const types = (flags) => flags.map((f) => f.type);

describe('merchantKey', () => {
  test('strips phone numbers, domains and noise words', () => {
    expect(merchantKey('EXAMPLE RESUME CO 8005550100')).toBe('EXAMPLE RESUME CO');
    expect(merchantKey('STREAMBOX.COM 800-555-0111 ON')).toBe('STREAMBOX');
  });
});

describe('analyzeMerchant', () => {
  test('resume-style pattern: jump + 4-week billing + missing charge', () => {
    const flags = analyzeMerchant(resumePattern);
    expect(types(flags)).toEqual(
      expect.arrayContaining(['PRICE_JUMP', 'FOUR_WEEK_BILLING', 'POSSIBLE_MISSING_CHARGE'])
    );

    const jump = flags.find((f) => f.type === 'PRICE_JUMP');
    expect(jump.ratio).toBeCloseTo(17.9, 1);

    const four = flags.find((f) => f.type === 'FOUR_WEEK_BILLING');
    expect(four.chargesPerYear).toBe(13);

    const missing = flags.find((f) => f.type === 'POSSIBLE_MISSING_CHARGE');
    expect(missing.expectedDate).toBe('2025-03-20');
    expect(missing.missingCount).toBe(1);
  });

  test('21 days between trial and big charge is not TRIAL_TO_BIG_CHARGE', () => {
    expect(types(analyzeMerchant(resumePattern))).not.toContain('TRIAL_TO_BIG_CHARGE');
  });

  test('charge after cancel request is flagged', () => {
    const flags = analyzeMerchant(resumePattern, { cancelRequestDate: '2025-06-28' });
    const f = flags.find((x) => x.type === 'CHARGED_AFTER_CANCEL_REQUEST');
    expect(f).toBeDefined();
    expect(f.count).toBe(1);
    expect(f.amount).toBe(34.85);
  });

  test('no cancel flag without a cancel date', () => {
    expect(types(analyzeMerchant(resumePattern))).not.toContain('CHARGED_AFTER_CANCEL_REQUEST');
  });

  test('trial then annual charge 6 days later', () => {
    const flags = analyzeMerchant([ch('2025-10-19', 3.28), ch('2025-10-25', 108.47)]);
    expect(types(flags)).toEqual(expect.arrayContaining(['PRICE_JUMP', 'TRIAL_TO_BIG_CHARGE']));
    expect(flags.find((f) => f.type === 'TRIAL_TO_BIG_CHARGE').days).toBe(6);
  });

  test('normal 30-day subscription is NOT flagged', () => {
    const normal = ['2025-01-05', '2025-02-04', '2025-03-06', '2025-04-05', '2025-05-05'].map((d) => ch(d, 22.99));
    expect(analyzeMerchant(normal)).toEqual([]);
  });

  test('single charge returns no flags', () => {
    expect(analyzeMerchant([ch('2025-01-01', 10)])).toEqual([]);
  });
});

describe('analyzeStatement', () => {
  const tx = (date, description, amount, type = 'debit') => ({ date: new Date(date), description, amount, type });

  test('groups by merchant, ignores credits, only returns flagged merchants', () => {
    const transactions = [
      tx('2025-10-19', 'EXAMPLE VIDEO AI SG', 3.28),
      tx('2025-10-25', 'EXAMPLE VIDEO AI SG', 108.47),
      tx('2025-10-01', 'PAYROLL DEPOSIT', 2500, 'credit'),
      tx('2025-10-02', 'FRESH MART GROCERY', 80),
    ];
    const r = analyzeStatement(transactions);
    expect(r.trapsFound).toBe(1);
    expect(r.merchants[0].merchant).toBe('EXAMPLE VIDEO AI');
    expect(r.merchants[0].totalCharged).toBe(111.75);
  });

  test('cancelMerchant applies cancel date only to that merchant', () => {
    const transactions = resumePattern.map((c) => tx(c.date, 'EXAMPLE RESUME CO 800', c.amount));
    const r = analyzeStatement(transactions, { cancelMerchant: 'resume', cancelRequestDate: '2025-06-28' });
    expect(types(r.merchants[0].flags)).toContain('CHARGED_AFTER_CANCEL_REQUEST');
  });
});
