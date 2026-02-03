'use client';

import { useState, useEffect } from 'react';

export default function DemoPage() {
  const [healthStatus, setHealthStatus] = useState('checking');
  const [healthMessage, setHealthMessage] = useState('Checking...');

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (res.ok && data.ok) {
          setHealthStatus('ok');
          setHealthMessage('OK');
        } else {
          setHealthStatus('down');
          setHealthMessage(data.error || 'Service unavailable');
        }
      } catch (err) {
        setHealthStatus('down');
        setHealthMessage('Connection failed');
      }
    }
    checkHealth();
  }, []);

  const statusColor = healthStatus === 'ok' ? '#22c55e' : healthStatus === 'down' ? '#ef4444' : '#f59e0b';
  const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://promptfenceapp-production.up.railway.app';

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>PromptFence Demo</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>Test in under 5 minutes</p>

      {/* Health Check */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: statusColor
        }} />
        <span style={{ fontWeight: 500 }}>Backend:</span>
        <span style={{ color: statusColor }}>{healthMessage}</span>
      </div>

      {/* Primary Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        <a href="/extension/promptfence-extension.zip" download style={{
          display: 'block',
          padding: '16px 20px',
          background: '#7c3aed',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          textAlign: 'center',
          fontSize: '1.1rem'
        }}>
          Download Extension (ZIP)
        </a>
        <a href="/signup" style={{
          display: 'block',
          padding: '16px 20px',
          background: '#2563eb',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          textAlign: 'center',
          fontSize: '1.1rem'
        }}>
          Sign Up (Admin)
        </a>
        <a href="/login" style={{
          display: 'block',
          padding: '14px 20px',
          background: '#1f2937',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: 500,
          textAlign: 'center'
        }}>
          Log In
        </a>
      </div>

      {/* Install Code Info */}
      <div style={{
        padding: '16px',
        background: '#fef3c7',
        borderRadius: '8px',
        marginBottom: '32px'
      }}>
        <strong>Install Code</strong>
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#92400e' }}>
          You'll get an 8-character code after signup. Use it in the extension options.
          <br />
          <a href="/setup" style={{ color: '#b45309' }}>Go to Setup →</a>
        </p>
      </div>

      {/* How to Test */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>How to Test (2 minutes)</h2>
      <ol style={{ lineHeight: '2', paddingLeft: '20px', color: '#374151', marginBottom: '24px' }}>
        <li>
          <strong>Load extension:</strong> Unzip → <code>chrome://extensions</code> → Developer Mode ON → Load unpacked
          <br />
          <a href="https://github.com/user/promptfence/blob/main/extension/README.md" style={{ fontSize: '0.85rem', color: '#6366f1' }}>
            (detailed instructions)
          </a>
        </li>
        <li>
          <strong>Configure:</strong> Extension Options → paste Install Code + API URL below
        </li>
        <li>
          <strong>Test:</strong> Go to <a href="https://chatgpt.com" target="_blank" rel="noopener">chatgpt.com</a> and paste:
          <br />
          <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>test@example.com</code> (WARN) or{' '}
          <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>DE89370400440532013000</code> (BLOCK)
        </li>
        <li>
          <strong>Verify:</strong> Refresh <a href="/events">/events</a> to see logged events
        </li>
      </ol>

      {/* API Base URL */}
      <div style={{
        padding: '16px',
        background: '#f0fdf4',
        borderRadius: '8px',
        border: '1px solid #bbf7d0'
      }}>
        <strong>API Base URL (for extension):</strong>
        <div style={{ marginTop: '8px' }}>
          <code style={{
            display: 'block',
            background: '#dcfce7',
            padding: '10px 12px',
            borderRadius: '4px',
            fontSize: '0.95rem',
            wordBreak: 'break-all'
          }}>
            {apiBaseUrl}
          </code>
        </div>
      </div>
    </div>
  );
}
