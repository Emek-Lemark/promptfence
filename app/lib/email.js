/**
 * lib/email.js — Shared email sending via Resend
 *
 * All transactional emails go through here.
 * Falls back to console.log in dev if RESEND_API_KEY is not set.
 */

'use strict';

const BASE_URL = process.env.BASE_URL || 'https://app.promptfence.ai';
const FROM     = 'PromptFence <hello@promptfence.ai>';

// ── Shared HTML shell ────────────────────────────────────────────────────────
function shell(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>PromptFence</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:520px;">

        <!-- Header -->
        <tr>
          <td style="padding:28px 36px 24px;border-bottom:1px solid #e2e8f0;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:#1a56db;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                <span style="color:#fff;font-size:20px;line-height:1;">🛡</span>
              </td>
              <td style="padding-left:12px;vertical-align:middle;">
                <div style="font-size:17px;font-weight:700;color:#1e293b;letter-spacing:-0.01em;">PromptFence</div>
                <div style="font-size:11px;color:#64748b;margin-top:1px;">AI data protection</div>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:32px 36px;">${body}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:18px 36px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
              PromptFence · AI privacy protection for teams<br>
              <a href="${BASE_URL}/privacy" style="color:#94a3b8;">Privacy Policy</a>
              &nbsp;·&nbsp;
              <a href="${BASE_URL}/unsubscribe" style="color:#94a3b8;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Button helper ─────────────────────────────────────────────────────────────
function btn(url, label) {
  return `
  <table cellpadding="0" cellspacing="0" style="width:100%;margin:28px 0 20px;">
    <tr><td align="center">
      <a href="${url}" style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 32px;border-radius:8px;letter-spacing:-0.01em;">
        ${label}
      </a>
    </td></tr>
  </table>`;
}

// ── Step list helper ──────────────────────────────────────────────────────────
function steps(items) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;">
    ${items.map(([num, text]) => `
    <tr>
      <td style="width:28px;vertical-align:top;padding:0 12px 14px 0;">
        <div style="width:24px;height:24px;background:#eff6ff;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#1a56db;">${num}</div>
      </td>
      <td style="vertical-align:top;padding-bottom:14px;font-size:14px;color:#475569;line-height:1.5;">${text}</td>
    </tr>`).join('')}
  </table>`;
}

// ── Send wrapper ─────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    // Dev fallback — log to console
    console.log('\n📧 [DEV] Email would be sent:');
    console.log('  To:', to);
    console.log('  Subject:', subject);
    console.log('  (Set RESEND_API_KEY to send real emails)\n');
    return { ok: true, dev: true };
  }

  const { Resend } = require('resend');
  const resend = new Resend(key);
  const result = await resend.emails.send({ from: FROM, to, subject, html });
  return result;
}

// ── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

/**
 * Welcome email — sent immediately on signup.
 * Goal: get them to install the extension and understand next steps.
 */
async function sendWelcomeEmail({ email, installCode, orgDomain }) {
  const installUrl  = `${BASE_URL}/install?code=${installCode}`;
  const dashUrl     = `${BASE_URL}/dashboard`;

  const html = shell(`
    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1e293b;letter-spacing:-0.02em;">
      Welcome to PromptFence 👋
    </p>
    <p style="margin:12px 0 0;font-size:15px;color:#475569;line-height:1.6;">
      Your 14-day free trial is active. Here's how to get your team protected in the next 10 minutes:
    </p>

    ${steps([
      ['1', `<strong>Install the browser extension</strong> — works in Chrome and Firefox. Takes 30 seconds.<br>
             <a href="${installUrl}" style="color:#1a56db;font-weight:600;">Install extension →</a>`],
      ['2', `<strong>Share your install code with your team</strong> — they'll enter it once to connect to your dashboard.<br>
             <span style="font-family:monospace;background:#f1f5f9;padding:3px 8px;border-radius:4px;font-size:14px;color:#1e293b;">${installCode}</span>`],
      ['3', `<strong>Set your policy</strong> — choose what to block: emails, IBANs, passwords, custom terms. Takes 2 minutes.<br>
             <a href="${dashUrl}/policy" style="color:#1a56db;font-weight:600;">Open policy settings →</a>`],
    ])}

    ${btn(installUrl, 'Install the extension →')}

    <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
      Or go straight to your <a href="${dashUrl}" style="color:#64748b;">dashboard</a>
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">

    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1e293b;">What PromptFence protects:</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        ${[
          ['📧', 'Emails'],
          ['📞', 'Phone numbers'],
          ['🏦', 'IBANs & card numbers'],
          ['🔑', 'API keys & passwords'],
          ['🪪', 'National IDs'],
          ['📍', 'Addresses'],
        ].slice(0, 3).map(([icon, label]) => `
          <td style="text-align:center;padding:8px 4px;">
            <div style="font-size:20px;">${icon}</div>
            <div style="font-size:11px;color:#64748b;margin-top:3px;">${label}</div>
          </td>
        `).join('')}
      </tr>
      <tr>
        ${[
          ['📧', 'Emails'],
          ['📞', 'Phone numbers'],
          ['🏦', 'IBANs & card numbers'],
          ['🔑', 'API keys & passwords'],
          ['🪪', 'National IDs'],
          ['📍', 'Addresses'],
        ].slice(3).map(([icon, label]) => `
          <td style="text-align:center;padding:8px 4px;">
            <div style="font-size:20px;">${icon}</div>
            <div style="font-size:11px;color:#64748b;margin-top:3px;">${label}</div>
          </td>
        `).join('')}
      </tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">
      Questions? Just reply to this email — I read every one.
    </p>
  `);

  return sendEmail({
    to: email,
    subject: 'Welcome to PromptFence — install the extension to get started',
    html,
  });
}

/**
 * Team invite email — sent when admin invites a team member.
 * Goal: get them to install the extension with the install code pre-filled.
 */
async function sendTeamInviteEmail({ email, invitedByEmail, orgDomain, installCode }) {
  const installUrl = `${BASE_URL}/install?code=${installCode}`;

  const html = shell(`
    <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#1e293b;letter-spacing:-0.02em;">
      You've been added to PromptFence
    </p>
    <p style="margin:12px 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      <strong>${invitedByEmail}</strong> has set up PromptFence for <strong>${orgDomain}</strong> —
      a browser extension that stops sensitive data from accidentally reaching AI tools.
    </p>

    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1e293b;">To get protected:</p>
    ${steps([
      ['1', 'Click the button below to install the extension (Chrome or Firefox)'],
      ['2', `Enter your team install code when prompted: <span style="font-family:monospace;background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:14px;color:#1e293b;">${installCode}</span>`],
      ['3', "That's it — PromptFence runs automatically in the background"],
    ])}

    ${btn(installUrl, 'Install PromptFence →')}

    <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
      Takes about 30 seconds. No account needed.
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
      PromptFence protects emails, phone numbers, bank details, API keys, and passwords —
      scanning everything locally in your browser before it reaches ChatGPT, Claude, Gemini, or any other AI tool.
      <strong>Nothing is sent to our servers.</strong>
    </p>
  `);

  return sendEmail({
    to: email,
    subject: `${invitedByEmail} added you to PromptFence`,
    html,
  });
}

/**
 * Password reset email.
 */
async function sendPasswordResetEmail({ email, resetUrl }) {
  const html = shell(`
    <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e293b;">Reset your password</p>
    <p style="margin:16px 0 0;font-size:15px;color:#475569;line-height:1.6;">
      We received a request to reset the password for your PromptFence account.
    </p>
    <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">
      This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email.
    </p>
    ${btn(resetUrl, 'Reset password →')}
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      Or paste this link into your browser:<br>
      <a href="${resetUrl}" style="color:#64748b;word-break:break-all;">${resetUrl}</a>
    </p>
  `);

  return sendEmail({
    to: email,
    subject: 'Reset your PromptFence password',
    html,
  });
}

module.exports = { sendEmail, sendWelcomeEmail, sendTeamInviteEmail, sendPasswordResetEmail };
