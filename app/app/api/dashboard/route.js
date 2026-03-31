// GET /api/dashboard - Aggregate stats for admin dashboard
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { requireAdmin } = require('@/lib/auth');

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const db = getDb();
    const orgId = auth.user.orgId;

    // Trial gate — super plan bypasses, everything else checks expiry
    const orgRow = db.prepare('SELECT plan, trial_ends_at FROM orgs WHERE id = ?').get(orgId);
    const isSuperPlan = orgRow?.plan === 'super' || orgRow?.plan === 'active';
    const trialExpired = !isSuperPlan &&
      orgRow?.trial_ends_at &&
      new Date(orgRow.trial_ends_at) < new Date();

    if (trialExpired) {
      return NextResponse.json({ trialExpired: true }, { status: 402 });
    }

    // Time ranges
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // This week stats
    const weekWarnings = db.prepare(`
      SELECT COUNT(*) as count FROM events
      WHERE org_id = ? AND action = 'WARN' AND timestamp >= ?
    `).get(orgId, weekAgo);

    const weekBlocks = db.prepare(`
      SELECT COUNT(*) as count FROM events
      WHERE org_id = ? AND action = 'BLOCK' AND timestamp >= ?
    `).get(orgId, weekAgo);

    const totalEvents = db.prepare(`
      SELECT COUNT(*) as count FROM events WHERE org_id = ?
    `).get(orgId);

    // Team stats
    const totalUsers = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE org_id = ?
    `).get(orgId);

    const installedUsers = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE org_id = ? AND extension_installed = 1
    `).get(orgId);

    const org = db.prepare('SELECT seats FROM orgs WHERE id = ?').get(orgId);

    // Top triggered data types this week
    const weekEvents = db.prepare(`
      SELECT data_types FROM events
      WHERE org_id = ? AND timestamp >= ?
    `).all(orgId, weekAgo);

    const typeCounts = {};
    for (const evt of weekEvents) {
      try {
        const types = JSON.parse(evt.data_types);
        for (const t of types) {
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        }
      } catch (e) {
        // data_types might be comma-separated string
        const types = evt.data_types.split(',');
        for (const t of types) {
          const trimmed = t.trim();
          if (trimmed) typeCounts[trimmed] = (typeCounts[trimmed] || 0) + 1;
        }
      }
    }

    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    // Top platforms this week
    const platformCounts = db.prepare(`
      SELECT ai_domain, COUNT(*) as count FROM events
      WHERE org_id = ? AND timestamp >= ?
      GROUP BY ai_domain ORDER BY count DESC LIMIT 10
    `).all(orgId, weekAgo);

    // Unacknowledged high-severity events
    const unacknowledged = db.prepare(`
      SELECT COUNT(*) as count FROM events
      WHERE org_id = ? AND action = 'BLOCK' AND acknowledged = 0
    `).get(orgId);

    // Recent events (last 5)
    const recentEvents = db.prepare(`
      SELECT e.id, e.timestamp, e.ai_domain, e.data_types, e.action, e.acknowledged,
             u.email as user_email
      FROM events e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.org_id = ?
      ORDER BY e.timestamp DESC LIMIT 5
    `).all(orgId);

    // Shadow AI: platform visits
    const platformVisits = db.prepare(`
      SELECT ai_domain, COUNT(DISTINCT user_id) as users, COUNT(*) as visits
      FROM platform_visits
      WHERE org_id = ? AND visited_at >= ?
      GROUP BY ai_domain ORDER BY visits DESC
    `).all(orgId, monthAgo);

    return NextResponse.json({
      week: {
        warnings: weekWarnings.count,
        blocks: weekBlocks.count,
        total: weekWarnings.count + weekBlocks.count,
      },
      allTime: { total: totalEvents.count },
      team: {
        total: totalUsers.count,
        installed: installedUsers.count,
        seats: org?.seats || 10,
      },
      topTypes,
      topPlatforms: platformCounts,
      unacknowledgedBlocks: unacknowledged.count,
      recentEvents: recentEvents.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        aiDomain: e.ai_domain,
        dataTypes: e.data_types,
        action: e.action,
        acknowledged: Boolean(e.acknowledged),
        userEmail: e.user_email,
      })),
      platformDiscovery: platformVisits,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }, { status: 500 });
  }
}
