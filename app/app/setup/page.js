'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminFetch, clearAuth } from '../../lib/api';

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [installCode, setInstallCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [configError, setConfigError] = useState(false);

  // Config state
  const [aiTools, setAiTools] = useState({
    chatgpt: true,
    claude: true,
    gemini: true,
    other: false,
  });

  const [rules, setRules] = useState({
    EMAIL: 'WARN',
    PHONE: 'WARN',
    IBAN: 'BLOCK',
  });

  const [approvedAiUrl, setApprovedAiUrl] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load install code from localStorage if available
    const storedInstallCode = localStorage.getItem('installCode');
    if (storedInstallCode) {
      setInstallCode(storedInstallCode);
    }

    fetchConfig();
  }, [router]);

  async function fetchConfig() {
    setLoading(true);
    setError('');
    setConfigError(false);

    try {
      const { res, data } = await adminFetch('/api/config', {}, router);

      if (!res || res.status === 401) {
        // Already handled by adminFetch
        return;
      }

      if (!res.ok) {
        setConfigError(true);
        setError('Failed to load configuration');
        setLoading(false);
        return;
      }

      if (data && !data.error) {
        setAiTools(data.aiTools || aiTools);
        setRules(data.rules || rules);
        setApprovedAiUrl(data.approvedAiUrl || '');
      }
    } catch (err) {
      setConfigError(true);
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { res, data } = await adminFetch('/api/config', {
        method: 'POST',
        body: JSON.stringify({
          aiTools,
          rules,
          approvedAiUrl: approvedAiUrl || null,
        }),
      }, router);

      if (!res || res.status === 401) {
        return;
      }

      if (!res.ok) {
        setError(data?.error?.message || 'Failed to save');
      } else {
        setSuccess('Configuration saved successfully!');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    clearAuth();
    router.push('/login');
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(installCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = installCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div>
        <nav className="nav">
          <Link href="/setup" className="active">Setup</Link>
          <Link href="/events">Events</Link>
          <Link href="/users">Users</Link>
          <a href="#" onClick={handleLogout} style={{ marginLeft: 'auto' }}>Logout</a>
        </nav>
        <div className="page-container">
          <p style={{ color: 'var(--muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="nav">
        <Link href="/setup" className="active">Setup</Link>
        <Link href="/events">Events</Link>
        <Link href="/users">Users</Link>
        <a href="#" onClick={handleLogout} style={{ marginLeft: 'auto' }}>Logout</a>
      </nav>

      <div className="page-container">
        <h1 className="page-title">Configuration</h1>

        {installCode && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 8 }}>Install Code</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 14 }}>
              Share this code with your team to install the extension:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="install-code" style={{ flex: 1 }}>{installCode}</div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyCode}
                style={{ minWidth: 80 }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {configError && (
          <div className="status-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchConfig}
              style={{ marginLeft: 16 }}
            >
              Retry
            </button>
          </div>
        )}

        {!configError && error && <div className="status-error">{error}</div>}
        {success && <div className="status-success">{success}</div>}

        {!configError && (
          <form onSubmit={handleSave}>
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Allowed AI Tools</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 14 }}>
                Select which AI tools are approved for use. Unapproved tools will trigger warnings.
              </p>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={aiTools.chatgpt}
                    onChange={(e) => setAiTools({ ...aiTools, chatgpt: e.target.checked })}
                  />
                  ChatGPT (chatgpt.com)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={aiTools.claude}
                    onChange={(e) => setAiTools({ ...aiTools, claude: e.target.checked })}
                  />
                  Claude (claude.ai)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={aiTools.gemini}
                    onChange={(e) => setAiTools({ ...aiTools, gemini: e.target.checked })}
                  />
                  Gemini (gemini.google.com)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={aiTools.other}
                    onChange={(e) => setAiTools({ ...aiTools, other: e.target.checked })}
                  />
                  Other AI Tools
                </label>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Data Protection Rules</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 14 }}>
                Configure how sensitive data types are handled when pasted.
              </p>

              <div className="form-group">
                <label>Email Addresses</label>
                <select
                  value={rules.EMAIL}
                  onChange={(e) => setRules({ ...rules, EMAIL: e.target.value })}
                >
                  <option value="WARN">Warn (allow paste)</option>
                  <option value="BLOCK">Block (prevent paste)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Phone Numbers</label>
                <select
                  value={rules.PHONE}
                  onChange={(e) => setRules({ ...rules, PHONE: e.target.value })}
                >
                  <option value="WARN">Warn (allow paste)</option>
                  <option value="BLOCK">Block (prevent paste)</option>
                </select>
              </div>

              <div className="form-group">
                <label>IBANs (Bank Accounts)</label>
                <select
                  value={rules.IBAN}
                  onChange={(e) => setRules({ ...rules, IBAN: e.target.value })}
                >
                  <option value="WARN">Warn (allow paste)</option>
                  <option value="BLOCK">Block (prevent paste)</option>
                </select>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Approved AI URL</h3>
              <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: 14 }}>
                Optional: Provide a URL to your approved AI tool. Users will see a button to redirect here.
              </p>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input
                  type="url"
                  value={approvedAiUrl}
                  onChange={(e) => setApprovedAiUrl(e.target.value)}
                  placeholder="https://internal-ai.company.com"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
