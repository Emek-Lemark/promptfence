// lib/auth.js - Authentication utilities
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

// In production, JWT_SECRET must be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET environment variable is required in production'); })()
    : 'promptfence-dev-secret-change-in-production'
);
const JWT_EXPIRY = '7d';

// Password hashing
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// JWT token generation
function generateToken(userId, orgId, role) {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Store session in database
  const db = getDb();
  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(sessionId, userId, expiresAt);

  return jwt.sign(
    { userId, orgId, role, jti: sessionId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// JWT token verification
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check session exists and not expired
    const db = getDb();
    const session = db.prepare(`
      SELECT * FROM sessions
      WHERE id = ? AND expires_at > datetime('now')
    `).get(decoded.jti);

    if (!session) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

// Extract token from Authorization header
function extractBearerToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

// Generate 8-character install code
function generateInstallCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Extract install code from header
function extractInstallCode(request) {
  return request.headers.get('x-install-code');
}

// Get org by install code
function getOrgByInstallCode(installCode) {
  const db = getDb();
  return db.prepare('SELECT * FROM orgs WHERE install_code = ?').get(installCode);
}

// Get or create user by install code and hash
function getOrCreateUserByInstallCode(orgId, userHash) {
  const db = getDb();

  // Try to find existing user
  let user = db.prepare(`
    SELECT * FROM users WHERE org_id = ? AND hashed_id = ?
  `).get(orgId, userHash);

  if (!user) {
    // Create new employee user
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, org_id, hashed_id, role, extension_installed, last_seen_at)
      VALUES (?, ?, ?, 'employee', 1, datetime('now'))
    `).run(userId, orgId, userHash);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  } else {
    // Update last seen and extension installed
    db.prepare(`
      UPDATE users SET extension_installed = 1, last_seen_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id);
  }

  return user;
}

// Auth middleware for admin routes
async function requireAdmin(request) {
  const token = extractBearerToken(request);
  if (!token) {
    return { error: { code: 'UNAUTHORIZED', message: 'Missing authorization token' }, status: 401 };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }, status: 401 };
  }

  if (decoded.role !== 'admin') {
    return { error: { code: 'FORBIDDEN', message: 'Admin access required' }, status: 403 };
  }

  return { user: decoded };
}

// Auth middleware for extension routes
async function requireInstallCode(request) {
  const installCode = extractInstallCode(request);
  if (!installCode) {
    return { error: { code: 'INVALID_INSTALL_CODE', message: 'Missing install code' }, status: 401 };
  }

  const org = getOrgByInstallCode(installCode);
  if (!org) {
    return { error: { code: 'INVALID_INSTALL_CODE', message: 'Invalid install code' }, status: 401 };
  }

  // Get or create user
  const userHash = request.headers.get('x-user-hash') || `anon-${uuidv4()}`;
  const user = getOrCreateUserByInstallCode(org.id, userHash);

  return { org, user };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  extractBearerToken,
  generateInstallCode,
  extractInstallCode,
  getOrgByInstallCode,
  getOrCreateUserByInstallCode,
  requireAdmin,
  requireInstallCode
};
