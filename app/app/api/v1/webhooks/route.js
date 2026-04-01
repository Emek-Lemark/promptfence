/**
 * app/api/v1/webhooks/route.js — Webhook configuration per project
 *
 * GET    /api/v1/webhooks?project_id=... — get webhook config
 * PUT    /api/v1/webhooks                — set/update webhook URL + secret
 * DELETE /api/v1/webhooks?project_id=... — remove webhook
 * POST   /api/v1/webhooks/test           — send a test event
 *
 * Auth: JWT (admin session)
 */

'use strict';

import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getDb } from '../../../../lib/db';
import { randomUUID, createHmac } from 'crypto';

function auth(request) {
  const a = request.headers.get('authorization') || '';
  const token = a.startsWith('Bearer ') ? a.slice(7) : null;
  if (!token) return { error: 'Unauthorized', status: 401 };
  const payload = verifyToken(token);
  if (!payload) return { error: 'Invalid or expired token', status: 401 };
  return { payload };
}

// GET /api/v1/webhooks?project_id=...
export async function GET(request) {
  const { payload, error, status } = auth(request);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  const db = getDb();
  const project = db.prepare(`SELECT id, webhook_url, webhook_secret FROM dev_projects WHERE id = ? AND org_id = ?`)
    .get(projectId, payload.orgId);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Recent deliveries
  const deliveries = db.prepare(`
    SELECT id, event_type, response_status, delivered_at, failed_at, created_at
    FROM webhook_deliveries
    WHERE project_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(projectId);

  return NextResponse.json({
    webhook_url:    project.webhook_url,
    has_secret:     !!project.webhook_secret,
    recent_deliveries: deliveries,
  });
}

// PUT /api/v1/webhooks
// Body: { project_id, webhook_url, webhook_secret? }
export async function PUT(request) {
  const { payload, error, status } = auth(request);
  if (error) return NextResponse.json({ error }, { status });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { project_id, webhook_url, webhook_secret } = body;
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 });
  if (webhook_url && !webhook_url.startsWith('https://')) {
    return NextResponse.json({ error: 'webhook_url must use HTTPS' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`
    UPDATE dev_projects
    SET webhook_url = ?, webhook_secret = ?, updated_at = datetime('now')
    WHERE id = ? AND org_id = ?
  `).run(webhook_url || null, webhook_secret || null, project_id, payload.orgId);

  if (result.changes === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  return NextResponse.json({ success: true, webhook_url, has_secret: !!webhook_secret });
}

// DELETE /api/v1/webhooks?project_id=...
export async function DELETE(request) {
  const { payload, error, status } = auth(request);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  const db = getDb();
  db.prepare(`UPDATE dev_projects SET webhook_url = NULL, webhook_secret = NULL WHERE id = ? AND org_id = ?`)
    .run(projectId, payload.orgId);

  return NextResponse.json({ success: true });
}

// POST /api/v1/webhooks/test — sends a test ping to the configured URL
export async function POST(request) {
  const { payload, error, status } = auth(request);
  if (error) return NextResponse.json({ error }, { status });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { project_id } = body;
  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  const db = getDb();
  const project = db.prepare(`SELECT id, webhook_url, webhook_secret FROM dev_projects WHERE id = ? AND org_id = ?`)
    .get(project_id, payload.orgId);

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!project.webhook_url) return NextResponse.json({ error: 'No webhook URL configured' }, { status: 400 });

  const testPayload = {
    event: 'test.ping',
    project_id: project.id,
    org_id: payload.orgId,
    timestamp: new Date().toISOString(),
    data: { message: 'PromptFence webhook test event' },
  };

  const deliveryId = randomUUID();
  const bodyStr = JSON.stringify(testPayload);

  // Sign if secret configured
  const headers = { 'Content-Type': 'application/json', 'X-PromptFence-Event': 'test.ping' };
  if (project.webhook_secret) {
    const sig = createHmac('sha256', project.webhook_secret).update(bodyStr).digest('hex');
    headers['X-PromptFence-Signature'] = `sha256=${sig}`;
  }

  try {
    const resp = await fetch(project.webhook_url, {
      method: 'POST',
      headers,
      body: bodyStr,
      signal: AbortSignal.timeout(5000),
    });

    db.prepare(`
      INSERT INTO webhook_deliveries (id, org_id, project_id, event_type, payload, response_status, delivered_at)
      VALUES (?, ?, ?, 'test.ping', ?, ?, datetime('now'))
    `).run(deliveryId, payload.orgId, project_id, bodyStr, resp.status);

    return NextResponse.json({
      success: resp.ok,
      status: resp.status,
      message: resp.ok ? 'Test event delivered successfully' : `Endpoint returned ${resp.status}`,
    });
  } catch (err) {
    db.prepare(`
      INSERT INTO webhook_deliveries (id, org_id, project_id, event_type, payload, failed_at)
      VALUES (?, ?, ?, 'test.ping', ?, datetime('now'))
    `).run(deliveryId, payload.orgId, project_id, bodyStr);

    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
