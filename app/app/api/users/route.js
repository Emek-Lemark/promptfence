// GET /api/users - Admin views users
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { requireAdmin } = require('@/lib/auth');

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

    const db = getDb();

    // Get total count
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM users WHERE org_id = ?
    `).get(auth.user.orgId);
    const total = countResult.total;

    // Get users with pagination
    const offset = (page - 1) * limit;
    const users = db.prepare(`
      SELECT id, email, hashed_id, role, extension_installed, last_seen_at, block_count, created_at
      FROM users
      WHERE org_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(auth.user.orgId, limit, offset);

    // Format users
    const formattedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      hashedId: u.hashed_id,
      role: u.role,
      extensionInstalled: Boolean(u.extension_installed),
      lastSeenAt: u.last_seen_at,
      blockCount: u.block_count,
      createdAt: u.created_at
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}
