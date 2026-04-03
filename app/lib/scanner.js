/**
 * lib/scanner.js — Server-side PII detection engine
 *
 * Port of extension/src/logic.js for use in API routes.
 * Pure functions — no side effects, no DB calls.
 *
 * Exports:
 *   scan(text, rules?)       → { matches, detectedTypes, action, redacted }
 *   redact(text, matches)    → string with PII replaced by placeholders
 *   scanFile(buffer, mime)   → Promise<{ text, scan }>
 */

'use strict';

// ── Validators ──────────────────────────────────────────────────────────────

function ibanIsValid(ibanRaw) {
  if (!ibanRaw || typeof ibanRaw !== 'string') return false;
  const iban = ibanRaw.replace(/\s+/g, '').toUpperCase();
  if (iban.length < 15 || iban.length > 34) return false;
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let numericString = '';
  for (const char of rearranged) {
    numericString += char >= 'A' && char <= 'Z'
      ? (char.charCodeAt(0) - 55).toString()
      : char;
  }
  let remainder = 0;
  for (const digit of numericString) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }
  return remainder === 1;
}

function isValidCreditCard(cardNumber) {
  if (!cardNumber || typeof cardNumber !== 'string') return false;
  const digits = cardNumber.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

// ── National ID validators ────────────────────────────────────────────────────

/** Netherlands BSN — elfproef (11-proof) */
function bsnIsValid(raw) {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += parseInt(d[i], 10) * (9 - i);
  sum -= parseInt(d[8], 10);
  return sum > 0 && sum % 11 === 0;
}

/** Denmark CPR — basic date-part sanity check (modulo-11 deprecated post-2007) */
function cprIsValid(raw) {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 10) return false;
  const day = parseInt(d.slice(0, 2), 10);
  const mon = parseInt(d.slice(2, 4), 10);
  return day >= 1 && day <= 31 && mon >= 1 && mon <= 12;
}

/** Swedish personnummer — Luhn check on last 10 digits */
function personnummerIsValid(raw) {
  const d = raw.replace(/[^\d]/g, '');
  // accept 10 or 12 digit forms; validate last 10
  const digits = d.length === 12 ? d.slice(2) : d;
  if (digits.length !== 10) return false;
  // Luhn on first 9 digits; last digit is check
  const nums = digits.slice(0, 9).split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let v = nums[i] * (i % 2 === 0 ? 2 : 1);
    if (v > 9) v -= 9;
    sum += v;
  }
  return (10 - (sum % 10)) % 10 === parseInt(digits[9], 10);
}

/** Romania CNP — modulo-11 check */
function cnpIsValid(raw) {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 13) return false;
  const weights = [2,7,9,1,4,6,3,5,8,2,7,9];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(d[i], 10) * weights[i];
  const check = sum % 11 === 10 ? 1 : sum % 11;
  return check === parseInt(d[12], 10);
}

// ── National ID patterns (EU) ────────────────────────────────────────────────

const NATIONAL_ID_PATTERNS = [
  // Denmark — CPR: DDMMYY-NNNN
  { type: 'NATIONAL_ID', regex: /\b\d{6}-\d{4}\b/g, country: 'DK', validate: cprIsValid },
  // Sweden — personnummer: YYMMDD-NNNN or YYYYMMDD-NNNN
  { type: 'NATIONAL_ID', regex: /\b\d{6}[-+]\d{4}\b/g, country: 'SE', validate: personnummerIsValid },
  // Finland — HETU: DDMMYY[+\-A]NNNc
  { type: 'NATIONAL_ID', regex: /\b\d{6}[+\-A]\d{3}[0-9A-FHJK-NPR-Y]\b/g, country: 'FI' },
  // Norway — fødselsnummer: DDMMYYNNNKK (11 digits, date-separated context)
  { type: 'NATIONAL_ID', regex: /\b\d{2}[01]\d[0-9]\d{2}\d{5}\b/g, country: 'NO' },
  // Spain — DNI: 8 digits + 1 letter
  { type: 'NATIONAL_ID', regex: /\b\d{8}[A-HJ-NP-TV-Z]\b/g, country: 'ES' },
  // Netherlands — BSN: 9 digits (elfproef validated)
  { type: 'NATIONAL_ID', regex: /\b[1-9]\d{8}\b/g, country: 'NL', validate: bsnIsValid },
  // France — INSEE: 15 digits starting 1 or 2
  { type: 'NATIONAL_ID', regex: /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g, country: 'FR' },
  // Italy — Codice Fiscale: 6 letters + 2 digits + letter + 2 digits + letter + 3 digits + letter
  { type: 'NATIONAL_ID', regex: /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/g, country: 'IT' },
  // Poland — PESEL: 11 digits
  { type: 'NATIONAL_ID', regex: /\b\d{11}\b/g, country: 'PL' },
  // Romania — CNP: 13 digits (modulo-11 validated)
  { type: 'NATIONAL_ID', regex: /\b[1-9]\d{12}\b/g, country: 'RO', validate: cnpIsValid },
  // Portugal — NIF: 9 digits starting 1-3 or 5-9
  { type: 'NATIONAL_ID', regex: /\b[125689]\d{8}\b/g, country: 'PT' },
  // Belgium — NISS: NN.NN.NN-NNN.NN format
  { type: 'NATIONAL_ID', regex: /\b\d{2}[.\-]\d{2}[.\-]\d{2}[.\-]\d{3}[.\-]\d{2}\b/g, country: 'BE' },
  // Austria — Sozialversicherungsnummer: 4 serial + 6 DOB digits
  { type: 'NATIONAL_ID', regex: /\b\d{4}\s\d{6}\b/g, country: 'AT' },
  // Greece — AFM (tax number): 9 digits starting 1-9
  { type: 'NATIONAL_ID', regex: /\b[1-9]\d{8}\b/g, country: 'GR' },
];

// VAT number patterns (EU)
const VAT_PATTERNS = [
  /\b(AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|GB|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK)U?\d{2,12}\b/g,
];

// ── Core detection ──────────────────────────────────────────────────────────

function detectMatchesWithRanges(text, enabledTypes) {
  if (!text || typeof text !== 'string') return [];

  const enabled = enabledTypes || {
    EMAIL: true, PHONE: true, IBAN: true, CREDIT_CARD: true,
    ADDRESS: true, PASSWORD: true, NATIONAL_ID: true, VAT: true,
    IP_ADDRESS: true, DATE_OF_BIRTH: true,
  };

  const matches = [];

  // EMAIL
  if (enabled.EMAIL !== false) {
    const re = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      matches.push({ type: 'EMAIL', start: m.index, end: m.index + m[0].length, value: m[0] });
    }
  }

  // PHONE
  if (enabled.PHONE !== false) {
    const phonePatterns = [
      /\+\d{1,3}[\s.\-]?\(?\d{1,5}\)?[\s.\-]?\d{2,5}[\s.\-]?\d{2,5}[\s.\-]?\d{0,5}/g,
      /\(\d{2,5}\)\s*\d{3,5}[\s.\-]?\d{3,5}/g,
      /\b0\d{1,3}[\s.\-]?\d{3,5}[\s.\-]?\d{3,5}\b/g,
    ];
    for (const re of phonePatterns) {
      let m;
      while ((m = re.exec(text)) !== null) {
        const digits = m[0].replace(/\D/g, '');
        if (digits.length >= 8 && digits.length <= 15) {
          matches.push({ type: 'PHONE', start: m.index, end: m.index + m[0].length, value: m[0] });
        }
      }
    }
  }

  // IBAN
  if (enabled.IBAN !== false) {
    const re = /\b[A-Za-z]{2}[0-9]{2}(?:\s?[A-Za-z0-9]{4}){2,7}(?:\s?[A-Za-z0-9]{1,4})?\b/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (ibanIsValid(m[0])) {
        matches.push({ type: 'IBAN', start: m.index, end: m.index + m[0].length, value: m[0] });
      }
    }
  }

  // CREDIT_CARD
  if (enabled.CREDIT_CARD !== false) {
    const re = /\b(?:\d{4}[\s\-]?){3,4}\d{1,4}\b/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (isValidCreditCard(m[0])) {
        matches.push({ type: 'CREDIT_CARD', start: m.index, end: m.index + m[0].length, value: m[0] });
      }
    }
  }

  // ADDRESS
  if (enabled.ADDRESS !== false) {
    const addressPatterns = [
      /\b\d{1,5}\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl)\b/gi,
      /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi,   // UK postcode
      /\b[1-9]\d{3}\s+[A-Z\u00C6\u00D8\u00C5][a-z\u00E6\u00F8\u00E5]+/g, // Nordic
      /\b[0-9]{5}\s+[A-Z\u00C4\u00D6\u00DC][a-z\u00E4\u00F6\u00FC\u00DF]+/g, // German
      /\b\d{4}\s?[A-Z]{2}\b/g,                       // Dutch
    ];
    for (const re of addressPatterns) {
      let m;
      while ((m = re.exec(text)) !== null) {
        matches.push({ type: 'ADDRESS', start: m.index, end: m.index + m[0].length, value: m[0] });
      }
    }
  }

  // PASSWORD / CREDENTIALS
  if (enabled.PASSWORD !== false) {
    const credPatterns = [
      /\b(password|passwd|pwd)\s*[:=]\s*\S+/gi,
      /\b(api[_\-]?key|apikey)\s*[:=]\s*\S+/gi,
      /\b(secret|token|access_token|auth_token)\s*[:=]\s*\S+/gi,
      /\b(2fa|totp|otp|mfa)\s*[:=]?\s*\d{6,8}\b/gi,
      /\bsk[-_]live[-_][a-zA-Z0-9]{24,}\b/g,
      /\bsk[-_]test[-_][a-zA-Z0-9]{24,}\b/g,
      /\bAKIA[A-Z0-9]{16}\b/g,
      /\bghp_[a-zA-Z0-9]{36}\b/g,
      /\bgho_[a-zA-Z0-9]{36}\b/g,
      /\bghs_[a-zA-Z0-9]{36}\b/g,
      /\bglpat-[a-zA-Z0-9\-_]{20,}\b/g,
      /\bxoxb-[0-9]+-[a-zA-Z0-9-]+\b/g,
      /\bxoxp-[0-9]+-[a-zA-Z0-9-]+\b/g,
      /\bBearer\s+[a-zA-Z0-9._\-]{20,}\b/g,
    ];
    for (const re of credPatterns) {
      let m;
      while ((m = re.exec(text)) !== null) {
        matches.push({ type: 'PASSWORD', start: m.index, end: m.index + m[0].length, value: m[0] });
      }
    }
  }

  // NATIONAL_ID
  if (enabled.NATIONAL_ID !== false) {
    for (const { type, regex, validate } of NATIONAL_ID_PATTERNS) {
      let m;
      while ((m = regex.exec(text)) !== null) {
        if (!validate || validate(m[0])) {
          matches.push({ type, start: m.index, end: m.index + m[0].length, value: m[0] });
        }
      }
    }
  }

  // VAT numbers
  if (enabled.VAT !== false) {
    for (const re of VAT_PATTERNS) {
      let m;
      while ((m = re.exec(text)) !== null) {
        matches.push({ type: 'VAT', start: m.index, end: m.index + m[0].length, value: m[0] });
      }
    }
  }

  // IP_ADDRESS
  if (enabled.IP_ADDRESS !== false) {
    const re = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      // Exclude obvious non-PII like 127.0.0.1, 0.0.0.0, 255.255.255.255
      const v = m[0];
      if (v !== '127.0.0.1' && v !== '0.0.0.0' && v !== '255.255.255.255') {
        matches.push({ type: 'IP_ADDRESS', start: m.index, end: m.index + m[0].length, value: m[0] });
      }
    }
  }

  // DATE_OF_BIRTH (only when contextually flagged)
  if (enabled.DATE_OF_BIRTH !== false) {
    const dobPatterns = [
      /\b(dob|date of birth|born on|born:?|birthday)\s*[:=]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/gi,
    ];
    for (const re of dobPatterns) {
      let m;
      while ((m = re.exec(text)) !== null) {
        matches.push({ type: 'DATE_OF_BIRTH', start: m.index, end: m.index + m[0].length, value: m[0] });
      }
    }
  }

  // Sort and deduplicate overlapping matches
  matches.sort((a, b) => a.start - b.start);
  const filtered = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) { filtered.push(m); lastEnd = m.end; }
  }

  return filtered;
}

// ── Placeholders ─────────────────────────────────────────────────────────────

const PLACEHOLDERS = {
  EMAIL:        '[EMAIL]',
  PHONE:        '[PHONE]',
  IBAN:         '[IBAN]',
  CREDIT_CARD:  '[CARD]',
  ADDRESS:      '[ADDRESS]',
  PASSWORD:     '[SECRET]',
  NATIONAL_ID:  '[NATIONAL_ID]',
  VAT:          '[VAT]',
  IP_ADDRESS:   '[IP_ADDRESS]',
  DATE_OF_BIRTH:'[DOB]',
  CUSTOM_TERM:  '[REDACTED]',
};

// ── Redaction ────────────────────────────────────────────────────────────────

function redact(text, matches) {
  if (!matches || matches.length === 0) return text;
  const sorted = [...matches].sort((a, b) => b.start - a.start);
  let result = text;
  for (const m of sorted) {
    const placeholder = PLACEHOLDERS[m.type] || '[REDACTED]';
    result = result.slice(0, m.start) + placeholder + result.slice(m.end);
  }
  return result;
}

// ── Custom terms ─────────────────────────────────────────────────────────────

function detectCustomTerms(text, terms) {
  if (!terms || !Array.isArray(terms) || terms.length === 0) return [];
  const matches = [];
  const lower = text.toLowerCase();
  for (const term of terms) {
    if (!term) continue;
    const lt = term.toLowerCase();
    let idx = 0;
    while ((idx = lower.indexOf(lt, idx)) !== -1) {
      matches.push({ type: 'CUSTOM_TERM', start: idx, end: idx + term.length, value: text.slice(idx, idx + term.length) });
      idx += term.length;
    }
  }
  return matches;
}

// ── Action determination ─────────────────────────────────────────────────────

const DEFAULT_RULES = {
  EMAIL: 'WARN', PHONE: 'WARN', IBAN: 'BLOCK', CREDIT_CARD: 'BLOCK',
  ADDRESS: 'WARN', PASSWORD: 'BLOCK', NATIONAL_ID: 'BLOCK', VAT: 'WARN',
  IP_ADDRESS: 'WARN', DATE_OF_BIRTH: 'WARN', CUSTOM_TERM: 'WARN',
};

function determineAction(detectedTypes, rules) {
  const r = rules || DEFAULT_RULES;
  let hasBlock = false;
  let hasWarn = false;
  for (const t of detectedTypes) {
    const a = r[t];
    if (a === 'BLOCK') hasBlock = true;
    else if (a === 'WARN') hasWarn = true;
  }
  if (hasBlock) return 'BLOCK';
  if (hasWarn) return 'WARN';
  return 'ALLOW';
}

// ── Main scan function ────────────────────────────────────────────────────────

/**
 * Scan text for PII.
 * @param {string} text
 * @param {Object} options
 *   rules       — map of type → 'ALLOW'|'WARN'|'BLOCK'
 *   customTerms — array of strings to flag
 *   enabledTypes — which types to detect (default: all)
 * @returns {{ matches, detectedTypes, action, redacted, clean }}
 */
function scan(text, options) {
  if (!text || typeof text !== 'string') {
    return { matches: [], detectedTypes: [], action: 'ALLOW', redacted: text || '', clean: true };
  }

  const opts = options || {};
  const builtIn = detectMatchesWithRanges(text, opts.enabledTypes);
  const custom  = detectCustomTerms(text, opts.customTerms || []);
  const matches = [...builtIn, ...custom].sort((a, b) => a.start - b.start);

  const detectedTypes = [...new Set(matches.map((m) => m.type))];
  const action = determineAction(detectedTypes, opts.rules);
  const redacted = redact(text, matches);

  return {
    matches: matches.map((m) => ({
      type:        m.type,
      start:       m.start,
      end:         m.end,
      redactedAs:  PLACEHOLDERS[m.type] || '[REDACTED]',
    })),
    detectedTypes,
    action,
    redacted,
    clean: matches.length === 0,
  };
}

// ── File text extraction ─────────────────────────────────────────────────────

/**
 * Extract plain text from a buffer given its MIME type.
 * Supports: text/plain, text/csv, application/json, text/html
 * PDF and DOCX require optional deps — gracefully degrades.
 */
async function extractText(buffer, mimeType) {
  const mime = (mimeType || 'text/plain').toLowerCase();

  // Plain text, CSV, JSON
  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/csv'
  ) {
    return buffer.toString('utf-8');
  }

  // PDF — requires pdf-parse (optional)
  if (mime === 'application/pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch {
      return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    }
  }

  // DOCX — requires mammoth (optional)
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch {
      return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    }
  }

  // XLSX — requires xlsx (optional)
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    try {
      const XLSX = require('xlsx');
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const texts = wb.SheetNames.map((name) => {
        const ws = wb.Sheets[name];
        return XLSX.utils.sheet_to_csv(ws);
      });
      return texts.join('\n');
    } catch {
      return '';
    }
  }

  // Fallback: try UTF-8
  return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
}

/**
 * Scan a file buffer.
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {Object} options — same as scan()
 * @returns {Promise<{ text, scan: ScanResult, charCount, pageEstimate }>}
 */
async function scanFile(buffer, mimeType, options) {
  const text = await extractText(buffer, mimeType);
  const result = scan(text, options);
  return {
    text: null, // never return content — privacy by design
    charCount: text.length,
    pageEstimate: Math.ceil(text.length / 2000),
    scan: result,
  };
}

module.exports = { scan, redact, scanFile, detectMatchesWithRanges, detectCustomTerms, DEFAULT_RULES, PLACEHOLDERS };
