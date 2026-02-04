// rules.js - Local rule pack and presets configuration
// Store MVP: No backend required, all detection runs locally

/**
 * Preset configurations for different use cases.
 * Copy is compact, calm, and non-assumptive.
 */
const PromptFencePresets = {

  // PERSONAL SAFETY (DEFAULT)
  personal: {
    id: 'personal',
    name: 'Personal Safety',
    description: 'Balanced protection for everyday use',
    whyItMatters: 'AI tools may store conversations. This preset alerts you when personal data is detected.',
    modal: {
      warn: {
        title: 'Possible sensitive data',
        body: 'This text appears to include personal information.'
      },
      block: {
        title: 'Protected data detected',
        body: 'This text includes data this preset blocks.'
      }
    },
    guidance: 'Review before sharing.',
    rules: {
      EMAIL: 'WARN',
      PHONE: 'WARN',
      IBAN: 'WARN',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'WARN',
      PASSWORD: 'BLOCK'
    }
  },

  // FINANCE
  finance: {
    id: 'finance',
    name: 'Finance',
    description: 'Strict protection for financial data',
    whyItMatters: 'Financial identifiers can cause harm if leaked. This preset blocks them by default.',
    modal: {
      warn: {
        title: 'Possible financial data',
        body: 'This text appears to include financial identifiers.'
      },
      block: {
        title: 'Financial data blocked',
        body: 'This text contains data that could pose risk if shared.'
      }
    },
    guidance: 'Redact account numbers before sharing.',
    rules: {
      EMAIL: 'WARN',
      PHONE: 'WARN',
      IBAN: 'BLOCK',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'WARN',
      PASSWORD: 'BLOCK'
    }
  },

  // HEALTH
  health: {
    id: 'health',
    name: 'Health',
    description: 'Privacy-focused for health contexts',
    whyItMatters: 'Health information is personal and often regulated.',
    modal: {
      warn: {
        title: 'Personal identifier detected',
        body: 'This text includes info that could identify you.'
      },
      block: {
        title: 'Identifier blocked',
        body: 'This text has identifiers that could link you to health discussions.'
      }
    },
    guidance: 'Use general terms instead of specifics.',
    rules: {
      EMAIL: 'WARN',
      PHONE: 'BLOCK',
      IBAN: 'WARN',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'BLOCK',
      PASSWORD: 'BLOCK'
    }
  },

  // WORKPLACE
  workplace: {
    id: 'workplace',
    name: 'Workplace',
    description: 'Protection for professional contexts',
    whyItMatters: 'Work conversations may include colleague or client data.',
    modal: {
      warn: {
        title: 'Possible work-related data',
        body: 'This text may include colleague or client info.'
      },
      block: {
        title: 'Professional data blocked',
        body: 'This text contains info that may be sensitive professionally.'
      }
    },
    guidance: 'Redacting identifiers maintains confidentiality.',
    rules: {
      EMAIL: 'WARN',
      PHONE: 'WARN',
      IBAN: 'BLOCK',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'WARN',
      PASSWORD: 'BLOCK'
    }
  },

  // DEVELOPER
  developer: {
    id: 'developer',
    name: 'Developer',
    description: 'Focused on credentials and secrets',
    whyItMatters: 'API keys and secrets can be pasted accidentally.',
    modal: {
      warn: {
        title: 'Possible credential detected',
        body: 'This text may include credentials or financial data.'
      },
      block: {
        title: 'Credential blocked',
        body: 'This text appears to contain secrets.'
      }
    },
    guidance: 'Use placeholders like sk-xxx... or [API_KEY].',
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
 * Data type definitions with labels and anonymization placeholders.
 */
const PromptFenceDataTypes = {
  EMAIL: {
    id: 'EMAIL',
    label: 'Email address',
    placeholder: '[EMAIL]'
  },
  PHONE: {
    id: 'PHONE',
    label: 'Phone number',
    placeholder: '[PHONE]'
  },
  IBAN: {
    id: 'IBAN',
    label: 'Bank account (IBAN)',
    placeholder: '[IBAN]'
  },
  CREDIT_CARD: {
    id: 'CREDIT_CARD',
    label: 'Card number',
    placeholder: '[CARD]'
  },
  ADDRESS: {
    id: 'ADDRESS',
    label: 'Address',
    placeholder: '[ADDRESS]'
  },
  PASSWORD: {
    id: 'PASSWORD',
    label: 'Credential / API key',
    placeholder: '[SECRET]'
  }
};

/**
 * Default configuration used by PromptFence.
 */
const PromptFenceConfig = {
  aiDomains: [
    'chat.openai.com',
    'chatgpt.com',
    'claude.ai',
    'gemini.google.com'
  ],
  defaultPreset: 'personal',
  presets: PromptFencePresets,
  dataTypes: PromptFenceDataTypes
};
