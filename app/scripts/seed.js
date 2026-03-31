/**
 * seed.js — Creates the super admin / demo account.
 *
 * Run once after first deploy:
 *   node scripts/seed.js
 *
 * Safe to re-run — skips if account already exists.
 * Reads from environment variables (set these in Railway):
 *   SUPER_ADMIN_EMAIL
 *   SUPER_ADMIN_PASSWORD
 *   DATABASE_PATH (optional — defaults to ./data/promptfence.db)
 */

'use strict';

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ── Config ──────────────────────────────────────────────────────────────────
const EMAIL    = process.env.SUPER_ADMIN_EMAIL    || 'emeka@promptfence.ai';
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const DB_PATH  = process.env.DATABASE_PATH        || path.join(process.cwd(), 'data', 'promptfence.db');

if (!PASSWORD) {
  console.error('❌  SUPER_ADMIN_PASSWORD env var is required.');
  process.exit(1);
}

// ── DB ───────────────────────────────────────────────────────────────────────
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const Database = require('better-sqlite3');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Run the full schema (same as lib/db.js — idempotent)
const { getDb } = require('../lib/db');
getDb(); // triggers schema init

// ── Seed ────────────────────────────────────────────────────────────────────
const domain = EMAIL.split('@')[1];

// Check if already exists
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(EMAIL);
if (existing) {
  console.log(`✓  Super admin already exists: ${EMAIL}`);
  console.log('   Nothing to do.');
  process.exit(0);
}

const orgId    = uuidv4();
const userId   = uuidv4();
const hashPw   = bcrypt.hashSync(PASSWORD, 10);

// Generate a memorable install code for demo purposes
const installCode = 'DEMO' + Math.random().toString(36).slice(2, 6).toUpperCase();

// Create org — plan 'super' bypasses all trial gates
db.prepare(`
  INSERT INTO orgs (
    id, domain, name, install_code,
    plan, seats, setup_completed,
    trial_ends_at, created_at, updated_at
  ) VALUES (
    ?, ?, 'PromptFence Demo', ?,
    'super', 999, 1,
    '2099-12-31', datetime('now'), datetime('now')
  )
`).run(orgId, domain, installCode);

// Create admin config
db.prepare(`
  INSERT INTO org_config (
    org_id, preset,
    ai_chatgpt, ai_claude, ai_gemini, ai_perplexity, ai_copilot,
    ai_mistral, ai_slack, ai_gmail, ai_notion, ai_linear, ai_outlook, ai_other,
    action_email, action_phone, action_iban, action_credit_card, action_address, action_password,
    custom_terms, file_upload_warning
  ) VALUES (
    ?, 'workplace',
    1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1,
    'WARN', 'WARN', 'BLOCK', 'BLOCK', 'WARN', 'BLOCK',
    '[]', 1
  )
`).run(orgId);

// Create super admin user
db.prepare(`
  INSERT INTO users (
    id, org_id, email, password_hash, role,
    extension_installed, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, 'admin',
    0, datetime('now'), datetime('now')
  )
`).run(userId, orgId, EMAIL, hashPw);

console.log('');
console.log('✅  Super admin created successfully!');
console.log('');
console.log(`   Email:        ${EMAIL}`);
console.log(`   Install code: ${installCode}`);
console.log(`   Plan:         super (no trial expiry)`);
console.log('');
console.log('   Login at: https://app.promptfence.ai/login');
console.log('');
console.log('⚠️   Remember to change the password after first login.');
console.log('');
