'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '../AdminNav';
import { adminFetch } from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDashboard();
  }, [router]);

  async function fetchDashboard() {
    setLoading(true);
    setError('');
    try {
      const { res, data: body } = await adminFetch('/api/dashboard', {}, router);
      if (!res || res.status === 401) return;
      if (res.status === 402 || body?.trialExpired) {
        router.push('/upgrade');
        return;
      }
      if (body && !body.error) {
        setData(body);
      } else {
        setError(body?.error?.message || 'Failed to load dashboard');
      }
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <AdminNav active="Dashboard" />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
          <p style={{ color: '#64748b' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <AdminNav active="Dashboard" />
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
          <div className="status-error">{error}</div>
        </div>
      </div>
    );
  }

  const { week, allTime, team, topTypes, topPlatforms, unacknowledgedBlocks, recentEvents, platformDiscovery, trialDaysLeft } = data;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AdminNav active="Dashboard" />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 24 }}>
          Dashboard
        </h1>

        {/* Stats cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}>
          <StatCard
            label="Warnings this week"
            value={week.warnings}
            color="#d97706"
            bgColor="#fffbeb"
          />
          <StatCard
            label="Blocks this week"
            value={week.blocks}
            color="#dc2626"
            bgColor="#fef2f2"
          />
          <StatCard
            label="Total events"
            value={allTime.total}
            color="#1e293b"
            bgColor="#fff"
          />
          <StatCard
            label="Team installed"
            value={`${team.installed} of ${team.seats}`}
            color="#059669"
            bgColor="#f0fdf4"
          />
          <StatCard
            label="AI literacy"
            value={`${team.pctTrained ?? 0}%`}
            color="#7c3aed"
            bgColor="#f5f3ff"
          />
        </div>

        {/* Trial expiry warning banner */}
        {trialDaysLeft !== null && trialDaysLeft <= 7 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: trialDaysLeft <= 2 ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${trialDaysLeft <= 2 ? '#fca5a5' : '#fcd34d'}`,
            borderRadius: 8,
            padding: '12px 20px',
            marginBottom: 16,
          }}>
            <span style={{ color: trialDaysLeft <= 2 ? '#991b1b' : '#92400e', fontWeight: 500, fontSize: 14 }}>
              {trialDaysLeft === 0
                ? 'Your trial expires today — upgrade to keep your policy active'
                : `Your trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}`}
            </span>
            <Link href="/billing" style={{
              color: trialDaysLeft <= 2 ? '#991b1b' : '#92400e',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'underline',
            }}>
              View plans
            </Link>
          </div>
        )}

        {/* Unacknowledged blocks banner */}
        {unacknowledgedBlocks > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: 8,
            padding: '12px 20px',
            marginBottom: 24,
          }}>
            <span style={{ color: '#92400e', fontWeight: 500, fontSize: 14 }}>
              {unacknowledgedBlocks} blocked event{unacknowledgedBlocks !== 1 ? 's' : ''} need{unacknowledgedBlocks === 1 ? 's' : ''} review
            </span>
            <Link href="/events" style={{
              color: '#92400e',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'underline',
            }}>
              Review events
            </Link>
          </div>
        )}

        {/* Top triggers + Top platforms side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          {/* Top triggers */}
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 24,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
              Top triggers this week
            </h2>
            {topTypes.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 14 }}>No triggers this week</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {topTypes.map((t) => (
                  <Badge key={t.type} label={t.type} count={t.count} color="#1a56db" bg="#eff6ff" />
                ))}
              </div>
            )}
          </div>

          {/* Top platforms */}
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 24,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
              Top platforms this week
            </h2>
            {topPlatforms.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 14 }}>No platform activity this week</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {topPlatforms.map((p) => (
                  <Badge key={p.ai_domain} label={p.ai_domain} count={p.count} color="#7c3aed" bg="#f5f3ff" />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Shadow AI discovery */}
        {platformDiscovery && platformDiscovery.length > 0 && (
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 24,
            marginBottom: 32,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
              AI platforms used by your team
            </h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Users</th>
                    <th>Sessions</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {platformDiscovery.map((p) => (
                    <tr key={p.ai_domain}>
                      <td style={{ fontWeight: 500 }}>{p.ai_domain}</td>
                      <td>{p.users}</td>
                      <td>{p.visits}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 9999,
                          fontSize: 12,
                          fontWeight: 500,
                          background: p.approved ? '#dcfce7' : '#fef3c7',
                          color: p.approved ? '#166534' : '#92400e',
                        }}>
                          {p.approved ? 'Approved' : 'Not approved'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent events */}
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
              Recent events
            </h2>
            <Link href="/events" style={{ fontSize: 14, color: '#1a56db', fontWeight: 500 }}>
              View all events &rarr;
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>No events yet</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Platform</th>
                    <th>Data types</th>
                    <th>Action</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((evt) => {
                    let dataTypesDisplay = '';
                    try {
                      const parsed = JSON.parse(evt.dataTypes);
                      dataTypesDisplay = Array.isArray(parsed) ? parsed.join(', ') : evt.dataTypes;
                    } catch {
                      dataTypesDisplay = evt.dataTypes || '-';
                    }

                    return (
                      <tr key={evt.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                          {new Date(evt.timestamp).toLocaleString()}
                        </td>
                        <td style={{ fontSize: 13, fontFamily: 'monospace' }}>
                          {evt.userEmail || '-'}
                        </td>
                        <td style={{ fontSize: 13 }}>{evt.aiDomain}</td>
                        <td style={{ fontSize: 13 }}>{dataTypesDisplay}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 500,
                            background: evt.action === 'BLOCK' ? '#fee2e2' : '#fef3c7',
                            color: evt.action === 'BLOCK' ? '#991b1b' : '#92400e',
                          }}>
                            {evt.action}
                          </span>
                        </td>
                        <td>
                          {evt.acknowledged ? (
                            <span style={{ color: '#059669', fontSize: 12, fontWeight: 500 }}>Reviewed</span>
                          ) : (
                            <span style={{ color: '#d97706', fontSize: 12, fontWeight: 500 }}>Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bgColor }) {
  return (
    <div style={{
      background: bgColor,
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '20px 24px',
    }}>
      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function Badge({ label, count, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 12px',
      borderRadius: 9999,
      fontSize: 13,
      fontWeight: 500,
      color,
      background: bg,
    }}>
      {label}
      <span style={{
        background: color,
        color: '#fff',
        borderRadius: 9999,
        padding: '1px 7px',
        fontSize: 11,
        fontWeight: 600,
      }}>
        {count}
      </span>
    </span>
  );
}
