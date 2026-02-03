// POST /api/signup - Admin registration
import { NextResponse } from 'next/server';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('@/lib/db');
const { hashPassword, generateToken, generateInstallCode } = require('@/lib/auth');

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Invalid email format' } },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Password must be at least 8 characters' } },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Email already registered' } },
        { status: 409 }
      );
    }

    // Extract domain from email
    const domain = email.split('@')[1].toLowerCase();

    // Check if org with this domain already exists
    const existingOrg = db.prepare('SELECT id FROM orgs WHERE domain = ?').get(domain);
    if (existingOrg) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Organization with this domain already exists' } },
        { status: 409 }
      );
    }

    // Create organization
    const orgId = uuidv4();
    const installCode = generateInstallCode();
    db.prepare(`
      INSERT INTO orgs (id, domain, install_code)
      VALUES (?, ?, ?)
    `).run(orgId, domain, installCode);

    // Create default config (EMAIL=WARN, PHONE=WARN, IBAN=BLOCK)
    const configId = uuidv4();
    db.prepare(`
      INSERT INTO org_config (id, org_id)
      VALUES (?, ?)
    `).run(configId, orgId);

    // Create admin user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    db.prepare(`
      INSERT INTO users (id, org_id, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'admin')
    `).run(userId, orgId, email, passwordHash);

    // Generate token
    const token = generateToken(userId, orgId, 'admin');

    return NextResponse.json(
      {
        userId,
        orgId,
        domain,
        installCode,
        token
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}
