// POST /api/auth/reset-password
// Validates token and sets new password.
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { hashPassword } = require('@/lib/auth');

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Token and password are required' } },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Look up token — must be unused and not expired
    const reset = db.prepare(`
      SELECT r.id, r.user_id, r.expires_at, r.used_at
      FROM password_resets r
      WHERE r.token = ?
      LIMIT 1
    `).get(token);

    if (!reset) {
      return NextResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset link' } },
        { status: 400 }
      );
    }

    if (reset.used_at) {
      return NextResponse.json(
        { error: { code: 'TOKEN_USED', message: 'This reset link has already been used' } },
        { status: 400 }
      );
    }

    if (new Date(reset.expires_at) < new Date()) {
      return NextResponse.json(
        { error: { code: 'TOKEN_EXPIRED', message: 'This reset link has expired. Request a new one.' } },
        { status: 400 }
      );
    }

    // Hash new password and update user
    const hash = await hashPassword(password);

    db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
    `).run(hash, reset.user_id);

    // Mark token as used
    db.prepare(`
      UPDATE password_resets SET used_at = datetime('now') WHERE id = ?
    `).run(reset.id);

    // Invalidate all existing sessions for this user (force re-login)
    db.prepare(`
      DELETE FROM sessions WHERE user_id = ?
    `).run(reset.user_id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}
