# AI Guardrail (Prototype) — v1 Features

## In-scope (v1)
1. Browser extension (Manifest V3) for Chrome/Edge.
2. Runs only on:
   - https://chat.openai.com/*
   - https://chatgpt.com/*
   - https://claude.ai/*
   - https://gemini.google.com/*
3. Intercepts paste events inside likely AI prompt fields:
   - textarea
   - contenteditable=true
   - input type=text/search
4. Detects regulated identifiers in pasted text:
   - EMAIL (pragmatic regex)
   - PHONE (conservative regex)
   - IBAN (candidate regex + mod-97 validation)
5. Rule R1:
   - If any of EMAIL/PHONE/IBAN detected in pasted text inside AI prompt on supported domains:
     - BLOCK paste (preventDefault + stopPropagation)
     - Show modal explaining block and listing detected types
     - Console log event
6. No backend. Rules are local in rules.js.

## Out-of-scope (explicit)
- Any backend / org/user management
- Admin dashboard
- SSO
- Rule editing UI
- Clipboard/file upload control
- Monitoring typing or keystrokes beyond paste events
- AI content analysis or semantic classification
- Any additional domains beyond the four listed

## Acceptance Criteria
- A user pasting an email into ChatGPT prompt is blocked and sees modal.
- A user pasting regular text into ChatGPT prompt is allowed.
- A user pasting a valid IBAN into Claude prompt is blocked.
- A user pasting an invalid IBAN is allowed.
- Paste in non-prompt areas is not blocked.
- Works in Chrome and Edge via "Load unpacked".
