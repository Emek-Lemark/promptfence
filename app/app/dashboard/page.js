'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../AdminNav';
import { adminFetch } from '../../lib/api';

const D = {
  bg:       '#0c0a14',
  surface:  '#13101f',
  elevated: '#1a1628',
  border:   '#2d2645',
  text1:    '#fafafa',
  text2:    '#a89ec0',
  muted:    '#6b608a',
  accent:   '#7c3aed',
  accentDim:'rgba(124,58,237,0.12)',
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchDashboard();
  }, [router]);

  async function fetchDashboard() {
    setLoading(true); setError('');
    try {
      const { res, data: body } = await adminFetch('/api/dashboard', {}, router);
      if (!res || res.status === 401) return;
      if (res.status === 402 || body?.trialExpired) { router.push('/upgrade'); return; }
      if (body && !body.error) setData(body);
      else setError(body?.error?.message || 'Failed to load dashboard');
    } catch { setError('Failed to load dashboard'); }
    finally { setLoading(false); }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="Dashboard" />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ color: D.muted }}>Loading dashboard...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="Dashboard" />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '12px 16px', borderRadius: 8, fontSize: 14 }}>{error}</div>
      </div>
    </div>
  );

  const { week, allTime, team, topTypes, topPlatforms, unacknowledgedBlocks, recentEvents, platformDiscovery, trialDaysLeft } = data;

  return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="Dashboard" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: D.text1, marginBottom: 24 }}>Dashboard</h1>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Warnings this week"   value={week.warnings}                          color="#fbbf24" bg="rgba(245,158,11,0.08)" />
          <StatCard label="Blocks this week"      value={week.blocks}                            color="#f87171" bg="rgba(239,68,68,0.08)"  />
          <StatCard label="Total events"          value={allTime.total}                          color={D.text1} bg={D.surface}             />
          <StatCard label="Team installed"        value={`${team.installed} of ${team.seats}`}  color="#4ade80" bg="rgba(34,197,94,0.08)"  />
          <StatCard label="Policy acknowledged"   value={`${team.pctTrained ?? 0}%`}            color="#c4b5fd" bg={D.accentDim}           />
        </div>

        {/* Trial banner */}
        {trialDaysLeft !== null && trialDaysLeft <= 7 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: trialDaysLeft <= 2 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${trialDaysLeft <= 2 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
            borderRadius: 8, padding: '12px 20px', marginBottom: 16,
          }}>
            <span style={{ color: trialDaysLeft <= 2 ? '#f87171' : '#fbbf24', fontWeight: 500, fontSize: 14 }}>
              {trialDaysLeft === 0
                ? 'Your trial expires today. Upgrade now to keep your policy active.'
                : `Your trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}`}
            </span>
            <Link href="/billing" style={{ color: trialDaysLeft <= 2 ? '#f87171' : '#fbbf24', fontWeight: 600, fontSize: 14, textDecoration: 'underline' }}>
              View plans
            </Link>
          </div>
        )}

        {/* Unacknowledged blocks banner */}
        {unacknowledgedBlocks > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 8, padding: '12px 20px', marginBottom: 24,
          }}>
            <span style={{ color: '#fbbf24', fontWeight: 500, fontSize: 14 }}>
              {unacknowledgedBlocks} blocked event{unacknowledgedBlocks !== 1 ? 's' : ''} need{unacknowledgedBlocks === 1 ? 's' : ''} review
            </span>
            <Link href="/events" style={{ color: '#fbbf24', fontWeight: 600, fontSize: 14, textDecoration: 'underline' }}>
              Review events
            </Link>
          </div>
        )}

        {/* Top triggers + platforms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: D.text1, marginBottom: 16 }}>Top triggers this week</h2>
            {topTypes.length === 0
              ? <p style={{ color: D.muted, fontSize: 14 }}>No triggers this week</p>
              : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {topTypes.map((t) => <Badge key={t.type} label={t.type} count={t.count} color="#c4b5fd" bg={D.accentDim} />)}
                </div>
            }
          </div>
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: D.text1, marginBottom: 16 }}>Top platforms this week</h2>
            {topPlatforms.length === 0
              ? <p style={{ color: D.muted, fontSize: 14 }}>No platform activity this week</p>
              : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {topPlatforms.map((p) => <Badge key={p.ai_domain} label={p.ai_domain} count={p.count} color="#c4b5fd" bg={D.accentDim} />)}
                </div>
            }
          </div>
        </div>

        {/* Shadow AI discovery */}
        {platformDiscovery && platformDiscovery.length > 0 && (
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: 24, marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: D.text1, marginBottom: 16 }}>AI platforms used by your team</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                  {['Platform','Users','Sessions','Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: D.muted, fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {platformDiscovery.map((p) => (
                  <tr key={p.ai_domain} style={{ borderBottom: `1px solid ${D.border}` }}>
                    <td style={{ padding: '10px 12px', color: D.text1, fontWeight: 500 }}>{p.ai_domain}</td>
                    <td style={{ padding: '10px 12px', color: D.text2 }}>{p.users}</td>
                    <td style={{ padding: '10px 12px', color: D.text2 }}>{p.visits}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 500,
                        background: p.approved ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                        color: p.approved ? '#4ade80' : '#fbbf24',
                      }}>
                        {p.approved ? 'Approved' : 'Not approved'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent events */}
        <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: D.text1 }}>Recent events</h2>
            <Link href="/events" style={{ fontSize: 14, color: '#c4b5fd', fontWeight: 500, textDecoration: 'none' }}>
              View all events &rarr;
            </Link>
          </div>
          {recentEvents.length === 0
            ? <p style={{ color: D.muted, fontSize: 14 }}>No events yet</p>
            : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                    {['Time','User','Platform','Data types','Action','Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: D.muted, fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((evt) => {
                    let dataTypesDisplay = '';
                    try {
                      const parsed = JSON.parse(evt.dataTypes);
                      dataTypesDisplay = Array.isArray(parsed) ? parsed.join(', ') : evt.dataTypes;
                    } catch { dataTypesDisplay = evt.dataTypes || '-'; }
                    return (
                      <tr key={evt.id} style={{ borderBottom: `1px solid ${D.border}` }}>
                        <td style={{ padding: '10px 12px', color: D.muted, whiteSpace: 'nowrap', fontSize: 13 }}>{new Date(evt.timestamp).toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontFamily: 'monospace', color: D.text2 }}>{evt.userEmail || '-'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: D.text2 }}>{evt.aiDomain}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: D.text2 }}>{dataTypesDisplay}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                            background: evt.action === 'BLOCK' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                            color: evt.action === 'BLOCK' ? '#f87171' : '#fbbf24',
                          }}>{evt.action}</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {evt.acknowledged
                            ? <span style={{ color: '#4ade80', fontSize: 12, fontWeight: 500 }}>Reviewed</span>
                            : <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 500 }}>Pending</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          }
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, border: '1px solid #2d2645', borderRadius: 8, padding: '20px 24px' }}>
      <div style={{ fontSize: 13, color: '#6b608a', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function Badge({ label, count, color, bg }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9999, fontSize: 13, fontWeight: 500, color, background: bg }}>
      {label}
      <span style={{ background: color, color: '#0c0a14', borderRadius: 9999, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{count}</span>
    </span>
  );
}
