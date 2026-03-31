// GET  /api/billing - Current billing status
// POST /api/billing - Generate Paddle customer portal session URL
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { requireAdmin } = require('@/lib/auth');

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const db = getDb();

    const org = db.prepare(`
      SELECT plan, seats, trial_ends_at, paddle_subscription_id, paddle_customer_id, name
      FROM orgs WHERE id = ?
    `).get(auth.user.orgId);

    const usedSeats = db
      .prepare('SELECT COUNT(*) as count FROM users WHERE org_id = ?')
      .get(auth.user.orgId);

    const adminUser = db
      .prepare("SELECT email FROM users WHERE id = ?")
      .get(auth.user.userId);

    // Trial days remaining
    let trialDaysLeft = null;
    if (org?.plan === 'trial' && org?.trial_ends_at) {
      const diff = new Date(org.trial_ends_at) - new Date();
      trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const planLabel = {
      trial: 'Free Trial',
      active: 'Active',
      super: 'PromptFence Internal',
      cancelled: 'Cancelled',
    }[org?.plan] || org?.plan || 'Free Trial';

    return NextResponse.json({
      plan: org?.plan || 'trial',
      planLabel,
      seats: { used: usedSeats.count, total: org?.seats || 10 },
      trialEndsAt: org?.trial_ends_at || null,
      trialDaysLeft,
      hasSubscription: Boolean(org?.paddle_subscription_id),
      hasCustomerId: Boolean(org?.paddle_customer_id),
      adminEmail: adminUser?.email || null,
    });
  } catch (error) {
    console.error('Billing GET error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const db = getDb();
    const org = db
      .prepare('SELECT paddle_customer_id FROM orgs WHERE id = ?')
      .get(auth.user.orgId);

    if (!org?.paddle_customer_id) {
      return NextResponse.json(
        { error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found' } },
        { status: 400 },
      );
    }

    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: { code: 'NOT_CONFIGURED', message: 'Billing portal not configured' } },
        { status: 503 },
      );
    }

    // Generate Paddle customer portal session
    const response = await fetch(
      `https://api.paddle.com/customers/${org.paddle_customer_id}/portal-sessions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription_ids: [] }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('[Paddle] Portal session error:', result);
      return NextResponse.json(
        { error: { code: 'PORTAL_ERROR', message: 'Could not open billing portal' } },
        { status: 500 },
      );
    }

    const portalUrl =
      result.data?.urls?.general?.overview ||
      result.data?.urls?.subscriptions?.[0]?.cancel_subscription;

    if (!portalUrl) {
      return NextResponse.json(
        { error: { code: 'PORTAL_ERROR', message: 'Portal URL unavailable' } },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    console.error('Billing portal error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 },
    );
  }
}
