// GET  /api/compliance - Compliance stats + AI tool inventory
// PATCH /api/compliance - Approve or flag an AI tool
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { requireAdmin } = require('@/lib/auth');

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const db = getDb();
    const orgId = auth.user.orgId;
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const quarterAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // ── Team literacy / training ──────────────────────────────────────
    const totalUsers = db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE org_id = ?'
    ).get(orgId);

    const trainedUsers = db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE org_id = ? AND policy_acknowledged_at IS NOT NULL'
    ).get(orgId);

    const pctTrained = totalUsers.count > 0
      ? Math.round((trainedUsers.count / totalUsers.count) * 100)
      : 0;

    // ── Incident stats ────────────────────────────────────────────────
    const quarterBlocks = db.prepare(
      "SELECT COUNT(*) as count FROM events WHERE org_id = ? AND action = 'BLOCK' AND timestamp >= ?"
    ).get(orgId, quarterAgo);

    const acknowledgedBlocks = db.prepare(
      "SELECT COUNT(*) as count FROM events WHERE org_id = ? AND action = 'BLOCK' AND acknowledged = 1 AND timestamp >= ?"
    ).get(orgId, quarterAgo);

    const pendingBlocks = db.prepare(
      "SELECT COUNT(*) as count FROM events WHERE org_id = ? AND action = 'BLOCK' AND acknowledged = 0"
    ).get(orgId);

    const resolutionRate = quarterBlocks.count > 0
      ? Math.round((acknowledgedBlocks.count / quarterBlocks.count) * 100)
      : 100;

    // ── AI Inventory ──────────────────────────────────────────────────
    // Aggregate discovered domains from platform_visits
    const discovered = db.prepare(`
      SELECT ai_domain,
             COUNT(DISTINCT user_id) as users,
             COUNT(*) as visits,
             MAX(visited_at) as last_seen
      FROM platform_visits
      WHERE org_id = ?
      GROUP BY ai_domain
      ORDER BY visits DESC
    `).all(orgId);

    // Fetch admin-set statuses
    const toolRows = db.prepare(
      'SELECT domain, status, risk_level, notes, reviewed_at FROM ai_tools WHERE org_id = ?'
    ).all(orgId);
    const toolMap = {};
    for (const t of toolRows) toolMap[t.domain] = t;

    const inventory = discovered.map((d) => ({
      domain: d.ai_domain,
      users: d.users,
      visits: d.visits,
      lastSeen: d.last_seen,
      status: toolMap[d.ai_domain]?.status || 'discovered',
      riskLevel: toolMap[d.ai_domain]?.risk_level || 'limited',
      notes: toolMap[d.ai_domain]?.notes || null,
      reviewedAt: toolMap[d.ai_domain]?.reviewed_at || null,
    }));

    // Also include tools that are approved/flagged but may not have recent visits
    for (const t of toolRows) {
      if (!discovered.find((d) => d.ai_domain === t.domain)) {
        inventory.push({
          domain: t.domain,
          users: 0,
          visits: 0,
          lastSeen: null,
          status: t.status,
          riskLevel: t.risk_level,
          notes: t.notes,
          reviewedAt: t.reviewed_at,
        });
      }
    }

    const approvedTools = inventory.filter((t) => t.status === 'approved').length;
    const flaggedTools = inventory.filter((t) => t.status === 'flagged').length;

    // ── Posture score (0–100) ─────────────────────────────────────────
    // Weighted: 40% trained, 30% incidents resolved, 30% tools reviewed
    const reviewedTools = inventory.filter((t) => t.status !== 'discovered').length;
    const pctToolsReviewed = inventory.length > 0
      ? Math.round((reviewedTools / inventory.length) * 100)
      : 100;

    const postureScore = Math.round(
      (pctTrained * 0.4) + (resolutionRate * 0.3) + (pctToolsReviewed * 0.3)
    );

    // ── Last report generated ─────────────────────────────────────────
    const lastReport = db.prepare(
      'SELECT generated_at FROM compliance_reports WHERE org_id = ? ORDER BY generated_at DESC LIMIT 1'
    ).get(orgId);

    return NextResponse.json({
      posture: {
        score: postureScore,
        pctTrained,
        resolutionRate,
        pctToolsReviewed,
      },
      team: {
        total: totalUsers.count,
        trained: trainedUsers.count,
        pctTrained,
      },
      incidents: {
        quarterTotal: quarterBlocks.count,
        acknowledged: acknowledgedBlocks.count,
        pending: pendingBlocks.count,
        resolutionRate,
      },
      inventory,
      summary: {
        approvedTools,
        flaggedTools,
        discoveredTools: inventory.length,
        lastReportAt: lastReport?.generated_at || null,
      },
    });
  } catch (error) {
    console.error('Compliance GET error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { domain, status, riskLevel, notes } = body;

    if (!domain || !['approved', 'flagged', 'discovered'].includes(status)) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'domain and valid status required' } },
        { status: 400 },
      );
    }

    const db = getDb();
    const { v4: uuidv4 } = require('uuid');

    db.prepare(`
      INSERT INTO ai_tools (id, org_id, domain, status, risk_level, notes, reviewed_by, reviewed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(org_id, domain) DO UPDATE SET
        status = excluded.status,
        risk_level = excluded.risk_level,
        notes = excluded.notes,
        reviewed_by = excluded.reviewed_by,
        reviewed_at = excluded.reviewed_at,
        updated_at = excluded.updated_at
    `).run(uuidv4(), auth.user.orgId, domain, status, riskLevel || 'limited', notes || null, auth.user.userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Compliance PATCH error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 },
    );
  }
}
