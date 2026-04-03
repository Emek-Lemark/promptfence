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

const RISK_LABELS = { minimal: 'Minimal', limited: 'Limited', high: 'High' };
const RISK_COLORS = { minimal: '#4ade80', limited: '#fbbf24', high: '#f87171' };
const RISK_BG    = { minimal: 'rgba(34,197,94,0.1)', limited: 'rgba(245,158,11,0.1)', high: 'rgba(239,68,68,0.1)' };

const STATUS_LABELS = { approved: 'Approved', flagged: 'Flagged', discovered: 'Unreviewed' };
const STATUS_COLORS = { approved: '#4ade80', flagged: '#f87171', discovered: '#6b608a' };
const STATUS_BG    = { approved: 'rgba(34,197,94,0.1)', flagged: 'rgba(239,68,68,0.1)', discovered: '#1a1628' };

export default function CompliancePage() {
  const router = useRouter();
  const [loading, setLoading]     = useState(true);
  const [data, setData]           = useState(null);
  const [error, setError]         = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', riskLevel: 'limited', notes: '' });
  const [saving, setSaving]       = useState(false);
  const [downloading, setDownloading]         = useState(false);
  const [downloadingPolicy, setDownloadingPolicy] = useState(false);
  const [reportFrom, setReportFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0];
  });
  const [reportTo, setReportTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchCompliance();
  }, [router]);

  async function fetchCompliance() {
    setLoading(true); setError('');
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
      if (res?.ok) { setReviewing(null); fetchCompliance(); }
      else setError('Failed to save review');
    } catch { setError('Failed to save review'); }
    finally { setSaving(false); }
  }

  async function downloadPolicyDocument() {
    setDownloadingPolicy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/compliance/policy-document', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setError('Failed to generate policy document'); return; }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href; a.download = `ai-use-policy-${new Date().toISOString().split('T')[0]}.txt`; a.click();
      URL.revokeObjectURL(href);
    } catch { setError('Failed to generate policy document'); }
    finally { setDownloadingPolicy(false); }
  }

  async function downloadReport() {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const from = new Date(reportFrom).toISOString();
      const to   = new Date(reportTo + 'T23:59:59').toISOString();
      const res  = await fetch(`/api/compliance/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setError('Failed to generate report'); return; }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href; a.download = `promptfence-audit-${reportTo}.csv`; a.click();
      URL.revokeObjectURL(href);
      fetchCompliance();
    } catch { setError('Failed to generate report'); }
    finally { setDownloading(false); }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="compliance" />
      <div style={s.container}><p style={{ color: D.muted }}>Loading…</p></div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="compliance" />
      <div style={s.container}><div style={{ color: '#f87171' }}>{error}</div></div>
    </div>
  );

  const { posture, team, incidents, inventory, summary } = data;
  const postureColor = posture.score >= 75 ? '#4ade80' : posture.score >= 50 ? '#fbbf24' : '#f87171';
  const postureLabel = posture.score >= 75 ? 'Good' : posture.score >= 50 ? 'Needs attention' : 'At risk';
  const postureBg    = posture.score >= 75 ? 'rgba(34,197,94,0.08)' : posture.score >= 50 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)';

  const inputStyle = {
    padding: '8px 12px', border: `1px solid ${D.border}`, borderRadius: 6,
    fontSize: 14, background: D.elevated, color: D.text1,
  };

  return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="compliance" />
      <div style={s.container}>
        <h1 style={s.h1}>Compliance</h1>
        <p style={{ color: D.muted, fontSize: 14, marginBottom: 28, marginTop: -12 }}>
          EU AI Act readiness: Art. 4 (literacy), Art. 10 (governance), Art. 12 (logging), Art. 14 (oversight)
        </p>

        {error && <div style={{ background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',color:'#f87171',padding:'12px 16px',borderRadius:8,marginBottom:16,fontSize:14 }}>{error}</div>}

        {/* Score row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <ScoreCard label="Compliance posture" value={`${posture.score}/100`} sub={postureLabel} color={postureColor} bg={postureBg} />
          <ScoreCard label="Team trained"        value={`${team.pctTrained}%`}  sub={`${team.trained} of ${team.total} members`} color="#c4b5fd" bg="rgba(124,58,237,0.08)" />
          <ScoreCard
            label="Incidents resolved" value={`${incidents.resolutionRate}%`}
            sub={`${incidents.acknowledged} of ${incidents.quarterTotal} this quarter`}
            color={incidents.pending > 0 ? '#fbbf24' : '#4ade80'}
            bg={incidents.pending > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)'}
          />
          <ScoreCard label="AI tools reviewed" value={`${posture.pctToolsReviewed}%`} sub={`${summary.approvedTools} approved · ${summary.flaggedTools} flagged`} color="#c4b5fd" bg="rgba(124,58,237,0.08)" />
        </div>

        {/* AI Tool Inventory */}
        <div style={s.card}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
            <div>
              <h2 style={s.h2}>AI Tool Inventory</h2>
              <p style={{ fontSize:13,color:D.muted,marginTop:2 }}>
                All AI platforms used by your team. Approve or flag each one to satisfy EU AI Act Art. 10.
              </p>
            </div>
          </div>

          {inventory.length === 0 ? (
            <p style={{ color:D.muted,fontSize:14,padding:'16px 0' }}>
              No AI platforms detected yet. The extension reports platform visits automatically.
            </p>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Platform','Users','Sessions','Last seen','Risk level','Status',''].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((tool) => (
                    <tr key={tool.domain}>
                      <td style={{ ...s.td, fontWeight:500, color:D.text1 }}>{tool.domain}</td>
                      <td style={{ ...s.td, color:D.text2 }}>{tool.users}</td>
                      <td style={{ ...s.td, color:D.text2 }}>{tool.visits}</td>
                      <td style={{ ...s.td, fontSize:12, color:D.muted }}>{tool.lastSeen ? new Date(tool.lastSeen).toLocaleDateString() : '—'}</td>
                      <td style={s.td}>
                        <span style={{ display:'inline-block',padding:'2px 8px',borderRadius:9999,fontSize:11,fontWeight:600,color:RISK_COLORS[tool.riskLevel]||D.muted,background:RISK_BG[tool.riskLevel]||D.elevated }}>
                          {RISK_LABELS[tool.riskLevel] || tool.riskLevel}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ display:'inline-block',padding:'2px 8px',borderRadius:9999,fontSize:11,fontWeight:600,color:STATUS_COLORS[tool.status]||D.muted,background:STATUS_BG[tool.status]||D.elevated }}>
                          {STATUS_LABELS[tool.status] || tool.status}
                        </span>
                      </td>
                      <td style={{ ...s.td, textAlign:'right' }}>
                        <button onClick={() => openReview(tool.domain, tool)} style={{ padding:'4px 12px',fontSize:12,fontWeight:500,background:D.elevated,color:D.text2,border:`1px solid ${D.border}`,borderRadius:5,cursor:'pointer' }}>
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

        {/* AI Policy Document */}
        <div style={s.card}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16 }}>
            <div style={{ flex: 1 }}>
              <h2 style={s.h2}>AI Use Policy</h2>
              <p style={{ fontSize:13,color:D.muted,marginTop:4,marginBottom:0,lineHeight:1.6 }}>
                A ready-to-sign AI Use Policy document generated from your current detection settings.
                Covers EU AI Act Art. 4, Art. 10, ISO 27001 A.5.1, and GDPR Art. 25. Hand it to your
                DPO, auditor, or HR team.
              </p>
            </div>
            <button
              onClick={downloadPolicyDocument} disabled={downloadingPolicy}
              style={{ padding:'9px 20px',background:downloadingPolicy?'#3d3460':D.accent,color:'#fff',border:'none',borderRadius:7,fontSize:14,fontWeight:600,cursor:downloadingPolicy?'wait':'pointer',whiteSpace:'nowrap',alignSelf:'flex-start' }}
            >
              {downloadingPolicy ? 'Generating…' : '⬇ Download policy'}
            </button>
          </div>
        </div>

        {/* Audit Report */}
        <div style={s.card}>
          <h2 style={s.h2}>Compliance Audit Report</h2>
          <p style={{ fontSize:13,color:D.muted,marginBottom:20 }}>
            Download a structured CSV report covering team training, AI interactions, and tool inventory.
            Hand this to a DPO, auditor, or enterprise procurement team.
          </p>
          <div style={{ display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap' }}>
            <div>
              <label style={{ display:'block',fontSize:12,fontWeight:500,color:D.muted,marginBottom:4 }}>From</label>
              <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display:'block',fontSize:12,fontWeight:500,color:D.muted,marginBottom:4 }}>To</label>
              <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} style={inputStyle} />
            </div>
            <button
              onClick={downloadReport} disabled={downloading}
              style={{ padding:'9px 20px',background:downloading?'#3d3460':D.accent,color:'#fff',border:'none',borderRadius:7,fontSize:14,fontWeight:600,cursor:downloading?'wait':'pointer' }}
            >
              {downloading ? 'Generating…' : '⬇ Download report'}
            </button>
            {summary.lastReportAt && (
              <span style={{ fontSize:12,color:D.muted,alignSelf:'center' }}>
                Last generated {new Date(summary.lastReportAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div style={{ marginTop:16,padding:'12px 16px',background:D.elevated,borderRadius:6,fontSize:12,color:D.muted }}>
            Report includes: team AI literacy (Art. 4) · interaction log with data types and actions (Art. 12) · AI tool inventory with approval status (Art. 10)
          </div>
        </div>
      </div>

      {/* Review modal */}
      {reviewing && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100 }}>
          <div style={{ background:D.surface,border:`1px solid ${D.border}`,borderRadius:12,padding:32,width:'100%',maxWidth:440,boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize:16,fontWeight:600,color:D.text1,marginBottom:4 }}>Review AI tool</h3>
            <p style={{ fontSize:13,color:D.muted,marginBottom:20 }}>{reviewing}</p>

            <label style={s.label}>Status</label>
            <div style={{ display:'flex',gap:8,marginBottom:16 }}>
              {['approved','flagged','discovered'].map(opt => (
                <button key={opt} onClick={() => setReviewForm(f => ({ ...f, status: opt }))} style={{
                  flex:1,padding:'8px 0',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',border:'2px solid',
                  borderColor: reviewForm.status === opt ? STATUS_COLORS[opt] : D.border,
                  background: reviewForm.status === opt ? STATUS_BG[opt] : D.elevated,
                  color: reviewForm.status === opt ? STATUS_COLORS[opt] : D.muted,
                }}>{STATUS_LABELS[opt]}</button>
              ))}
            </div>

            <label style={s.label}>Risk level</label>
            <div style={{ display:'flex',gap:8,marginBottom:16 }}>
              {['minimal','limited','high'].map(opt => (
                <button key={opt} onClick={() => setReviewForm(f => ({ ...f, riskLevel: opt }))} style={{
                  flex:1,padding:'8px 0',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',border:'2px solid',
                  borderColor: reviewForm.riskLevel === opt ? RISK_COLORS[opt] : D.border,
                  background: reviewForm.riskLevel === opt ? RISK_BG[opt] : D.elevated,
                  color: reviewForm.riskLevel === opt ? RISK_COLORS[opt] : D.muted,
                }}>{RISK_LABELS[opt]}</button>
              ))}
            </div>

            <label style={s.label}>Notes (optional)</label>
            <textarea
              value={reviewForm.notes}
              onChange={e => setReviewForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Approved for non-sensitive tasks only"
              rows={3}
              style={{ width:'100%',padding:'8px 12px',fontSize:14,border:`1px solid ${D.border}`,borderRadius:6,resize:'vertical',fontFamily:'inherit',boxSizing:'border-box',background:D.elevated,color:D.text1 }}
            />

            <div style={{ display:'flex',gap:10,marginTop:20 }}>
              <button onClick={() => setReviewing(null)} style={{ flex:1,padding:'10px',background:D.elevated,color:D.text2,border:`1px solid ${D.border}`,borderRadius:7,fontSize:14,fontWeight:500,cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={saveReview} disabled={saving} style={{ flex:2,padding:'10px',background:saving?'#3d3460':D.accent,color:'#fff',border:'none',borderRadius:7,fontSize:14,fontWeight:600,cursor:saving?'wait':'pointer' }}>
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
    <div style={{ background: bg, border: '1px solid #2d2645', borderRadius: 8, padding: '20px 24px' }}>
      <div style={{ fontSize: 13, color: '#6b608a', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b608a', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

const s = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  h1: { fontSize: 24, fontWeight: 600, color: '#fafafa', marginBottom: 6 },
  h2: { fontSize: 16, fontWeight: 600, color: '#fafafa' },
  card: { background: '#13101f', border: '1px solid #2d2645', borderRadius: 8, padding: 24, marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #2d2645',
    fontWeight: 500, background: '#1a1628', color: '#6b608a',
    fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #2d2645', fontSize: 14 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b608a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' },
};
