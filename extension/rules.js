// rules.js - Local rule pack and presets configuration
// Store MVP: No backend required, all detection runs locally

/**
 * Preset configurations for different use cases.
 * Each preset defines which data types to detect and their default actions.
 */
const PromptFencePresets = {
  // Personal Safety: Warn on most types, useful for everyday use
  personal: {
    id: 'personal',
    name: 'Personal Safety',
    description: 'Balanced protection for personal use',
    rules: {
      EMAIL: 'WARN',
      PHONE: 'WARN',
      IBAN: 'WARN',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'WARN',
      PASSWORD: 'BLOCK'
    }
  },

  // Finance: Strict blocking for financial data
  finance: {
    id: 'finance',
    name: 'Finance',
    description: 'Strict protection for financial information',
    rules: {
      EMAIL: 'WARN',
      PHONE: 'WARN',
      IBAN: 'BLOCK',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'WARN',
      PASSWORD: 'BLOCK'
    }
  },

  // Health: Protect medical/personal health info
  health: {
    id: 'health',
    name: 'Health',
    description: 'Protection for health-related data',
    rules: {
      EMAIL: 'WARN',
      PHONE: 'BLOCK',
      IBAN: 'WARN',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'BLOCK',
      PASSWORD: 'BLOCK'
    }
  },

  // Workplace: Balanced for professional use
  workplace: {
    id: 'workplace',
    name: 'Workplace/HR',
    description: 'Protection for workplace and HR data',
    rules: {
      EMAIL: 'WARN',
      PHONE: 'WARN',
      IBAN: 'BLOCK',
      CREDIT_CARD: 'BLOCK',
      ADDRESS: 'WARN',
      PASSWORD: 'BLOCK'
    }
  },

  // Developer: Focused on secrets/credentials
  developer: {
    id: 'developer',
    name: 'Developer',
    description: 'Focused on API keys and secrets',
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
