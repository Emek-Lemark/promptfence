/**
 * lib/apiKeyAuth.js — API key authentication for developer product
 *
 * Keys are prefixed: pf_live_... or pf_test_...
 * Stored hashed (SHA-256) in db — raw key only shown once at creation.
 */

'use strict';

const crypto = require('crypto');
const { getDb } = require('./db');

function hashKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function generateApiKey(env) {
  const prefix = env === 'test' ? 'pf_test_' : 'pf_live_';
  const random = crypto.randomBytes(32).toString('hex');
  return prefix + random;
}

/**
 * Authenticate a request using X-PromptFence-Key or Authorization: Bearer pf_...
 * Returns { project, org } or { error, status }
 */
function requireApiKey(request) {
  let rawKey = request.headers.get('x-promptfence-key');

  if (!rawKey) {
    const auth = request.headers.get('authorization') || '';
    if (auth.startsWith('Bearer pf_')) {
      rawKey = auth.slice(7);
    }
  }

  if (!rawKey) {
    return { error: { code: 'MISSING_API_KEY', message: 'Provide API key via X-PromptFence-Key header or Authorization: Bearer pf_...' }, status: 401 };
  }

  if (!rawKey.startsWith('pf_live_') && !rawKey.startsWith('pf_test_')) {
    return { error: { code: 'INVALID_API_KEY', message: 'Invalid API key format' }, status: 401 };
  }

  const db = getDb();
  const hash = hashKey(rawKey);

  const key = db.prepare(`
    SELECT k.id, k.project_id, k.org_id, k.name, k.env, k.rate_limit_per_min,
           k.calls_this_month, k.monthly_limit, k.revoked_at,
           p.name as project_name, p.rules as project_rules, p.custom_terms as project_custom_terms,
           p.webhook_url as project_webhook_url
    FROM api_keys k
    JOIN dev_projects p ON p.id = k.project_id
    WHERE k.key_hash = ? AND k.revoked_at IS NULL
    LIMIT 1
  `).get(hash);

  if (!key) {
    return { error: { code: 'INVALID_API_KEY', message: 'API key not found or revoked' }, status: 401 };
  }

  // Check monthly call limit
  if (key.monthly_limit && key.calls_this_month >= key.monthly_limit) {
    return { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Monthly call limit reached. Upgrade your plan.' }, status: 429 };
  }

  // Increment call counter
  db.prepare(`
    UPDATE api_keys SET
      calls_this_month = calls_this_month + 1,
      calls_total = calls_total + 1,
      last_used_at = datetime('now')
    WHERE id = ?
  `).run(key.id);

  return {
    key,
    project: {
      id:           key.project_id,
      name:         key.project_name,
      rules:        key.project_rules ? JSON.parse(key.project_rules) : null,
      customTerms:  key.project_custom_terms ? JSON.parse(key.project_custom_terms) : [],
      webhookUrl:   key.project_webhook_url || null,
    },
    orgId: key.org_id,
  };
}

module.exports = { requireApiKey, generateApiKey, hashKey };
