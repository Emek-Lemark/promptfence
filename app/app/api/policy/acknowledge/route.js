// POST /api/policy/acknowledge - Extension user acknowledges org policy
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { requireInstallCode } = require('@/lib/auth');

export async function POST(request) {
  try {
    const auth = await requireInstallCode(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = getDb();
    db.prepare(`
      UPDATE users SET policy_acknowledged_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(auth.user.id);

    return NextResponse.json({ acknowledged: true });
  } catch (error) {
    console.error('Policy acknowledge error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}
