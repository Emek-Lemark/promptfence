/**
 * app/api/v1/keys/route.js — API key management
 *
 * GET  /api/v1/keys          — list keys for a project
 * POST /api/v1/keys          — create a new key
 * DELETE /api/v1/keys?id=... — revoke a key
 *
 * Auth: JWT (admin session) — developers manage keys from the dashboard
 */

'use strict';

import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getDb } from '../../../../lib/db';
import { generateApiKey, hashKey } from '../../../../lib/apiKeyAuth';
import { randomUUID } from 'crypto';

function authOrError(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { error: 'Unauthorized', status: 401 };
  const payload = verifyToken(token);
  if (!payload) return { error: 'Invalid or expired token', status: 401 };
  return { payload };
}

// GET /api/v1/keys?project_id=...
export async function GET(request) {
  const { payload, error, status } = authOrError(request);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  const db = getDb();

  // Verify project belongs to org
  const project = db.prepare(`SELECT id FROM dev_projects WHERE id = ? AND org_id = ?`)
    .get(projectId, payload.orgId);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const keys = db.prepare(`
    SELECT id, name, env,
           substr(key_prefix, 1, 12) || '...' as key_preview,
           key_prefix,
           rate_limit_per_min, monthly_limit,
           calls_this_month, calls_total,
           last_used_at, revoked_at, created_at
    FROM api_keys
    WHERE project_id = ? AND org_id = ?
    ORDER BY created_at DESC
  `).all(projectId, payload.orgId);

  return NextResponse.json({ keys });
}

// POST /api/v1/keys
// Body: { project_id, name, env, rate_limit_per_min?, monthly_limit? }
export async function POST(request) {
  const { payload, error, status } = authOrError(request);
  if (error) return NextResponse.json({ error }, { status });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { project_id, name, env = 'live', rate_limit_per_min = 60, monthly_limit } = body;
  if (!project_id || !name) return NextResponse.json({ error: 'project_id and name required' }, { status: 400 });
  if (!['live', 'test'].includes(env)) return NextResponse.json({ error: 'env must be live or test' }, { status: 400 });

  const db = getDb();

  // Verify project belongs to org
  const project = db.prepare(`SELECT id FROM dev_projects WHERE id = ? AND org_id = ?`)
    .get(project_id, payload.orgId);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const rawKey = generateApiKey(env);
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 16); // pf_live_xxxxxxxx — safe prefix for display
  const id = randomUUID();

  db.prepare(`
    INSERT INTO api_keys (id, org_id, project_id, name, key_hash, key_prefix, env, rate_limit_per_min, monthly_limit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, payload.orgId, project_id, name, keyHash, keyPrefix, env, rate_limit_per_min, monthly_limit || null);

  // Return raw key ONCE — never stored
  return NextResponse.json({
    id,
    name,
    env,
    key: rawKey,        // shown once
    key_preview: keyPrefix + '...',
    message: 'Store this key securely — it will not be shown again.',
  }, { status: 201 });
}

// DELETE /api/v1/keys?id=...
export async function DELETE(request) {
  const { payload, error, status } = authOrError(request);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = getDb();
  const result = db.prepare(`
    UPDATE api_keys SET revoked_at = datetime('now')
    WHERE id = ? AND org_id = ? AND revoked_at IS NULL
  `).run(id, payload.orgId);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Key not found or already revoked' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'API key revoked' });
}
