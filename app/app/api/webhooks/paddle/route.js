// POST /api/webhooks/paddle - Paddle Billing webhook handler
// Register this URL in Paddle dashboard → Notifications
import { NextResponse } from 'next/server';
import crypto from 'crypto';
const { getDb } = require('@/lib/db');

// Paddle Billing uses HMAC-SHA256: ts=<timestamp>;h1=<hex-hmac>
// Signed payload = `${ts}:${rawBody}`
function verifyPaddleSignature(rawBody, signatureHeader) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Paddle] PADDLE_WEBHOOK_SECRET not set — skipping signature check');
    return true;
  }

  const parts = {};
  (signatureHeader || '').split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > 0) parts[part.slice(0, idx)] = part.slice(idx + 1);
  });

  const { ts, h1 } = parts;
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(h1, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
}

// Map Paddle price ID → plan config
function getPlanConfig(priceId) {
  if (priceId === process.env.PADDLE_TEAM_PRICE_ID) return { plan: 'active', seats: 25 };
  if (priceId === process.env.PADDLE_BUSINESS_PRICE_ID) return { plan: 'active', seats: 100 };
  // Fallback — unknown price, still activate with default seats
  console.warn('[Paddle] Unknown price ID:', priceId);
  return { plan: 'active', seats: 25 };
}

// Find org by Paddle customer ID or admin email
function findOrg(db, customerId, customerEmail) {
  if (customerId) {
    const org = db.prepare('SELECT id FROM orgs WHERE paddle_customer_id = ?').get(customerId);
    if (org) return org.id;
  }
  if (customerEmail) {
    const user = db
      .prepare("SELECT org_id FROM users WHERE email = ? AND role = 'admin' LIMIT 1")
      .get(customerEmail.toLowerCase());
    if (user) return user.org_id;
  }
  return null;
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const sigHeader = request.headers.get('Paddle-Signature') || '';

    if (!verifyPaddleSignature(rawBody, sigHeader)) {
      console.error('[Paddle] Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const { event_type, data } = event;

    console.log('[Paddle] Webhook received:', event_type);

    const db = getDb();

    // ── Subscription activated / created ────────────────────────────────────
    if (
      event_type === 'subscription.activated' ||
      event_type === 'subscription.created'
    ) {
      const subscriptionId = data.id;
      const customerId = data.customer_id;
      const customerEmail = data.customer?.email;
      const priceId = data.items?.[0]?.price?.id;

      const planConfig = getPlanConfig(priceId);
      const orgId = findOrg(db, customerId, customerEmail);

      if (!orgId) {
        console.error('[Paddle] No org found for subscription', { subscriptionId, customerId, customerEmail });
        // Still return 200 so Paddle doesn't retry
        return NextResponse.json({ received: true });
      }

      db.prepare(`
        UPDATE orgs
        SET plan = ?, seats = ?,
            paddle_subscription_id = ?, paddle_customer_id = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(planConfig.plan, planConfig.seats, subscriptionId, customerId, orgId);

      console.log(`[Paddle] Activated org ${orgId}: ${planConfig.plan}, ${planConfig.seats} seats`);
    }

    // ── Subscription updated (plan change) ──────────────────────────────────
    else if (event_type === 'subscription.updated') {
      const subscriptionId = data.id;
      const priceId = data.items?.[0]?.price?.id;
      const customerId = data.customer_id;

      if (priceId) {
        const planConfig = getPlanConfig(priceId);
        db.prepare(`
          UPDATE orgs
          SET plan = ?, seats = ?,
              paddle_customer_id = COALESCE(paddle_customer_id, ?),
              updated_at = datetime('now')
          WHERE paddle_subscription_id = ?
        `).run(planConfig.plan, planConfig.seats, customerId, subscriptionId);
        console.log(`[Paddle] Updated subscription ${subscriptionId}: ${planConfig.plan}`);
      }
    }

    // ── Subscription cancelled / paused ─────────────────────────────────────
    else if (
      event_type === 'subscription.cancelled' ||
      event_type === 'subscription.paused'
    ) {
      const subscriptionId = data.id;
      db.prepare(`
        UPDATE orgs
        SET plan = 'cancelled', updated_at = datetime('now')
        WHERE paddle_subscription_id = ?
      `).run(subscriptionId);
      console.log(`[Paddle] Cancelled subscription ${subscriptionId}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Paddle] Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
