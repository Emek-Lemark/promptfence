# Chrome Web Store Listing

## Extension Name
PromptFence (Personal) - AI Privacy Guard

## Short Description (132 chars max)
Protects your sensitive data from being shared with AI assistants. Detects emails, phones, credit cards, and more before you paste.

## Detailed Description

**Stop accidentally sharing sensitive information with AI chatbots.**

PromptFence monitors what you paste into AI chat prompts (ChatGPT, Claude, Gemini) and warns or blocks you when it detects sensitive data like:

✓ Email addresses
✓ Phone numbers
✓ Credit card numbers
✓ Bank accounts (IBAN)
✓ Physical addresses
✓ Passwords & API keys

**How it works:**
1. Install the extension
2. Choose a protection preset (Personal, Finance, Health, etc.)
3. Use AI assistants as normal
4. Get warned or blocked when pasting sensitive data

**100% Local & Private:**
- All detection runs in your browser
- No data is sent anywhere
- No account required
- No tracking or analytics

**Customizable:**
- 5 presets for different use cases
- Toggle warnings and blocking independently
- Optional debug mode for troubleshooting

Perfect for anyone who uses AI assistants regularly and wants peace of mind that their personal information stays private.

## Category
Productivity

## Language
English

---

## Permissions Justification

### storage
**Justification:** Required to save user preferences (selected preset, toggle states) so settings persist across browser sessions. Uses Chrome's sync storage for cross-device settings sync.

### Host Permissions (AI Sites)
**Sites:** chat.openai.com, chatgpt.com, claude.ai, gemini.google.com

**Justification:** Required to inject content scripts that intercept paste events on AI chat interfaces. The extension must run on these specific pages to detect and warn about sensitive data being pasted into AI prompts. No broader host permissions are requested.

---

## Data Use Disclosure

### Single Purpose Description
PromptFence detects sensitive information (emails, phones, credit cards, etc.) in text being pasted into AI chat prompts and warns or blocks the user to prevent accidental data exposure.

### Data Collection
- **Personally Identifiable Information:** Not collected
- **Health Information:** Not collected
- **Financial Information:** Not collected
- **Authentication Information:** Not collected
- **Personal Communications:** Not collected
- **Location:** Not collected
- **Web History:** Not collected
- **User Activity:** Not collected
- **Website Content:** Not collected

### Certification
I certify that this extension's data practices comply with the Chrome Web Store Developer Program Policies, including the limited use requirements for any sensitive data the extension may access.

---

## Screenshots Needed
1. Options page showing preset selection
2. WARN modal on ChatGPT
3. BLOCK modal preventing paste
4. Rules preview showing detection types

## Icon Sizes Needed
- 16x16
- 48x48
- 128x128
