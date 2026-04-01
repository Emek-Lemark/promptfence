'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ── Syntax-highlighted code block ─────────────────────────────────────────
function Code({ children, lang = '' }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <pre style={{
        background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
        padding: '16px 20px', fontSize: 13, lineHeight: 1.6,
        overflowX: 'auto', margin: 0,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      }}>
        <code>{children.trim()}</code>
      </pre>
      <button onClick={copy} style={{
        position: 'absolute', top: 10, right: 10, fontSize: 11,
        background: copied ? '#10b981' : 'rgba(255,255,255,0.1)',
        color: '#fff', border: 'none', borderRadius: 4,
        padding: '3px 8px', cursor: 'pointer', transition: 'background 0.2s',
      }}>
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

// ── Section heading with anchor ────────────────────────────────────────────
function H2({ id, children }) {
  return (
    <h2 id={id} style={{ fontSize: 22, fontWeight: 700, margin: '48px 0 16px', scrollMarginTop: 80 }}>
      {children}
    </h2>
  );
}
function H3({ id, children }) {
  return (
    <h3 id={id} style={{ fontSize: 16, fontWeight: 600, margin: '32px 0 10px', scrollMarginTop: 80 }}>
      {children}
    </h3>
  );
}

// ── Method badge ───────────────────────────────────────────────────────────
function Method({ m }) {
  const colors = { GET: '#10b981', POST: '#3b82f6', PUT: '#f59e0b', PATCH: '#8b5cf6', DELETE: '#ef4444' };
  return (
    <span style={{
      background: colors[m] || '#6b7280', color: '#fff',
      borderRadius: 4, padding: '2px 7px', fontSize: 12, fontWeight: 700,
      marginRight: 8, fontFamily: 'monospace',
    }}>{m}</span>
  );
}

// ── Endpoint doc row ────────────────────────────────────────────────────────
function Endpoint({ method, path, desc }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '12px 0', display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <Method m={method} />
      <code style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{path}</code>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{desc}</span>
    </div>
  );
}

// ── Param row ──────────────────────────────────────────────────────────────
function Param({ name, type, required, desc }) {
  return (
    <tr>
      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'nowrap' }}>
        {name}
        {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </td>
      <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{type}</td>
      <td style={{ padding: '8px 12px', fontSize: 13 }}>{desc}</td>
    </tr>
  );
}

function ParamTable({ children }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
      <thead>
        <tr style={{ background: 'var(--bg)' }}>
          {['Parameter', 'Type', 'Description'].map(h => (
            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, color: 'var(--muted)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

// ── Callout box ────────────────────────────────────────────────────────────
function Callout({ type = 'info', children }) {
  const styles = {
    info:    { bg: '#eff6ff', border: '#bfdbfe', icon: 'ℹ️' },
    tip:     { bg: '#f0fdf4', border: '#bbf7d0', icon: '💡' },
    warning: { bg: '#fffbeb', border: '#fde68a', icon: '⚠️' },
    danger:  { bg: '#fff1f2', border: '#fecdd3', icon: '🚫' },
  };
  const s = styles[type];
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14 }}>
      {s.icon} {children}
    </div>
  );
}

// ── Nav sections ────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview',      label: 'Overview' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'quickstart',   label: 'Quick Start' },
  { id: 'proxy',        label: 'OpenAI Proxy' },
  { id: 'scan-text',    label: 'Scan Text' },
  { id: 'scan-file',    label: 'Scan File' },
  { id: 'redact',       label: 'Redact' },
  { id: 'logs',         label: 'Logs' },
  { id: 'webhooks',     label: 'Webhooks' },
  { id: 'sdk',          label: 'JavaScript SDK' },
  { id: 'mcp',          label: 'MCP Server' },
  { id: 'cli',          label: 'CLI' },
  { id: 'errors',       label: 'Errors' },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    const handler = () => {
      const scrollY = window.scrollY + 100;
      for (const { id } of [...NAV].reverse()) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollY) { setActiveSection(id); break; }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const BASE = 'https://app.promptfence.ai';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fff' }}>

      {/* ── Sidebar nav ─────────────────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0, position: 'sticky', top: 0,
        height: '100vh', overflowY: 'auto', padding: '28px 16px',
        borderRight: '1px solid var(--border)', background: '#fafafa',
      }}>
        <Link href="/developer" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', marginBottom: 28 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>← Developer</span>
        </Link>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 8px' }}>
          API Reference
        </p>
        {NAV.map(({ id, label }) => (
          <a key={id} href={`#${id}`} onClick={() => setActiveSection(id)} style={{
            display: 'block', padding: '5px 10px', borderRadius: 6, fontSize: 13,
            fontWeight: activeSection === id ? 600 : 400,
            color: activeSection === id ? '#1a56db' : '#475569',
            background: activeSection === id ? '#eff6ff' : 'transparent',
            textDecoration: 'none', marginBottom: 2,
            transition: 'background 0.1s',
          }}>
            {label}
          </a>
        ))}
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main style={{ flex: 1, maxWidth: 860, padding: '40px 48px', lineHeight: 1.7 }}>

        {/* ── OVERVIEW ─── */}
        <div id="overview">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>API Reference</h1>
            <span style={{ fontSize: 12, background: '#e0e7ff', color: '#3730a3', borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>v1</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 16, marginBottom: 32 }}>
            PromptFence scans prompts for PII before they reach AI models. Drop it into any LLM pipeline in minutes.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
            {[
              { icon: '🔌', title: 'OpenAI Proxy', desc: '1-line integration. Change baseURL, done.' },
              { icon: '📦', title: 'REST API', desc: 'Scan, redact, and log any text or file.' },
              { icon: '🔷', title: 'SDK + CLI', desc: 'npm, MCP server, and CI/CD tooling.' },
            ].map(card => (
              <div key={card.title} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{card.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{card.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{card.desc}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            <strong>Base URL:</strong>{' '}
            <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{BASE}/api/v1</code>
          </p>
        </div>

        {/* ── AUTHENTICATION ─── */}
        <H2 id="authentication">Authentication</H2>
        <p>All API requests require an API key. Create keys in the <Link href="/developer">Developer dashboard</Link>.</p>

        <p>Pass your key in one of two ways:</p>
        <Code>{`# Header (recommended)
X-PromptFence-Key: pf_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Bearer token
Authorization: Bearer pf_live_xxxx...`}</Code>

        <ParamTable>
          <Param name="pf_live_..." type="string" required desc="Live key — use in production" />
          <Param name="pf_test_..." type="string" required={false} desc="Test key — calls are logged separately, same behaviour" />
        </ParamTable>

        <Callout type="warning">
          Never expose API keys client-side. Use them only in server environments, CI, or the proxy configuration.
        </Callout>

        {/* ── QUICK START ─── */}
        <H2 id="quickstart">Quick Start</H2>
        <p>Three ways to integrate. Pick the one that fits your stack:</p>

        <H3>Option 1 — LLM proxy (fastest)</H3>
        <p style={{marginBottom:12}}>Works with OpenAI, Grok, Gemini, Mistral, Groq, and any OpenAI-compatible API. For Claude, see the <a href="#proxy-anthropic">Anthropic proxy</a>.</p>
        <Code lang="js">{`import OpenAI from 'openai';

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: '${BASE}/api/v1/proxy/openai',
  defaultHeaders: { 'X-PromptFence-Key': process.env.PROMPTFENCE_API_KEY },
});

// Grok (xAI) — same proxy, different upstream
const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: '${BASE}/api/v1/proxy/openai',
  defaultHeaders: {
    'X-PromptFence-Key': process.env.PROMPTFENCE_API_KEY,
    'X-Upstream-Base-URL': 'https://api.x.ai/v1',
  },
});

// Gemini (OpenAI-compatible mode)
const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: '${BASE}/api/v1/proxy/openai',
  defaultHeaders: {
    'X-PromptFence-Key': process.env.PROMPTFENCE_API_KEY,
    'X-Upstream-Base-URL': 'https://generativelanguage.googleapis.com/v1beta/openai',
  },
});

// Every prompt is now scanned automatically
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: userMessage }],
});`}</Code>

        <H3>Option 2 — SDK</H3>
        <Code lang="js">{`import { PromptFence } from '@promptfence/sdk';

const pf = new PromptFence({ apiKey: process.env.PROMPTFENCE_API_KEY });

const result = await pf.scan(userMessage);
if (result.action === 'BLOCK') {
  return res.status(400).json({ error: 'Sensitive data detected' });
}

// Safe to forward to AI
const response = await openai.chat.completions.create({ ... });`}</Code>

        <H3>Option 3 — REST API directly</H3>
        <Code lang="bash">{`curl -X POST ${BASE}/api/v1/scan/text \\
  -H "X-PromptFence-Key: pf_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"text": "My email is alice@corp.com and IBAN is GB33BUKB20201555555555"}'`}</Code>
        <Code lang="json">{`{
  "action": "BLOCK",
  "detectedTypes": ["EMAIL", "IBAN"],
  "matches": [
    { "type": "EMAIL", "value": "alice@corp.com", "start": 12, "end": 26 },
    { "type": "IBAN",  "value": "GB33BUKB20201555555555", "start": 38, "end": 60 }
  ],
  "clean": false
}`}</Code>

        {/* ── PROXY ─── */}
        <H2 id="proxy">LLM Proxy</H2>
        <p>
          The proxy sits between your code and any LLM API. Every request is scanned before forwarding.
          Streaming, all models, and all endpoints are supported. Responses pass through transparently.
        </p>

        <H3 id="proxy-openai">OpenAI-compatible providers</H3>
        <p style={{marginBottom:12}}>One endpoint works for OpenAI, Grok, Gemini, Mistral, Groq, Together AI, Perplexity, DeepSeek, and OpenRouter.</p>

        <Endpoint method="*" path="/api/v1/proxy/openai/{path}" desc="Forward to any OpenAI-compatible provider with PII scanning" />

        <H3>Headers</H3>
        <ParamTable>
          <Param name="X-PromptFence-Key" type="string" required desc="Your PromptFence API key" />
          <Param name="Authorization" type="string" required desc="Bearer <provider-key> — forwarded upstream" />
          <Param name="X-Upstream-Base-URL" type="string" required={false} desc="Override upstream base URL. Defaults to api.openai.com/v1. Use for Grok, Gemini, Mistral, etc." />
        </ParamTable>

        <H3 id="proxy-anthropic">Anthropic Claude</H3>
        <p style={{marginBottom:12}}>Claude uses a different API format. Use the dedicated Anthropic proxy:</p>

        <Endpoint method="*" path="/api/v1/proxy/anthropic/{path}" desc="Forward to Anthropic Claude with PII scanning" />

        <Code lang="js">{`import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: '${BASE}/api/v1/proxy/anthropic',
  defaultHeaders: {
    'X-PromptFence-Key': process.env.PROMPTFENCE_API_KEY,
  },
});

const message = await client.messages.create({
  model: 'claude-opus-4-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: userMessage }],
});`}</Code>

        <H3>Response headers added (all providers)</H3>
        <ParamTable>
          <Param name="X-PromptFence-Action" type="string" required={false} desc="ALLOW, WARN, or BLOCK" />
          <Param name="X-PromptFence-Detected" type="string" required={false} desc="Comma-separated detected types, e.g. EMAIL,IBAN" />
        </ParamTable>

        <H3>When a request is blocked</H3>
        <p>The proxy returns <code>400</code> and never contacts the upstream provider:</p>
        <Code lang="json">{`{
  "error": {
    "code": "PROMPTFENCE_BLOCK",
    "message": "Request blocked: sensitive data detected (EMAIL, IBAN)",
    "types": ["EMAIL", "IBAN"]
  }
}`}</Code>

        <H3>Streaming</H3>
        <p>Streaming responses (<code>stream: true</code>) pass through chunk by chunk with no buffering. The scan happens on the <em>request</em> body before forwarding. The response is never scanned.</p>

        <Code lang="js">{`// Streaming works exactly as normal
const stream = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: prompt }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`}</Code>

        {/* ── SCAN TEXT ─── */}
        <H2 id="scan-text">Scan Text</H2>
        <Endpoint method="POST" path="/api/v1/scan/text" desc="Scan plain text for PII and sensitive data" />

        <H3>Request body</H3>
        <ParamTable>
          <Param name="text" type="string" required desc="Text to scan. Max 500,000 characters." />
          <Param name="options.action_overrides" type="object" required={false} desc='Override per-type action: { "EMAIL": "ALLOW", "IBAN": "BLOCK" }' />
          <Param name="options.custom_terms" type="string[]" required={false} desc='Extra terms to flag: ["Project Phoenix", "budget-2024"]' />
        </ParamTable>

        <H3>Detected types</H3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {['EMAIL','PHONE','IBAN','CREDIT_CARD','ADDRESS','PASSWORD','NATIONAL_ID','VAT','IP_ADDRESS','DATE_OF_BIRTH','CUSTOM_TERM'].map(t => (
            <code key={t} style={{ fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px' }}>{t}</code>
          ))}
        </div>

        <H3>Response</H3>
        <Code lang="json">{`{
  "action": "BLOCK",           // ALLOW | WARN | BLOCK
  "detectedTypes": ["EMAIL"],
  "matches": [
    {
      "type":  "EMAIL",
      "value": "alice@corp.com",
      "start": 12,
      "end":   26
    }
  ],
  "clean": false
}`}</Code>

        <H3>Example</H3>
        <Code lang="bash">{`curl -X POST ${BASE}/api/v1/scan/text \\
  -H "X-PromptFence-Key: pf_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Contact alice@corp.com for the Q3 budget",
    "options": {
      "action_overrides": { "EMAIL": "WARN" },
      "custom_terms": ["Q3 budget"]
    }
  }'`}</Code>

        {/* ── SCAN FILE ─── */}
        <H2 id="scan-file">Scan File</H2>
        <Endpoint method="POST" path="/api/v1/scan/file" desc="Scan a document for PII. Supports PDF, DOCX, XLSX, TXT, CSV, MD." />

        <Callout type="tip">
          File content is <strong>never stored</strong>. Only the scan result (action, detected types, match positions) is logged.
        </Callout>

        <H3>Request — multipart/form-data</H3>
        <ParamTable>
          <Param name="file" type="File" required desc="The document to scan. Max 20MB." />
          <Param name="options" type="JSON string" required={false} desc="Same options object as scan/text, JSON-encoded" />
        </ParamTable>

        <H3>Supported formats</H3>
        <ParamTable>
          <Param name="application/pdf" type="" required={false} desc="PDF documents (requires pdf-parse)" />
          <Param name="application/vnd.openxmlformats-officedocument.wordprocessingml.document" type="" required={false} desc="Word documents .docx (requires mammoth)" />
          <Param name="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" type="" required={false} desc="Excel spreadsheets .xlsx (requires xlsx)" />
          <Param name="text/plain, text/csv, text/markdown" type="" required={false} desc="Plain text files — no extra dependencies" />
        </ParamTable>

        <H3>Example</H3>
        <Code lang="bash">{`curl -X POST ${BASE}/api/v1/scan/file \\
  -H "X-PromptFence-Key: pf_live_..." \\
  -F "file=@report.pdf" \\
  -F 'options={"action_overrides":{"EMAIL":"WARN"}}'`}</Code>
        <Code lang="json">{`{
  "filename":      "report.pdf",
  "mimeType":      "application/pdf",
  "action":        "WARN",
  "detectedTypes": ["EMAIL", "PHONE"],
  "matches":       [...],
  "clean":         false,
  "pageCount":     12
}`}</Code>

        <H3>Node.js example</H3>
        <Code lang="js">{`import { PromptFence } from '@promptfence/sdk';
import { readFileSync } from 'fs';

const pf = new PromptFence({ apiKey: process.env.PROMPTFENCE_API_KEY });
const buffer = readFileSync('./data/employees.xlsx');
const result = await pf.scanFile(buffer, 'employees.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

console.log(result.action);        // BLOCK
console.log(result.detectedTypes); // ['EMAIL', 'PHONE', 'NATIONAL_ID']`}</Code>

        {/* ── REDACT ─── */}
        <H2 id="redact">Redact</H2>
        <Endpoint method="POST" path="/api/v1/redact" desc="Remove PII from text and return a safe version" />

        <H3>Request body</H3>
        <ParamTable>
          <Param name="text" type="string" required desc="Text to redact. Max 500,000 characters." />
          <Param name="options.replacement" type="string" required={false} desc='"tag" (default) | "blank" | "hash"' />
          <Param name="options.custom_terms" type="string[]" required={false} desc="Additional terms to redact" />
        </ParamTable>

        <H3>Replacement modes</H3>
        <Code lang="json">{`// tag (default) — human-readable
"Contact [EMAIL REDACTED] for details"

// blank — uniform redaction
"Contact ████████ for details"

// hash — deterministic (useful for dedup/analytics)
"Contact [EMAIL:3a7fc2b1] for details"`}</Code>

        <H3>Example</H3>
        <Code lang="bash">{`curl -X POST ${BASE}/api/v1/redact \\
  -H "X-PromptFence-Key: pf_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Email alice@corp.com or call +44 7911 123456"}'`}</Code>
        <Code lang="json">{`{
  "original_length": 46,
  "redacted":        "Email [EMAIL REDACTED] or call [PHONE REDACTED]",
  "detectedTypes":   ["EMAIL", "PHONE"],
  "redactedCount":   2,
  "clean":           false
}`}</Code>

        {/* ── LOGS ─── */}
        <H2 id="logs">Logs</H2>
        <Endpoint method="GET" path="/api/v1/logs" desc="Retrieve proxy and scan logs with aggregate stats" />

        <Callout type="info">
          Logs contain only metadata: action, detected types, token count, and latency. <strong>No prompt content is ever stored.</strong>
        </Callout>

        <H3>Query parameters</H3>
        <ParamTable>
          <Param name="project_id" type="string" required={false} desc="Filter by project" />
          <Param name="from" type="ISO 8601" required={false} desc="Start date, e.g. 2024-01-01T00:00:00Z" />
          <Param name="to" type="ISO 8601" required={false} desc="End date" />
          <Param name="action" type="string" required={false} desc="ALLOW | WARN | BLOCK" />
          <Param name="limit" type="number" required={false} desc="Max results, default 50, max 500" />
          <Param name="offset" type="number" required={false} desc="Pagination offset" />
        </ParamTable>

        <H3>Response</H3>
        <Code lang="json">{`{
  "logs": [
    {
      "id":             "uuid",
      "project_name":   "Customer Support Bot",
      "provider":       "openai",
      "model":          "gpt-4o",
      "action":         "BLOCK",
      "detected_types": ["IBAN"],
      "prompt_tokens":  142,
      "latency_ms":     38,
      "timestamp":      "2024-06-15T14:22:10Z"
    }
  ],
  "stats": {
    "total_calls":    1482,
    "allowed":        1390,
    "warned":         74,
    "blocked":        18,
    "block_rate":     "1.2%",
    "avg_latency_ms": 41
  },
  "pagination": { "total": 1482, "limit": 50, "offset": 0, "has_more": true }
}`}</Code>

        {/* ── WEBHOOKS ─── */}
        <H2 id="webhooks">Webhooks</H2>
        <p>Receive real-time events when PromptFence blocks or warns on a request.</p>

        <H3>Event types</H3>
        <ParamTable>
          <Param name="scan.blocked" type="" required={false} desc="Fired when action = BLOCK (proxy or direct scan)" />
          <Param name="scan.warned" type="" required={false} desc="Fired when action = WARN" />
          <Param name="test.ping" type="" required={false} desc="Sent when you click 'Test' in the dashboard" />
        </ParamTable>

        <H3>Payload structure</H3>
        <Code lang="json">{`{
  "event":      "scan.blocked",
  "project_id": "proj_uuid",
  "org_id":     "org_uuid",
  "timestamp":  "2024-06-15T14:22:10Z",
  "data": {
    "action":         "BLOCK",
    "detected_types": ["IBAN", "CREDIT_CARD"],
    "model":          "gpt-4o"
  }
}`}</Code>

        <H3>Signature verification</H3>
        <p>If you set a webhook secret, every delivery includes an <code>X-PromptFence-Signature</code> header:</p>
        <Code lang="js">{`import { createHmac } from 'crypto';

// Express handler
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-promptfence-signature'];
  const expected  = 'sha256=' + createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (signature !== expected) return res.sendStatus(401);

  const event = JSON.parse(req.body);
  console.log('Event:', event.event, event.data.detected_types);
  res.sendStatus(200);
});`}</Code>

        {/* ── SDK ─── */}
        <H2 id="sdk">JavaScript / TypeScript SDK</H2>
        <Code lang="bash">{`npm install @promptfence/sdk`}</Code>

        <H3>Initialise</H3>
        <Code lang="ts">{`import { PromptFence } from '@promptfence/sdk';

const pf = new PromptFence({
  apiKey:  process.env.PROMPTFENCE_API_KEY!, // pf_live_... or pf_test_...
  baseUrl: 'https://app.promptfence.ai',     // optional override
});

// One-line proxy URL for OpenAI SDK
console.log(pf.proxyUrl); // https://app.promptfence.ai/api/v1/proxy/openai`}</Code>

        <H3>Methods</H3>
        <Code lang="ts">{`// Scan text
const result = await pf.scan('alice@corp.com');
// → { action: 'BLOCK', detectedTypes: ['EMAIL'], matches: [...], clean: false }

// Redact
const clean = await pf.redact('Call +44 7911 123456', { replacement: 'tag' });
// → { redacted: 'Call [PHONE REDACTED]', redactedCount: 1, ... }

// Scan file (Node.js Buffer or browser File)
const buffer = readFileSync('report.pdf');
const file   = await pf.scanFile(buffer, 'report.pdf', 'application/pdf');

// Quick boolean check
const safe = await pf.isSafe(userInput);
if (!safe) throw new Error('PII detected');`}</Code>

        <H3>Express middleware</H3>
        <Code lang="js">{`import express from 'express';
import { PromptFence } from '@promptfence/sdk';

const app = express();
const pf  = new PromptFence({ apiKey: process.env.PROMPTFENCE_API_KEY });

app.use(express.json());

// Scan all /chat requests automatically
app.post('/chat', pf.middleware(), async (req, res) => {
  // req.promptFence = { action, detectedTypes, matches }
  // If action is BLOCK, middleware already returned 400 — won't reach here
  const response = await openai.chat.completions.create(req.body);
  res.json(response);
});`}</Code>

        {/* ── MCP ─── */}
        <H2 id="mcp">MCP Server</H2>
        <p>
          The PromptFence MCP server gives AI agents (Claude, Cursor, etc.) tools to scan and redact PII
          as part of their reasoning loop.
        </p>

        <Code lang="bash">{`npm install -g @promptfence/mcp`}</Code>

        <H3>Claude Desktop config</H3>
        <Code lang="json">{`// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "promptfence": {
      "command": "npx",
      "args": ["@promptfence/mcp"],
      "env": {
        "PROMPTFENCE_API_KEY": "pf_live_..."
      }
    }
  }
}`}</Code>

        <H3>Available tools</H3>
        <ParamTable>
          <Param name="scan_text" type="" required={false} desc="Scan text for PII — returns action, types, match positions" />
          <Param name="redact_text" type="" required={false} desc="Redact PII from text — returns cleaned version" />
          <Param name="check_policy" type="" required={false} desc="Boolean policy check — allowed: true/false" />
          <Param name="scan_and_redact" type="" required={false} desc="Combined scan + redact in one call (most efficient)" />
        </ParamTable>

        <H3>Example agent prompt</H3>
        <Code>{`You are a customer support agent. Before sending any user data to external systems,
use the check_policy tool to verify it contains no PII. If it does, use redact_text
to clean it first.`}</Code>

        {/* ── CLI ─── */}
        <H2 id="cli">CLI</H2>
        <Code lang="bash">{`npm install -g @promptfence/cli
# or use without installing:
npx @promptfence/cli scan ./data`}</Code>

        <H3>Commands</H3>
        <Code lang="bash">{`# Scan a file
pf scan report.pdf

# Scan all files in a directory
pf scan ./training-data

# JSON output (for CI scripts)
pf scan ./prompts --format json

# Fail CI if any file is blocked
pf scan . --fail-on block   # default

# Fail CI on warnings too (strict mode)
pf scan . --fail-on warn

# Redact a file — print to stdout
pf redact messy.txt

# Redact and write to file
pf redact messy.txt -o clean.txt`}</Code>

        <H3>GitHub Actions example</H3>
        <Code lang="yaml">{`# .github/workflows/pii-scan.yml
name: PII Scan

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan training data for PII
        run: npx @promptfence/cli scan ./data --fail-on block --format json
        env:
          PROMPTFENCE_API_KEY: \${{ secrets.PROMPTFENCE_API_KEY }}`}</Code>

        {/* ── ERRORS ─── */}
        <H2 id="errors">Error Reference</H2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 32 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              {['HTTP', 'Code', 'Description'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['401', 'MISSING_API_KEY',       'No API key provided'],
              ['401', 'INVALID_API_KEY',        'Key not found, revoked, or wrong format'],
              ['400', 'PROMPTFENCE_BLOCK',      'Proxy: request blocked due to PII detection'],
              ['400', 'MISSING_TEXT',           'text field is required'],
              ['400', 'MISSING_FILE',           'file field is required (scan/file)'],
              ['413', 'TEXT_TOO_LARGE',         'Text exceeds 500,000 character limit'],
              ['413', 'FILE_TOO_LARGE',         'File exceeds 20MB limit'],
              ['415', 'UNSUPPORTED_FILE_TYPE',  'File format not supported'],
              ['429', 'RATE_LIMIT_EXCEEDED',    'Monthly call limit reached'],
              ['502', 'UPSTREAM_ERROR',         'Proxy: could not reach OpenAI API'],
            ].map(([status, code, desc]) => (
              <tr key={code} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '9px 12px', fontWeight: 600 }}>{status}</td>
                <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 12 }}>{code}</td>
                <td style={{ padding: '9px 12px', color: 'var(--muted)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <H3>Error response shape</H3>
        <Code lang="json">{`{
  "code":    "INVALID_API_KEY",
  "message": "API key not found or revoked"
}`}</Code>

        {/* ── FOOTER ─── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32, marginTop: 48, color: 'var(--muted)', fontSize: 13 }}>
          <p>
            Questions? Email <a href="mailto:support@promptfence.ai" style={{ color: 'var(--primary)' }}>support@promptfence.ai</a>
            {' '}or open an issue on GitHub.
          </p>
        </div>

      </main>
    </div>
  );
}
