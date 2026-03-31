'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const CHROME_STORE_URL = 'https://chrome.google.com/webstore/detail/promptfence/YOUR_EXTENSION_ID';
const FIREFOX_STORE_URL = 'https://addons.mozilla.org/en-US/firefox/addon/promptfence/';

const s = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '40px 36px',
    maxWidth: 480,
    width: '100%',
    textAlign: 'center',
  },
  logo: {
    width: 52,
    height: 52,
    background: '#1a56db',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  heading: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 32,
    lineHeight: 1.5,
  },
  orgTag: {
    display: 'inline-block',
    background: '#eff6ff',
    color: '#1a56db',
    fontWeight: 600,
    padding: '2px 10px',
    borderRadius: 99,
    fontSize: 14,
    marginBottom: 24,
  },
  steps: {
    textAlign: 'left',
    marginBottom: 28,
  },
  step: {
    display: 'flex',
    gap: 14,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#1a56db',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumDone: {
    background: '#059669',
  },
  stepContent: { flex: 1 },
  stepTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.5,
  },
  codeBox: {
    display: 'inline-block',
    fontFamily: 'monospace',
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 3,
    background: '#f3f4f6',
    padding: '12px 24px',
    borderRadius: 8,
    color: '#1e293b',
    margin: '8px 0',
    userSelect: 'all',
  },
  btnPrimary: {
    display: 'block',
    width: '100%',
    padding: '12px 20px',
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
    marginBottom: 10,
  },
  btnSecondary: {
    display: 'block',
    width: '100%',
    padding: '11px 20px',
    background: '#fff',
    color: '#1e293b',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
  },
  copyBtn: {
    marginTop: 6,
    fontSize: 12,
    color: '#1a56db',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500,
  },
  footer: {
    marginTop: 28,
    fontSize: 12,
    color: '#94a3b8',
  },
};

function InstallContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code')?.toUpperCase() || '';
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(!!code);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code) return;
    // Fetch org name from the config endpoint
    fetch('/api/config', {
      headers: { 'X-Install-Code': code }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.orgName) setOrgName(data.orgName);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code]);

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
        </div>

        <h1 style={s.heading}>Install PromptFence</h1>

        {loading ? (
          <p style={s.subheading}>Loading your invite...</p>
        ) : (
          <>
            {orgName && (
              <div style={s.orgTag}>{orgName}</div>
            )}
            <p style={s.subheading}>
              {orgName
                ? `${orgName} uses PromptFence to prevent sensitive data from leaking into AI tools. Follow these steps to get protected.`
                : 'Follow these steps to connect to your team.'}
            </p>

            <div style={s.steps}>
              {/* Step 1 */}
              <div style={s.step}>
                <div style={s.stepNum}>1</div>
                <div style={s.stepContent}>
                  <div style={s.stepTitle}>Install the browser extension</div>
                  <div style={s.stepDesc}>Available for Chrome and Firefox. Takes about 30 seconds.</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <a
                      href={CHROME_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...s.btnPrimary, width: 'auto', flex: 1, fontSize: 13, padding: '8px 14px', marginBottom: 0 }}
                    >
                      Chrome
                    </a>
                    <a
                      href={FIREFOX_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...s.btnSecondary, width: 'auto', flex: 1, fontSize: 13, padding: '8px 14px' }}
                    >
                      Firefox
                    </a>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div style={s.step}>
                <div style={s.stepNum}>2</div>
                <div style={s.stepContent}>
                  <div style={s.stepTitle}>Click the extension icon and enter your team code</div>
                  <div style={s.stepDesc}>Find the PromptFence icon in your browser toolbar, then paste this code:</div>
                  {code && (
                    <>
                      <div style={s.codeBox}>{code}</div>
                      <div>
                        <button style={s.copyBtn} onClick={copyCode}>
                          {copied ? '✓ Copied!' : 'Copy code'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ ...s.step, marginBottom: 0 }}>
                <div style={s.stepNum}>3</div>
                <div style={s.stepContent}>
                  <div style={s.stepTitle}>You're protected</div>
                  <div style={s.stepDesc}>
                    PromptFence will quietly run in the background, alerting you if sensitive data is detected before it reaches an AI tool.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <p style={s.footer}>
          PromptFence detects sensitive data locally in your browser. No prompts or clipboard content is ever stored.
        </p>
      </div>
    </div>
  );
}

export default function InstallPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#64748b' }}>
        Loading...
      </div>
    }>
      <InstallContent />
    </Suspense>
  );
}
