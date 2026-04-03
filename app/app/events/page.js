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

const s = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  th: {
    textAlign: 'left', padding: '10px 12px',
    borderBottom: `2px solid #2d2645`,
    fontWeight: 500, background: '#1a1628', color: '#6b608a',
    fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #2d2645', verticalAlign: 'middle' },
};

export default function EventsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [dataTypeFilter, setDataTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [acknowledging, setAcknowledging] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchEvents();
  }, [router]);

  async function fetchEvents() {
    setLoading(true); setError('');
    try {
      const { res, data } = await adminFetch('/api/events', {}, router);
      if (!res || res.status === 401) return;
      if (data && data.events) { setEvents(data.events); setPagination(data.pagination); }
    } catch { setError('Failed to load events'); }
    finally { setLoading(false); }
  }

  async function acknowledge(eventId) {
    setAcknowledging(eventId);
    try {
      const { res } = await adminFetch(`/api/events/${eventId}`, { method: 'PATCH', body: JSON.stringify({}) }, router);
      if (res?.ok) {
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, acknowledged: true, acknowledgedAt: new Date().toISOString() } : e));
      } else { setError('Failed to mark event as reviewed'); }
    } catch { setError('Failed to mark event as reviewed'); }
    finally { setAcknowledging(null); }
  }

  const filteredEvents = events.filter((event) => {
    if (actionFilter && event.action !== actionFilter) return false;
    if (domainFilter && !event.aiDomain.includes(domainFilter)) return false;
    if (dataTypeFilter && !JSON.stringify(event.dataTypes).includes(dataTypeFilter)) return false;
    if (statusFilter === 'pending' && event.acknowledged) return false;
    if (statusFilter === 'reviewed' && !event.acknowledged) return false;
    return true;
  });

  function exportCsv() {
    const headers = ['timestamp','userEmail','aiDomain','action','dataTypes','reviewed','reviewedAt'];
    const rows = filteredEvents.map(e => [e.timestamp, e.userEmail||'', e.aiDomain, e.action, (e.dataTypes||[]).join(';'), e.acknowledged?'yes':'no', e.acknowledgedAt||'']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `promptfence-events-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const selectStyle = {
    padding: '8px 12px', fontSize: 14, border: `1px solid ${D.border}`,
    borderRadius: 6, background: D.elevated, color: D.text2, cursor: 'pointer',
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="events" />
      <div style={{ textAlign: 'center', padding: 60, color: D.muted, fontSize: 15 }}>Loading events…</div>
    </div>
  );

  const pendingCount = events.filter(e => e.action === 'BLOCK' && !e.acknowledged).length;

  return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      <AdminNav active="events" />
      <div style={s.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: D.text1 }}>Events</h1>
            {pendingCount > 0 && (
              <p style={{ fontSize: 13, color: '#fbbf24', marginTop: 4, fontWeight: 500 }}>
                {pendingCount} blocked event{pendingCount !== 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} review
              </p>
            )}
          </div>
          {events.length > 0 && (
            <button onClick={exportCsv} style={{
              padding: '8px 16px', fontSize: 14, fontWeight: 500,
              background: D.elevated, color: D.text2, border: `1px solid ${D.border}`,
              borderRadius: 6, cursor: 'pointer',
            }}>
              Export CSV
            </button>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        {events.length === 0 ? (
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, padding: 24 }}>
            <div style={{ textAlign: 'center', padding: 48, color: D.muted, fontSize: 15 }}>
              No events yet. Events appear here when the extension detects sensitive data.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <select style={selectStyle} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
                <option value="">All Actions</option>
                <option value="WARN">WARN</option>
                <option value="BLOCK">BLOCK</option>
              </select>
              <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending review</option>
                <option value="reviewed">Reviewed</option>
              </select>
              <select style={selectStyle} value={domainFilter} onChange={e => setDomainFilter(e.target.value)}>
                <option value="">All Platforms</option>
                <option value="chatgpt.com">ChatGPT</option>
                <option value="claude.ai">Claude</option>
                <option value="gemini.google.com">Gemini</option>
                <option value="perplexity.ai">Perplexity</option>
                <option value="copilot.microsoft.com">Copilot</option>
              </select>
              <select style={selectStyle} value={dataTypeFilter} onChange={e => setDataTypeFilter(e.target.value)}>
                <option value="">All Data Types</option>
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone</option>
                <option value="IBAN">IBAN</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="ADDRESS">Address</option>
                <option value="PASSWORD">Password/Secret</option>
              </select>
            </div>

            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={s.th}>Time</th>
                      <th style={s.th}>User</th>
                      <th style={s.th}>Platform</th>
                      <th style={s.th}>Data types</th>
                      <th style={s.th}>Action</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.length === 0 ? (
                      <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: D.muted, padding: 32 }}>No events match the current filters</td></tr>
                    ) : filteredEvents.map((event) => (
                      <tr key={event.id}>
                        <td style={{ ...s.td, whiteSpace: 'nowrap', fontSize: 13, color: D.muted }}>{new Date(event.timestamp).toLocaleString()}</td>
                        <td style={{ ...s.td, fontSize: 13, fontFamily: 'monospace', color: D.text2 }}>{event.userEmail || '-'}</td>
                        <td style={{ ...s.td, fontSize: 13, color: D.text2 }}>{event.aiDomain}</td>
                        <td style={{ ...s.td, fontSize: 13, color: D.text2 }}>{(event.dataTypes || []).join(', ')}</td>
                        <td style={s.td}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                            background: event.action === 'BLOCK' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                            color: event.action === 'BLOCK' ? '#f87171' : '#fbbf24',
                          }}>{event.action}</span>
                        </td>
                        <td style={s.td}>
                          {event.acknowledged
                            ? <span style={{ color: '#4ade80', fontSize: 12, fontWeight: 500 }}>&#10003; Reviewed</span>
                            : <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 500 }}>Pending</span>}
                        </td>
                        <td style={{ ...s.td, textAlign: 'right' }}>
                          {!event.acknowledged && event.action === 'BLOCK' && (
                            <button
                              onClick={() => acknowledge(event.id)}
                              disabled={acknowledging === event.id}
                              style={{
                                padding: '4px 12px', fontSize: 12, fontWeight: 600,
                                background: 'rgba(34,197,94,0.1)', color: '#4ade80',
                                border: '1px solid rgba(34,197,94,0.2)', borderRadius: 5,
                                cursor: acknowledging === event.id ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                              }}
                            >
                              {acknowledging === event.id ? '…' : 'Mark reviewed'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {pagination && (
              <p style={{ marginTop: 16, color: D.muted, fontSize: 14 }}>
                Showing {filteredEvents.length} of {pagination.total} events
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
