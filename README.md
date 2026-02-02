# PromptFence

Browser extension and web app that prevents sensitive data (emails, phone numbers, IBANs) from being pasted into AI chat prompts.

## Monorepo Structure

```
PromptFence/
├── extension/             # Browser extension (Chrome/Edge)
│   ├── manifest.json
│   ├── rules.js
│   ├── content.js
│   ├── ui.css
│   ├── service_worker.js
│   ├── src/
│   │   └── logic.js
│   └── tests/
│       └── logic.test.js
├── app/                   # Next.js web app (admin dashboard)
├── shared/                # Shared code between extension and app
├── features.md            # V1 feature specification
├── v2_features.md         # V2 feature specification
├── architecture.md        # Architecture documentation
└── README.md              # This file
```

## Extension

### Supported AI Sites

- https://chat.openai.com
- https://chatgpt.com
- https://claude.ai
- https://gemini.google.com

### Installation (Chrome/Edge)

1. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension` folder
5. The extension is now active

### Running Tests

```bash
cd extension
node --test tests/logic.test.js
```

### Manual Test Plan

#### Test 1: Email blocked in ChatGPT prompt
1. Go to https://chatgpt.com
2. Click in the prompt textarea
3. Copy text containing an email: `Contact me at test@example.com`
4. Paste (Ctrl+V / Cmd+V)
5. **Expected:** Paste is blocked, modal appears with "Email Address" listed

#### Test 2: Regular text allowed
1. Go to https://chatgpt.com
2. Click in the prompt textarea
3. Copy regular text: `Hello, how are you today?`
4. Paste (Ctrl+V / Cmd+V)
5. **Expected:** Text is pasted normally, no modal appears

#### Test 3: Valid IBAN blocked
1. Go to https://claude.ai
2. Paste text with valid IBAN: `Pay to DE89370400440532013000`
3. **Expected:** Paste is blocked, modal appears with "Bank Account (IBAN)" listed

#### Test 4: Phone number blocked
1. Go to https://gemini.google.com
2. Paste text with phone: `Call me at +45 12 34 56 78`
3. **Expected:** Paste is blocked, modal appears with "Phone Number" listed

## Web App

Coming in V2. See `v2_features.md` for specification.

## Development

### Prerequisites

- Node.js 18+
- Chrome or Edge browser

### Quick Start

```bash
# Run extension tests
cd extension && node --test tests/logic.test.js

# Load extension in browser
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Load unpacked -> select extension/ folder
```
