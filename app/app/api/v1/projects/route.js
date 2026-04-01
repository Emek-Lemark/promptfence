/**
 * app/api/v1/projects/route.js — Developer project management
 *
 * GET    /api/v1/projects          — list projects for org
 * POST   /api/v1/projects          — create project
 * PATCH  /api/v1/projects?id=...   — update project
 * DELETE /api/v1/projects?id=...   — delete project
 *
 * Auth: JWT (admin session)
 */

'use strict';

import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getDb } from '../../../../lib/db';
import { randomUUID } from 'crypto';

function auth(request) {
  const a = request.headers.get('authorization') || '';
  const token = a.startsWith('Bearer ') ? a.slice(7) : null;
  if (!token) return { error: 'Unauthorized', status: 401 };
  const payload = verifyToken(token);
  if (!payload) return { error: 'Invalid or expired token', status: 401 };
  return { payload };
}

export async function GET(request) {
  const { payload, error, status } = auth(request);
  if (error) return NextResponse.json({ error }, { status });

  const db = getDb();
  const projects = db.prepare(`
    SELECT p.id, p.name, p.description, p.rules, p.custom_terms,
           p.webhook_url, p.created_at, p.updated_at,
           COUNT(DISTINCT k.id) as key_count,
           COUNT(DISTINCT CASE WHEN k.revoked_at IS NULL THEN k.id END) as active_key_count,
           SUM(k.calls_total) as total_calls
    FROM dev_projects p
    LEFT JOIN api_keys k ON k.project_id = p.id
    WHERE p.org_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all(payload.orgId);

  return NextResponse.json({
    projects: projects.map(p => ({
      ...p,
      rules:        p.rules ? JSON.parse(p.rules) : {},
      custom_terms: p.custom_terms ? JSON.parse(p.custom_terms) : [],
      total_calls:  p.total_calls || 0,
    })),
  });
}

export async function POST(request) {
  const { payload, error, status } = auth(request);
  if (error) return NextResponse.json({ error }, { status });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { name, description, rules, custom_terms } = body;
  if (!name || !name.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const db = getDb();
  const id = randomUUID();

  db.prepare(`
    INSERT INTO dev_projects (id, org_id, name, description, rules, custom_terms)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.orgId,
    name.trim(),
    description || null,
    JSON.stringify(rules || {}),
    JSON.stringify(custom_terms || []),
  );

  const project = db.prepare(`SELECT * FROM dev_projects WHERE id = ?`).get(id);
  return NextResponse.json({
    ...project,
    rules:        JSON.parse(project.rules),
    custom_terms: JSON.parse(project.custom_terms),
  }, { status: 201 });
}

export async function PATCH(request) {
  const { payload, error, status } = auth(request);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const db = getDb();
  const project = db.prepare(`SELECT * FROM dev_projects WHERE id = ? AND org_id = ?`).get(id, payload.orgId);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const name         = body.name ?? project.name;
  const description  = body.description !== undefined ? body.description : project.description;
  const rules        = body.rules !== undefined ? JSON.stringify(body.rules) : project.rules;
  const custom_terms = body.custom_terms !== undefined ? JSON.stringify(body.custom_terms) : project.custom_terms;

  db.prepare(`
    UPDATE dev_projects
    SET name = ?, description = ?, rules = ?, custom_terms = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name, description, rules, custom_terms, id);

  const updated = db.prepare(`SELECT * FROM dev_projects WHERE id = ?`).get(id);
  return NextResponse.json({
    ...updated,
    rules:        JSON.parse(updated.rules),
    custom_terms: JSON.parse(updated.custom_terms),
  });
}

export async function DELETE(request) {
  const { payload, error, status } = auth(request);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = getDb();
  const result = db.prepare(`DELETE FROM dev_projects WHERE id = ? AND org_id = ?`).run(id, payload.orgId);
  if (result.changes === 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
