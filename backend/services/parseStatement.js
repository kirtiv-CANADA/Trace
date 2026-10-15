const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

/**
 * Detects bank format from CSV headers + sample date.
 * Both RBC and TD share the same headers, so we use the date format to distinguish.
 */
function detectBank(headers, sampleDate) {
  const h = headers.map((x) => String(x).toLowerCase().trim());

  if (
    h.includes('date') &&
    h.includes('description') &&
    h.includes('debit') &&
    h.includes('credit') &&
    h.includes('balance')
  ) {
    // RBC uses MM/DD/YYYY, TD uses YYYY-MM-DD
    if (sampleDate && /^\d{4}-\d{2}-\d{2}$/.test(String(sampleDate).trim())) {
      return 'TD';
    }
    if (sampleDate && /^\d{2}\/\d{2}\/\d{4}$/.test(String(sampleDate).trim())) {
      return 'RBC';
    }
    return 'RBC'; // default fallback
  }

  return 'UNKNOWN';
}

/**
 * Detects date format from a sample date string.
 */
function detectDateFormat(sample) {
  if (!sample) return null;
  const s = String(sample).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'YYYY-MM-DD';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return 'MM/DD/YYYY';
  return null;
}

/**
 * Parses a date string into a JS Date.
 */
function parseDate(str, format) {
  if (!str) return null;
  const s = String(str).trim();

  if (format === 'YYYY-MM-DD') {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (format === 'MM/DD/YYYY') {
    const [m, d, y] = s.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  return null;
}

/**
 * Parses a number, stripping commas, spaces, currency symbols.
 */
function parseAmount(str) {
  if (str === null || str === undefined || str === '') return 0;
  const cleaned = String(str).replace(/[,\s$]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Main parser: CSV file path → structured statement data.
 */
async function parseStatement(filePath) {
  const csvText = fs.readFileSync(filePath, 'utf8');

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows = parsed.data;
  const headers = parsed.meta.fields || [];

  // Handle empty CSV
  if (!rows || rows.length === 0) {
    throw new Error('CSV file is empty or has no data rows');
  }

  // Detect bank + date format from the first row
  const firstDate = rows[0]?.Date || rows[0]?.date || '';
  const bank = detectBank(headers, firstDate);
  const dateFormat = detectDateFormat(firstDate) || 'MM/DD/YYYY';

  // Normalize transactions
  const transactions = rows.map((row) => {
    const date = parseDate(row.Date || row.date, dateFormat);
    const description = (row.Description || row.description || '').trim();

    const debit = parseAmount(row.Debit || row.debit);
    const credit = parseAmount(row.Credit || row.credit);

    let amount = 0;
    let type = 'unknown';
    if (credit > 0) {
      amount = credit;
      type = 'credit';
    } else if (debit > 0) {
      amount = -debit;
      type = 'debit';
    }

    const balance = parseAmount(row.Balance || row.balance);

    return { date, description, amount, balance, type, raw: row };
  });

  // Compute statement period
  const dates = transactions
    .map((t) => t.date)
    .filter((d) => d instanceof Date && !isNaN(d))
    .sort((a, b) => a - b);

  const periodStart = dates[0] || null;
  const periodEnd = dates[dates.length - 1] || null;

  return {
    bank,
    dateFormat,
    filename: path.basename(filePath),
    periodStart,
    periodEnd,
    transactions,
    totalTransactions: transactions.length,
  };
}

module.exports = {
  parseStatement,
  detectBank,
  detectDateFormat,
  parseDate,
  parseAmount,
};