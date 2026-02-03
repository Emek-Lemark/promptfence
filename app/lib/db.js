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
        install_code TEXT NOT NULL UNIQUE,
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
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_hashed_id ON users(hashed_id);

    -- Organization Configuration (rules)
    CREATE TABLE IF NOT EXISTS org_config (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL UNIQUE,
        ai_chatgpt INTEGER NOT NULL DEFAULT 1,
        ai_claude INTEGER NOT NULL DEFAULT 1,
        ai_gemini INTEGER NOT NULL DEFAULT 1,
        ai_other INTEGER NOT NULL DEFAULT 0,
        action_email TEXT NOT NULL DEFAULT 'WARN',
        action_phone TEXT NOT NULL DEFAULT 'WARN',
        action_iban TEXT NOT NULL DEFAULT 'BLOCK',
        approved_ai_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
        CHECK (action_email IN ('WARN', 'BLOCK')),
        CHECK (action_phone IN ('WARN', 'BLOCK')),
        CHECK (action_iban IN ('WARN', 'BLOCK'))
    );

    CREATE INDEX IF NOT EXISTS idx_org_config_org_id ON org_config(org_id);

    -- Events (WARN/BLOCK occurrences - NO CONTENT STORED)
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        ai_domain TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        data_types TEXT NOT NULL,
        action TEXT NOT NULL,
        extension_version TEXT NOT NULL,
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
}

module.exports = { getDb };
