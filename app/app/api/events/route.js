// POST /api/events - Extension reports event
// GET /api/events - Admin views events
import { NextResponse } from 'next/server';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('@/lib/db');
const { requireAdmin, requireInstallCode } = require('@/lib/auth');

// POST - Extension reports event (NO CONTENT STORED)
export async function POST(request) {
  try {
    // Require install code
    const auth = await requireInstallCode(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { timestamp, aiDomain, ruleId, dataTypes, action, extensionVersion } = body;

    // Validate required fields
    if (!timestamp || !aiDomain || !ruleId || !dataTypes || !action || !extensionVersion) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    // Validate action
    if (!['WARN', 'BLOCK'].includes(action)) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Action must be WARN or BLOCK' } },
        { status: 400 }
      );
    }

    // Validate dataTypes is array
    if (!Array.isArray(dataTypes)) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'dataTypes must be an array' } },
        { status: 400 }
      );
    }

    const db = getDb();
    const eventId = uuidv4();

    // Insert event (NO clipboard content or prompts stored)
    db.prepare(`
      INSERT INTO events (id, org_id, user_id, timestamp, ai_domain, rule_id, data_types, action, extension_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      auth.org.id,
      auth.user.id,
      timestamp,
      aiDomain,
      ruleId,
      JSON.stringify(dataTypes),
      action,
      extensionVersion
    );

    // Increment block count if action is BLOCK
    if (action === 'BLOCK') {
      db.prepare(`
        UPDATE users SET block_count = block_count + 1, last_seen_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(auth.user.id);
    } else {
      db.prepare(`
        UPDATE users SET last_seen_at = datetime('now'), updated_at = datetime('now')
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
