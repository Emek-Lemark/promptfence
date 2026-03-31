// POST /api/auth/forgot-password
// Sends a password reset email. Always returns 200 to prevent email enumeration.
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { v4: uuidv4 } = require('uuid');

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

    // Send email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(resendKey);

        await resend.emails.send({
          from: 'PromptFence <noreply@promptfence.ai>',
          to: user.email,
          subject: 'Reset your PromptFence password',
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="padding:32px 36px 24px;border-bottom:1px solid #e2e8f0;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:#1a56db;border-radius:10px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                <span style="color:#fff;font-size:22px;line-height:1;">🛡</span>
              </td>
              <td style="padding-left:12px;vertical-align:middle;">
                <div style="font-size:18px;font-weight:700;color:#1e293b;">PromptFence</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">AI data protection</div>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e293b;">Reset your password</p>
            <p style="margin:16px 0 0;font-size:15px;color:#475569;line-height:1.6;">
              We received a request to reset the password for your PromptFence account.
              Click the button below to set a new password.
            </p>
            <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">
              This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email.
            </p>
            <table cellpadding="0" cellspacing="0" style="width:100%;margin:28px 0;">
              <tr><td align="center">
                <a href="${resetUrl}" style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;">
                  Reset password →
                </a>
              </td></tr>
            </table>
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              Or paste this link into your browser:<br>
              <a href="${resetUrl}" style="color:#64748b;word-break:break-all;">${resetUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              PromptFence · <a href="https://promptfence.ai/privacy" style="color:#94a3b8;">Privacy Policy</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
          text: `Reset your PromptFence password\n\nClick this link to set a new password (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
        });
      } catch (err) {
        console.error('[PromptFence] Failed to send reset email:', err.message);
        // Non-fatal — don't reveal failure to client
      }
    } else {
      // Dev mode — log to console
      console.log('[PromptFence] Password reset URL (no Resend key):', resetUrl);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    // Still return 200 — never reveal internal errors on auth endpoints
    return NextResponse.json({ ok: true });
  }
}
