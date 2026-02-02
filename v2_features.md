# PromptFence — V2 Features Specification

## Goal of V2
Deliver a demo-grade, sellable product that shows:
- company onboarding
- employee management
- configurable AI usage rules
- auditable evidence of enforcement

V2 must answer this buyer question clearly:
> "If we rolled this out company-wide, how would it work?"

---

## In Scope (V2)

### 1. System Components
- Browser Extension (employees)
- Web App (admins)
- Minimal Backend (orgs, config, users, events)

No other components.

---

### 2. Organization Onboarding (Admin)

#### Admin Signup
- Admin signs up with email + password or magic link
- New organization is created automatically
- Organization domain is derived from admin email

#### Initial Setup Flow
Admin must be able to complete setup in ≤5 minutes:
- Select approved AI tools (checkboxes):
  - ChatGPT
  - Claude
  - Gemini
  - Other (warn only)
- Configure data types:
  - EMAIL
  - PHONE
  - IBAN
- For each data type:
  - Action: WARN or BLOCK
- Optional field:
  - Approved alternative AI URL (string)

Defaults must be pre-selected (safe-by-default).

---

### 3. Employee Onboarding

#### Join Methods (V2 supports only these)
- Install link with org install code
- Email-domain auto-association (if domain matches org)

No SCIM, no SSO, no HR integrations.

#### First-Run Employee Experience
- No training or walkthrough
- First blocked action acts as onboarding moment
- Modal must explain:
  - What was blocked
  - Why
  - Optional approved AI link

---

### 4. Browser Extension (Employee)

#### Enforcement
- Intercepts paste events only
- Applies org-configured rules
- Supports:
  - EMAIL
  - PHONE
  - IBAN
- Enforcement actions:
  - WARN (allow paste)
  - BLOCK (prevent paste)

#### Reliability Requirements
- Works in:
  - ChatGPT
  - Claude
  - Gemini
- Supports textarea and contenteditable editors
- Uses activeElement + ancestor detection
- Capture-phase paste interception

#### Offline / Failure Behavior
- If backend unavailable:
  - Use last known config from local storage
  - Continue enforcement
  - Do not crash editor

---

### 5. Event Logging (Core Value)

#### Event Generation
An event is generated when:
- A WARN or BLOCK action occurs

#### Event Payload (No Content)
Event must include:
- timestamp (ISO string)
- orgId
- userId (or anonymized identifier)
- AI host/domain
- ruleId
- data types detected (array)
- action (WARN or BLOCK)
- extension version

Clipboard contents or prompts must NEVER be stored or logged.

---

### 6. Admin Dashboard

#### Users View
Admin can see:
- user identifier (email or hashed ID)
- extension installed: yes/no
- last seen timestamp
- total block count

Admin CANNOT see:
- prompt content
- pasted text
- browsing history

#### Events View
Admin can see:
- table of events with metadata only
- filters by:
  - data type
  - AI tool
  - action
- export:
  - CSV
  - JSON

No charts or analytics dashboards.

---

### 7. Configuration Management

- Admin changes config via web app
- Extension fetches config on load
- Config cached locally in extension
- Changes apply on refresh / reload

No real-time push required.

---

### 8. Landing Page (Public)

#### Purpose
- Explain product in <15 seconds
- Drive pilot signups

#### Content
- One headline
- Three bullets
- Visual (GIF/video placeholder)
- Single CTA: "Start a pilot"

Landing page routes to admin signup.

---

## Explicitly Out of Scope (V2)

The following MUST NOT be implemented:

- Typing / keystroke interception
- File upload interception
- Semantic or ML-based classification
- Additional PII types beyond EMAIL/PHONE/IBAN
- Role-based or per-user rules
- Policy authoring tools
- Training modules
- Dashboards, charts, or analytics
- SCIM / SSO / HR integrations
- Mobile support
- Browser support beyond Chrome/Edge
- Reading or storing AI prompts or responses

---

## Acceptance Criteria (V2 Complete)

V2 is considered complete when:
- An admin can sign up, configure rules, and invite employees
- An employee installs the extension and enforcement works
- Events appear in admin dashboard
- Events can be exported
- Product can be demoed end-to-end in <5 minutes
- No sensitive content is stored anywhere

---

## Non-Goals
V2 is NOT intended to:
- Fully stop all data leakage
- Replace enterprise DLP tools
- Monitor productivity
- Enforce company policy beyond paste behavior

V2 exists to prove value, demand, and willingness to pay.
