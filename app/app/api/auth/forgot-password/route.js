// POST /api/auth/forgot-password
// Sends a password reset email. Always returns 200 to prevent email enumeration.
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { v4: uuidv4 } = require('uuid');
const { sendPasswordResetEmail } = require('@/lib/email');

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // Still 200 — don't confirm whether email exists
      return NextResponse.json({ ok: true });
    }

    const db = getDb();
    const user = db
      .prepare("SELECT id, email FROM users WHERE email = ? AND role = 'admin' LIMIT 1")
      .get(email.toLowerCase().trim());

    // Always return 200 regardless of whether user exists
    if (!user) return NextResponse.json({ ok: true });

    // Generate a secure reset token — expires in 1 hour
    const token = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Store token in DB (upsert — one token per user at a time)
    db.prepare(`
      INSERT INTO password_resets (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        token = excluded.token,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at,
        used_at = NULL
    `).run(uuidv4(), user.id, token, expiresAt);

    const baseUrl = process.env.BASE_URL || 'https://app.promptfence.ai';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send via shared email module (handles Resend + dev fallback)
    await sendPasswordResetEmail({ email: user.email, resetUrl }).catch(err =>
      console.error('[PromptFence] Failed to send reset email:', err.message)
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    // Still return 200 — never reveal internal errors on auth endpoints
    return NextResponse.json({ ok: true });
  }
}
