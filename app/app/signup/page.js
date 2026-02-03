'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { hasToken } from '../../lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    // Redirect to /setup if already logged in
    if (hasToken()) {
      router.push('/setup');
    }
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Signup failed');
        setLoading(false);
        return;
      }

      // Store token in localStorage
      // TODO: Use httpOnly cookies for production
      localStorage.setItem('token', data.token);
      localStorage.setItem('installCode', data.installCode);

      setSuccess(data);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--success)', marginBottom: 16 }}>Account Created!</h1>
          <p style={{ marginBottom: 24, color: 'var(--muted)' }}>
            Your organization has been set up. Share this install code with your team:
          </p>
          <div className="install-code" style={{ marginBottom: 24 }}>
            {success.installCode}
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
            Domain: <strong>{success.domain}</strong>
          </p>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => router.push('/setup')}
          >
            Continue to Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
        <h1 className="page-title" style={{ textAlign: 'center' }}>Create Account</h1>

        {error && <div className="status-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Work Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: 'center', color: 'var(--muted)' }}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
