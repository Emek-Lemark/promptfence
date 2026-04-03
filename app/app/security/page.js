import Link from 'next/link';

export const metadata = {
  title: 'Security: How PromptFence Protects Your Data',
  description: 'PromptFence is built privacy-first. Detection runs locally in the browser. No prompt content ever leaves your device.',
};

const D = {
  bg:      '#0c0a14',
  surface: '#13101f',
  elevated:'#1a1628',
  border:  '#2d2645',
  text1:   '#fafafa',
  text2:   '#a89ec0',
  muted:   '#6b608a',
  accent:  '#7c3aed',
  accentDim:'rgba(124,58,237,0.12)',
};

function Section({ label, title, children }) {
  return (
    <div style={{ marginBottom: 64 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: D.accent, textTransform: 'uppercase', marginBottom: 12 }}>{label}</div>
      <h2 style={{ fontFamily: "'Cormorant Garant', Georgia, serif", fontSize: 36, fontWeight: 300, color: D.text1, margin: '0 0 24px', lineHeight: 1.2 }}>{title}</h2>
      {children}
    </div>
  );
}

function Fact({ icon, title, body }) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: D.accentDim, border: `1px solid rgba(124,58,237,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: D.text1, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 14, color: D.text2, lineHeight: 1.7 }}>{body}</div>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: "'Inter', -apple-system, sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${D.border}`, padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <Link href="/" style={{ display:'inline-flex',alignItems:'center',gap:9,textDecoration:'none',color:D.text1,fontWeight:700,fontSize:16,letterSpacing:'-0.02em' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#7c3aed" opacity="0.2" stroke="#7c3aed" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          PromptFence
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/legal/dpa" style={{ fontSize: 13, color: D.muted, textDecoration: 'none' }}>DPA</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: D.muted, textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/signup" style={{ fontSize: 13, fontWeight: 600, color: D.text1, textDecoration: 'none', background: D.accentDim, border: `1px solid rgba(124,58,237,0.25)`, borderRadius: 7, padding: '6px 14px' }}>
            Start free trial
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '80px 40px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 72, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: D.accent, textTransform: 'uppercase', marginBottom: 16 }}>Security</div>
          <h1 style={{ fontFamily: "'Cormorant Garant', Georgia, serif", fontSize: 56, fontWeight: 300, color: D.text1, margin: '0 0 20px', lineHeight: 1.1 }}>
            Built to protect data.<br />
            <span style={{ color: D.accent }}>Not just to say it does.</span>
          </h1>
          <p style={{ fontSize: 18, color: D.text2, lineHeight: 1.7, margin: '0 auto', maxWidth: 560 }}>
            PromptFence runs detection locally in the browser. Prompt content never leaves
            the device. We only store metadata — never the sensitive data itself.
          </p>
        </div>

        {/* Architecture */}
        <Section label="Architecture" title="Local detection. No content stored.">
          <Fact
            icon="🔒"
            title="All scanning happens in your browser"
            body="The PromptFence extension runs pattern matching directly on the device. When you type a prompt, detection runs before any data is transmitted to an AI tool — entirely locally, using JavaScript with no external API calls."
          />
          <Fact
            icon="🚫"
            title="We never see your prompts"
            body="PromptFence servers never receive prompt content. We store only the metadata of each event: the data type detected (e.g. IBAN), the action taken (BLOCK or WARN), the AI platform visited, and the timestamp. The actual sensitive value is never logged."
          />
          <Fact
            icon="📊"
            title="What we do store"
            body="When the extension detects sensitive data, it sends a small structured event to your organisation's log: user ID, timestamp, AI platform domain, detected data types (not values), and the action taken. This is the minimum required to build an audit trail."
          />
          <Fact
            icon="🔗"
            title="Developer proxy"
            body="When using the developer proxy API, PromptFence receives the prompt text in transit in order to scan it. This content is scanned in memory, never persisted to disk, and is discarded immediately after the scan result is determined. Only the scan metadata is stored."
          />
        </Section>

        {/* Infrastructure */}
        <Section label="Infrastructure" title="EU-hosted. Encrypted at rest and in transit.">
          <Fact
            icon="🇪🇺"
            title="European data residency"
            body="All PromptFence infrastructure runs in the EU (Railway, Frankfurt region). Customer data never transits outside the EU. This satisfies GDPR Chapter V restrictions on international transfers without any additional contractual measures."
          />
          <Fact
            icon="🔐"
            title="Encryption at rest and in transit"
            body="All data is encrypted at rest using AES-256. All traffic is served over TLS 1.3. Database volumes are encrypted at the infrastructure layer. JWT tokens use RS256 signing and expire after 30 days."
          />
          <Fact
            icon="🏗️"
            title="Isolated per-organisation databases"
            body="Each organisation's data is stored with strict org_id row-level scoping. All API queries are parameterised. Admins can only access data belonging to their own organisation. There is no cross-org data access by design."
          />
          <Fact
            icon="🔑"
            title="Secrets management"
            body="API keys are hashed on creation using bcrypt (cost factor 12). The plaintext key is shown once and never stored. Paddle webhook signatures are verified on every inbound request. Environment secrets are injected at runtime and never committed to source control."
          />
        </Section>

        {/* Access controls */}
        <Section label="Access controls" title="Least privilege. Audit everything.">
          <Fact
            icon="👤"
            title="Role-based access"
            body="Every PromptFence account has a role (admin or member). Only admins can access the dashboard, modify policy settings, and download compliance reports. Members only report events via the browser extension."
          />
          <Fact
            icon="📋"
            title="Immutable audit log"
            body="Every event is written with a timestamp and cannot be modified after creation. Block acknowledgements add a note and timestamp but do not alter the original event record. This provides a tamper-evident audit trail for compliance purposes."
          />
          <Fact
            icon="🚪"
            title="Session security"
            body="Admin sessions use short-lived JWTs (30-day expiry) delivered over secure, HttpOnly-equivalent channels. Logging out invalidates the token. There is no persistent session state server-side."
          />
        </Section>

        {/* Compliance */}
        <Section label="Compliance posture" title="Designed for regulated environments.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'GDPR', body: 'EU data residency, processing agreement available, no data sold or used for training.' },
              { label: 'EU AI Act', body: 'PromptFence generates evidence for Art. 4, 10, 12 and 14 obligations out of the box.' },
              { label: 'ISO 27001', body: 'Controls mapped to Annex A. Technical controls documented in generated audit reports.' },
              { label: 'SOC 2', body: 'Trust Service Criteria CC6 and CC7 covered. Control mapping included in compliance reports.' },
            ].map(({ label, body }) => (
              <div key={label} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 14, color: D.text2, lineHeight: 1.6 }}>{body}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Contact */}
        <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: D.text1, marginBottom: 8 }}>Security questions or vulnerability reports</h3>
          <p style={{ fontSize: 14, color: D.text2, lineHeight: 1.7, marginBottom: 20 }}>
            If you have a security question, need a penetration test report, or want to report a vulnerability,
            contact us at <a href="mailto:security@promptfence.ai" style={{ color: '#c4b5fd', textDecoration: 'none' }}>security@promptfence.ai</a>.
            We respond to all security reports within 24 hours.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/legal/dpa" style={{ padding: '10px 20px', background: D.elevated, color: D.text2, border: `1px solid ${D.border}`, borderRadius: 7, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Download DPA
            </Link>
            <Link href="/signup" style={{ padding: '10px 20px', background: D.accent, color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              Start free trial
            </Link>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${D.border}`, padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontSize: 12, color: D.muted }}>AI data protection · Made in the EU</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/privacy" style={{ fontSize: 12, color: D.muted, textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/legal/dpa" style={{ fontSize: 12, color: D.muted, textDecoration: 'none' }}>DPA</Link>
          <a href="mailto:security@promptfence.ai" style={{ fontSize: 12, color: D.muted, textDecoration: 'none' }}>security@promptfence.ai</a>
        </div>
      </footer>
    </div>
  );
}
