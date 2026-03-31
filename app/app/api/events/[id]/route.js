// PATCH /api/events/[id] - Acknowledge (mark reviewed) an event
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { requireAdmin } = require('@/lib/auth');

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const note = body.note || null;

    const db = getDb();

    // Verify event belongs to this org
    const event = db.prepare('SELECT id, org_id FROM events WHERE id = ?').get(id);
    if (!event) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Event not found' } }, { status: 404 });
    }
    if (event.org_id !== auth.user.orgId) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    db.prepare(`
      UPDATE events
      SET acknowledged = 1,
          acknowledged_by = ?,
          acknowledged_at = datetime('now'),
          acknowledged_note = ?
      WHERE id = ?
    `).run(auth.user.userId, note, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Acknowledge event error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 },
    );
  }
}
