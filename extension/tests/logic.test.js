// tests/logic.test.js - Unit tests for src/logic.js
// Using node:test (Node.js built-in test runner)

const { describe, it } = require('node:test');
const assert = require('node:assert');

// Import functions to test (will fail until implemented)
const {
  ibanIsValid,
  isValidCreditCard,
  detectMatches,
  detectMatchesWithRanges,
  isAiDomain,
  ruleTriggers,
  getTypeName,
  getTypeExplanation
} = require('../src/logic.js');

// =============================================================================
// ibanIsValid - IBAN mod-97 validation
// =============================================================================
describe('ibanIsValid', () => {
  it('returns true for valid German IBAN', () => {
    // DE89 3704 0044 0532 0130 00 is a known valid test IBAN
    assert.strictEqual(ibanIsValid('DE89370400440532013000'), true);
  });

  it('returns true for valid IBAN with spaces', () => {
    assert.strictEqual(ibanIsValid('DE89 3704 0044 0532 0130 00'), true);
  });

  it('returns true for valid IBAN with lowercase', () => {
    assert.strictEqual(ibanIsValid('de89370400440532013000'), true);
  });

  it('returns false for invalid checksum', () => {
    // Changed last digit to make checksum invalid
    assert.strictEqual(ibanIsValid('DE89370400440532013001'), false);
  });

  it('returns false for too short string', () => {
    assert.strictEqual(ibanIsValid('DE89'), false);
  });

  it('returns false for empty string', () => {
    assert.strictEqual(ibanIsValid(''), false);
  });

  it('returns true for valid UK IBAN', () => {
    // GB82 WEST 1234 5698 7654 32
    assert.strictEqual(ibanIsValid('GB82WEST12345698765432'), true);
  });

  it('returns true for valid French IBAN', () => {
    // FR76 3000 6000 0112 3456 7890 189
    assert.strictEqual(ibanIsValid('FR7630006000011234567890189'), true);
  });
});

// =============================================================================
// detectMatches - Detect EMAIL, PHONE, IBAN in text
// =============================================================================
describe('detectMatches', () => {
  describe('EMAIL detection', () => {
    it('detects simple email', () => {
      const hits = detectMatches('contact me at john@example.com please');
      assert.ok(hits.includes('EMAIL'));
    });

    it('detects email with subdomain', () => {
      const hits = detectMatches('email: user@mail.example.co.uk');
      assert.ok(hits.includes('EMAIL'));
    });

    it('does not detect invalid email without @', () => {
      const hits = detectMatches('this is not an email');
      assert.ok(!hits.includes('EMAIL'));
    });
  });

  describe('PHONE detection', () => {
    it('detects US phone format with area code in parens', () => {
      const hits = detectMatches('call me at (555) 123-4567');
      assert.ok(hits.includes('PHONE'));
    });

    it('detects international phone with +', () => {
      const hits = detectMatches('my number is +1-555-123-4567');
      assert.ok(hits.includes('PHONE'));
    });

    it('does not detect short numbers', () => {
      const hits = detectMatches('the code is 1234');
      assert.ok(!hits.includes('PHONE'));
    });

    it('detects Danish phone with spaces', () => {
      const hits = detectMatches('Number: +45 12 34 56 78');
      assert.ok(hits.includes('PHONE'));
    });

    it('detects spaced phone in mixed text', () => {
      const hits = detectMatches('Call me at +45 12 34 56 78, thanks');
      assert.ok(hits.includes('PHONE'));
    });

    it('detects compact international phone', () => {
      const hits = detectMatches('+4512345678');
      assert.ok(hits.includes('PHONE'));
    });

    it('does not detect short reference number', () => {
      const hits = detectMatches('Ref +1234');
      assert.ok(!hits.includes('PHONE'));
    });

    it('does not detect bare digit sequences like order numbers', () => {
      const hits = detectMatches('Order number: 12345678');
      assert.ok(!hits.includes('PHONE'));
    });

    it('does not detect invoice IDs', () => {
      const hits = detectMatches('Invoice ID: 20230915001');
      assert.ok(!hits.includes('PHONE'));
    });

    it('detects local phone with leading 0', () => {
      const hits = detectMatches('ring 020 7946 0958');
      assert.ok(hits.includes('PHONE'));
    });

    it('detects German phone with + prefix', () => {
      const hits = detectMatches('call +49 30 123456');
      assert.ok(hits.includes('PHONE'));
    });
  });

  describe('PASSWORD detection', () => {
    it('detects password= prefix pattern', () => {
      const hits = detectMatches('config: password=SuperSecret123!');
      assert.ok(hits.includes('PASSWORD'));
    });

    it('detects api_key= prefix pattern', () => {
      const hits = detectMatches('api_key=sk_live_abcdef1234567890');
      assert.ok(hits.includes('PASSWORD'));
    });

    it('detects AWS access key', () => {
      const hits = detectMatches('key is AKIAIOSFODNN7EXAMPLE');
      assert.ok(hits.includes('PASSWORD'));
    });

    it('detects GitHub personal access token', () => {
      const hits = detectMatches('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij');
      assert.ok(hits.includes('PASSWORD'));
    });

    it('detects Slack bot token', () => {
      const hits = detectMatches('token: xoxb-123456789012-abcdef');
      assert.ok(hits.includes('PASSWORD'));
    });

    it('detects Bearer token', () => {
      const hits = detectMatches('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc');
      assert.ok(hits.includes('PASSWORD'));
    });

    it('does not detect UUIDs as passwords', () => {
      const hits = detectMatches('id: 550e8400e29b41d4a716446655440000');
      assert.ok(!hits.includes('PASSWORD'));
    });

    it('does not detect random hashes as passwords', () => {
      const hits = detectMatches('sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      assert.ok(!hits.includes('PASSWORD'));
    });

    it('detects GitLab personal access token', () => {
      const hits = detectMatches('glpat-abcdefghijklmnopqrstu');
      assert.ok(hits.includes('PASSWORD'));
    });
  });

  describe('ADDRESS detection', () => {
    it('detects US ZIP code', () => {
      const hits = detectMatches('address: 123 Main St, Springfield 62704');
      assert.ok(hits.includes('ADDRESS'));
    });

    it('detects UK postcode', () => {
      const hits = detectMatches('office at SW1A 1AA London');
      assert.ok(hits.includes('ADDRESS'));
    });

    it('detects Danish address', () => {
      const hits = detectMatches('bor i 2200 København');
      assert.ok(hits.includes('ADDRESS'));
    });

    it('detects German address', () => {
      const hits = detectMatches('Adresse: 10115 Berlin');
      assert.ok(hits.includes('ADDRESS'));
    });

    it('detects Dutch postcode', () => {
      const hits = detectMatches('postcode 1011 AB Amsterdam');
      assert.ok(hits.includes('ADDRESS'));
    });

    it('detects Swedish postcode', () => {
      const hits = detectMatches('postnummer 111 22 Stockholm');
      assert.ok(hits.includes('ADDRESS'));
    });

    it('detects Norwegian address', () => {
      const hits = detectMatches('adresse: 0150 Oslo');
      assert.ok(hits.includes('ADDRESS'));
    });
  });

  describe('IBAN detection', () => {
    it('detects valid IBAN', () => {
      const hits = detectMatches('transfer to DE89370400440532013000');
      assert.ok(hits.includes('IBAN'));
    });

    it('detects valid IBAN with spaces', () => {
      const hits = detectMatches('IBAN: DE89 3704 0044 0532 0130 00');
      assert.ok(hits.includes('IBAN'));
    });

    it('does not detect invalid IBAN (bad checksum)', () => {
      const hits = detectMatches('fake IBAN: DE00370400440532013000');
      assert.ok(!hits.includes('IBAN'));
    });
  });

  describe('multiple detections', () => {
    it('detects multiple types in same text', () => {
      const text = 'Email john@test.com, call +1-555-123-4567, pay to DE89370400440532013000';
      const hits = detectMatches(text);
      assert.ok(hits.includes('EMAIL'));
      assert.ok(hits.includes('PHONE'));
      assert.ok(hits.includes('IBAN'));
    });

    it('returns empty array for clean text', () => {
      const hits = detectMatches('Hello, how are you today?');
      assert.deepStrictEqual(hits, []);
    });

    it('returns unique types only', () => {
      const hits = detectMatches('a@b.com and c@d.com');
      const emailCount = hits.filter(h => h === 'EMAIL').length;
      assert.strictEqual(emailCount, 1);
    });
  });
});

// =============================================================================
// isAiDomain - Check if hostname is in allowed AI domains
// =============================================================================
describe('isAiDomain', () => {
  const aiDomains = [
    'chat.openai.com',
    'chatgpt.com',
    'claude.ai',
    'gemini.google.com'
  ];

  it('returns true for chat.openai.com', () => {
    assert.strictEqual(isAiDomain('chat.openai.com', aiDomains), true);
  });

  it('returns true for chatgpt.com', () => {
    assert.strictEqual(isAiDomain('chatgpt.com', aiDomains), true);
  });

  it('returns true for claude.ai', () => {
    assert.strictEqual(isAiDomain('claude.ai', aiDomains), true);
  });

  it('returns true for gemini.google.com', () => {
    assert.strictEqual(isAiDomain('gemini.google.com', aiDomains), true);
  });

  it('returns false for google.com', () => {
    assert.strictEqual(isAiDomain('google.com', aiDomains), false);
  });

  it('returns false for subdomain of allowed domain', () => {
    assert.strictEqual(isAiDomain('sub.claude.ai', aiDomains), false);
  });

  it('returns false for empty hostname', () => {
    assert.strictEqual(isAiDomain('', aiDomains), false);
  });
});

// =============================================================================
// ruleTriggers - Check if hits match any rule
// =============================================================================
describe('ruleTriggers', () => {
  const rules = [
    {
      id: 'R1',
      name: 'Block PII in AI prompts',
      triggers: ['EMAIL', 'PHONE', 'IBAN'],
      action: 'BLOCK'
    }
  ];

  it('returns rule when EMAIL detected', () => {
    const result = ruleTriggers(['EMAIL'], rules);
    assert.ok(result);
    assert.strictEqual(result.id, 'R1');
  });

  it('returns rule when PHONE detected', () => {
    const result = ruleTriggers(['PHONE'], rules);
    assert.ok(result);
    assert.strictEqual(result.id, 'R1');
  });

  it('returns rule when IBAN detected', () => {
    const result = ruleTriggers(['IBAN'], rules);
    assert.ok(result);
    assert.strictEqual(result.id, 'R1');
  });

  it('returns rule when multiple types detected', () => {
    const result = ruleTriggers(['EMAIL', 'IBAN'], rules);
    assert.ok(result);
    assert.strictEqual(result.id, 'R1');
  });

  it('returns null when no hits', () => {
    const result = ruleTriggers([], rules);
    assert.strictEqual(result, null);
  });

  it('returns null when hits do not match any rule trigger', () => {
    const result = ruleTriggers(['UNKNOWN'], rules);
    assert.strictEqual(result, null);
  });
});

// =============================================================================
// detectMatchesWithRanges - Returns match ranges for anonymization
// =============================================================================
describe('detectMatchesWithRanges', () => {
  it('returns match objects with type, start, end, match', () => {
    const results = detectMatchesWithRanges('email: john@test.com');
    assert.ok(results.length > 0);
    assert.ok(results[0].type === 'EMAIL');
    assert.ok(typeof results[0].start === 'number');
    assert.ok(typeof results[0].end === 'number');
    assert.ok(results[0].match === 'john@test.com');
  });

  it('returns empty array for clean text', () => {
    const results = detectMatchesWithRanges('Hello world');
    assert.deepStrictEqual(results, []);
  });

  it('respects enabledTypes parameter', () => {
    const results = detectMatchesWithRanges('john@test.com +45 12 34 56 78', { EMAIL: true, PHONE: false });
    assert.ok(results.some(r => r.type === 'EMAIL'));
    assert.ok(!results.some(r => r.type === 'PHONE'));
  });

  it('detects credit card with Luhn validation', () => {
    const results = detectMatchesWithRanges('card: 4111 1111 1111 1111');
    assert.ok(results.some(r => r.type === 'CREDIT_CARD'));
  });

  it('does not detect invalid credit card number', () => {
    const results = detectMatchesWithRanges('card: 4111 1111 1111 1112');
    assert.ok(!results.some(r => r.type === 'CREDIT_CARD'));
  });
});

// =============================================================================
// isValidCreditCard - Luhn algorithm
// =============================================================================
describe('isValidCreditCard', () => {
  it('validates Visa test number', () => {
    assert.strictEqual(isValidCreditCard('4111111111111111'), true);
  });

  it('validates with spaces', () => {
    assert.strictEqual(isValidCreditCard('4111 1111 1111 1111'), true);
  });

  it('validates with dashes', () => {
    assert.strictEqual(isValidCreditCard('4111-1111-1111-1111'), true);
  });

  it('rejects invalid number', () => {
    assert.strictEqual(isValidCreditCard('4111111111111112'), false);
  });

  it('rejects too short', () => {
    assert.strictEqual(isValidCreditCard('411111'), false);
  });
});
