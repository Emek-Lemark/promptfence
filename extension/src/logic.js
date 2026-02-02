// src/logic.js - Pure functions for detection logic

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
 * Detects regulated identifiers in text.
 * @param {string} text - The text to scan
 * @returns {string[]} - Array of unique detected types: "EMAIL", "PHONE", "IBAN"
 */
function detectMatches(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const hits = new Set();

  // EMAIL: pragmatic regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(text)) {
    hits.add('EMAIL');
  }

  // PHONE: candidate extraction + normalization
  // Extract candidates that start/end with digit, contain digits and separators
  const phoneCandidateRegex = /(\+?\d[\d\s().-]{6,}\d)/g;
  const phoneCandidates = text.match(phoneCandidateRegex) || [];
  for (const candidate of phoneCandidates) {
    // Normalize: strip non-digits
    const digits = candidate.replace(/\D/g, '');
    // Valid phone: 8-15 digits
    if (digits.length >= 8 && digits.length <= 15) {
      hits.add('PHONE');
      break;
    }
  }

  // IBAN: candidate regex + mod-97 validation
  // Match 2 letters + 2 digits + 11-30 alphanumeric (with optional spaces)
  const ibanCandidateRegex = /\b[A-Za-z]{2}[0-9]{2}(?:\s?[A-Za-z0-9]{4}){2,7}(?:\s?[A-Za-z0-9]{1,4})?\b/g;
  const ibanMatches = text.match(ibanCandidateRegex) || [];
  for (const candidate of ibanMatches) {
    if (ibanIsValid(candidate)) {
      hits.add('IBAN');
      break;
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
    // Check if any hit matches any trigger in this rule
    const hasMatch = hits.some(hit => rule.triggers.includes(hit));
    if (hasMatch) {
      return rule;
    }
  }

  return null;
}

// Export for Node.js testing and browser content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ibanIsValid,
    detectMatches,
    isAiDomain,
    ruleTriggers
  };
}
