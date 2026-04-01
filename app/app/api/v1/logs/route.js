/**
 * app/api/v1/logs/route.js — Proxy & scan log retrieval
 *
 * GET /api/v1/logs?project_id=...&from=...&to=...&action=...&limit=...&offset=...
 * Auth: JWT (admin session)
 *
 * Returns paginated log entries with aggregate stats.
 * No content is ever stored — only metadata (action, types, tokens, latency).
 */

'use strict';

import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getDb } from '../../../../lib/db';

export async function GET(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId   = searchParams.get('project_id');
  const from        = searchParams.get('from');
  const to          = searchParams.get('to');
  const action      = searchParams.get('action');  // ALLOW | WARN | BLOCK
  const limit       = Math.min(parseInt(searchParams.get('limit') || '50'), 500);
  const offset      = parseInt(searchParams.get('offset') || '0');

  const db = getDb();

  // Build query
  const conditions = ['l.org_id = ?'];
  const params = [payload.orgId];

  if (projectId) { conditions.push('l.project_id = ?'); params.push(projectId); }
  if (from)      { conditions.push('l.timestamp >= ?'); params.push(from); }
  if (to)        { conditions.push('l.timestamp <= ?'); params.push(to); }
  if (action)    { conditions.push('l.action = ?'); params.push(action.toUpperCase()); }

  const where = conditions.join(' AND ');

  // Total count for pagination
  const { total } = db.prepare(`SELECT COUNT(*) as total FROM proxy_logs l WHERE ${where}`).get(...params);

  // Logs with project name
  const logs = db.prepare(`
    SELECT l.id, l.project_id, p.name as project_name,
           l.provider, l.model, l.detected_types,
           l.action, l.prompt_tokens, l.latency_ms, l.timestamp
    FROM proxy_logs l
    LEFT JOIN dev_projects p ON p.id = l.project_id
    WHERE ${where}
    ORDER BY l.timestamp DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  // Aggregate stats (same filters, no pagination)
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_calls,
      SUM(CASE WHEN action = 'ALLOW' THEN 1 ELSE 0 END) as allowed,
      SUM(CASE WHEN action = 'WARN' THEN 1 ELSE 0 END)  as warned,
      SUM(CASE WHEN action = 'BLOCK' THEN 1 ELSE 0 END) as blocked,
      SUM(prompt_tokens) as total_tokens,
      AVG(latency_ms)    as avg_latency_ms
    FROM proxy_logs l WHERE ${where}
  `).get(...params);

  return NextResponse.json({
    logs: logs.map(l => ({
      ...l,
      detected_types: JSON.parse(l.detected_types || '[]'),
    })),
    stats: {
      total_calls:    stats.total_calls,
      allowed:        stats.allowed,
      warned:         stats.warned,
      blocked:        stats.blocked,
      total_tokens:   stats.total_tokens || 0,
      avg_latency_ms: stats.avg_latency_ms ? Math.round(stats.avg_latency_ms) : null,
      block_rate:     stats.total_calls > 0
        ? ((stats.blocked / stats.total_calls) * 100).toFixed(1) + '%'
        : '0%',
    },
    pagination: { total, limit, offset, has_more: offset + limit < total },
  });
}
