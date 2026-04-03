'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuth } from '../../lib/api';

const TEAM_PRICE_ID     = process.env.NEXT_PUBLIC_PADDLE_TEAM_PRICE_ID;
const BUSINESS_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_ID;
const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

export default function UpgradePage() {
  const router = useRouter();
  const [paddleReady, setPaddleReady] = useState(false);
  const [success, setSuccess]         = useState(false);
  const [loading, setLoading]         = useState(null);

  useEffect(() => {
    if (!PADDLE_CLIENT_TOKEN) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.onload = () => {
      window.Paddle.Initialize({
        token: PADDLE_CLIENT_TOKEN,
        eventCallback(event) {
          if (event.name === 'checkout.completed') {
            setSuccess(true); setLoading(null);
            setTimeout(() => router.push('/dashboard'), 4000);
          }
          if (event.name === 'checkout.closed' || event.name === 'checkout.error') setLoading(null);
        },
      });
      setPaddleReady(true);
    };
    script.onerror = () => console.error('Failed to load Paddle.js');
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, [router]);

  function handleSubscribe(plan) {
    const priceId = plan === 'team' ? TEAM_PRICE_ID : BUSINESS_PRICE_ID;
    if (!priceId || !paddleReady) { window.location.href = 'https://promptfence.ai/#pricing'; return; }
    setLoading(plan);
    window.Paddle.Checkout.open({ items: [{ priceId, quantity: 1 }] });
  }

  function handleLogout() { clearAuth(); router.push('/login'); }

  if (success) {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h1 style={s.heading}>You&#39;re all set!</h1>
          <p style={s.sub}>Your subscription is active. Taking you to the dashboard…</p>
          <div style={{
            width: 32, height: 32, border: `3px solid #2d2645`,
            borderTopColor: '#7c3aed', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}>⏱</div>
        <h1 style={s.heading}>Your trial has ended</h1>
        <p style={s.sub}>Choose a plan to keep your policy active and keep your team&#39;s data safe.</p>

        <div style={s.plans}>
          {/* Team */}
          <div style={s.plan}>
            <div style={s.planName}>Team</div>
            <div style={s.planPrice}>€49</div>
            <div style={s.planPer}>/month</div>
            <div style={s.planSeats}>Up to 25 seats</div>
            <button
              style={{
                ...s.btn, marginTop: 16,
                background: loading === 'team' ? '#3d3460' : '#1a1628',
                color: '#a89ec0', border: '1px solid #2d2645',
                cursor: loading ? 'wait' : 'pointer',
              }}
              onClick={() => handleSubscribe('team')}
              disabled={!!loading}
            >
              {loading === 'team' ? 'Opening…' : 'Subscribe'}
            </button>
          </div>

          {/* Business */}
          <div style={s.planHighlight}>
            <div style={s.badge}>POPULAR</div>
            <div style={s.planName}>Business</div>
            <div style={{ ...s.planPrice, color: '#c4b5fd' }}>€149</div>
            <div style={s.planPer}>/month</div>
            <div style={s.planSeats}>Up to 100 seats</div>
            <button
              style={{
                ...s.btn, marginTop: 16,
                background: loading === 'business' ? '#3d3460' : '#7c3aed',
                color: '#fff', cursor: loading ? 'wait' : 'pointer',
              }}
              onClick={() => handleSubscribe('business')}
              disabled={!!loading}
            >
              {loading === 'business' ? 'Opening…' : 'Subscribe'}
            </button>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#3d3460', marginBottom: 20, textAlign: 'center' }}>
          Secure checkout by Paddle · Cancel any time
        </p>
        <button style={s.logout} onClick={handleLogout}>Log out</button>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', background: '#0c0a14',
    fontFamily: "'Inter', -apple-system, sans-serif",
    WebkitFontSmoothing: 'antialiased',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
  },
  card: {
    background: '#13101f', border: '1px solid #2d2645',
    borderRadius: 12, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center',
  },
  icon:    { fontSize: 40, marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: 700, color: '#fafafa', marginBottom: 10 },
  sub:     { fontSize: 15, color: '#a89ec0', lineHeight: 1.6, marginBottom: 32 },
  plans:   { display: 'flex', gap: 12, marginBottom: 20 },
  plan: {
    flex: 1, border: '1px solid #2d2645',
    borderRadius: 8, padding: '16px 12px', textAlign: 'center', background: '#1a1628',
  },
  planHighlight: {
    flex: 1, border: '2px solid #7c3aed',
    borderRadius: 8, padding: '16px 12px', textAlign: 'center',
    background: 'rgba(124,58,237,0.08)',
  },
  planName:  { fontSize: 13, fontWeight: 600, color: '#fafafa', marginBottom: 4 },
  planPrice: { fontSize: 22, fontWeight: 700, color: '#c4b5fd' },
  planPer:   { fontSize: 11, color: '#6b608a' },
  planSeats: { fontSize: 12, color: '#6b608a', marginTop: 6 },
  badge: {
    display: 'inline-block', background: '#7c3aed', color: '#fff',
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
    marginBottom: 8, letterSpacing: '0.05em',
  },
  btn: {
    display: 'block', width: '100%', padding: '10px 16px',
    border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600,
  },
  logout: {
    fontSize: 13, color: '#3d3460', background: 'none',
    border: 'none', cursor: 'pointer', display: 'block', margin: '0 auto',
  },
};
