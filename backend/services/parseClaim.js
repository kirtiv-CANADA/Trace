// backend/services/parseClaim.js
// Parses unstructured client claim text into structured data using LLMs.
//
// Strategy: Groq first (fast, reliable), Gemini fallback.
// Principle: "AI proposes. Code verifies."
// AI extracts fields — it never decides whether money moved.

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ---------- Gemini client (lazy) ----------
let geminiClient = null;
function getGeminiClient() {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    geminiClient = new GoogleGenerativeAI(key);
  }
  return geminiClient;
}

// ---------- The extraction prompt (shared by both providers) ----------
function buildPrompt(claimText) {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = today.slice(0, 4);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  return `You are a financial claim parser. Today's date is ${today}.

Extract structured data from a client's claim about a payment.

CLAIM TEXT:
"""
${claimText}
"""

Return ONLY valid JSON (no markdown, no explanation) in this exact shape:
{
  "clientName": string or null,
  "amount": number or null,
  "currency": "CAD" | "USD" | "INR" | "EUR" | "GBP" or null,
  "paidDate": "YYYY-MM-DD" or null,
  "reference": string or null,
  "paymentMethod": string or null,
  "claimsPaid": true | false | null,
  "confidence": number between 0 and 1,
  "warnings": string[]
}

Rules for claimsPaid (CRITICAL):
- If the sender says they HAVE paid / sent / transferred / deposited → claimsPaid = true
- If the sender says "haven't paid", "didn't pay", "will pay", "will send", "not yet", "tomorrow", "next week" → claimsPaid = false
- If unclear or the text doesn't discuss payment status → claimsPaid = null
- NEVER set claimsPaid = true when the text contains a negation about payment.

Rules for currency (IMPORTANT):
- ₹ or "Rs" or "INR" → INR
- $ → CAD (default for this app; USD only if "USD" or "US$" is explicit)
- € → EUR
- £ → GBP
- If no currency symbol or code is present → null
- Do NOT default to CAD unless a $ sign is present.

Rules for paidDate:
- If a year is not mentioned, assume ${currentYear}.
- "September 3rd" or "3 Sept" → "${currentYear}-09-03".
- "yesterday" → ${yesterday}
- "today" → ${today}
- "last week" → ${lastWeek}
- If the parsed date would be in the future but the claim describes a past event, use the previous year.
- If the date is in ambiguous format like 05/09/2026 (both DD and MM ≤ 12), interpret as DD/MM/YYYY and add warning "date_format_ambiguous".
- If only month/year mentioned, use the 1st of that month.

Other rules:
- clientName: who sent the money (company or person name).
- reference: invoice number or reference code (e.g. "INV-1001", "ABC123").
- paymentMethod: "e-transfer", "wire", "cheque", "credit card", etc. if mentioned.
- confidence: 0.9+ explicit, 0.5 vague, 0.2 unclear.
- warnings: array of strings. Use tags like "date_format_ambiguous", "currency_inferred", "relative_date_used", "amount_missing".
- Do NOT invent data. Only extract what is stated.

Return ONLY the JSON object.`;
}

// ---------- Groq (OpenAI-compatible API) ----------
const GROQ_MODEL = 'openai/gpt-oss-120b';

async function parseWithGroq(claimText) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: buildPrompt(claimText) }],
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq HTTP ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned empty content');

  return { rawText: content, provider: 'groq', model: GROQ_MODEL };
}

// ---------- Gemini ----------
async function parseWithGemini(claimText) {
  const client = getGeminiClient();
  const MODELS = [
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite',
  ];

  let lastError = null;
  for (const modelName of MODELS) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent(buildPrompt(claimText));
      const rawText = result.response.text();
      return { rawText, provider: 'gemini', model: modelName };
    } catch (err) {
      lastError = err;
      console.warn(`[parseClaim] Gemini ${modelName} failed: ${err.message.slice(0, 100)}`);
    }
  }
  throw new Error(`All Gemini models failed: ${lastError?.message || 'unknown'}`);
}

// ---------- Main parser (tries Groq → Gemini) ----------
async function parseClaim(claimText) {
  if (!claimText || typeof claimText !== 'string' || claimText.trim().length < 3) {
    throw new Error('Claim text is too short or empty');
  }

  let result = null;
  let errors = [];

  // 1. Groq first
  try {
    result = await parseWithGroq(claimText);
    console.log(`[parseClaim] Used Groq (${result.model})`);
  } catch (err) {
    console.warn(`[parseClaim] Groq failed: ${err.message.slice(0, 120)}`);
    errors.push(`groq: ${err.message.slice(0, 80)}`);
  }

  // 2. Gemini fallback
  if (!result) {
    try {
      result = await parseWithGemini(claimText);
      console.log(`[parseClaim] Used Gemini (${result.model})`);
    } catch (err) {
      console.warn(`[parseClaim] Gemini failed: ${err.message.slice(0, 120)}`);
      errors.push(`gemini: ${err.message.slice(0, 80)}`);
    }
  }

  if (!result) {
    throw new Error(`All LLM providers failed → ${errors.join(' | ')}`);
  }

  // ---------- Parse JSON ----------
  let parsed;
  try {
    parsed = JSON.parse(result.rawText);
  } catch (err) {
    const match = result.rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('AI did not return valid JSON: ' + result.rawText.slice(0, 200));
    }
    parsed = JSON.parse(match[0]);
  }

  // ---------- Normalize ----------
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.slice() : [];
  if (parsed.amount == null) warnings.push('amount_missing');
  if (!parsed.clientName && !parsed.payer) warnings.push('clientName_missing');

  return {
    clientName: parsed.clientName || parsed.payer || null,
    amount: typeof parsed.amount === 'number' ? parsed.amount : null,
    currency: parsed.currency || null,
    paidDate: parsed.paidDate || parsed.date || null,
    reference: parsed.reference || null,
    paymentMethod: parsed.paymentMethod || null,
    claimsPaid: parsed.claimsPaid === true ? true : parsed.claimsPaid === false ? false : null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    warnings: [...new Set(warnings)],
    raw: {
      claimText,
      provider: result.provider,
      model: result.model,
      aiRawResponse: result.rawText.slice(0, 500),
    },
  };
}

module.exports = { parseClaim };