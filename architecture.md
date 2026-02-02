# Architecture — v1 (Extension-only)

## Overview
Manifest V3 extension using a content script to intercept paste events on specific AI domains. Detection logic is isolated into pure functions for unit testing using Node's built-in test runner.

## Components
1. manifest.json
   - Declares host_permissions and content_scripts for supported domains.
   - Loads rules.js and content.js and ui.css.

2. rules.js
   - Holds local rule pack and regex patterns.
   - Exposes config/patterns to content script.

3. src/logic.js (pure functions)
   - detectMatches(text): returns ["EMAIL","PHONE","IBAN"] hits
   - ibanIsValid(ibanRaw): mod-97 check
   - isAiDomain(hostname, aiDomains)
   - ruleTriggers(hits, rules): returns matched rule or null

4. content.js
   - Attaches paste event listener (capture phase).
   - Ensures target is likely prompt field.
   - Extracts pasted text.
   - Calls logic functions.
   - On block: prevents paste, shows modal, logs.

5. ui.css + simple modal DOM created by content.js.

6. service_worker.js
   - Minimal/no-op for v1.

## Data flow
Paste event → extract text → detectMatches → ruleTriggers → block/allow → modal + console log.

## Testing
- tests/logic.test.js using node:test for pure functions.
- Manual test plan documented in README.md for DOM behavior.
