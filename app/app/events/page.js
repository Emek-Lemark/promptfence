'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminFetch, clearAuth } from '../../lib/api';

export default function EventsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState('');

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [dataTypeFilter, setDataTypeFilter] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchEvents();
  }, [router]);

  async function fetchEvents() {
    setLoading(true);
    setError('');
    try {
      const { res, data } = await adminFetch('/api/events', {}, router);

      if (!res || res.status === 401) {
        // Already handled by adminFetch
        return;
      }

      if (data && data.events) {
        setEvents(data.events);
        setPagination(data.pagination);
      }
    } catch (err) {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  // Filter events client-side
  const filteredEvents = events.filter((event) => {
    if (actionFilter && event.action !== actionFilter) return false;
    if (domainFilter && !event.aiDomain.includes(domainFilter)) return false;
    if (dataTypeFilter && !event.dataTypes.includes(dataTypeFilter)) return false;
    return true;
  });

  // Export to CSV
  function exportCsv() {
    const headers = ['timestamp', 'aiDomain', 'action', 'dataTypes', 'ruleId', 'userId'];
    const rows = filteredEvents.map((e) => [
      e.timestamp,
      e.aiDomain,
      e.action,
      e.dataTypes.join(';'),
      e.ruleId,
      e.userId || '',
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
      <div>
        <nav className="nav">
          <Link href="/setup">Setup</Link>
          <Link href="/events" className="active">Events</Link>
          <Link href="/users">Users</Link>
          <a href="#" onClick={handleLogout} style={{ marginLeft: 'auto' }}>Logout</a>
        </nav>
        <div className="page-container">
          <p style={{ color: 'var(--muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Check if there are no events at all (not just filtered)
  const hasNoEvents = events.length === 0;

  return (
    <div>
      <nav className="nav">
        <Link href="/setup">Setup</Link>
        <Link href="/events" className="active">Events</Link>
        <Link href="/users">Users</Link>
        <a href="#" onClick={handleLogout} style={{ marginLeft: 'auto' }}>Logout</a>
      </nav>

      <div className="page-container" style={{ maxWidth: 1200 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Events</h1>
          {!hasNoEvents && (
            <button className="btn btn-secondary" onClick={exportCsv}>
              Export CSV
            </button>
          )}
        </div>

        {error && <div className="status-error">{error}</div>}

        {hasNoEvents ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: 'var(--muted)', fontSize: 16 }}>
              No events yet. Trigger a WARN/BLOCK by pasting an email/IBAN into an AI prompt with the extension installed.
            </p>
          </div>
        ) : (
          <>
            <div className="filter-bar">
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                <option value="">All Actions</option>
                <option value="WARN">WARN</option>
                <option value="BLOCK">BLOCK</option>
              </select>

              <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>
                <option value="">All Domains</option>
                <option value="chatgpt.com">chatgpt.com</option>
                <option value="claude.ai">claude.ai</option>
                <option value="gemini.google.com">gemini.google.com</option>
              </select>

              <select value={dataTypeFilter} onChange={(e) => setDataTypeFilter(e.target.value)}>
                <option value="">All Data Types</option>
                <option value="EMAIL">EMAIL</option>
                <option value="PHONE">PHONE</option>
                <option value="IBAN">IBAN</option>
              </select>
            </div>

            <div className="card table-container">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>AI Domain</th>
                    <th>Action</th>
                    <th>Data Types</th>
                    <th>Rule</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                        No events match the current filters
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((event) => (
                      <tr key={event.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(event.timestamp).toLocaleString()}
                        </td>
                        <td>{event.aiDomain}</td>
                        <td>
                          <span style={{
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
                        <td>{event.dataTypes.join(', ')}</td>
                        <td>{event.ruleId}</td>
                        <td style={{ fontSize: 12, fontFamily: 'monospace' }}>
                          {event.userEmail || event.userId?.slice(0, 8) || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination && (
              <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 14 }}>
                Showing {filteredEvents.length} of {pagination.total} events
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
