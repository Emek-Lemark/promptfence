'use client';

import { useState, useEffect } from 'react';
import AdminNav from '../AdminNav';

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

const s = {
  container: { maxWidth: 900, margin: '0 auto', padding: '40px 24px', color: D.text1 },
  th: {
    textAlign: 'left', padding: '10px 12px', borderBottom: `2px solid ${D.border}`,
    fontWeight: 500, background: D.elevated, color: D.muted,
    fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  td: { padding: '10px 12px', borderBottom: `1px solid ${D.border}` },
};

function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('token') || '';
  return '';
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatusBadge({ status }) {
  if (status === 'active') return <span><span style={{ display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#4ade80',marginRight:6,verticalAlign:'middle' }} />Active</span>;
  if (status === 'installed') return <span><span style={{ display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#7c3aed',marginRight:6,verticalAlign:'middle' }} />Installed</span>;
  return <span style={{ color: D.muted }}><span style={{ display:'inline-block',width:8,height:8,borderRadius:'50%',background:'#3d3460',marginRight:6,verticalAlign:'middle' }} />Invited</span>;
}

export default function TeamPage() {
  const [members, setMembers]           = useState([]);
  const [seats, setSeats]               = useState({ used: 0, total: 10 });
  const [installCode, setInstallCode]   = useState('');
  const [loading, setLoading]           = useState(true);
  const [showInvite, setShowInvite]     = useState(false);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [pendingInvites, setPendingInvites] = useState([]);
  const [sending, setSending]           = useState(false);
  const [message, setMessage]           = useState(null);
  const [copied, setCopied]             = useState(false);

  useEffect(() => { fetchTeam(); }, []);

  async function fetchTeam() {
    try {
      const res = await fetch('/api/team', { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMembers(data.members || []);
      setSeats(data.seats || { used: 0, total: 10 });
      setInstallCode(data.installCode || '');
    } catch { setMessage({ type: 'error', text: 'Failed to load team data.' }); }
    finally { setLoading(false); }
  }

  function addInviteEmail() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (pendingInvites.includes(email) || members.some(m => m.email === email)) return;
    setPendingInvites(prev => [...prev, email]);
    setInviteEmail('');
  }

  function removeInviteEmail(email) { setPendingInvites(prev => prev.filter(e => e !== email)); }

  async function sendInvites() {
    if (pendingInvites.length === 0) return;
    setSending(true); setMessage(null);
    let successCount = 0; let errorMsg = '';
    for (const email of pendingInvites) {
      try {
        const res = await fetch('/api/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) { const err = await res.json(); errorMsg = err.error?.message || 'Invite failed'; }
        else successCount++;
      } catch { errorMsg = 'Network error sending invite'; }
    }
    setPendingInvites([]); await fetchTeam(); setSending(false);
    if (successCount > 0) { setMessage({ type: 'success', text: `${successCount} invite${successCount > 1 ? 's' : ''} sent.` }); setTimeout(() => setMessage(null), 3000); }
    if (errorMsg) setMessage({ type: 'error', text: errorMsg });
  }

  async function resendInvite(email) {
    try {
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ email }),
      });
      setMessage({ type: 'success', text: `Invite resent to ${email}.` });
      setTimeout(() => setMessage(null), 3000);
    } catch { setMessage({ type: 'error', text: 'Failed to resend invite.' }); }
  }

  function copyInstallLink() {
    navigator.clipboard.writeText(`https://promptfence.ai/install?code=${installCode}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  const notInstalledCount = members.filter(m => m.status === 'invited').length;

  const inputStyle = {
    padding: '8px 12px', fontSize: 14, border: `1px solid ${D.border}`,
    borderRadius: 6, flex: 1, color: D.text1, background: D.elevated,
    outline: 'none',
  };

  if (loading) return (
    <>
      <AdminNav active="team" />
      <div style={{ textAlign: 'center', padding: 60, color: D.muted, fontSize: 15 }}>Loading team...</div>
    </>
  );

  return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="team" />
      <div style={s.container}>
        {/* Warning banner */}
        {notInstalledCount > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
            {notInstalledCount} team member{notInstalledCount > 1 ? 's' : ''} haven&#39;t installed the extension yet.
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: D.text1 }}>
            Team ({seats.used} of {seats.total} seats)
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {installCode && (
              <span style={{ display:'inline-flex',alignItems:'center',gap:6,background:D.elevated,border:`1px solid ${D.border}`,borderRadius:6,padding:'6px 12px',fontSize:13,fontFamily:'monospace',color:D.text2 }}>
                Code: {installCode}
              </span>
            )}
            <button
              style={{ padding:'8px 18px',fontSize:14,fontWeight:500,background:D.accent,color:'#fff',border:'none',borderRadius:6,cursor:'pointer' }}
              onClick={() => setShowInvite(!showInvite)}
            >
              {showInvite ? 'Cancel' : 'Invite team members'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
            background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.type === 'success' ? '#4ade80' : '#f87171',
            border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            {message.text}
          </div>
        )}

        {/* Invite panel */}
        {showInvite && (
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: D.text1, marginBottom: 16 }}>Invite team members</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input
                type="email" style={inputStyle} placeholder="colleague@company.com"
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addInviteEmail(); }}
              />
              <button style={{ padding:'8px 18px',fontSize:14,fontWeight:500,background:D.accent,color:'#fff',border:'none',borderRadius:6,cursor:'pointer' }} onClick={addInviteEmail}>Add</button>
            </div>

            {pendingInvites.length > 0 && (
              <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:16 }}>
                {pendingInvites.map(email => (
                  <div key={email} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:D.elevated,border:`1px solid ${D.border}`,borderRadius:6,padding:'6px 12px',fontSize:14,color:D.text2 }}>
                    <span>{email}</span>
                    <button style={{ background:'none',border:'none',cursor:'pointer',color:'#f87171',fontWeight:600,fontSize:14,padding:0,lineHeight:1 }} onClick={() => removeInviteEmail(email)}>&times;</button>
                  </div>
                ))}
              </div>
            )}

            {pendingInvites.length > 0 && (
              <button
                style={{ padding:'8px 18px',fontSize:14,fontWeight:500,background:D.accent,color:'#fff',border:'none',borderRadius:6,cursor:sending?'not-allowed':'pointer',opacity:sending?0.6:1 }}
                onClick={sendInvites} disabled={sending}
              >
                {sending ? 'Sending...' : `Send ${pendingInvites.length} invite${pendingInvites.length > 1 ? 's' : ''}`}
              </button>
            )}

            {installCode && (
              <div style={{ display:'flex',alignItems:'center',gap:8,background:D.elevated,border:`1px solid ${D.border}`,borderRadius:6,padding:'8px 12px',fontSize:13,fontFamily:'monospace',marginTop:12,wordBreak:'break-all',color:D.muted }}>
                <span style={{ flex:1 }}>https://promptfence.ai/install?code={installCode}</span>
                <button style={{ background:'none',border:'none',cursor:'pointer',color:'#c4b5fd',fontSize:13,fontWeight:500,padding:0,whiteSpace:'nowrap' }} onClick={copyInstallLink}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Members table */}
        <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={s.th}>Member</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Last active</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Warnings</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Blocks</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id}>
                    <td style={s.td}>
                      <span style={{ fontWeight: 500, color: D.text1 }}>{member.email}</span>
                      {member.role === 'admin' && (
                        <span style={{ marginLeft:8,fontSize:11,fontWeight:600,background:'rgba(124,58,237,0.15)',color:'#c4b5fd',padding:'2px 6px',borderRadius:4 }}>Admin</span>
                      )}
                    </td>
                    <td style={{ ...s.td, color: D.text2 }}><StatusBadge status={member.status} /></td>
                    <td style={{ ...s.td, color: D.muted }}>
                      {member.status === 'active' ? timeAgo(member.lastSeenAt) : '\u2014'}
                    </td>
                    <td style={{ ...s.td, textAlign:'right', color: D.text2 }}>
                      {member.status !== 'invited' && member.warnCount != null ? member.warnCount : <span style={{ color:D.muted }}>{'\u2014'}</span>}
                    </td>
                    <td style={{ ...s.td, textAlign:'right', color: D.text2 }}>
                      {member.status !== 'invited' && member.blockCount != null ? member.blockCount : <span style={{ color:D.muted }}>{'\u2014'}</span>}
                    </td>
                    <td style={{ ...s.td, textAlign:'right' }}>
                      {member.status === 'invited' && (
                        <button style={{ padding:'6px 14px',fontSize:13,fontWeight:500,background:D.elevated,color:D.text2,border:`1px solid ${D.border}`,borderRadius:6,cursor:'pointer' }} onClick={() => resendInvite(member.email)}>
                          Resend invite
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr><td colSpan={6} style={{ ...s.td, textAlign:'center', color:D.muted, padding:32 }}>No team members yet. Invite your first team member above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
