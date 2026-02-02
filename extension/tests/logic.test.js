// tests/logic.test.js - Unit tests for src/logic.js
// Using node:test (Node.js built-in test runner)

const { describe, it } = require('node:test');
const assert = require('node:assert');

// Import functions to test (will fail until implemented)
const {
  ibanIsValid,
  detectMatches,
  isAiDomain,
  ruleTriggers
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
    it('detects US phone format', () => {
      const hits = detectMatches('call me at (555) 123-4567');
      assert.ok(hits.includes('PHONE'));
    });

    it('detects international phone with +', () => {
      const hits = detectMatches('my number is +1-555-123-4567');
      assert.ok(hits.includes('PHONE'));
    });

    it('detects phone with spaces', () => {
      const hits = detectMatches('phone: 555 123 4567');
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
