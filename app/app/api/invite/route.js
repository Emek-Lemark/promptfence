// POST /api/invite - Generate or regenerate install code
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { requireAdmin, generateInstallCode } = require('@/lib/auth');

export async function POST(request) {
  try {
    // Require admin auth
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { regenerate } = body;

    const db = getDb();

    // Get current org
    const org = db.prepare('SELECT * FROM orgs WHERE id = ?').get(auth.user.orgId);
    if (!org) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Organization not found' } },
        { status: 500 }
      );
    }

    let installCode = org.install_code;

    // Regenerate if requested
    if (regenerate) {
      installCode = generateInstallCode();
      db.prepare(`
        UPDATE orgs SET install_code = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(installCode, org.id);
    }

    const baseUrl = process.env.BASE_URL || 'https://promptfence.com';

    return NextResponse.json({
      installCode,
      installUrl: `${baseUrl}/install?code=${installCode}`
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}
