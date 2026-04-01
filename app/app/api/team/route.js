// GET /api/team - List team members with status
// POST /api/team - Invite team member by email
import { NextResponse } from 'next/server';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('@/lib/db');
const { requireAdmin } = require('@/lib/auth');
const { sendTeamInviteEmail } = require('@/lib/email');


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
    sendTeamInviteEmail({
      email,
      invitedByEmail: adminUser?.email || org.domain,
      orgDomain: org.domain,
      installCode: org.install_code,
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
