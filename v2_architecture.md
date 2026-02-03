# PromptFence — V2 Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Extension (Employee)                        │    │
│  │  - Paste interception                                    │    │
│  │  - Detection (EMAIL, PHONE, IBAN)                       │    │
│  │  - WARN/BLOCK enforcement                               │    │
│  │  - Config cached in chrome.storage.local                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ GET /api/config (on load)
                              │ POST /api/events (on WARN/BLOCK)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js App                                 │
│  ┌──────────────────┐  ┌──────────────────────────────────┐    │
│  │   Landing Page   │  │        Admin Dashboard            │    │
│  │   (Public)       │  │  - Users view                     │    │
│  │                  │  │  - Events view (table + export)   │    │
│  │   /              │  │  - Config editor                  │    │
│  │   /signup        │  │                                    │    │
│  │   /login         │  │  /dashboard                       │    │
│  └──────────────────┘  └──────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Routes                             │  │
│  │  POST /api/signup      - Admin registration               │  │
│  │  POST /api/login       - Admin authentication             │  │
│  │  POST /api/invite      - Generate install code            │  │
│  │  GET  /api/config      - Extension fetches org config     │  │
│  │  POST /api/config      - Admin updates org config         │  │
│  │  POST /api/events      - Extension reports event          │  │
│  │  GET  /api/events      - Admin views events               │  │
│  │  GET  /api/users       - Admin views users                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQLite Database                             │
│  - orgs           (organization records)                         │
│  - users          (admin + employee records)                     │
│  - org_config     (rules configuration per org)                  │
│  - events         (WARN/BLOCK events, no content)               │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Browser Extension (`/extension`)
- **Purpose:** Enforce paste rules on AI chat sites
- **Target sites:** ChatGPT, Claude, Gemini
- **Auth:** `X-Install-Code` header for API calls
- **Storage:** `chrome.storage.local` for cached config
- **Offline:** Uses cached config if backend unavailable

### 2. Next.js App (`/app`)
- **Framework:** Next.js (App Router)
- **Database:** SQLite (local file, no external DB)
- **Auth:** JWT Bearer tokens for admin sessions
- **Pages:**
  - `/` - Landing page (public)
  - `/signup` - Admin registration
  - `/login` - Admin login
  - `/dashboard` - Admin dashboard (protected)
  - `/dashboard/users` - Users view
  - `/dashboard/events` - Events view
  - `/dashboard/config` - Config editor

### 3. Shared (`/shared`)
- `db_schema.sql` - SQLite schema
- `contracts.md` - API contracts

## Data Flow

### Admin Signup
1. Admin visits `/signup`
2. Enters email + password
3. `POST /api/signup` creates org + admin user
4. Org domain derived from email (e.g., `user@acme.com` → `acme.com`)
5. Default config created (EMAIL=WARN, PHONE=WARN, IBAN=BLOCK)
6. Admin redirected to dashboard

### Employee Onboarding
1. Admin generates install code via `/dashboard`
2. Employee installs extension with code
3. Extension calls `GET /api/config` with `X-Install-Code`
4. Backend associates user with org (creates user if new)
5. Extension caches config locally

### Enforcement Flow
1. Employee pastes text in AI prompt
2. Extension detects EMAIL/PHONE/IBAN
3. Extension checks cached config for action
4. If WARN: show modal, allow paste
5. If BLOCK: show modal, prevent paste
6. `POST /api/events` with metadata (no content)

### Config Update (Admin Only)
1. Admin edits config in dashboard
2. `POST /api/config` saves to database (admin-only, Bearer token required)
3. Extension fetches new config on next load/refresh

Note: `POST /api/config` is the only config write endpoint. Extensions cannot modify config.

## Authentication

### Admin (Web App)
- **Method:** JWT Bearer token
- **Header:** `Authorization: Bearer <token>`
- **Token contains:** `{ userId, orgId, role: "admin" }`
- **Expiry:** 7 days

### Extension (Employee)
- **Method:** Install code
- **Header:** `X-Install-Code: <code>`
- **Code format:** 8-character alphanumeric
- **Lookup:** Code maps to orgId, creates/finds user

## Security Constraints

1. **No content storage:** Clipboard text and prompts are NEVER stored or logged
2. **Metadata only:** Events contain only: timestamp, orgId, userId, domain, ruleId, dataTypes, action, version
3. **No browsing history:** Extension does not track or report visited URLs
4. **Minimal permissions:** Extension only needs access to AI chat domains

## Offline Behavior

If backend is unavailable:
1. Extension uses last cached config from `chrome.storage.local`
2. Enforcement continues with cached rules
3. Editor functionality never blocked

Note: Event queueing for offline scenarios is a future enhancement (not in V2 scope).

## File Structure

```
PromptFence/
├── extension/              # Browser extension
│   ├── manifest.json
│   ├── content.js          # Paste interception
│   ├── background.js       # Config fetch, event posting
│   ├── src/logic.js        # Detection functions
│   └── ...
├── app/                    # Next.js application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── lib/            # Database, auth utilities
│   │   └── components/     # React components
│   ├── package.json
│   └── ...
├── shared/                 # Shared contracts
│   ├── db_schema.sql
│   └── contracts.md
└── ...
```

## Out of Scope (V2)

- No SCIM/SSO/HR integrations
- No real-time config push (poll on load only)
- No charts or analytics dashboards
- No role-based permissions (admin-only for now)
- No mobile support
- No browsers beyond Chrome/Edge
