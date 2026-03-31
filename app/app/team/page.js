'use client';

import { useState, useEffect } from 'react';
import AdminNav from '../AdminNav';

const styles = {
  container: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '40px 24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#1e293b',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  btnPrimary: {
    padding: '8px 18px',
    fontSize: 14,
    fontWeight: 500,
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    background: '#e2e8f0',
    color: '#1e293b',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#1e293b',
  },
  copyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#1a56db',
    fontSize: 13,
    fontWeight: 500,
    padding: 0,
  },
  warning: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    color: '#92400e',
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
  },
  section: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 16,
    color: '#1e293b',
  },
  row: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    flex: 1,
    color: '#1e293b',
  },
  emailList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 16,
  },
  emailItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 14,
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    padding: 0,
    lineHeight: 1,
  },
  installLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    fontFamily: 'monospace',
    marginTop: 12,
    wordBreak: 'break-all',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: 600,
    background: '#f8fafc',
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0',
  },
  statusDot: (color) => ({
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    marginRight: 6,
    verticalAlign: 'middle',
  }),
  statusHalf: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'linear-gradient(90deg, #1a56db 50%, #e2e8f0 50%)',
    marginRight: 6,
    verticalAlign: 'middle',
  },
  muted: {
    color: '#64748b',
  },
  success: {
    fontSize: 14,
    color: '#059669',
    fontWeight: 500,
  },
  error: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: 500,
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    color: '#64748b',
    fontSize: 15,
  },
};

function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || '';
  }
  return '';
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatusBadge({ status }) {
  if (status === 'active') {
    return (
      <span>
        <span style={styles.statusDot('#059669')} />
        Active
      </span>
    );
  }
  if (status === 'installed') {
    return (
      <span>
        <span style={styles.statusHalf} />
        Installed
      </span>
    );
  }
  return (
    <span style={styles.muted}>
      <span style={styles.statusDot('#cbd5e1')} />
      Invited
    </span>
  );
}

export default function TeamPage() {
  const [members, setMembers] = useState([]);
  const [seats, setSeats] = useState({ used: 0, total: 10 });
  const [installCode, setInstallCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [pendingInvites, setPendingInvites] = useState([]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  async function fetchTeam() {
    try {
      const res = await fetch('/api/team', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load team');
      const data = await res.json();
      setMembers(data.members || []);
      setSeats(data.seats || { used: 0, total: 10 });
      setInstallCode(data.installCode || '');
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load team data.' });
    } finally {
      setLoading(false);
    }
  }

  function addInviteEmail() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (pendingInvites.includes(email)) return;
    if (members.some(m => m.email === email)) return;
    setPendingInvites(prev => [...prev, email]);
    setInviteEmail('');
  }

  function removeInviteEmail(email) {
    setPendingInvites(prev => prev.filter(e => e !== email));
  }

  async function sendInvites() {
    if (pendingInvites.length === 0) return;
    setSending(true);
    setMessage(null);
    let successCount = 0;
    let errorMsg = '';

    for (const email of pendingInvites) {
      try {
        const res = await fetch('/api/team', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const err = await res.json();
          errorMsg = err.error?.message || 'Invite failed';
        } else {
          successCount++;
        }
      } catch {
        errorMsg = 'Network error sending invite';
      }
    }

    setPendingInvites([]);
    await fetchTeam();
    setSending(false);

    if (successCount > 0) {
      setMessage({ type: 'success', text: `${successCount} invite${successCount > 1 ? 's' : ''} sent.` });
      setTimeout(() => setMessage(null), 3000);
    }
    if (errorMsg) {
      setMessage({ type: 'error', text: errorMsg });
    }
  }

  async function resendInvite(email) {
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ email }),
      });
      if (res.status === 409) {
        setMessage({ type: 'success', text: `Invite resent to ${email}.` });
      } else if (res.ok) {
        setMessage({ type: 'success', text: `Invite resent to ${email}.` });
      }
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to resend invite.' });
    }
  }

  function copyInstallLink() {
    const url = `https://promptfence.ai/install?code=${installCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const notInstalledCount = members.filter(m => m.status === 'invited').length;

  if (loading) {
    return (
      <>
        <AdminNav active="team" />
        <div style={styles.loading}>Loading team...</div>
      </>
    );
  }

  return (
    <>
      <AdminNav active="team" />
      <div style={styles.container}>
        {/* Warning banner */}
        {notInstalledCount > 0 && (
          <div style={styles.warning}>
            {notInstalledCount} team member{notInstalledCount > 1 ? 's' : ''} haven't installed the extension yet.
          </div>
        )}

        {/* Header row */}
        <div style={styles.headerRow}>
          <h1 style={styles.title}>
            Team ({seats.used} of {seats.total} seats)
          </h1>
          <div style={styles.headerRight}>
            {installCode && (
              <span style={styles.badge}>
                Code: {installCode}
              </span>
            )}
            <button
              style={styles.btnPrimary}
              onClick={() => setShowInvite(!showInvite)}
            >
              {showInvite ? 'Cancel' : 'Invite team members'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '10px 16px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: message.type === 'success' ? '#059669' : '#dc2626',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          }}>
            {message.text}
          </div>
        )}

        {/* Invite section */}
        {showInvite && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Invite team members</div>
            <div style={styles.row}>
              <input
                type="email"
                style={styles.input}
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addInviteEmail(); }}
              />
              <button style={styles.btnPrimary} onClick={addInviteEmail}>Add</button>
            </div>

            {pendingInvites.length > 0 && (
              <div style={styles.emailList}>
                {pendingInvites.map(email => (
                  <div key={email} style={styles.emailItem}>
                    <span>{email}</span>
                    <button style={styles.removeBtn} onClick={() => removeInviteEmail(email)}>
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pendingInvites.length > 0 && (
              <button
                style={{
                  ...styles.btnPrimary,
                  opacity: sending ? 0.6 : 1,
                  cursor: sending ? 'not-allowed' : 'pointer',
                }}
                onClick={sendInvites}
                disabled={sending}
              >
                {sending ? 'Sending...' : `Send ${pendingInvites.length} invite${pendingInvites.length > 1 ? 's' : ''}`}
              </button>
            )}

            {installCode && (
              <div style={styles.installLink}>
                <span style={{ flex: 1 }}>
                  https://promptfence.ai/install?code={installCode}
                </span>
                <button style={styles.copyBtn} onClick={copyInstallLink}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Team members table */}
        <div style={styles.section}>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Member</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Last active</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Warnings</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Blocks</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id}>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 500 }}>{member.email}</span>
                      {member.role === 'admin' && (
                        <span style={{
                          marginLeft: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#e0e7ff',
                          color: '#3730a3',
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}>
                          Admin
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <StatusBadge status={member.status} />
                    </td>
                    <td style={{ ...styles.td, color: '#64748b' }}>
                      {member.status === 'active' ? timeAgo(member.lastSeenAt) : '\u2014'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {member.status !== 'invited' && member.warnCount != null
                        ? member.warnCount
                        : <span style={styles.muted}>{'\u2014'}</span>}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {member.status !== 'invited' && member.blockCount != null
                        ? member.blockCount
                        : <span style={styles.muted}>{'\u2014'}</span>}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {member.status === 'invited' && (
                        <button
                          style={styles.btnSecondary}
                          onClick={() => resendInvite(member.email)}
                        >
                          Resend invite
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#64748b', padding: 32 }}>
                      No team members yet. Invite your first team member above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
