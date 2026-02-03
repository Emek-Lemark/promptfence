-- PromptFence V2 Database Schema (SQLite)
-- Minimal schema for demo-grade product

-- =============================================================================
-- Organizations
-- =============================================================================
CREATE TABLE orgs (
    id TEXT PRIMARY KEY,                    -- UUID
    domain TEXT NOT NULL UNIQUE,            -- e.g., "acme.com" (derived from admin email)
    name TEXT,                              -- Optional display name
    install_code TEXT NOT NULL UNIQUE,      -- 8-char code for employee onboarding
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_orgs_domain ON orgs(domain);
CREATE INDEX idx_orgs_install_code ON orgs(install_code);

-- =============================================================================
-- Users (admins and employees)
-- =============================================================================
CREATE TABLE users (
    id TEXT PRIMARY KEY,                    -- UUID
    org_id TEXT NOT NULL,                   -- FK to orgs
    email TEXT,                             -- Nullable for anonymous employees
    hashed_id TEXT,                         -- SHA256 of browser fingerprint (if no email)
    password_hash TEXT,                     -- Only for admins (bcrypt)
    role TEXT NOT NULL DEFAULT 'employee',  -- 'admin' or 'employee'
    extension_installed INTEGER NOT NULL DEFAULT 0,  -- 0 or 1
    last_seen_at TEXT,                      -- ISO timestamp of last extension activity
    block_count INTEGER NOT NULL DEFAULT 0, -- Total blocks for this user
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_hashed_id ON users(hashed_id);

-- =============================================================================
-- Organization Configuration (rules)
-- =============================================================================
CREATE TABLE org_config (
    id TEXT PRIMARY KEY,                    -- UUID
    org_id TEXT NOT NULL UNIQUE,            -- FK to orgs (one config per org)

    -- Approved AI tools (1 = approved, 0 = warn only)
    ai_chatgpt INTEGER NOT NULL DEFAULT 1,
    ai_claude INTEGER NOT NULL DEFAULT 1,
    ai_gemini INTEGER NOT NULL DEFAULT 1,
    ai_other INTEGER NOT NULL DEFAULT 0,    -- "Other" always warn-only

    -- Data type actions ('WARN' or 'BLOCK')
    action_email TEXT NOT NULL DEFAULT 'WARN',
    action_phone TEXT NOT NULL DEFAULT 'WARN',
    action_iban TEXT NOT NULL DEFAULT 'BLOCK',

    -- Optional approved AI URL
    approved_ai_url TEXT,                   -- e.g., "https://internal-ai.company.com"

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,

    CHECK (action_email IN ('WARN', 'BLOCK')),
    CHECK (action_phone IN ('WARN', 'BLOCK')),
    CHECK (action_iban IN ('WARN', 'BLOCK'))
);

CREATE INDEX idx_org_config_org_id ON org_config(org_id);

-- =============================================================================
-- Events (WARN/BLOCK occurrences - NO CONTENT STORED)
-- =============================================================================
CREATE TABLE events (
    id TEXT PRIMARY KEY,                    -- UUID
    org_id TEXT NOT NULL,                   -- FK to orgs
    user_id TEXT NOT NULL,                  -- FK to users

    -- Event metadata (NO clipboard content or prompts)
    timestamp TEXT NOT NULL,                -- ISO string from extension
    ai_domain TEXT NOT NULL,                -- e.g., "chatgpt.com", "claude.ai"
    rule_id TEXT NOT NULL,                  -- e.g., "R1"
    data_types TEXT NOT NULL,               -- JSON array: ["EMAIL", "PHONE"]
    action TEXT NOT NULL,                   -- 'WARN' or 'BLOCK'
    extension_version TEXT NOT NULL,        -- e.g., "1.0.0"

    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CHECK (action IN ('WARN', 'BLOCK'))
);

CREATE INDEX idx_events_org_id ON events(org_id);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_ai_domain ON events(ai_domain);
CREATE INDEX idx_events_action ON events(action);

-- =============================================================================
-- Sessions (admin JWT tokens - optional, can use stateless JWT)
-- =============================================================================
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,                    -- UUID (jti claim)
    user_id TEXT NOT NULL,                  -- FK to users
    expires_at TEXT NOT NULL,               -- ISO timestamp
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
