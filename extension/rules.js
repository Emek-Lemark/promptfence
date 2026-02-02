// rules.js - Local rule pack and configuration
// Exposes config/patterns to content script

const PromptFenceConfig = {
  // AI domains where paste interception is active
  aiDomains: [
    'chat.openai.com',
    'chatgpt.com',
    'claude.ai',
    'gemini.google.com'
  ],

  // Rules for blocking
  rules: [
    {
      id: 'R1',
      name: 'Block PII in AI prompts',
      description: 'Prevents pasting emails, phone numbers, or IBANs into AI chat prompts',
      triggers: ['EMAIL', 'PHONE', 'IBAN'],
      action: 'BLOCK'
    }
  ]
};
