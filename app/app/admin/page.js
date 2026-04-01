'use client';

import { useState, useEffect } from 'react';

const PLAN_COLORS = {
  super:     { bg: '#f0fdf4', color: '#15803d', label: 'Super' },
  active:    { bg: '#eff6ff', color: '#1d4ed8', label: 'Active' },
  trial:     { bg: '#fefce8', color: '#a16207', label: 'Trial' },
  cancelled: { bg: '#fff1f2', color: '#be123c', label: 'Cancelled' },
};

function PlanBadge({ plan }) {
  const s = PLAN_COLORS[plan] || { bg: '#f1f5f9', color: '#475569', label: plan };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || '#1e293b', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function AdminPage() {
  const [secret, setSecret]   = useState('');
  const [authed, setAuthed]   = useState(false);
  const [data, setData]       = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Plan change modal
  const [promoting, setPromoting]   = useState(null); // org domain
  const [targetPlan, setTargetPlan] = useState('super');
  const [saving, setSaving]         = useState(false);

  async function load(s) {
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin', { headers: { 'x-admin-secret': s } });
    setLoading(false);
    if (res.status === 401) { setError('Wrong secret'); return; }
    if (!res.ok) { setError('Failed to load'); return; }
    setData(await res.json());
    setAuthed(true);
  }

  async function setPlan(domain, plan) {
    setSaving(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ action: 'set_plan', domain, plan }),
    });
    setSaving(false);
    if (res.ok) {
      setPromoting(null);
      load(secret);
    } else {
      const d = await res.json();
      alert(d.error || 'Failed');
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    load(secret);
  }

  // ── Login screen ─────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '40px 36px', width: 340 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ background: '#1a56db', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>PromptFence</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Platform Admin</div>
            </div>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Admin secret</label>
              <input
                type="password"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="Enter ADMIN_SECRET"
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px', background: '#1a56db', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              {loading ? 'Loading...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { stats, orgs } = data;

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🛡</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>PromptFence</span>
          <span style={{ fontSize: 12, background: '#f1f5f9', color: '#64748b', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>Platform Admin</span>
        </div>
        <button onClick={() => { setAuthed(false); setData(null); setSecret(''); }}
          style={{ fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
          <StatCard label="Total orgs"      value={stats.total}        />
          <StatCard label="Active (paying)" value={stats.active}       color="#1d4ed8" />
          <StatCard label="Trialling"       value={stats.trialling}    color="#a16207" />
          <StatCard label="Trial expired"   value={stats.trialExpired} color="#ef4444" />
          <StatCard label="Cancelled"       value={stats.cancelled}    color="#be123c" />
          <StatCard label="New (7d)"        value={stats.last7days}    color="#7c3aed" />
          <StatCard label="New (30d)"       value={stats.last30days}   />
          <StatCard label="Est. MRR"        value={`€${stats.mrrEstimate}`} color="#059669" sub="Active × €49" />
        </div>

        {/* Orgs table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>All organisations ({orgs.length})</h2>
            <button onClick={() => load(secret)} style={{ fontSize: 12, background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
              Refresh
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Domain', 'Plan', 'Members', 'Events', 'Last active', 'Trial ends', 'Signed up', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, fontSize: 12, color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map(org => {
                const trialExpired = org.plan === 'trial' && org.trialEndsAt && new Date(org.trialEndsAt) < new Date();
                return (
                  <tr key={org.id} style={{ borderBottom: '1px solid #f1f5f9', background: trialExpired ? '#fff7f7' : 'transparent' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                      {org.domain}
                      {org.hasPaddle && <span style={{ marginLeft: 6, fontSize: 10, color: '#059669' }}>● Paddle</span>}
                    </td>
                    <td style={{ padding: '10px 16px' }}><PlanBadge plan={org.plan} /></td>
                    <td style={{ padding: '10px 16px', color: '#64748b' }}>{org.members}</td>
                    <td style={{ padding: '10px 16px', color: '#64748b' }}>{org.events.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 12 }}>
                      {org.lastEventAt ? new Date(org.lastEventAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: trialExpired ? '#ef4444' : '#94a3b8', fontSize: 12 }}>
                      {org.trialEndsAt ? new Date(org.trialEndsAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 12 }}>
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => { setPromoting(org.domain); setTargetPlan('super'); }}
                        style={{ fontSize: 12, background: 'none', border: '1px solid #e2e8f0', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', color: '#475569' }}>
                        Change plan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {orgs.length === 0 && (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No organisations yet</p>
          )}
        </div>
      </div>

      {/* Change plan modal */}
      {promoting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '32px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Change plan</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}><strong>{promoting}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {['super', 'active', 'trial', 'cancelled'].map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `2px solid ${targetPlan === p ? '#1a56db' : '#e2e8f0'}`, borderRadius: 8, cursor: 'pointer' }}>
                  <input type="radio" value={p} checked={targetPlan === p} onChange={() => setTargetPlan(p)} />
                  <PlanBadge plan={p} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {p === 'super' && '— No billing gate, never expires'}
                    {p === 'active' && '— Paying customer'}
                    {p === 'trial' && '— 14-day trial'}
                    {p === 'cancelled' && '— Locked out'}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPromoting(null)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={() => setPlan(promoting, targetPlan)} disabled={saving} style={{ flex: 1, padding: '10px', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
