// POST /api/login - Admin authentication
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { verifyPassword, generateToken } = require('@/lib/auth');

export async function POST(request) {
  try {
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
