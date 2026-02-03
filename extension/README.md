# PromptFence Browser Extension

Prevents sensitive data (emails, phone numbers, IBANs) from being pasted into AI chat prompts.

## How to Install (1 minute)

1. **Download** the ZIP from `/demo` page (or run `./scripts/package-extension.sh`)
2. **Unzip** the file to a folder
3. **Open Chrome** → navigate to `chrome://extensions`
4. **Enable Developer Mode** (toggle in top-right)
5. **Click "Load unpacked"** → select the unzipped folder
6. PromptFence icon appears in toolbar ✓

## How to Connect

Open extension **Options** (right-click icon → Options) and enter:

| Setting | Value |
|---------|-------|
| **API Base URL** | `https://promptfenceapp-production.up.railway.app` |
| **Install Code** | 8-character code from `/setup` after signup |

Click **Save**. Status should show **OK**.

## How to Test

1. Go to [chatgpt.com](https://chatgpt.com) (or claude.ai, gemini.google.com)
2. Paste one of these into the prompt field:
   - Email: `test@example.com` → **WARN** (yellow modal, paste allowed)
   - IBAN: `DE89370400440532013000` → **BLOCK** (red modal, paste prevented)
3. Check `/events` on the dashboard to see logged events

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Config fetch failed" | Check API URL has `https://`, Install Code is 8 chars |
| No modal appears | Refresh the AI page after configuring extension |
| Events not logged | Install Code must match the org you signed up with |
