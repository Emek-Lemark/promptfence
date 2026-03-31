'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../AdminNav';
import { adminFetch } from '../../lib/api';

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
    setLoading(true);
    setError('');
    try {
      const { res, data: body } = await adminFetch('/api/billing', {}, router);
      if (!res || res.status === 401) return;
      if (body && !body.error) {
        setData(body);
      } else {
        setError(body?.error?.message || 'Failed to load billing info');
      }
    } catch {
      setError('Failed to load billing info');
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { res, data: body } = await adminFetch('/api/billing', { method: 'POST' }, router);
      if (body?.url) {
        window.location.href = body.url;
      } else {
        setError(body?.error?.message || 'Could not open billing portal');
      }
    } catch {
      setError('Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <AdminNav active="Billing" />
        <div style={s.container}>
          <p style={{ color: '#64748b' }}>Loading billing info…</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <AdminNav active="Billing" />
        <div style={s.container}>
          <div className="status-error">{error}</div>
        </div>
      </div>
    );
  }

  const { plan, planLabel, seats, trialEndsAt, trialDaysLeft, hasSubscription } = data;
  const isTrialling = plan === 'trial';
  const isActive = plan === 'active';
  const isCancelled = plan === 'cancelled';
  const isSuper = plan === 'super';

  const planColor = isActive || isSuper ? '#059669' : isCancelled ? '#dc2626' : '#d97706';
  const planBg = isActive || isSuper ? '#f0fdf4' : isCancelled ? '#fef2f2' : '#fffbeb';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AdminNav active="Billing" />

      <div style={s.container}>
        <h1 style={s.h1}>Billing</h1>

        {error && <div className="status-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Current plan card */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 6 }}>
                Current plan
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#1e293b',
                }}>
                  {isTrialling ? 'Free Trial' : isActive ? 'Paid plan' : planLabel}
                </span>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  color: planColor,
                  background: planBg,
                }}>
                  {isTrialling
                    ? trialDaysLeft !== null
                      ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left`
                      : 'Active'
                    : planLabel}
                </span>
              </div>

              {isTrialling && trialEndsAt && (
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                  Trial ends {new Date(trialEndsAt).toLocaleDateString('en-IE', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              {(isTrialling || isCancelled) && (
                <a
                  href="/upgrade"
                  style={{
                    display: 'inline-block',
                    padding: '9px 20px',
                    background: '#1a56db',
                    color: '#fff',
                    borderRadius: 7,
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Upgrade plan
                </a>
              )}
              {hasSubscription && (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  style={{
                    padding: '9px 20px',
                    background: 'transparent',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: 7,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: portalLoading ? 'wait' : 'pointer',
                  }}
                >
                  {portalLoading ? 'Opening…' : 'Manage subscription'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Seats */}
        <div style={s.card}>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 12 }}>
            Seat usage
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              flex: 1,
              height: 8,
              background: '#e2e8f0',
              borderRadius: 99,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (seats.used / seats.total) * 100)}%`,
                background: seats.used >= seats.total ? '#dc2626' : '#1a56db',
                borderRadius: 99,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
              {seats.used} / {seats.total} seats
            </span>
          </div>
          {seats.used >= seats.total && (
            <p style={{ fontSize: 13, color: '#dc2626', marginTop: 10 }}>
              Seat limit reached. Upgrade to add more team members.
            </p>
          )}
        </div>

        {/* Plan comparison */}
        {(isTrialling || isCancelled) && (
          <div style={s.card}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>
              Available plans
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <PlanCard
                name="Team"
                price="€49"
                per="/month"
                seats="Up to 25 seats"
                features={['Custom data policy', 'Team install code', 'Events dashboard', 'Email alerts']}
                highlight={false}
                onUpgrade={() => router.push('/upgrade')}
              />
              <PlanCard
                name="Business"
                price="€149"
                per="/month"
                seats="Up to 100 seats"
                features={['Everything in Team', 'Shadow AI discovery', 'CSV export', 'Priority support']}
                highlight
                onUpgrade={() => router.push('/upgrade')}
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
      border: highlight ? '2px solid #1a56db' : '1px solid #e2e8f0',
      borderRadius: 8,
      padding: 20,
      background: highlight ? '#eff6ff' : '#fff',
      position: 'relative',
    }}>
      {highlight && (
        <div style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a56db',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 10px',
          borderRadius: 99,
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}>
          POPULAR
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 2 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#1a56db' }}>{price}</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>{per}</span>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{seats}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {features.map((f) => (
          <li key={f} style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#059669', fontWeight: 700 }}>✓</span> {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onUpgrade}
        style={{
          display: 'block',
          width: '100%',
          padding: '9px 16px',
          background: highlight ? '#1a56db' : '#f1f5f9',
          color: highlight ? '#fff' : '#1e293b',
          border: 'none',
          borderRadius: 7,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Get started
      </button>
    </div>
  );
}

const s = {
  container: { maxWidth: 860, margin: '0 auto', padding: '32px 24px' },
  h1: { fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 24 },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 24,
    marginBottom: 16,
  },
};
