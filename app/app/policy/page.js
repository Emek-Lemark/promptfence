'use client';

import { useState, useEffect } from 'react';
import AdminNav from '../AdminNav';

const PRESET_DEFAULTS = {
  personal:  { EMAIL: 'WARN',  PHONE: 'WARN',  IBAN: 'WARN',  CREDIT_CARD: 'BLOCK', ADDRESS: 'WARN',  PASSWORD: 'BLOCK' },
  finance:   { EMAIL: 'WARN',  PHONE: 'WARN',  IBAN: 'BLOCK', CREDIT_CARD: 'BLOCK', ADDRESS: 'WARN',  PASSWORD: 'BLOCK' },
  health:    { EMAIL: 'WARN',  PHONE: 'BLOCK', IBAN: 'WARN',  CREDIT_CARD: 'BLOCK', ADDRESS: 'BLOCK', PASSWORD: 'BLOCK' },
  workplace: { EMAIL: 'WARN',  PHONE: 'WARN',  IBAN: 'BLOCK', CREDIT_CARD: 'BLOCK', ADDRESS: 'WARN',  PASSWORD: 'BLOCK' },
  developer: { EMAIL: 'ALLOW', PHONE: 'ALLOW', IBAN: 'WARN',  CREDIT_CARD: 'BLOCK', ADDRESS: 'ALLOW', PASSWORD: 'BLOCK' },
};

const RULE_LABELS = {
  EMAIL: 'Email addresses',
  PHONE: 'Phone numbers',
  IBAN: 'Bank accounts (IBAN)',
  CREDIT_CARD: 'Credit cards',
  ADDRESS: 'Physical addresses',
  PASSWORD: 'API keys / secrets',
};

const ACTIONS = ['ALLOW', 'WARN', 'BLOCK'];

const PLATFORM_LABELS = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  copilot: 'Copilot',
  mistral: 'Mistral',
  slack: 'Slack',
  gmail: 'Gmail',
  notion: 'Notion',
  linear: 'Linear',
  outlook: 'Outlook',
};

const styles = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '40px 24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#1e293b',
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 32,
  },
  section: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 16,
    color: '#1e293b',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
    color: '#64748b',
  },
  select: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: '#fff',
    color: '#1e293b',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: 600,
    background: '#f8fafc',
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0',
  },
  input: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    flex: 1,
    color: '#1e293b',
  },
  inputFull: {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    width: '100%',
    color: '#1e293b',
  },
  row: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  btnPrimary: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  btnSmall: {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  term: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 13,
    color: '#1e293b',
  },
  termX: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    padding: 0,
    lineHeight: 1,
  },
  termsWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px 16px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: 400,
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: '#1a56db',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  saveRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  saveBtnLarge: {
    padding: '10px 28px',
    fontSize: 15,
    fontWeight: 600,
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  success: {
    fontSize: 14,
    color: '#059669',
    fontWeight: 500,
  },
  error: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: 500,
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    color: '#64748b',
    fontSize: 15,
  },
};

function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || '';
  }
  return '';
}

export default function PolicyPage() {
  const [preset, setPreset] = useState('workplace');
  const [rules, setRules] = useState(PRESET_DEFAULTS.workplace);
  const [customTerms, setCustomTerms] = useState([]);
  const [newTerm, setNewTerm] = useState('');
  const [platforms, setPlatforms] = useState({});
  const [approvedAiUrl, setApprovedAiUrl] = useState('');
  const [fileUploadWarning, setFileUploadWarning] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchPolicy();
  }, []);

  async function fetchPolicy() {
    try {
      const res = await fetch('/api/policy', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load policy');
      const data = await res.json();
      setPreset(data.preset || 'workplace');
      setRules(data.rules || PRESET_DEFAULTS.workplace);
      setPlatforms(data.platforms || {});
      setCustomTerms(data.customTerms || []);
      setApprovedAiUrl(data.approvedAiUrl || '');
      setFileUploadWarning(data.fileUploadWarning ?? true);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load policy settings.' });
    } finally {
      setLoading(false);
    }
  }

  function handlePresetChange(value) {
    setPreset(value);
    if (PRESET_DEFAULTS[value]) {
      setRules({ ...PRESET_DEFAULTS[value] });
    }
  }

  function handleRuleChange(key, value) {
    setRules(prev => ({ ...prev, [key]: value }));
  }

  function addTerm() {
    const trimmed = newTerm.trim();
    if (!trimmed) return;
    if (customTerms.includes(trimmed)) return;
    if (customTerms.length >= 50) return;
    setCustomTerms(prev => [...prev, trimmed]);
    setNewTerm('');
  }

  function removeTerm(term) {
    setCustomTerms(prev => prev.filter(t => t !== term));
  }

  function handlePlatformToggle(key) {
    setPlatforms(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          preset,
          rules,
          platforms,
          customTerms,
          approvedAiUrl,
          fileUploadWarning,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Save failed');
      }
      setMessage({ type: 'success', text: 'Policy saved.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save policy.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <AdminNav active="policy" />
        <div style={styles.loading}>Loading policy...</div>
      </>
    );
  }

  return (
    <>
      <AdminNav active="policy" />
      <div style={styles.container}>
        <h1 style={styles.title}>Detection Policy</h1>

        {/* Active preset */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Active preset</div>
          <label style={styles.label}>Preset</label>
          <select
            style={styles.select}
            value={preset}
            onChange={e => handlePresetChange(e.target.value)}
          >
            <option value="personal">Personal</option>
            <option value="finance">Finance</option>
            <option value="health">Health</option>
            <option value="workplace">Workplace</option>
            <option value="developer">Developer</option>
          </select>
        </div>

        {/* Detection rules */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Detection rules</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Data Type</th>
                <th style={{ ...styles.th, width: 160 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(RULE_LABELS).map(([key, label]) => (
                <tr key={key}>
                  <td style={styles.td}>{label}</td>
                  <td style={styles.td}>
                    <select
                      style={styles.select}
                      value={rules[key] || 'WARN'}
                      onChange={e => handleRuleChange(key, e.target.value)}
                    >
                      {ACTIONS.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Custom blocked terms */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Custom blocked terms</div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            Add company-specific terms (client names, project codes, etc.) that should trigger a warning.
          </p>
          <div style={styles.row}>
            <input
              type="text"
              style={styles.input}
              placeholder="Enter a term..."
              value={newTerm}
              onChange={e => setNewTerm(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTerm(); }}
              maxLength={100}
            />
            <button style={styles.btnSmall} onClick={addTerm}>Add term</button>
          </div>
          {customTerms.length > 0 && (
            <div style={styles.termsWrap}>
              {customTerms.map(term => (
                <span key={term} style={styles.term}>
                  {term}
                  <button style={styles.termX} onClick={() => removeTerm(term)} title="Remove">
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Monitored platforms */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Monitored platforms</div>
          <div style={styles.checkboxGrid}>
            {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
              <label key={key} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={!!platforms[key]}
                  onChange={() => handlePlatformToggle(key)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Approved AI URL */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Approved AI URL</div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            Your company's approved AI tool URL. Users will be redirected here.
          </p>
          <input
            type="url"
            style={styles.inputFull}
            placeholder="https://ai.yourcompany.com"
            value={approvedAiUrl}
            onChange={e => setApprovedAiUrl(e.target.value)}
          />
        </div>

        {/* File upload warnings */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>File upload warnings</div>
          <label style={styles.toggleRow}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={fileUploadWarning}
              onChange={e => setFileUploadWarning(e.target.checked)}
            />
            <span style={{ fontSize: 14 }}>Warn when files are uploaded to AI tools</span>
          </label>
        </div>

        {/* Save */}
        <div style={styles.saveRow}>
          <button
            style={{
              ...styles.saveBtnLarge,
              opacity: saving ? 0.6 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save policy'}
          </button>
          {message && (
            <span style={message.type === 'success' ? styles.success : styles.error}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
