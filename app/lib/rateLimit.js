// lib/rateLimit.js - Demo-only rate limiting
// NOTE: In-memory, resets on server restart. Demo use only.

// Store: IP -> { count, resetAt }
const requestCounts = new Map();

// Config: 10 requests per minute per IP
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;

/**
 * Check if request should be rate limited.
 * Demo-only: in-memory Map, resets on restart.
 *
 * @param {Request} request - Next.js request object
 * @returns {{ limited: boolean, remaining: number, resetAt: Date }}
 */
function checkRateLimit(request) {
  // Extract IP from headers (Railway/proxies set x-forwarded-for)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  const now = Date.now();
  const record = requestCounts.get(ip);

  // Clean up expired entries (simple cleanup on each check)
  if (record && record.resetAt <= now) {
    requestCounts.delete(ip);
  }

  const current = requestCounts.get(ip);

  if (!current) {
    // First request in window
    requestCounts.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS
    });
    return { limited: false, remaining: MAX_REQUESTS - 1, resetAt: new Date(now + WINDOW_MS) };
  }

  if (current.count >= MAX_REQUESTS) {
    // Rate limited
    return { limited: true, remaining: 0, resetAt: new Date(current.resetAt) };
  }

  // Increment count
  current.count++;
  return { limited: false, remaining: MAX_REQUESTS - current.count, resetAt: new Date(current.resetAt) };
}

/**
 * Maximum allowed request body size in bytes.
 * Rejects requests with bodies larger than this.
 */
const MAX_BODY_SIZE = 100 * 1024; // 100kb

/**
 * Check Content-Length header against max body size.
 *
 * @param {Request} request - Next.js request object
 * @returns {{ oversized: boolean, size: number }}
 */
function checkBodySize(request) {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) {
    // No content-length header - allow (will fail later if too large)
    return { oversized: false, size: 0 };
  }

  const size = parseInt(contentLength, 10);
  if (isNaN(size)) {
    return { oversized: false, size: 0 };
  }

  return { oversized: size > MAX_BODY_SIZE, size };
}

module.exports = {
  checkRateLimit,
  checkBodySize,
  MAX_BODY_SIZE,
  MAX_REQUESTS,
  WINDOW_MS
};
