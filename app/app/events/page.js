'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '../AdminNav';
import { adminFetch } from '../../lib/api';

const styles = {
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#1e293b',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 600 },
  btnSecondary: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    background: '#e2e8f0',
    color: '#1e293b',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  filterBar: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  select: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    color: '#1e293b',
    cursor: 'pointer',
  },
  section: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 24,
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
    verticalAlign: 'middle',
  },
  empty: {
    textAlign: 'center',
    padding: 48,
    color: '#64748b',
    fontSize: 15,
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    color: '#64748b',
    fontSize: 15,
  },
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
    setLoading(true);
    setError('');
    try {
      const { res, data } = await adminFetch('/api/events', {}, router);
      if (!res || res.status === 401) return;
      if (data && data.events) {
        setEvents(data.events);
        setPagination(data.pagination);
      }
    } catch {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  async function acknowledge(eventId) {
    setAcknowledging(eventId);
    try {
      const { res } = await adminFetch(`/api/events/${eventId}`, { method: 'PATCH', body: JSON.stringify({}) }, router);
      if (res?.ok) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, acknowledged: true, acknowledgedAt: new Date().toISOString() }
              : e
          )
        );
      } else {
        setError('Failed to mark event as reviewed');
      }
    } catch {
      setError('Failed to mark event as reviewed');
    } finally {
      setAcknowledging(null);
    }
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
    const headers = ['timestamp', 'userEmail', 'aiDomain', 'action', 'dataTypes', 'reviewed', 'reviewedAt'];
    const rows = filteredEvents.map((e) => [
      e.timestamp,
      e.userEmail || '',
      e.aiDomain,
      e.action,
      (e.dataTypes || []).join(';'),
      e.acknowledged ? 'yes' : 'no',
      e.acknowledgedAt || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptfence-events-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <AdminNav active="events" />
        <div style={styles.loading}>Loading events…</div>
      </div>
    );
  }

  const pendingCount = events.filter((e) => e.action === 'BLOCK' && !e.acknowledged).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AdminNav active="events" />
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Events</h1>
            {pendingCount > 0 && (
              <p style={{ fontSize: 13, color: '#d97706', marginTop: 4, fontWeight: 500 }}>
                {pendingCount} blocked event{pendingCount !== 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} review
              </p>
            )}
          </div>
          {events.length > 0 && (
            <button style={styles.btnSecondary} onClick={exportCsv}>Export CSV</button>
          )}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        {events.length === 0 ? (
          <div style={styles.section}>
            <div style={styles.empty}>
              No events yet. Events appear here when the extension detects sensitive data.
            </div>
          </div>
        ) : (
          <>
            <div style={styles.filterBar}>
              <select style={styles.select} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                <option value="">All Actions</option>
                <option value="WARN">WARN</option>
                <option value="BLOCK">BLOCK</option>
              </select>
              <select style={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending review</option>
                <option value="reviewed">Reviewed</option>
              </select>
              <select style={styles.select} value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
                <option value="">All Platforms</option>
                <option value="chatgpt.com">ChatGPT</option>
                <option value="claude.ai">Claude</option>
                <option value="gemini.google.com">Gemini</option>
                <option value="perplexity.ai">Perplexity</option>
                <option value="copilot.microsoft.com">Copilot</option>
              </select>
              <select style={styles.select} value={dataTypeFilter} onChange={(e) => setDataTypeFilter(e.target.value)}>
                <option value="">All Data Types</option>
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone</option>
                <option value="IBAN">IBAN</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="ADDRESS">Address</option>
                <option value="PASSWORD">Password/Secret</option>
              </select>
            </div>

            <div style={styles.section}>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Time</th>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Platform</th>
                      <th style={styles.th}>Data types</th>
                      <th style={styles.th}>Action</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#64748b', padding: 32 }}>
                          No events match the current filters
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((event) => (
                        <tr key={event.id} style={{ background: !event.acknowledged && event.action === 'BLOCK' ? '#fffbeb' : 'transparent' }}>
                          <td style={{ ...styles.td, whiteSpace: 'nowrap', fontSize: 13 }}>
                            {new Date(event.timestamp).toLocaleString()}
                          </td>
                          <td style={{ ...styles.td, fontSize: 13, fontFamily: 'monospace' }}>
                            {event.userEmail || '-'}
                          </td>
                          <td style={{ ...styles.td, fontSize: 13 }}>{event.aiDomain}</td>
                          <td style={{ ...styles.td, fontSize: 13 }}>
                            {(event.dataTypes || []).join(', ')}
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 500,
                              background: event.action === 'BLOCK' ? '#fee2e2' : '#fef3c7',
                              color: event.action === 'BLOCK' ? '#991b1b' : '#92400e',
                            }}>
                              {event.action}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {event.acknowledged ? (
                              <span style={{ color: '#059669', fontSize: 12, fontWeight: 500 }}>
                                ✓ Reviewed
                              </span>
                            ) : (
                              <span style={{ color: '#d97706', fontSize: 12, fontWeight: 500 }}>
                                Pending
                              </span>
                            )}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            {!event.acknowledged && event.action === 'BLOCK' && (
                              <button
                                onClick={() => acknowledge(event.id)}
                                disabled={acknowledging === event.id}
                                style={{
                                  padding: '4px 12px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: acknowledging === event.id ? '#e2e8f0' : '#f0fdf4',
                                  color: '#059669',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: 5,
                                  cursor: acknowledging === event.id ? 'wait' : 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {acknowledging === event.id ? '…' : 'Mark reviewed'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {pagination && (
              <p style={{ marginTop: 16, color: '#64748b', fontSize: 14 }}>
                Showing {filteredEvents.length} of {pagination.total} events
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
