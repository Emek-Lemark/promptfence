'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminFetch, clearAuth } from '../../lib/api';

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchUsers();
  }, [router]);

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const { res, data } = await adminFetch('/api/users', {}, router);

      if (!res || res.status === 401) {
        // Already handled by adminFetch
        return;
      }

      if (data && data.users) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  if (loading) {
    return (
      <div>
        <nav className="nav">
          <Link href="/setup">Setup</Link>
          <Link href="/events">Events</Link>
          <Link href="/users" className="active">Users</Link>
          <a href="#" onClick={handleLogout} style={{ marginLeft: 'auto' }}>Logout</a>
        </nav>
        <div className="page-container">
          <p style={{ color: 'var(--muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Check if only admin exists or list is empty (no employee activity)
  const hasOnlyAdmin = users.length === 0 || (users.length === 1 && users[0].role === 'admin');

  return (
    <div>
      <nav className="nav">
        <Link href="/setup">Setup</Link>
        <Link href="/events">Events</Link>
        <Link href="/users" className="active">Users</Link>
        <a href="#" onClick={handleLogout} style={{ marginLeft: 'auto' }}>Logout</a>
      </nav>

      <div className="page-container" style={{ maxWidth: 1000 }}>
        <h1 className="page-title">Users</h1>

        {error && <div className="status-error">{error}</div>}

        {hasOnlyAdmin ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: 'var(--muted)', fontSize: 16 }}>
              No employee activity yet. Events will create users automatically when the extension reports.
            </p>
          </div>
        ) : (
          <>
            <div className="card table-container">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Extension</th>
                    <th>Last Seen</th>
                    <th>Blocks</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        {user.email ? (
                          <span>{user.email}</span>
                        ) : (
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                            {user.hashedId?.slice(0, 12) || user.id.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 500,
                          background: user.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                          color: user.role === 'admin' ? '#1e40af' : '#374151',
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {user.extensionInstalled ? (
                          <span style={{ color: 'var(--success)' }}>Installed</span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : '-'}
                      </td>
                      <td>
                        {user.blockCount > 0 ? (
                          <span style={{ color: 'var(--error)', fontWeight: 500 }}>{user.blockCount}</span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && (
              <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 14 }}>
                Showing {users.length} of {pagination.total} users
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
