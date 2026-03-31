'use client';

import { useRouter } from 'next/navigation';
import { clearAuth } from '../../lib/api';

const s = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '48px 40px',
    maxWidth: 460,
    width: '100%',
    textAlign: 'center',
  },
  icon: { fontSize: 40, marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 10 },
  sub: { fontSize: 15, color: '#64748b', lineHeight: 1.6, marginBottom: 32 },
  plans: { display: 'flex', gap: 12, marginBottom: 28 },
  plan: {
    flex: 1,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '16px 12px',
    textAlign: 'center',
  },
  planHighlight: {
    flex: 1,
    border: '2px solid #1a56db',
    borderRadius: 8,
    padding: '16px 12px',
    textAlign: 'center',
    background: '#eff6ff',
  },
  planName: { fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 4 },
  planPrice: { fontSize: 22, fontWeight: 700, color: '#1a56db' },
  planPer: { fontSize: 11, color: '#64748b' },
  planSeats: { fontSize: 12, color: '#64748b', marginTop: 6 },
  badge: {
    display: 'inline-block',
    background: '#1a56db',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 99,
    marginBottom: 8,
    letterSpacing: '0.05em',
  },
  btnPrimary: {
    display: 'block',
    width: '100%',
    padding: '13px 20px',
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
    marginBottom: 12,
  },
  logout: {
    fontSize: 13,
    color: '#94a3b8',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
};

export default function UpgradePage() {
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}>⏱</div>
        <h1 style={s.heading}>Your trial has ended</h1>
        <p style={s.sub}>
          You've had 14 days to protect your team with PromptFence.
          Choose a plan to keep your policy active and your data safe.
        </p>

        <div style={s.plans}>
          <div style={s.plan}>
            <div style={s.planName}>Team</div>
            <div style={s.planPrice}>€49</div>
            <div style={s.planPer}>/month</div>
            <div style={s.planSeats}>Up to 25 seats</div>
          </div>
          <div style={s.planHighlight}>
            <div style={s.badge}>POPULAR</div>
            <div style={s.planName}>Business</div>
            <div style={s.planPrice}>€149</div>
            <div style={s.planPer}>/month</div>
            <div style={s.planSeats}>Up to 100 seats</div>
          </div>
        </div>

        <a
          href="https://promptfence.ai/#pricing"
          style={s.btnPrimary}
        >
          Choose a plan →
        </a>

        <button style={s.logout} onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}
