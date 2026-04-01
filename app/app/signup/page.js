'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { hasToken } from '../../lib/api';

const inputStyle = {
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
};

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(null);

  useEffect(() => {
    if (hasToken()) router.push('/setup');
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || 'Signup failed'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('installCode', data.installCode);
      setSuccess(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /* ── SUCCESS STATE ─────────────────────────────────────── */
  if (success) {
    return (
      <div style={{
        minHeight:      '100vh',
        background:     '#0c0a14',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontFamily:     "'Inter', -apple-system, sans-serif",
        WebkitFontSmoothing: 'antialiased',
        padding:        24,
      }}>
        <div style={{
          background:   '#13101f',
          border:       '1px solid #2d2645',
          borderRadius: 14,
          padding:      '48px 40px',
          maxWidth:     440,
          width:        '100%',
          textAlign:    'center',
        }}>
          <div style={{
            width:          48,
            height:         48,
            borderRadius:   '50%',
            background:     'rgba(34,197,94,0.12)',
            border:         '1px solid rgba(34,197,94,0.25)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            margin:         '0 auto 20px',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="#22c55e" aria-hidden="true">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fafafa', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Account created
          </h2>
          <p style={{ fontSize: 14, color: '#a89ec0', margin: '0 0 28px', lineHeight: 1.6 }}>
            Share this install code with your team so they can connect the extension.
          </p>
          <div style={{
            fontFamily:    "'JetBrains Mono', monospace",
            fontSize:      28,
            fontWeight:    700,
            letterSpacing: 4,
            color:         '#7c3aed',
            background:    '#1a1628',
            border:        '1px solid #2d2645',
            borderRadius:  10,
            padding:       '18px 24px',
            marginBottom:  20,
          }}>
            {success.installCode}
          </div>
          <p style={{ fontSize: 13, color: '#6b608a', margin: '0 0 28px' }}>
            Organisation: <strong style={{ color: '#a89ec0' }}>{success.domain}</strong>
          </p>
          <button
            onClick={() => router.push('/setup')}
            style={{
              width:        '100%',
              padding:      '12px',
              background:   '#7c3aed',
              color:        '#fff',
              border:       'none',
              borderRadius: 8,
              fontSize:     14,
              fontWeight:   600,
              cursor:       'pointer',
            }}
          >
            Continue to setup
          </button>
        </div>
      </div>
    );
  }

  /* ── MAIN LAYOUT ───────────────────────────────────────── */
  return (
    <div style={{
      display:            'flex',
      minHeight:          '100vh',
      fontFamily:         "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>

      {/* ── LEFT PANEL ──────────────────────────────────────── */}
      <div style={{
        width:          '52%',
        background:     '#0c0a14',
        borderRight:    '1px solid #2d2645',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'space-between',
        padding:        '36px 52px 48px',
      }}>

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
            Set up your team<br />in five minutes,<br />
            <span style={{ color: '#7c3aed' }}>not five weeks.</span>
          </h1>
          <p style={{ fontSize: 16, color: '#a89ec0', lineHeight: 1.7, margin: '0 0 40px' }}>
            No IT ticket. No code required. Your team installs the extension
            and every AI prompt is protected from day one.
          </p>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              'Free 14-day trial. No credit card required.',
              'Set policy once. Covers every AI tool automatically.',
              'Full audit log ready for compliance reviews.',
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#6b608a' }}>Already have an account?</span>
          <Link href="/login" style={{
            fontSize:       13,
            fontWeight:     600,
            color:          '#fafafa',
            textDecoration: 'none',
            background:     '#1a1628',
            border:         '1px solid #2d2645',
            borderRadius:   7,
            padding:        '6px 14px',
          }}>
            Log in
          </Link>
        </div>

        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#fafafa', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Start your free trial
          </h2>
          <p style={{ fontSize: 14, color: '#6b608a', margin: '0 0 32px' }}>
            14 days free. No credit card needed.
          </p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', borderRadius: 8, padding: '12px 14px', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a89ec0', marginBottom: 7 }}>
                Work email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e  => e.target.style.borderColor = '#2d2645'}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a89ec0', marginBottom: 7 }}>
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e  => e.target.style.borderColor = '#2d2645'}
              />
              <p style={{ fontSize: 12, color: '#3d3460', marginTop: 7 }}>
                Your organisation domain is set automatically from your email.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width:        '100%',
                padding:      '12px',
                marginTop:    4,
                background:   loading ? '#3d3460' : '#7c3aed',
                color:        '#fff',
                border:       'none',
                borderRadius: 8,
                fontSize:     14,
                fontWeight:   600,
                cursor:       loading ? 'not-allowed' : 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? 'Creating account...' : 'Create free account'}
            </button>

            <p style={{ fontSize: 12, color: '#3d3460', textAlign: 'center', margin: 0 }}>
              By signing up you agree to our{' '}
              <Link href="/privacy" style={{ color: '#6b608a', textDecoration: 'none' }}>Privacy Policy</Link>.
            </p>

          </form>
        </div>

        <p style={{ fontSize: 12, color: '#3d3460', margin: 0, textAlign: 'right' }}>
          © {new Date().getFullYear()} PromptFence
        </p>
      </div>

    </div>
  );
}
