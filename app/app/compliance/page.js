'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../AdminNav';
import { adminFetch } from '../../lib/api';

const RISK_LABELS = { minimal: 'Minimal', limited: 'Limited', high: 'High' };
const RISK_COLORS = { minimal: '#059669', limited: '#d97706', high: '#dc2626' };
const RISK_BG    = { minimal: '#f0fdf4', limited: '#fffbeb', high: '#fef2f2' };

const STATUS_LABELS = { approved: 'Approved', flagged: 'Flagged', discovered: 'Unreviewed' };
const STATUS_COLORS = { approved: '#059669', flagged: '#dc2626', discovered: '#64748b' };
const STATUS_BG    = { approved: '#f0fdf4', flagged: '#fef2f2', discovered: '#f1f5f9' };

export default function CompliancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(null); // domain being edited
  const [reviewForm, setReviewForm] = useState({ status: 'approved', riskLevel: 'limited', notes: '' });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportFrom, setReportFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });
  const [reportTo, setReportTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchCompliance();
  }, [router]);

  async function fetchCompliance() {
    setLoading(true);
    setError('');
    try {
      const { res, data: body } = await adminFetch('/api/compliance', {}, router);
      if (!res || res.status === 401) return;
      if (body && !body.error) setData(body);
      else setError(body?.error?.message || 'Failed to load compliance data');
    } catch { setError('Failed to load compliance data'); }
    finally { setLoading(false); }
  }

  function openReview(domain, current) {
    setReviewing(domain);
    setReviewForm({
      status: current.status === 'discovered' ? 'approved' : current.status,
      riskLevel: current.riskLevel || 'limited',
      notes: current.notes || '',
    });
  }

  async function saveReview() {
    setSaving(true);
    try {
      const { res } = await adminFetch('/api/compliance', {
        method: 'PATCH',
        body: JSON.stringify({ domain: reviewing, ...reviewForm }),
      }, router);
      if (res?.ok) {
        setReviewing(null);
        fetchCompliance();
      } else {
        setError('Failed to save review');
      }
    } catch { setError('Failed to save review'); }
    finally { setSaving(false); }
  }

  async function downloadReport() {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const from = new Date(reportFrom).toISOString();
      const to   = new Date(reportTo + 'T23:59:59').toISOString();
      const url = `/api/compliance/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setError('Failed to generate report'); return; }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `promptfence-audit-${reportTo}.csv`;
      a.click();
      URL.revokeObjectURL(href);
      fetchCompliance(); // refresh last report date
    } catch { setError('Failed to generate report'); }
    finally { setDownloading(false); }
  }

  if (loading) return (
    <div><AdminNav active="compliance" />
      <div style={s.container}><p style={{ color: '#64748b' }}>Loading…</p></div>
    </div>
  );

  if (!data) return (
    <div><AdminNav active="compliance" />
      <div style={s.container}><div style={{ color: '#dc2626' }}>{error}</div></div>
    </div>
  );

  const { posture, team, incidents, inventory, summary } = data;

  const postureColor = posture.score >= 75 ? '#059669' : posture.score >= 50 ? '#d97706' : '#dc2626';
  const postureLabel = posture.score >= 75 ? 'Good' : posture.score >= 50 ? 'Needs attention' : 'At risk';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AdminNav active="compliance" />

      <div style={s.container}>
        <h1 style={s.h1}>Compliance</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28, marginTop: -12 }}>
          EU AI Act readiness: Art. 4 (literacy), Art. 10 (governance), Art. 12 (logging), Art. 14 (oversight)
        </p>

        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {/* Posture score row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <ScoreCard
            label="Compliance posture"
            value={`${posture.score}/100`}
            sub={postureLabel}
            color={postureColor}
            bg={posture.score >= 75 ? '#f0fdf4' : posture.score >= 50 ? '#fffbeb' : '#fef2f2'}
          />
          <ScoreCard
            label="Team trained"
            value={`${team.pctTrained}%`}
            sub={`${team.trained} of ${team.total} members`}
            color="#1a56db"
            bg="#eff6ff"
          />
          <ScoreCard
            label="Incidents resolved"
            value={`${incidents.resolutionRate}%`}
            sub={`${incidents.acknowledged} of ${incidents.quarterTotal} this quarter`}
            color={incidents.pending > 0 ? '#d97706' : '#059669'}
            bg={incidents.pending > 0 ? '#fffbeb' : '#f0fdf4'}
          />
          <ScoreCard
            label="AI tools reviewed"
            value={`${posture.pctToolsReviewed}%`}
            sub={`${summary.approvedTools} approved · ${summary.flaggedTools} flagged`}
            color="#7c3aed"
            bg="#f5f3ff"
          />
        </div>

        {/* AI Inventory Register */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={s.h2}>AI Tool Inventory</h2>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                All AI platforms used by your team. Approve or flag each one to satisfy EU AI Act Art. 10.
              </p>
            </div>
          </div>

          {inventory.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14, padding: '16px 0' }}>
              No AI platforms detected yet. The extension reports platform visits automatically.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Platform</th>
                    <th style={s.th}>Users</th>
                    <th style={s.th}>Sessions</th>
                    <th style={s.th}>Last seen</th>
                    <th style={s.th}>Risk level</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((tool) => (
                    <tr key={tool.domain}>
                      <td style={{ ...s.td, fontWeight: 500 }}>{tool.domain}</td>
                      <td style={s.td}>{tool.users}</td>
                      <td style={s.td}>{tool.visits}</td>
                      <td style={{ ...s.td, fontSize: 12, color: '#64748b' }}>
                        {tool.lastSeen ? new Date(tool.lastSeen).toLocaleDateString() : '—'}
                      </td>
                      <td style={s.td}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 9999,
                          fontSize: 11, fontWeight: 600,
                          color: RISK_COLORS[tool.riskLevel] || '#64748b',
                          background: RISK_BG[tool.riskLevel] || '#f1f5f9',
                        }}>
                          {RISK_LABELS[tool.riskLevel] || tool.riskLevel}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 9999,
                          fontSize: 11, fontWeight: 600,
                          color: STATUS_COLORS[tool.status] || '#64748b',
                          background: STATUS_BG[tool.status] || '#f1f5f9',
                        }}>
                          {STATUS_LABELS[tool.status] || tool.status}
                        </span>
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <button
                          onClick={() => openReview(tool.domain, tool)}
                          style={{
                            padding: '4px 12px', fontSize: 12, fontWeight: 500,
                            background: '#f1f5f9', color: '#1e293b',
                            border: '1px solid #e2e8f0', borderRadius: 5, cursor: 'pointer',
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Report Download */}
        <div style={s.card}>
          <h2 style={s.h2}>Compliance Audit Report</h2>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            Download a structured CSV report covering team training, AI interactions, and tool inventory.
            Hand this to a DPO, auditor, or enterprise procurement team.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>From</label>
              <input
                type="date"
                value={reportFrom}
                onChange={(e) => setReportFrom(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#64748b', marginBottom: 4 }}>To</label>
              <input
                type="date"
                value={reportTo}
                onChange={(e) => setReportTo(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
              />
            </div>
            <button
              onClick={downloadReport}
              disabled={downloading}
              style={{
                padding: '9px 20px', background: downloading ? '#93c5fd' : '#1a56db',
                color: '#fff', border: 'none', borderRadius: 7,
                fontSize: 14, fontWeight: 600, cursor: downloading ? 'wait' : 'pointer',
              }}
            >
              {downloading ? 'Generating…' : '⬇ Download report'}
            </button>
            {summary.lastReportAt && (
              <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>
                Last generated {new Date(summary.lastReportAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#64748b' }}>
            Report includes: team AI literacy (Art. 4) · interaction log with data types and actions (Art. 12) · AI tool inventory with approval status (Art. 10)
          </div>
        </div>
      </div>

      {/* Review modal */}
      {reviewing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 32,
            width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Review AI tool</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{reviewing}</p>

            <label style={s.label}>Status</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['approved', 'flagged', 'discovered'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setReviewForm((f) => ({ ...f, status: opt }))}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', border: '2px solid',
                    borderColor: reviewForm.status === opt ? STATUS_COLORS[opt] : '#e2e8f0',
                    background: reviewForm.status === opt ? STATUS_BG[opt] : '#fff',
                    color: reviewForm.status === opt ? STATUS_COLORS[opt] : '#64748b',
                  }}
                >
                  {STATUS_LABELS[opt]}
                </button>
              ))}
            </div>

            <label style={s.label}>Risk level</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['minimal', 'limited', 'high'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setReviewForm((f) => ({ ...f, riskLevel: opt }))}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', border: '2px solid',
                    borderColor: reviewForm.riskLevel === opt ? RISK_COLORS[opt] : '#e2e8f0',
                    background: reviewForm.riskLevel === opt ? RISK_BG[opt] : '#fff',
                    color: reviewForm.riskLevel === opt ? RISK_COLORS[opt] : '#64748b',
                  }}
                >
                  {RISK_LABELS[opt]}
                </button>
              ))}
            </div>

            <label style={s.label}>Notes (optional)</label>
            <textarea
              value={reviewForm.notes}
              onChange={(e) => setReviewForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Approved for non-sensitive tasks only"
              rows={3}
              style={{
                width: '100%', padding: '8px 12px', fontSize: 14,
                border: '1px solid #e2e8f0', borderRadius: 6, resize: 'vertical',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setReviewing(null)}
                style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={saveReview}
                disabled={saving}
                style={{ flex: 2, padding: '10px', background: saving ? '#93c5fd' : '#1a56db', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}
              >
                {saving ? 'Saving…' : 'Save review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, value, sub, color, bg }) {
  return (
    <div style={{ background: bg, border: '1px solid #e2e8f0', borderRadius: 8, padding: '20px 24px' }}>
      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

const s = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  h1: { fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 6 },
  h2: { fontSize: 16, fontWeight: 600, color: '#1e293b' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e2e8f0',
    fontWeight: 600, background: '#f8fafc', color: '#64748b',
    fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' },
};
