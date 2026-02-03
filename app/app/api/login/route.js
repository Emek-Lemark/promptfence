// POST /api/login - Admin authentication
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { verifyPassword, generateToken } = require('@/lib/auth');
const { checkRateLimit, checkBodySize } = require('@/lib/rateLimit');

export async function POST(request) {
  try {
    // Rate limit check (demo-only, resets on restart)
    const rateLimit = checkRateLimit(request);
    if (rateLimit.limited) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
        { status: 429 }
      );
    }

    // Body size check
    const bodySize = checkBodySize(request);
    if (bodySize.oversized) {
      return NextResponse.json(
        { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Find user by email
    const user = db.prepare(`
      SELECT u.*, o.id as org_id
      FROM users u
      JOIN orgs o ON u.org_id = o.id
      WHERE u.email = ? AND u.role = 'admin'
    `).get(email);

    if (!user) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken(user.id, user.org_id, 'admin');

    return NextResponse.json({
      userId: user.id,
      orgId: user.org_id,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}
