'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, hasToken } from '../../lib/api';

/* ─── Preset definitions ─── */
const PRESETS = {
  personal:  { label: 'Personal',   desc: 'Lighter protection for individual use. Blocks credit cards and passwords, warns on other PII.', EMAIL: 'WARN', PHONE: 'WARN', IBAN: 'WARN', CREDIT_CARD: 'BLOCK', ADDRESS: 'WARN', PASSWORD: 'BLOCK' },
  finance:   { label: 'Finance',    desc: 'Strict rules for financial data. Blocks IBANs, credit cards, and passwords.', EMAIL: 'WARN', PHONE: 'WARN', IBAN: 'BLOCK', CREDIT_CARD: 'BLOCK', ADDRESS: 'WARN', PASSWORD: 'BLOCK' },
  health:    { label: 'Health',     desc: 'HIPAA-aware defaults. Blocks phone, address, credit card, and password fields.', EMAIL: 'WARN', PHONE: 'BLOCK', IBAN: 'WARN', CREDIT_CARD: 'BLOCK', ADDRESS: 'BLOCK', PASSWORD: 'BLOCK' },
  workplace: { label: 'Workplace',  desc: 'Balanced protection for office teams. Recommended for most organizations.', EMAIL: 'WARN', PHONE: 'WARN', IBAN: 'BLOCK', CREDIT_CARD: 'BLOCK', ADDRESS: 'WARN', PASSWORD: 'BLOCK' },
  developer: { label: 'Developer',  desc: 'Relaxed rules for engineering teams. Allows most PII, blocks credit cards and passwords.', EMAIL: 'ALLOW', PHONE: 'ALLOW', IBAN: 'WARN', CREDIT_CARD: 'BLOCK', ADDRESS: 'ALLOW', PASSWORD: 'BLOCK' },
};

const RULE_KEYS = ['EMAIL', 'PHONE', 'IBAN', 'CREDIT_CARD', 'ADDRESS', 'PASSWORD'];
const RULE_LABELS = { EMAIL: 'Email', PHONE: 'Phone', IBAN: 'IBAN', CREDIT_CARD: 'Credit Card', ADDRESS: 'Address', PASSWORD: 'Password' };
const ACTIONS = ['ALLOW', 'WARN', 'BLOCK'];

const INDUSTRIES = ['Tech/SaaS', 'Finance/Accounting', 'Legal', 'Healthcare', 'Recruitment/HR', 'Agency/Consulting', 'Other'];

const PLATFORMS = [
  { key: 'chatgpt',    label: 'ChatGPT',    defaultOn: true },
  { key: 'claude',     label: 'Claude',      defaultOn: true },
  { key: 'gemini',     label: 'Gemini',      defaultOn: true },
  { key: 'perplexity', label: 'Perplexity',  defaultOn: false },
  { key: 'copilot',    label: 'Copilot',     defaultOn: false },
  { key: 'mistral',    label: 'Mistral',     defaultOn: false },
  { key: 'slack',      label: 'Slack',       defaultOn: false },
  { key: 'gmail',      label: 'Gmail',       defaultOn: false },
  { key: 'notion',     label: 'Notion',      defaultOn: false },
  { key: 'linear',     label: 'Linear',      defaultOn: false },
  { key: 'outlook',    label: 'Outlook',     defaultOn: false },
];

const STEP_TITLES = ['Your Company', 'Choose Your Policy', 'AI Platforms', 'Invite Your Team'];

/* ─── Inline styles ─── */
const s = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' },
  container: { maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' },
  logo: { textAlign: 'center', marginBottom: 32 },
  logoText: { fontSize: 20, fontWeight: 700, color: '#1a56db' },
  progressBar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 8 },
  stepCircle: (active, done) => ({
    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 600, flexShrink: 0,
    background: active ? '#1a56db' : done ? '#059669' : '#e2e8f0',
    color: active || done ? '#fff' : '#64748b',
    transition: 'all 0.2s',
  }),
  stepLine: (done) => ({ width: 48, height: 2, background: done ? '#059669' : '#e2e8f0', transition: 'background 0.2s' }),
  stepLabel: { textAlign: 'center', fontSize: 14, color: '#64748b', marginBottom: 32 },
  stepLabelStrong: { color: '#1e293b', fontWeight: 600 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 32, marginBottom: 24 },
  cardTitle: { fontSize: 20, fontWeight: 600, color: '#1e293b', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  label: { display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#1e293b' },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none', color: '#1e293b' },
  inputReadonly: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', color: '#64748b' },
  select: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none', color: '#1e293b', background: '#fff' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 24px', fontSize: 14, fontWeight: 500, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#1a56db', color: '#fff', transition: 'background 0.2s', minWidth: 120 },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 24px', fontSize: 14, fontWeight: 500, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#1e293b', transition: 'background 0.2s' },
  btnSmall: { padding: '6px 12px', fontSize: 13, fontWeight: 500, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#1e293b' },
  btnDanger: { padding: '4px 8px', fontSize: 12, border: 'none', borderRadius: 4, cursor: 'pointer', background: '#fee2e2', color: '#991b1b' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14 },
  success: { background: '#dcfce7', color: '#166534', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14 },
  radioCard: (selected) => ({
    border: selected ? '2px solid #1a56db' : '1px solid #e2e8f0',
    borderRadius: 8, padding: '12px 16px', cursor: 'pointer', background: selected ? '#eff6ff' : '#fff',
    transition: 'all 0.15s',
  }),
  radioLabel: { fontWeight: 600, fontSize: 14, color: '#1e293b' },
  radioDesc: { fontSize: 13, color: '#64748b', marginTop: 2 },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#eff6ff', color: '#1a56db', borderRadius: 4, fontSize: 13 },
  checkboxGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', color: '#1e293b' },
  installCode: { fontFamily: 'monospace', fontSize: 28, fontWeight: 700, background: '#f3f4f6', padding: '20px 24px', borderRadius: 8, textAlign: 'center', letterSpacing: 3, color: '#1e293b' },
  installUrl: { fontFamily: 'monospace', fontSize: 14, background: '#f3f4f6', padding: '12px 16px', borderRadius: 6, wordBreak: 'break-all', color: '#1e293b' },
  actionBadge: (action) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
    background: action === 'BLOCK' ? '#fee2e2' : action === 'WARN' ? '#fef3c7' : '#dcfce7',
    color: action === 'BLOCK' ? '#991b1b' : action === 'WARN' ? '#92400e' : '#166534',
  }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', fontWeight: 600, color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '10px 12px', borderBottom: '1px solid #e2e8f0' },
  inviteRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e8f0', fontSize: 14 },
  inviteStatus: (status) => ({ fontSize: 12, fontWeight: 500, color: status === 'pending' ? '#92400e' : '#166534' }),
};

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [domain, setDomain] = useState('');

  // Step 2
  const [preset, setPreset] = useState('workplace');
  const [rules, setRules] = useState({ ...PRESETS.workplace });
  const [customTerms, setCustomTerms] = useState([]);
  const [termInput, setTermInput] = useState('');

  // Step 3
  const [platforms, setPlatforms] = useState(() => {
    const init = {};
    PLATFORMS.forEach(p => { init[p.key] = p.defaultOn; });
    return init;
  });
  const [approvedAiUrl, setApprovedAiUrl] = useState('');

  // Step 4
  const [installCode, setInstallCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedMembers, setInvitedMembers] = useState([]);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!hasToken()) {
      router.push('/login');
      return;
    }
    fetchSetupStatus();
  }, [router]);

  async function fetchSetupStatus() {
    try {
      const { res, data } = await adminFetch('/api/setup', {}, router);
      if (!res || res.status === 401) return;
      if (res.ok && data) {
        // If setup is already complete, redirect to dashboard
        if (data.setupCompleted) {
          router.push('/dashboard');
          return;
        }
        if (data.orgName) setCompanyName(data.orgName);
        if (data.industry) setIndustry(data.industry);
        if (data.domain) setDomain(data.domain);
        if (data.installCode) setInstallCode(data.installCode);
        if (data.preset && PRESETS[data.preset]) {
          setPreset(data.preset);
          setRules({ ...PRESETS[data.preset] });
        }
      }
    } catch (err) {
      // silent - defaults are fine
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setError('');
    setSuccessMsg('');
  }

  /* ─── Step navigation ─── */
  async function handleNext() {
    clearMessages();
    setSaving(true);

    try {
      let payload;
      if (step === 1) {
        if (!companyName.trim()) { setError('Company name is required.'); setSaving(false); return; }
        payload = { step: 'company', data: { name: companyName.trim(), industry } };
      } else if (step === 2) {
        const ruleData = {};
        RULE_KEYS.forEach(k => { ruleData[k] = rules[k]; });
        payload = { step: 'policy', data: { preset, rules: ruleData, customTerms } };
      } else if (step === 3) {
        payload = { step: 'platforms', data: { platforms, approvedAiUrl: approvedAiUrl || null } };
      }

      if (payload) {
        const { res, data } = await adminFetch('/api/setup', { method: 'POST', body: JSON.stringify(payload) }, router);
        if (!res || res.status === 401) return;
        if (!res.ok) { setError(data?.error?.message || 'Failed to save. Please try again.'); setSaving(false); return; }
      }

      setStep(prev => Math.min(prev + 1, 4));
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    clearMessages();
    setSaving(true);
    try {
      const { res, data } = await adminFetch('/api/setup', { method: 'POST', body: JSON.stringify({ step: 'complete', data: {} }) }, router);
      if (!res || res.status === 401) return;
      if (!res.ok) { setError(data?.error?.message || 'Failed to complete setup.'); setSaving(false); return; }
      router.push('/dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    clearMessages();
    setStep(prev => Math.max(prev - 1, 1));
  }

  /* ─── Preset change ─── */
  function handlePresetChange(key) {
    setPreset(key);
    const p = PRESETS[key];
    setRules({ EMAIL: p.EMAIL, PHONE: p.PHONE, IBAN: p.IBAN, CREDIT_CARD: p.CREDIT_CARD, ADDRESS: p.ADDRESS, PASSWORD: p.PASSWORD });
  }

  /* ─── Custom terms ─── */
  function addCustomTerm() {
    const term = termInput.trim();
    if (!term) return;
    if (customTerms.length >= 50) { setError('Maximum 50 custom terms allowed.'); return; }
    if (customTerms.includes(term)) { setError('This term already exists.'); return; }
    setCustomTerms([...customTerms, term]);
    setTermInput('');
    setError('');
  }

  function removeCustomTerm(idx) {
    setCustomTerms(customTerms.filter((_, i) => i !== idx));
  }

  /* ─── Copy install URL ─── */
  const installUrl = installCode ? `https://promptfence.ai/install?code=${installCode}` : '';

  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  /* ─── Invite team member ─── */
  async function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    clearMessages();
    try {
      const { res, data } = await adminFetch('/api/team', { method: 'POST', body: JSON.stringify({ email }) }, router);
      if (!res || res.status === 401) return;
      if (!res.ok) { setError(data?.error?.message || 'Failed to send invite.'); setInviting(false); return; }
      setInvitedMembers(prev => [...prev, { email, status: 'pending' }]);
      setInviteEmail('');
      setSuccessMsg(`Invite sent to ${email}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setInviting(false);
    }
  }

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.logo}><span style={s.logoText}>PromptFence</span></div>
          <p style={{ textAlign: 'center', color: '#64748b' }}>Loading...</p>
        </div>
      </div>
    );
  }

  /* ─── Progress indicator ─── */
  function renderProgress() {
    return (
      <div>
        <div style={s.progressBar}>
          {[1, 2, 3, 4].map((n, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={s.stepCircle(n === step, n < step)}>
                {n < step ? '\u2713' : n}
              </div>
              {i < 3 && <div style={s.stepLine(n < step)} />}
            </div>
          ))}
        </div>
        <p style={s.stepLabel}>
          Step {step} of 4: <span style={s.stepLabelStrong}>{STEP_TITLES[step - 1]}</span>
        </p>
      </div>
    );
  }

  /* ─── Step 1: Company ─── */
  function renderStep1() {
    return (
      <div style={s.card}>
        <h2 style={s.cardTitle}>Your Company</h2>
        <p style={s.cardDesc}>Tell us about your organization so we can tailor your experience.</p>

        <div style={{ marginBottom: 16 }}>
          <label style={s.label} htmlFor="companyName">Company Name</label>
          <input
            id="companyName"
            type="text"
            style={s.input}
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="Acme Inc."
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={s.label} htmlFor="industry">Industry</label>
          <select
            id="industry"
            style={s.select}
            value={industry}
            onChange={e => setIndustry(e.target.value)}
          >
            <option value="">Select your industry...</option>
            {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={s.label}>Domain</label>
          <input
            type="text"
            style={s.inputReadonly}
            value={domain || '(set during signup)'}
            readOnly
          />
        </div>
      </div>
    );
  }

  /* ─── Step 2: Policy ─── */
  function renderStep2() {
    return (
      <div>
        <div style={s.card}>
          <h2 style={s.cardTitle}>Choose Your Policy</h2>
          <p style={s.cardDesc}>Select a preset that matches your industry, then fine-tune individual rules.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {Object.entries(PRESETS).map(([key, p]) => (
              <div
                key={key}
                style={s.radioCard(preset === key)}
                onClick={() => handlePresetChange(key)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="preset"
                    checked={preset === key}
                    onChange={() => handlePresetChange(key)}
                    style={{ margin: 0 }}
                  />
                  <span style={s.radioLabel}>{p.label}</span>
                </div>
                <p style={s.radioDesc}>{p.desc}</p>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Detection Rules</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Data Type</th>
                  <th style={s.th}>Action</th>
                  <th style={s.th}>Preview</th>
                </tr>
              </thead>
              <tbody>
                {RULE_KEYS.map(key => (
                  <tr key={key}>
                    <td style={s.td}>{RULE_LABELS[key]}</td>
                    <td style={s.td}>
                      <select
                        value={rules[key]}
                        onChange={e => setRules({ ...rules, [key]: e.target.value })}
                        style={{ ...s.select, width: 'auto', minWidth: 110 }}
                      >
                        {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </td>
                    <td style={s.td}>
                      <span style={s.actionBadge(rules[key])}>{rules[key]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={s.card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Custom Terms</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Add custom words or phrases to detect (e.g. project codenames, internal IDs). Max 50.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              style={{ ...s.input, flex: 1 }}
              value={termInput}
              onChange={e => setTermInput(e.target.value)}
              placeholder="e.g. Project Aurora"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTerm(); } }}
              maxLength={100}
            />
            <button
              type="button"
              style={s.btnSmall}
              onClick={addCustomTerm}
            >
              Add
            </button>
          </div>
          {customTerms.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {customTerms.map((term, idx) => (
                <span key={idx} style={s.tag}>
                  {term}
                  <button
                    type="button"
                    onClick={() => removeCustomTerm(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a56db', fontWeight: 700, fontSize: 14, padding: 0, lineHeight: 1 }}
                    aria-label={`Remove ${term}`}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
          {customTerms.length > 0 && (
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>{customTerms.length} / 50 terms</p>
          )}
        </div>
      </div>
    );
  }

  /* ─── Step 3: Platforms ─── */
  function renderStep3() {
    return (
      <div style={s.card}>
        <h2 style={s.cardTitle}>AI Platforms</h2>
        <p style={s.cardDesc}>Select the AI tools your organization uses. PromptFence will monitor paste activity on these platforms.</p>

        <div style={s.checkboxGrid}>
          {PLATFORMS.map(p => (
            <label key={p.key} style={s.checkboxLabel}>
              <input
                type="checkbox"
                checked={!!platforms[p.key]}
                onChange={e => setPlatforms({ ...platforms, [p.key]: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: '#1a56db' }}
              />
              {p.label}
            </label>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <label style={s.label} htmlFor="approvedUrl">Approved AI URL (optional)</label>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
            If your company uses a self-hosted or approved AI tool, enter its URL. Users will see a redirect button.
          </p>
          <input
            id="approvedUrl"
            type="url"
            style={s.input}
            value={approvedAiUrl}
            onChange={e => setApprovedAiUrl(e.target.value)}
            placeholder="https://internal-ai.company.com"
          />
        </div>
      </div>
    );
  }

  /* ─── Step 4: Invite Team ─── */
  function renderStep4() {
    return (
      <div>
        <div style={s.card}>
          <h2 style={s.cardTitle}>Invite Your Team</h2>
          <p style={s.cardDesc}>Share the install code or URL with your team so they can connect to your organization.</p>

          {installCode && (
            <>
              <label style={{ ...s.label, marginBottom: 8 }}>Install Code</label>
              <div style={s.installCode}>{installCode}</div>

              <label style={{ ...s.label, marginTop: 20, marginBottom: 8 }}>Install URL</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ ...s.installUrl, flex: 1 }}>{installUrl}</div>
                <button
                  type="button"
                  style={s.btnSmall}
                  onClick={() => handleCopy(installUrl)}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </>
          )}
        </div>

        <div style={s.card}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Invite by Email</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Send the install link directly to team members.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              type="email"
              style={{ ...s.input, flex: 1 }}
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleInvite(); } }}
            />
            <button
              type="button"
              style={s.btnSmall}
              onClick={handleInvite}
              disabled={inviting}
            >
              {inviting ? 'Sending...' : 'Add'}
            </button>
          </div>
          {invitedMembers.length > 0 && (
            <div>
              {invitedMembers.map((m, idx) => (
                <div key={idx} style={s.inviteRow}>
                  <span>{m.email}</span>
                  <span style={s.inviteStatus(m.status)}>{m.status === 'pending' ? 'Pending' : 'Joined'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Main render ─── */
  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.logo}>
          <span style={s.logoText}>PromptFence</span>
        </div>

        {renderProgress()}

        {error && <div style={s.error}>{error}</div>}
        {successMsg && <div style={s.success}>{successMsg}</div>}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        <div style={s.footer}>
          <div>
            {step > 1 && (
              <button
                type="button"
                style={s.btnSecondary}
                onClick={handleBack}
                disabled={saving}
              >
                Back
              </button>
            )}
          </div>
          <div>
            {step < 4 ? (
              <button
                type="button"
                style={{ ...s.btnPrimary, opacity: saving ? 0.7 : 1 }}
                onClick={handleNext}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Next'}
              </button>
            ) : (
              <button
                type="button"
                style={{ ...s.btnPrimary, background: '#059669', opacity: saving ? 0.7 : 1, minWidth: 160 }}
                onClick={handleComplete}
                disabled={saving}
              >
                {saving ? 'Finishing...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
