// GET /api/team - List team members with status
// POST /api/team - Invite team member by email
import { NextResponse } from 'next/server';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('@/lib/db');
const { requireAdmin } = require('@/lib/auth');

async function sendInviteEmail({ toEmail, orgName, installCode, adminEmail }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log('[PromptFence] RESEND_API_KEY not set — skipping invite email');
    return;
  }

  const installUrl = `https://promptfence.ai/install?code=${installCode}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="padding:32px 36px 24px;border-bottom:1px solid #e2e8f0;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1a56db;border-radius:10px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                  <span style="color:#fff;font-size:22px;line-height:1;">🛡</span>
                </td>
                <td style="padding-left:12px;vertical-align:middle;">
                  <div style="font-size:18px;font-weight:700;color:#1e293b;">PromptFence</div>
                  <div style="font-size:12px;color:#64748b;margin-top:2px;">AI data protection</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">
              You've been added to<br>${orgName}
            </p>
            <p style="margin:16px 0 0;font-size:15px;color:#475569;line-height:1.6;">
              ${adminEmail} has set up PromptFence for your team. It's a browser extension that quietly catches sensitive data — emails, IBANs, API keys — before they reach an AI tool.
            </p>
            <p style="margin:8px 0 0;font-size:15px;color:#475569;line-height:1.6;">
              Setup takes about 60 seconds.
            </p>

            <!-- Steps -->
            <table cellpadding="0" cellspacing="0" style="margin:28px 0;width:100%;">
              <tr>
                <td style="padding-bottom:20px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:28px;height:28px;background:#1a56db;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;">1</td>
                      <td style="padding-left:12px;font-size:14px;color:#1e293b;vertical-align:middle;font-weight:600;">Install the extension</td>
                    </tr>
                  </table>
                  <p style="margin:6px 0 0 40px;font-size:13px;color:#64748b;">Available for Chrome and Firefox from the browser store.</p>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:20px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:28px;height:28px;background:#1a56db;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#fff;">2</td>
                      <td style="padding-left:12px;font-size:14px;color:#1e293b;vertical-align:middle;font-weight:600;">Enter your team code</td>
                    </tr>
                  </table>
                  <p style="margin:6px 0 0 40px;font-size:13px;color:#64748b;">Click the PromptFence icon in your toolbar and enter:</p>
                  <div style="margin:10px 0 0 40px;font-family:monospace;font-size:24px;font-weight:700;letter-spacing:3px;background:#f3f4f6;padding:12px 16px;border-radius:8px;color:#1e293b;display:inline-block;">${installCode}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:28px;height:28px;background:#059669;border-radius:50%;text-align:center;vertical-align:middle;font-size:13px;font-weight:700;color:#fff;">✓</td>
                      <td style="padding-left:12px;font-size:14px;color:#1e293b;vertical-align:middle;font-weight:600;">You're protected</td>
                    </tr>
                  </table>
                  <p style="margin:6px 0 0 40px;font-size:13px;color:#64748b;">PromptFence runs quietly in your browser. No setup needed after this.</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
              <tr>
                <td align="center">
                  <a href="${installUrl}" style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;">
                    Get started →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              Or open this link in your browser:<br>
              <a href="${installUrl}" style="color:#64748b;">${installUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              PromptFence detects sensitive data locally in your browser. No prompts or clipboard content is ever stored.<br>
              Made in the EU · <a href="https://promptfence.ai/privacy" style="color:#94a3b8;">Privacy Policy</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `
You've been added to ${orgName}'s PromptFence team.

${adminEmail} has set up PromptFence to catch sensitive data before it reaches AI tools.

To get started (60 seconds):

1. Install the extension from the Chrome Web Store or Firefox Add-ons
2. Click the PromptFence icon in your browser toolbar
3. Enter your team code: ${installCode}

That's it — you're protected.

Or visit this link for step-by-step instructions:
${installUrl}

---
PromptFence detects sensitive data locally. No prompts are ever stored.
  `.trim();

  try {
    const { Resend } = require('resend');
    const resend = new Resend(resendKey);

    await resend.emails.send({
      from: 'PromptFence <invites@promptfence.ai>',
      to: toEmail,
      subject: `${orgName} has added you to PromptFence`,
      html,
      text,
    });
  } catch (err) {
    console.error('[PromptFence] Failed to send invite email:', err.message);
    // Don't throw — user is still created, email failure is non-fatal
  }
}

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const db = getDb();
    const org = db.prepare('SELECT * FROM orgs WHERE id = ?').get(auth.user.orgId);

    const members = db.prepare(`
      SELECT id, email, hashed_id, role, extension_installed, last_seen_at,
             block_count, warn_count, invite_status, invited_at, policy_acknowledged_at,
             created_at
      FROM users WHERE org_id = ?
      ORDER BY role DESC, created_at ASC
    `).all(auth.user.orgId);

    const totalSeats = org?.seats || 10;
    const usedSeats = members.length;

    return NextResponse.json({
      members: members.map(m => ({
        id: m.id,
        email: m.email,
        role: m.role,
        status: getStatus(m),
        extensionInstalled: Boolean(m.extension_installed),
        lastSeenAt: m.last_seen_at,
        blockCount: m.block_count,
        warnCount: m.warn_count,
        inviteStatus: m.invite_status,
        invitedAt: m.invited_at,
        policyAcknowledged: Boolean(m.policy_acknowledged_at),
        createdAt: m.created_at,
      })),
      seats: { used: usedSeats, total: totalSeats },
      installCode: org?.install_code,
    });
  } catch (error) {
    console.error('Team GET error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }, { status: 500 });
  }
}

function getStatus(member) {
  // Admin is always active (they manage the dashboard)
  if (member.role === 'admin') return 'active';
  if (member.invite_status === 'invited' && !member.extension_installed) return 'invited';
  if (member.extension_installed && member.last_seen_at) return 'active';
  if (member.extension_installed && !member.last_seen_at) return 'installed';
  return 'pending';
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { email } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Valid email is required' } },
        { status: 400 }
      );
    }

    const db = getDb();
    const org = db.prepare('SELECT * FROM orgs WHERE id = ?').get(auth.user.orgId);

    // Check seat limit
    const memberCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE org_id = ?').get(auth.user.orgId);
    if (memberCount.count >= (org?.seats || 10)) {
      return NextResponse.json(
        { error: { code: 'SEAT_LIMIT', message: 'Seat limit reached. Upgrade your plan to add more users.' } },
        { status: 403 }
      );
    }

    // Check if already exists
    const existing = db.prepare('SELECT id FROM users WHERE org_id = ? AND email = ?').get(auth.user.orgId, email);
    if (existing) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'User already exists in your team' } },
        { status: 409 }
      );
    }

    // Create invited user
    const userId = uuidv4();
    const inviteToken = uuidv4();
    db.prepare(`
      INSERT INTO users (id, org_id, email, role, invite_status, invite_token, invited_at)
      VALUES (?, ?, ?, 'employee', 'invited', ?, datetime('now'))
    `).run(userId, auth.user.orgId, email, inviteToken);

    // Get admin email for the invite email
    const adminUser = db.prepare('SELECT email FROM users WHERE id = ?').get(auth.user.userId);

    // Send invite email (non-blocking — failure won't break the response)
    sendInviteEmail({
      toEmail: email,
      orgName: org.name || 'Your organization',
      installCode: org.install_code,
      adminEmail: adminUser?.email || org.domain,
    }).catch(() => {});

    return NextResponse.json({
      userId,
      email,
      inviteToken,
      installUrl: `https://promptfence.ai/install?code=${org.install_code}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Team POST error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }, { status: 500 });
  }
}
