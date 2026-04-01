/**
 * /api/admin — Platform admin API
 * Protected by ADMIN_SECRET env var (not JWT — completely separate auth)
 *
 * GET  /api/admin          — platform stats (orgs, MRR, churn, signups)
 * POST /api/admin          — promote org to super plan
 */

import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');

function checkSecret(request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return { error: 'ADMIN_SECRET not configured', status: 500 };
  const provided = request.headers.get('x-admin-secret');
  if (!provided || provided !== secret) return { error: 'Unauthorized', status: 401 };
  return { ok: true };
}

export async function GET(request) {
  const auth = checkSecret(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = getDb();

  // All orgs with user counts and event counts
  const orgs = db.prepare(`
    SELECT
      o.id, o.domain, o.name, o.plan, o.trial_ends_at,
      o.paddle_customer_id, o.created_at,
      COUNT(DISTINCT u.id) as member_count,
      COUNT(DISTINCT e.id) as event_count,
      MAX(e.created_at) as last_event_at
    FROM orgs o
    LEFT JOIN users u ON u.org_id = o.id
    LEFT JOIN events e ON e.org_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all();

  // Aggregate stats
  const total       = orgs.length;
  const trialling   = orgs.filter(o => o.plan === 'trial').length;
  const active      = orgs.filter(o => o.plan === 'active').length;
  const cancelled   = orgs.filter(o => o.plan === 'cancelled').length;
  const superPlans  = orgs.filter(o => o.plan === 'super').length;

  // Trial expired (trial plan + past trial_ends_at)
  const now = new Date();
  const trialExpired = orgs.filter(o =>
    o.plan === 'trial' && o.trial_ends_at && new Date(o.trial_ends_at) < now
  ).length;

  // Signups last 7 days
  const last7days = orgs.filter(o => {
    const created = new Date(o.created_at);
    return (now - created) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  // Signups last 30 days
  const last30days = orgs.filter(o => {
    const created = new Date(o.created_at);
    return (now - created) < 30 * 24 * 60 * 60 * 1000;
  }).length;

  // MRR estimate (active plans — Paddle is source of truth but this is a rough view)
  // Team = €49, Business = €149 — we don't store which plan tier yet so show active count
  const mrrEstimate = active * 49; // conservative — assumes all Team plan

  // Recent signups (last 10)
  const recentSignups = orgs.slice(0, 10).map(o => ({
    domain: o.domain,
    plan: o.plan,
    members: o.member_count,
    events: o.event_count,
    trialEndsAt: o.trial_ends_at,
    createdAt: o.created_at,
  }));

  return NextResponse.json({
    stats: {
      total,
      trialling,
      trialExpired,
      active,
      cancelled,
      superPlans,
      last7days,
      last30days,
      mrrEstimate,
    },
    orgs: orgs.map(o => ({
      id: o.id,
      domain: o.domain,
      name: o.name,
      plan: o.plan,
      members: o.member_count,
      events: o.event_count,
      lastEventAt: o.last_event_at,
      trialEndsAt: o.trial_ends_at,
      hasPaddle: !!o.paddle_customer_id,
      createdAt: o.created_at,
    })),
    recentSignups,
  });
}

export async function POST(request) {
  const auth = checkSecret(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, domain, plan } = body;

  const db = getDb();

  // Promote/change org plan
  if (action === 'set_plan') {
    if (!domain || !plan) return NextResponse.json({ error: 'domain and plan required' }, { status: 400 });
    const validPlans = ['trial', 'active', 'cancelled', 'super'];
    if (!validPlans.includes(plan)) return NextResponse.json({ error: `plan must be one of: ${validPlans.join(', ')}` }, { status: 400 });

    const result = db.prepare(`UPDATE orgs SET plan = ?, updated_at = datetime('now') WHERE domain = ?`)
      .run(plan, domain);

    if (result.changes === 0) return NextResponse.json({ error: `No org found with domain: ${domain}` }, { status: 404 });

    return NextResponse.json({ success: true, domain, plan });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
