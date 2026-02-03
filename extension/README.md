# PromptFence (Personal)

Browser extension that protects your sensitive data from being pasted into AI chat prompts.

**No server required** — all detection runs locally in your browser.

## Features

- **Detects sensitive data**: Emails, phones, IBANs, credit cards, addresses, passwords/API keys
- **Customizable presets**: Personal, Finance, Health, Workplace, Developer
- **WARN or BLOCK**: Choose to warn (allow paste) or block (prevent paste) for each data type
- **100% local**: No data leaves your browser, no accounts needed
- **Works on**: ChatGPT, Claude, Gemini

## Installation

### From Chrome Web Store
*(Coming soon)*

### Load Unpacked (Developer Mode)

1. Download or clone this repository
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `extension/` folder
6. Done! The extension is now active.

## Configuration

1. Click the PromptFence extension icon
2. Select **Options** (or right-click → Options)
3. Choose a **Protection Preset**:
   - **Personal Safety** (default): Warns on most types, blocks credit cards and passwords
   - **Finance**: Strict blocking for financial data
   - **Health**: Protects health-related data
   - **Workplace/HR**: Balanced for professional use
   - **Developer**: Focuses on API keys and secrets

4. Adjust toggles:
   - **Enable Warnings**: Show warning modals for WARN-level data
   - **Enable Blocking**: Prevent paste for BLOCK-level data
   - **Debug Mode**: Log detection details to console (for troubleshooting)

5. Click **Save Settings**

## Testing

1. Go to [chatgpt.com](https://chatgpt.com), [claude.ai](https://claude.ai), or [gemini.google.com](https://gemini.google.com)
2. Try pasting:
   - `test@example.com` → WARN (email)
   - `4111111111111111` → BLOCK (credit card)
   - `password: secret123` → BLOCK (password)
   - `DE89370400440532013000` → WARN or BLOCK (IBAN)

## Privacy

**PromptFence processes all data locally.** No data is collected, transmitted, or stored externally.

See [PRIVACY.md](PRIVACY.md) for full details.

## Versions

| Version | Description |
|---------|-------------|
| **PromptFence (Personal)** | This version. Local-only, no backend required. For personal use. |
| **PromptFence (Demo/Admin)** | Requires backend server. For enterprise/team testing. See main branch. |

## Development

### Run Tests
```bash
cd extension
node --test tests/logic.test.js
```

### Package for Store
```bash
./scripts/package-extension-store.sh
# Output: dist/promptfence-store.zip
```

## License

MIT
