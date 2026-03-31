// POST /api/events - Extension reports event
// GET /api/events - Admin views events
import { NextResponse } from 'next/server';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('@/lib/db');
const { requireAdmin, requireInstallCode } = require('@/lib/auth');

// POST - Extension reports event (NO CONTENT STORED)
export async function POST(request) {
  try {
    const auth = await requireInstallCode(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const db = getDb();

    // Handle platform visit (shadow AI discovery)
    if (body.type === 'platform_visit') {
      const { aiDomain } = body;
      if (!aiDomain) {
        return NextResponse.json(
          { error: { code: 'INVALID_REQUEST', message: 'aiDomain required' } },
          { status: 400 }
        );
      }
      db.prepare(`
        INSERT INTO platform_visits (id, org_id, user_id, ai_domain, visited_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(uuidv4(), auth.org.id, auth.user.id, aiDomain);

      // Update last_seen_at and mark extension as installed
      db.prepare(`
        UPDATE users SET last_seen_at = datetime('now'), extension_installed = 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(auth.user.id);

      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // Handle detection event
    const { aiDomain, dataTypes, action, ruleId, timestamp, extensionVersion, source } = body;

    if (!aiDomain || !action) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'aiDomain and action are required' } },
        { status: 400 }
      );
    }

    if (!['WARN', 'BLOCK'].includes(action)) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Action must be WARN or BLOCK' } },
        { status: 400 }
      );
    }

    const eventId = uuidv4();
    const types = Array.isArray(dataTypes) ? dataTypes : [];

    db.prepare(`
      INSERT INTO events (id, org_id, user_id, timestamp, ai_domain, rule_id, data_types, action, extension_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      auth.org.id,
      auth.user.id,
      timestamp || new Date().toISOString(),
      aiDomain,
      ruleId || source || 'detection',
      JSON.stringify(types),
      action,
      extensionVersion || '1.1.0'
    );

    // Update user stats
    if (action === 'BLOCK') {
      db.prepare(`
        UPDATE users SET block_count = block_count + 1, last_seen_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(auth.user.id);
    } else if (action === 'WARN') {
      db.prepare(`
        UPDATE users SET warn_count = warn_count + 1, last_seen_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(auth.user.id);
    }

    return NextResponse.json({ eventId }, { status: 201 });
  } catch (error) {
    console.error('Post event error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}

// GET - Admin views events
export async function GET(request) {
  try {
    // Require admin auth
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 50));
    const dataType = searchParams.get('dataType');
    const aiDomain = searchParams.get('aiDomain');
    const action = searchParams.get('action');
    const format = searchParams.get('format') || 'json';

    const db = getDb();

    // Build query with filters
    let whereClause = 'WHERE e.org_id = ?';
    const params = [auth.user.orgId];

    if (dataType) {
      whereClause += ' AND e.data_types LIKE ?';
      params.push(`%"${dataType}"%`);
    }
    if (aiDomain) {
      whereClause += ' AND e.ai_domain = ?';
      params.push(aiDomain);
    }
    if (action) {
      whereClause += ' AND e.action = ?';
      params.push(action);
    }

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM events e ${whereClause}
    `).get(...params);
    const total = countResult.total;

    // Get events with pagination
    const offset = (page - 1) * limit;
    const events = db.prepare(`
      SELECT e.*, u.email as user_email
      FROM events e
      LEFT JOIN users u ON e.user_id = u.id
      ${whereClause}
      ORDER BY e.timestamp DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // Format events
    const formattedEvents = events.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      userId: e.user_id,
      userEmail: e.user_email,
      aiDomain: e.ai_domain,
      ruleId: e.rule_id,
      dataTypes: JSON.parse(e.data_types),
      action: e.action,
      extensionVersion: e.extension_version
    }));

    // Return CSV if requested
    if (format === 'csv') {
      const csvHeader = 'id,timestamp,userId,userEmail,aiDomain,ruleId,dataTypes,action,extensionVersion';
      const csvRows = formattedEvents.map(e =>
        `${e.id},${e.timestamp},${e.userId},${e.userEmail || ''},${e.aiDomain},${e.ruleId},"${e.dataTypes.join(',')}",${e.action},${e.extensionVersion}`
      );
      const csv = [csvHeader, ...csvRows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="events.csv"'
        }
      });
    }

    return NextResponse.json({
      events: formattedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}
