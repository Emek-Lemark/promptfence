// lib/db.js - SQLite database setup and utilities
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Initialize database connection (lazy)
let db = null;

function getDb() {
  if (!db) {
    // Resolve DB path at runtime to avoid build-time env var access
    const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'promptfence.db');

    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

// Initialize schema (from shared/db_schema.sql)
function initSchema() {
  db.exec(`
    -- Organizations
    CREATE TABLE IF NOT EXISTS orgs (
        id TEXT PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        name TEXT,
        industry TEXT,
        install_code TEXT NOT NULL UNIQUE,
        setup_completed INTEGER NOT NULL DEFAULT 0,
        policy_text TEXT,
        plan TEXT NOT NULL DEFAULT 'trial',
        seats INTEGER NOT NULL DEFAULT 10,
        trial_ends_at TEXT,
        paddle_subscription_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_orgs_domain ON orgs(domain);
    CREATE INDEX IF NOT EXISTS idx_orgs_install_code ON orgs(install_code);

    -- Users (admins and employees)
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        email TEXT,
        hashed_id TEXT,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'employee',
        extension_installed INTEGER NOT NULL DEFAULT 0,
        last_seen_at TEXT,
        block_count INTEGER NOT NULL DEFAULT 0,
        warn_count INTEGER NOT NULL DEFAULT 0,
        invite_status TEXT DEFAULT 'active',
        invite_token TEXT,
        invited_at TEXT,
        policy_acknowledged_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_hashed_id ON users(hashed_id);

    -- Organization Configuration (full policy)
    CREATE TABLE IF NOT EXISTS org_config (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL UNIQUE,
        preset TEXT NOT NULL DEFAULT 'workplace',
        -- AI platforms (1 = monitored, 0 = not monitored)
        ai_chatgpt INTEGER NOT NULL DEFAULT 1,
        ai_claude INTEGER NOT NULL DEFAULT 1,
        ai_gemini INTEGER NOT NULL DEFAULT 1,
        ai_perplexity INTEGER NOT NULL DEFAULT 0,
        ai_copilot INTEGER NOT NULL DEFAULT 0,
        ai_mistral INTEGER NOT NULL DEFAULT 0,
        ai_slack INTEGER NOT NULL DEFAULT 0,
        ai_gmail INTEGER NOT NULL DEFAULT 0,
        ai_notion INTEGER NOT NULL DEFAULT 0,
        ai_linear INTEGER NOT NULL DEFAULT 0,
        ai_outlook INTEGER NOT NULL DEFAULT 0,
        ai_other INTEGER NOT NULL DEFAULT 0,
        -- Detection rules: ALLOW, WARN, or BLOCK
        action_email TEXT NOT NULL DEFAULT 'WARN',
        action_phone TEXT NOT NULL DEFAULT 'WARN',
        action_iban TEXT NOT NULL DEFAULT 'BLOCK',
        action_credit_card TEXT NOT NULL DEFAULT 'BLOCK',
        action_address TEXT NOT NULL DEFAULT 'WARN',
        action_password TEXT NOT NULL DEFAULT 'BLOCK',
        -- Custom blocked terms (JSON array of strings)
        custom_terms TEXT NOT NULL DEFAULT '[]',
        -- Approved alternative AI URL
        approved_ai_url TEXT,
        -- File upload warnings
        file_upload_warning INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_org_config_org_id ON org_config(org_id);

    -- Events (WARN/BLOCK occurrences - NO CONTENT STORED)
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        ai_domain TEXT NOT NULL,
        rule_id TEXT NOT NULL DEFAULT 'R1',
        data_types TEXT NOT NULL,
        action TEXT NOT NULL,
        extension_version TEXT NOT NULL DEFAULT '1.0.0',
        acknowledged INTEGER NOT NULL DEFAULT 0,
        acknowledged_by TEXT,
        acknowledged_at TEXT,
        acknowledged_note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CHECK (action IN ('WARN', 'BLOCK'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);
    CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_ai_domain ON events(ai_domain);
    CREATE INDEX IF NOT EXISTS idx_events_action ON events(action);

    -- AI platform visits (shadow AI discovery - metadata only)
    CREATE TABLE IF NOT EXISTS platform_visits (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        ai_domain TEXT NOT NULL,
        visited_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_platform_visits_org_id ON platform_visits(org_id);
    CREATE INDEX IF NOT EXISTS idx_platform_visits_ai_domain ON platform_visits(ai_domain);

    -- Sessions
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);

  // AI tool inventory — admin-set approval status per org
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_tools (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'discovered',
      risk_level TEXT NOT NULL DEFAULT 'limited',
      notes TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(org_id, domain),
      FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
      CHECK (status IN ('approved', 'flagged', 'discovered')),
      CHECK (risk_level IN ('minimal', 'limited', 'high'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_tools_org_id ON ai_tools(org_id);
  `);

  // Compliance report log
  db.exec(`
    CREATE TABLE IF NOT EXISTS compliance_reports (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      generated_by TEXT,
      period_from TEXT,
      period_to TEXT,
      generated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_compliance_reports_org_id ON compliance_reports(org_id);
  `);

  // Migrations — safe to run repeatedly
  const migrations = [
    `ALTER TABLE orgs ADD COLUMN paddle_customer_id TEXT`,
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}

module.exports = { getDb };
