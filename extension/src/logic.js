// src/logic.js - Pure functions for detection logic
// Store MVP: Local-only detection, no backend required

/**
 * Validates an IBAN using the mod-97 algorithm (ISO 7064).
 * @param {string} ibanRaw - The IBAN string to validate (may contain spaces)
 * @returns {boolean} - True if valid IBAN, false otherwise
 */
function ibanIsValid(ibanRaw) {
  if (!ibanRaw || typeof ibanRaw !== 'string') {
    return false;
  }

  // Remove spaces and convert to uppercase
  const iban = ibanRaw.replace(/\s+/g, '').toUpperCase();

  // IBAN must be at least 15 characters (shortest: Norway NO)
  if (iban.length < 15 || iban.length > 34) {
    return false;
  }

  // Check basic format: 2 letters + 2 digits + alphanumeric
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
    return false;
  }

  // Rearrange: move first 4 chars to end
  const rearranged = iban.slice(4) + iban.slice(0, 4);

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (const char of rearranged) {
    if (char >= 'A' && char <= 'Z') {
      numericString += (char.charCodeAt(0) - 55).toString();
    } else {
      numericString += char;
    }
  }

  // Mod-97 check (handle large numbers by processing in chunks)
  let remainder = 0;
  for (const digit of numericString) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }

  return remainder === 1;
}

/**
 * Validates a credit card number using Luhn algorithm.
 * @param {string} cardNumber - The card number (may contain spaces/dashes)
 * @returns {boolean} - True if valid card number
 */
function isValidCreditCard(cardNumber) {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return false;
  }

  // Remove spaces and dashes
  const digits = cardNumber.replace(/[\s-]/g, '');

  // Must be 13-19 digits
  if (!/^\d{13,19}$/.test(digits)) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Detects regulated identifiers in text.
 * @param {string} text - The text to scan
 * @param {Object} enabledTypes - Which types to detect (default: all)
 * @returns {string[]} - Array of unique detected types
 */
function detectMatches(text, enabledTypes) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Default: detect all types
  const enabled = enabledTypes || {
    EMAIL: true,
    PHONE: true,
    IBAN: true,
    CREDIT_CARD: true,
    ADDRESS: true,
    PASSWORD: true
  };

  const hits = new Set();

  // EMAIL: pragmatic regex
  if (enabled.EMAIL !== false) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    if (emailRegex.test(text)) {
      hits.add('EMAIL');
    }
  }

  // PHONE: candidate extraction + normalization
  if (enabled.PHONE !== false) {
    const phoneCandidateRegex = /(\+?\d[\d\s().-]{6,}\d)/g;
    const phoneCandidates = text.match(phoneCandidateRegex) || [];
    for (const candidate of phoneCandidates) {
      const digits = candidate.replace(/\D/g, '');
      if (digits.length >= 8 && digits.length <= 15) {
        hits.add('PHONE');
        break;
      }
    }
  }

  // IBAN: candidate regex + mod-97 validation
  if (enabled.IBAN !== false) {
    const ibanCandidateRegex = /\b[A-Za-z]{2}[0-9]{2}(?:\s?[A-Za-z0-9]{4}){2,7}(?:\s?[A-Za-z0-9]{1,4})?\b/g;
    const ibanMatches = text.match(ibanCandidateRegex) || [];
    for (const candidate of ibanMatches) {
      if (ibanIsValid(candidate)) {
        hits.add('IBAN');
        break;
      }
    }
  }

  // CREDIT_CARD: 13-19 digit sequences with Luhn validation
  if (enabled.CREDIT_CARD !== false) {
    // Match card-like patterns (with optional spaces/dashes)
    const cardRegex = /\b(?:\d{4}[\s-]?){3,4}\d{1,4}\b/g;
    const cardMatches = text.match(cardRegex) || [];
    for (const candidate of cardMatches) {
      if (isValidCreditCard(candidate)) {
        hits.add('CREDIT_CARD');
        break;
      }
    }
  }

  // ADDRESS: Basic heuristic for US/UK style addresses
  if (enabled.ADDRESS !== false) {
    // Look for street number + street name + common suffixes
    const addressPatterns = [
      /\b\d{1,5}\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl)\b/i,
      // ZIP codes (US 5-digit or 5+4)
      /\b\d{5}(?:-\d{4})?\b/,
      // UK postcodes
      /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i
    ];

    for (const pattern of addressPatterns) {
      if (pattern.test(text)) {
        hits.add('ADDRESS');
        break;
      }
    }
  }

  // PASSWORD: Keywords that suggest credentials/secrets
  if (enabled.PASSWORD !== false) {
    const passwordKeywords = [
      /\b(password|passwd|pwd)\s*[:=]\s*\S+/i,
      /\b(api[_-]?key|apikey)\s*[:=]\s*\S+/i,
      /\b(secret|token)\s*[:=]\s*\S+/i,
      /\b(2fa|totp|otp)\s*[:=]?\s*\d{6}\b/i,
      /\bsk[-_]live[-_][a-zA-Z0-9]+\b/,  // Stripe-style keys
      /\b[a-zA-Z0-9]{32,}\b/  // Long alphanumeric strings (API keys)
    ];

    for (const pattern of passwordKeywords) {
      if (pattern.test(text)) {
        hits.add('PASSWORD');
        break;
      }
    }
  }

  return Array.from(hits);
}

/**
 * Checks if a hostname is in the list of AI domains.
 * @param {string} hostname - The hostname to check
 * @param {string[]} aiDomains - List of allowed AI domain hostnames
 * @returns {boolean} - True if hostname exactly matches an AI domain
 */
function isAiDomain(hostname, aiDomains) {
  if (!hostname || !Array.isArray(aiDomains)) {
    return false;
  }
  return aiDomains.includes(hostname);
}

/**
 * Checks if detected hits trigger any rule.
 * @param {string[]} hits - Array of detected types (e.g., ["EMAIL", "IBAN"])
 * @param {Object[]} rules - Array of rule objects with triggers array
 * @returns {Object|null} - First matching rule or null
 */
function ruleTriggers(hits, rules) {
  if (!Array.isArray(hits) || hits.length === 0 || !Array.isArray(rules)) {
    return null;
  }

  for (const rule of rules) {
    if (!rule.triggers || !Array.isArray(rule.triggers)) {
      continue;
    }
    const hasMatch = hits.some(hit => rule.triggers.includes(hit));
    if (hasMatch) {
      return rule;
    }
  }

  return null;
}

/**
 * Returns human-readable name for a detection type.
 * @param {string} type - The detection type
 * @returns {string} - Human-readable name
 */
function getTypeName(type) {
  const names = {
    EMAIL: 'Email Address',
    PHONE: 'Phone Number',
    IBAN: 'Bank Account (IBAN)',
    CREDIT_CARD: 'Credit Card Number',
    ADDRESS: 'Physical Address',
    PASSWORD: 'Password/API Key/Secret'
  };
  return names[type] || type;
}

/**
 * Returns explanation for why a type was detected.
 * @param {string} type - The detection type
 * @returns {string} - Explanation
 */
function getTypeExplanation(type) {
  const explanations = {
    EMAIL: 'Remove or redact the email address before pasting.',
    PHONE: 'Remove or redact the phone number before pasting.',
    IBAN: 'Remove or redact the bank account number before pasting.',
    CREDIT_CARD: 'Never share credit card numbers with AI assistants.',
    ADDRESS: 'Consider removing or generalizing the address.',
    PASSWORD: 'Never share passwords, API keys, or secrets with AI assistants.'
  };
  return explanations[type] || 'Remove sensitive information before pasting.';
}

// Export for Node.js testing and browser content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ibanIsValid,
    isValidCreditCard,
    detectMatches,
    isAiDomain,
    ruleTriggers,
    getTypeName,
    getTypeExplanation
  };
}
