'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
    }
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don\'t match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Reset failed. Please try again.');
        return;
      }

      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card" style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
        <h1 className="page-title">Password updated</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
          Your password has been changed. Redirecting you to login…
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
      <h1 className="page-title" style={{ textAlign: 'center' }}>Set new password</h1>

      {error && <div className="status-error">{error}</div>}

      {token && !error && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">New password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              autoFocus
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm">Confirm password</label>
            <input
              type="password"
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your new password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      )}

      {(!token || error) && (
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/forgot-password" style={{ fontSize: 14, color: 'var(--accent)' }}>
            Request a new reset link
          </Link>
        </p>
      )}

      <p style={{ marginTop: 16, textAlign: 'center' }}>
        <Link href="/login" style={{ fontSize: 14, color: 'var(--muted)' }}>
          ← Back to login
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="page-container">
      <Suspense fallback={
        <div className="card" style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
