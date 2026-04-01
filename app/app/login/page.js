'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSessionExpiredMessage, hasToken } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (hasToken()) { router.push('/setup'); return; }
    const msg = getSessionExpiredMessage();
    if (msg) setInfo(msg);
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const res  = await fetch('/api/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || 'Login failed'); return; }
      localStorage.setItem('token', data.token);
      router.push('/setup');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/* ── LEFT PANEL ──────────────────────────────────────── */}
      <div style={{
        width: '52%',
        background: '#0c0a14',
        borderRight: '1px solid #2d2645',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '36px 52px 48px',
      }}>

        {/* Logo / back to home */}
        <Link href="/" style={{
          display:        'inline-flex',
          alignItems:     'center',
          gap:            9,
          textDecoration: 'none',
          color:          '#fafafa',
          fontWeight:     700,
          fontSize:       16,
          letterSpacing:  '-0.02em',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
              fill="#7c3aed" opacity="0.2" stroke="#7c3aed" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
              fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          PromptFence
        </Link>

        {/* Centred brand message */}
        <div style={{ maxWidth: 400 }}>
          <h1 style={{
            fontFamily:    "'Cormorant Garant', Georgia, serif",
            fontSize:      52,
            fontWeight:    300,
            lineHeight:    1.1,
            letterSpacing: '0.01em',
            color:         '#fafafa',
            margin:        '0 0 20px',
          }}>
            Protect sensitive<br />customer data<br />
            <span style={{ color: '#7c3aed' }}>from AI tools.</span>
          </h1>
          <p style={{
            fontSize:   16,
            color:      '#a89ec0',
            lineHeight: 1.7,
            margin:     '0 0 40px',
          }}>
            Real-time protection for every prompt your team sends,
            with a full audit trail for every AI product you ship.
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              '100% local detection. Nothing ever leaves the browser.',
              'GDPR and EU AI Act compliance evidence built in.',
              'Browser extension plus developer API in one platform.',
            ].map(item => (
              <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#6b608a' }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <p style={{ fontSize: 12, color: '#3d3460', margin: 0 }}>
          AI data protection · Made in the EU
        </p>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────── */}
      <div style={{
        flex:           1,
        background:     '#080611',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'space-between',
        padding:        '36px 52px 48px',
      }}>

        {/* Top-right: sign-up nudge */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#6b608a' }}>New to PromptFence?</span>
          <Link href="/signup" style={{
            fontSize:       13,
            fontWeight:     600,
            color:          '#fafafa',
            textDecoration: 'none',
            background:     '#1a1628',
            border:         '1px solid #2d2645',
            borderRadius:   7,
            padding:        '6px 14px',
            transition:     'border-color 0.12s',
          }}>
            Start free trial
          </Link>
        </div>

        {/* Form centred vertically */}
        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <h2 style={{
            fontSize:      24,
            fontWeight:    600,
            color:         '#fafafa',
            margin:        '0 0 6px',
            letterSpacing: '-0.02em',
          }}>
            Log in to PromptFence
          </h2>
          <p style={{ fontSize: 14, color: '#6b608a', margin: '0 0 32px' }}>
            Welcome back. Enter your details below.
          </p>

          {info  && (
            <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#c4b5fd', borderRadius: 8, padding: '12px 14px', fontSize: 13, marginBottom: 20 }}>
              {info}
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', borderRadius: 8, padding: '12px 14px', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a89ec0', marginBottom: 7 }}>
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
                required
                style={{
                  width:        '100%',
                  padding:      '11px 14px',
                  fontSize:     14,
                  background:   '#13101f',
                  border:       '1px solid #2d2645',
                  borderRadius: 8,
                  color:        '#fafafa',
                  outline:      'none',
                  boxSizing:    'border-box',
                  transition:   'border-color 0.15s',
                }}
                onFocus={e  => e.target.style.borderColor = '#7c3aed'}
                onBlur={e   => e.target.style.borderColor = '#2d2645'}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500, color: '#a89ec0' }}>
                  Password
                </label>
                <Link href="/forgot-password" style={{ fontSize: 12, color: '#6b608a', textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.color = '#a89ec0'}
                  onMouseLeave={e => e.target.style.color = '#6b608a'}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width:        '100%',
                  padding:      '11px 14px',
                  fontSize:     14,
                  background:   '#13101f',
                  border:       '1px solid #2d2645',
                  borderRadius: 8,
                  color:        '#fafafa',
                  outline:      'none',
                  boxSizing:    'border-box',
                  transition:   'border-color 0.15s',
                }}
                onFocus={e  => e.target.style.borderColor = '#7c3aed'}
                onBlur={e   => e.target.style.borderColor = '#2d2645'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width:         '100%',
                padding:       '12px',
                marginTop:     4,
                background:    loading ? '#3d3460' : '#7c3aed',
                color:         '#fff',
                border:        'none',
                borderRadius:  8,
                fontSize:      14,
                fontWeight:    600,
                cursor:        loading ? 'not-allowed' : 'pointer',
                transition:    'opacity 0.15s',
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>

          </form>
        </div>

        {/* Bottom note */}
        <p style={{ fontSize: 12, color: '#3d3460', margin: 0, textAlign: 'right' }}>
          © {new Date().getFullYear()} PromptFence
        </p>
      </div>

    </div>
  );
}
