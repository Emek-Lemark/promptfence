'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../AdminNav';
import { adminFetch } from '../../lib/api';

const D = {
  bg:      '#0c0a14',
  surface: '#13101f',
  elevated:'#1a1628',
  border:  '#2d2645',
  text1:   '#fafafa',
  text2:   '#a89ec0',
  muted:   '#6b608a',
  accent:  '#7c3aed',
};

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchBilling();
  }, [router]);

  async function fetchBilling() {
    setLoading(true); setError('');
    try {
      const { res, data: body } = await adminFetch('/api/billing', {}, router);
      if (!res || res.status === 401) return;
      if (body && !body.error) setData(body);
      else setError(body?.error?.message || 'Failed to load billing info');
    } catch { setError('Failed to load billing info'); }
    finally { setLoading(false); }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { res, data: body } = await adminFetch('/api/billing', { method: 'POST' }, router);
      if (body?.url) window.location.href = body.url;
      else setError(body?.error?.message || 'Could not open billing portal');
    } catch { setError('Could not open billing portal'); }
    finally { setPortalLoading(false); }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="Billing" />
      <div style={s.container}><p style={{ color: D.muted }}>Loading billing info…</p></div>
    </div>
  );

  if (error && !data) return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="Billing" />
      <div style={s.container}>
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '12px 16px', borderRadius: 8, fontSize: 14 }}>{error}</div>
      </div>
    </div>
  );

  const { plan, planLabel, seats, trialEndsAt, trialDaysLeft, hasSubscription } = data;
  const isTrialling = plan === 'trial';
  const isActive    = plan === 'active';
  const isCancelled = plan === 'cancelled';
  const isSuper     = plan === 'super';

  const badgeColor = isActive || isSuper ? '#4ade80' : isCancelled ? '#f87171' : '#fbbf24';
  const badgeBg    = isActive || isSuper ? 'rgba(34,197,94,0.1)' : isCancelled ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)';

  return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="Billing" />
      <div style={s.container}>
        <h1 style={s.h1}>Billing</h1>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>
        )}

        {/* Current plan */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: D.muted, fontWeight: 500, marginBottom: 6 }}>Current plan</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: D.text1 }}>
                  {isTrialling ? 'Free Trial' : isActive ? 'Paid plan' : planLabel}
                </span>
                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600, color: badgeColor, background: badgeBg }}>
                  {isTrialling
                    ? trialDaysLeft !== null ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left` : 'Active'
                    : planLabel}
                </span>
              </div>
              {isTrialling && trialEndsAt && (
                <p style={{ fontSize: 13, color: D.muted, marginTop: 6 }}>
                  Trial ends {new Date(trialEndsAt).toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              {(isTrialling || isCancelled) && (
                <a href="/upgrade" style={{
                  display: 'inline-block', padding: '9px 20px',
                  background: D.accent, color: '#fff', borderRadius: 7,
                  fontSize: 14, fontWeight: 600, textDecoration: 'none',
                }}>
                  Upgrade plan
                </a>
              )}
              {hasSubscription && (
                <button onClick={openPortal} disabled={portalLoading} style={{
                  padding: '9px 20px', background: 'transparent', color: D.muted,
                  border: `1px solid ${D.border}`, borderRadius: 7, fontSize: 14, fontWeight: 500,
                  cursor: portalLoading ? 'wait' : 'pointer',
                }}>
                  {portalLoading ? 'Opening…' : 'Manage subscription'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Seats */}
        <div style={s.card}>
          <div style={{ fontSize: 13, color: D.muted, fontWeight: 500, marginBottom: 12 }}>Seat usage</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, height: 8, background: D.elevated, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (seats.used / seats.total) * 100)}%`,
                background: seats.used >= seats.total ? '#f87171' : D.accent,
                borderRadius: 99, transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: D.text1, whiteSpace: 'nowrap' }}>
              {seats.used} / {seats.total} seats
            </span>
          </div>
          {seats.used >= seats.total && (
            <p style={{ fontSize: 13, color: '#f87171', marginTop: 10 }}>
              Seat limit reached. Upgrade to add more team members.
            </p>
          )}
        </div>

        {/* Plan comparison */}
        {(isTrialling || isCancelled) && (
          <div style={s.card}>
            <div style={{ fontSize: 15, fontWeight: 600, color: D.text1, marginBottom: 20 }}>Available plans</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <PlanCard
                name="Team" price="€49" per="/month" seats="Up to 25 seats"
                features={['Custom data policy','Team install code','Events dashboard','Email alerts']}
                highlight={false} onUpgrade={() => router.push('/upgrade')}
              />
              <PlanCard
                name="Business" price="€149" per="/month" seats="Up to 100 seats"
                features={['Everything in Team','Shadow AI discovery','CSV export','Priority support']}
                highlight onUpgrade={() => router.push('/upgrade')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanCard({ name, price, per, seats, features, highlight, onUpgrade }) {
  return (
    <div style={{
      border: highlight ? `2px solid #7c3aed` : '1px solid #2d2645',
      borderRadius: 8, padding: 20,
      background: highlight ? 'rgba(124,58,237,0.08)' : '#13101f',
      position: 'relative',
    }}>
      {highlight && (
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          background: '#7c3aed', color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '2px 10px', borderRadius: 99, letterSpacing: '0.05em', whiteSpace: 'nowrap',
        }}>POPULAR</div>
      )}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#fafafa', marginBottom: 4 }}>{name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 2 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#c4b5fd' }}>{price}</span>
        <span style={{ fontSize: 12, color: '#6b608a' }}>{per}</span>
      </div>
      <div style={{ fontSize: 12, color: '#6b608a', marginBottom: 16 }}>{seats}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {features.map(f => (
          <li key={f} style={{ fontSize: 13, color: '#a89ec0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#4ade80', fontWeight: 700 }}>✓</span> {f}
          </li>
        ))}
      </ul>
      <button onClick={onUpgrade} style={{
        display: 'block', width: '100%', padding: '9px 16px',
        background: highlight ? '#7c3aed' : '#1a1628',
        color: highlight ? '#fff' : '#a89ec0',
        border: highlight ? 'none' : '1px solid #2d2645',
        borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        Get started
      </button>
    </div>
  );
}

const s = {
  container: { maxWidth: 860, margin: '0 auto', padding: '32px 24px' },
  h1: { fontSize: 24, fontWeight: 600, color: '#fafafa', marginBottom: 24 },
  card: { background: '#13101f', border: '1px solid #2d2645', borderRadius: 8, padding: 24, marginBottom: 16 },
};
