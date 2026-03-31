'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success — never reveal whether email exists
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <h1 className="page-title">Check your email</h1>
          <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            If an account exists for <strong>{email}</strong>, we've sent a reset link.
            It expires in 1 hour.
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            No email? Check your spam folder, or{' '}
            <button
              onClick={() => setSent(false)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}
            >
              try again
            </button>.
          </p>
          <p style={{ marginTop: 24 }}>
            <Link href="/login" style={{ fontSize: 14, color: 'var(--accent)' }}>
              ← Back to login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
        <h1 className="page-title" style={{ textAlign: 'center' }}>Forgot password</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          Enter your email and we'll send you a reset link.
        </p>

        {error && <div className="status-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href="/login" style={{ fontSize: 14, color: 'var(--muted)' }}>
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
