// rules.js - Local rule pack and presets configuration
// Store MVP: No backend required, all detection runs locally

/**
 * ============================================================================
 * TONE OF VOICE SYSTEM
 * ============================================================================
 *
 * Core principles applied throughout this file:
 *
 * 1. CALM AUTHORITY - Confident, not apologetic. Direct without aggression.
 * 2. NON-ASSUMPTIVE - "appears to be" for patterns, direct for validated data.
 * 3. EDUCATIONAL - Explain why, not that it's wrong. Provide alternatives.
 * 4. USER AGENCY - User decides unless preset explicitly blocks.
 *
 * See DESIGN_NOTES.md for full guidelines.
 * ============================================================================
 */

/**
 * Preset configurations for different use cases.
 * Each preset defines detection rules, modal copy, and guidance text.
 */
const PromptFencePresets = {

  // =========================================================================
  // PERSONAL SAFETY (DEFAULT)
  // Intent: Gentle education, maximum agency. Warn often, block rarely.
  // =========================================================================
  personal: {
    id: 'personal',
    name: 'Personal Safety',
    description: 'Balanced protection for everyday use',

    // Shown in options page
    whyItMatters: 'AI tools may store conversations or use them for training. This preset gives you a heads-up when personal details are about to be shared, while blocking only the highest-risk data types.',

    // Modal copy for this preset
    modal: {
      warn: {
        title: 'Sensitive data detected',
        body: 'This text appears to include personal information. Take a moment to review before sharing.'
      },
      block: {
        title: 'This contains protected data',
        body: 'This text includes information that this preset is configured to block. You can edit it or adjust your settings.'
      }
    },

    // Guidance shown at bottom of modals
    guidance: {
      message: 'This is a heads-up to help protect your privacy.',
      emphasis: 'You\'re in control—review and decide what\'s right for you.'
    },

    rules: {
      EMAIL: 'WARN',
      PHONE: 'WARN',
      IBAN: 'WARN',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'WARN',
      PASSWORD: 'BLOCK'
    }
  },

  // =========================================================================
  // FINANCE
  // Intent: High confidence, strict by design. Prevent financial data exposure.
  // =========================================================================
  finance: {
    id: 'finance',
    name: 'Finance',
    description: 'Strict protection for financial data',

    whyItMatters: 'Financial identifiers like bank accounts and card numbers can cause real harm if leaked. This preset blocks financial data to help you avoid accidental exposure.',

    modal: {
      warn: {
        title: 'Financial information detected',
        body: 'This text appears to include financial identifiers. Review carefully before sharing.'
      },
      block: {
        title: 'Financial data blocked',
        body: 'This text contains financial information that could pose risk if shared. This mode is strict by design to protect sensitive accounts.'
      }
    },

    guidance: {
      message: 'This preset is strict to reduce financial risk.',
      emphasis: 'Redacting account numbers and financial identifiers is best practice.'
    },

    rules: {
      EMAIL: 'WARN',
      PHONE: 'WARN',
      IBAN: 'BLOCK',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'WARN',
      PASSWORD: 'BLOCK'
    }
  },

  // =========================================================================
  // HEALTH
  // Intent: Protective, privacy-forward. Help users pause before sharing.
  // =========================================================================
  health: {
    id: 'health',
    name: 'Health',
    description: 'Privacy-focused protection for health contexts',

    whyItMatters: 'Health information is deeply personal and often protected by privacy regulations. This preset helps you think twice before sharing details that could identify you alongside medical discussions.',

    modal: {
      warn: {
        title: 'Personal identifier detected',
        body: 'This text includes information that could identify you. In health-related contexts, consider generalizing or removing personal details.'
      },
      block: {
        title: 'Identifying information blocked',
        body: 'This text contains identifiers that could link you to health-related discussions. Consider using general terms instead.'
      }
    },

    guidance: {
      message: 'Health information deserves extra care.',
      emphasis: 'Consider saying "a medical condition" instead of specific details.'
    },

    rules: {
      EMAIL: 'WARN',
      PHONE: 'BLOCK',
      IBAN: 'WARN',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'BLOCK',
      PASSWORD: 'BLOCK'
    }
  },

  // =========================================================================
  // WORKPLACE / HR
  // Intent: Professional risk awareness. Protect colleague and client data.
  // =========================================================================
  workplace: {
    id: 'workplace',
    name: 'Workplace',
    description: 'Protection for professional contexts',

    whyItMatters: 'Work conversations may include information about colleagues, clients, or confidential projects. This preset helps you pause before sharing identifiers that could breach professional trust.',

    modal: {
      warn: {
        title: 'Work-related data detected',
        body: 'This text may include information about colleagues or clients. Consider redacting identifiers before sharing.'
      },
      block: {
        title: 'Professional data blocked',
        body: 'This text contains information that may create professional risk if shared externally.'
      }
    },

    guidance: {
      message: 'This may include information about colleagues or clients.',
      emphasis: 'Redacting identifiers helps maintain professional confidentiality.'
    },

    rules: {
      EMAIL: 'WARN',
      PHONE: 'WARN',
      IBAN: 'BLOCK',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'WARN',
      PASSWORD: 'BLOCK'
    }
  },

  // =========================================================================
  // DEVELOPER
  // Intent: Explicit opt-in. Relaxed on PII, strict on credentials.
  // =========================================================================
  developer: {
    id: 'developer',
    name: 'Developer',
    description: 'Focused on credentials and secrets',

    whyItMatters: 'API keys and credentials can be accidentally pasted when debugging or asking for help. This preset is relaxed on personal info but strict on secrets that could compromise systems.',

    modal: {
      warn: {
        title: 'Potential credential detected',
        body: 'This text may include credentials or financial data. Detection is informational—review before sharing.'
      },
      block: {
        title: 'Credential or secret blocked',
        body: 'This text appears to contain API keys, passwords, or similar secrets. Replace with placeholders before sharing.'
      }
    },

    guidance: {
      message: 'Detection is active but informational for most data types.',
      emphasis: 'Use placeholders like sk-xxx... or [API_KEY] instead of real values.'
    },

    rules: {
      EMAIL: 'ALLOW',
      PHONE: 'ALLOW',
      IBAN: 'WARN',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'ALLOW',
      PASSWORD: 'BLOCK'
    }
  }
};

/**
 * Data type definitions with detection confidence levels and copy.
 * Used by modals to display appropriate language.
 */
const PromptFenceDataTypes = {
  EMAIL: {
    id: 'EMAIL',
    label: 'Email address',
    confidence: 'pattern', // pattern-matched, not validated
    detected: 'This looks like an email address',
    risk: 'Email addresses can identify you or link conversations to your real identity.',
    tip: 'Use a placeholder like user@example.com',
    example: 'user@example.com'
  },
  PHONE: {
    id: 'PHONE',
    label: 'Phone number',
    confidence: 'pattern',
    detected: 'This appears to be a phone number',
    risk: 'Phone numbers are personal identifiers that may be retained in AI logs.',
    tip: 'Use placeholder digits like +XX XXX XXX XXX',
    example: '+XX XXX XXX XXX'
  },
  IBAN: {
    id: 'IBAN',
    label: 'Bank account (IBAN)',
    confidence: 'validated', // mod-97 checksum validated
    detected: 'This is a valid IBAN',
    risk: 'Bank account numbers are sensitive financial data that could enable fraud.',
    tip: 'Mask all but the country code',
    example: 'DE** **** **** ****'
  },
  CREDIT_CARD: {
    id: 'CREDIT_CARD',
    label: 'Credit card number',
    confidence: 'validated', // Luhn algorithm validated
    detected: 'This is a valid card number',
    risk: 'Card numbers should never be shared with AI tools—serious financial risk.',
    tip: 'Describe the issue instead of sharing the number',
    example: '"my Visa card ending in 1234"'
  },
  ADDRESS: {
    id: 'ADDRESS',
    label: 'Physical address',
    confidence: 'pattern',
    detected: 'This looks like a physical address',
    risk: 'Addresses reveal your location and can be combined with other data to identify you.',
    tip: 'Use a general location instead',
    example: '[City, Country]'
  },
  PASSWORD: {
    id: 'PASSWORD',
    label: 'Password or API key',
    confidence: 'pattern',
    detected: 'This looks like a password or API key',
    risk: 'Credentials can compromise accounts if stored in AI systems.',
    tip: 'Replace with a placeholder',
    example: '[redacted] or sk-xxx...'
  }
};

/**
 * Default configuration used by PromptFence.
 * Can be overridden by user settings in chrome.storage.sync
 */
const PromptFenceConfig = {
  // AI domains where paste interception is active
  aiDomains: [
    'chat.openai.com',
    'chatgpt.com',
    'claude.ai',
    'gemini.google.com'
  ],

  // Default preset
  defaultPreset: 'personal',

  // Get all available presets
  presets: PromptFencePresets,

  // Data type definitions
  dataTypes: PromptFenceDataTypes,

  // Legacy rules array (for backward compatibility)
  rules: [
    {
      id: 'R1',
      name: 'Block PII in AI prompts',
      description: 'Prevents pasting sensitive data into AI chat prompts',
      triggers: ['EMAIL', 'PHONE', 'IBAN', 'CREDIT_CARD', 'ADDRESS', 'PASSWORD'],
      action: 'BLOCK'
    }
  ]
};
