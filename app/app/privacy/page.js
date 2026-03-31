export const metadata = {
  title: 'Privacy Policy — PromptFence',
  description: 'How PromptFence collects, uses and protects your data.',
};

export default function PrivacyPage() {
  return (
    <div style={{
      maxWidth: 760,
      margin: '0 auto',
      padding: '60px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#1e293b',
      lineHeight: 1.7,
    }}>
      <div style={{ marginBottom: 40 }}>
        <a href="https://promptfence.ai" style={{ fontSize: 14, color: '#1a56db', textDecoration: 'none', fontWeight: 600 }}>
          ← promptfence.ai
        </a>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#64748b', marginBottom: 40 }}>Last updated: 1 April 2026</p>

      <Section title="1. Who we are">
        <p>
          PromptFence is operated by <strong>[COMPANY_NAME]</strong>, a company registered in <strong>[COUNTRY]</strong>
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). We are the data controller for information collected
          through the PromptFence admin dashboard and browser extension.
        </p>
        <p>Contact: <a href="mailto:privacy@promptfence.ai" style={{ color: '#1a56db' }}>privacy@promptfence.ai</a></p>
      </Section>

      <Section title="2. What we collect — and what we never collect">
        <p><strong>What we collect:</strong></p>
        <ul>
          <li><strong>Account data</strong> — your email address and password hash (bcrypt) when you create an admin account.</li>
          <li><strong>Organisation data</strong> — your organisation&rsquo;s domain name, policy configuration, and install code.</li>
          <li><strong>Detection metadata</strong> — when the extension detects sensitive data, we log: the AI platform domain, the category of data detected (e.g. &ldquo;IBAN&rdquo;, &ldquo;EMAIL&rdquo;), the action taken (WARN or BLOCK), and a timestamp. We use a hashed anonymous user ID — no name or email is linked unless the admin invited the user by email.</li>
          <li><strong>Platform visit metadata</strong> — which AI platforms employees visit and how often, for shadow AI discovery. No page content is recorded.</li>
          <li><strong>Policy acknowledgement</strong> — whether an employee has acknowledged the organisation&rsquo;s AI policy, and when.</li>
          <li><strong>Billing data</strong> — handled entirely by Paddle (our payment processor). We store only a subscription ID and customer ID reference.</li>
        </ul>
        <p><strong>What we never collect:</strong></p>
        <ul>
          <li>The content of any prompts, messages, or text entered into AI tools.</li>
          <li>The actual sensitive data (e.g. the IBAN number, the email address, the password) — only its category is recorded.</li>
          <li>Browser history outside of the monitored AI platforms.</li>
          <li>Keystroke data, clipboard content outside of active detection, or screenshots.</li>
        </ul>
      </Section>

      <Section title="3. Legal basis (GDPR)">
        <p>We process personal data on the following legal bases:</p>
        <ul>
          <li><strong>Contract performance (Art. 6(1)(b))</strong> — processing necessary to provide the PromptFence service to admin account holders.</li>
          <li><strong>Legitimate interests (Art. 6(1)(f))</strong> — detection metadata and platform visit data are processed to provide the organisation with the compliance and security features they have configured. Employees&rsquo; legitimate interests are balanced by the fact that no content is stored and data is presented only in aggregate or anonymised form.</li>
          <li><strong>Consent</strong> — where required for cookies or non-essential tracking, we obtain consent.</li>
        </ul>
      </Section>

      <Section title="4. How we use your data">
        <ul>
          <li>To provide and maintain the PromptFence service.</li>
          <li>To send transactional emails (invite emails, billing receipts) via Resend.</li>
          <li>To generate compliance reports for the organisation administrator.</li>
          <li>To improve the service (aggregated, non-personal analytics only).</li>
        </ul>
        <p>We do not sell personal data. We do not use personal data for advertising.</p>
      </Section>

      <Section title="5. Data sharing and third parties">
        <p>We use the following sub-processors:</p>
        <ul>
          <li><strong>Railway</strong> (railway.app) — cloud hosting, EU region. The database containing your data is hosted on Railway infrastructure.</li>
          <li><strong>Resend</strong> (resend.com) — transactional email. Your email address is shared with Resend only when sending invite or billing emails.</li>
          <li><strong>Paddle</strong> (paddle.com) — payment processing. Billing and payment data is processed by Paddle under their own privacy policy.</li>
        </ul>
        <p>We do not share data with any other third parties except where required by law.</p>
      </Section>

      <Section title="6. Data retention">
        <ul>
          <li><strong>Account data</strong> — retained for the lifetime of the account, deleted within 30 days of account closure.</li>
          <li><strong>Detection events</strong> — retained for 12 months by default. Organisations on Business plan can configure a custom retention period.</li>
          <li><strong>Platform visits</strong> — retained for 12 months.</li>
          <li><strong>Billing records</strong> — retained for 7 years as required by EU tax law.</li>
        </ul>
      </Section>

      <Section title="7. Your rights under GDPR">
        <p>If you are in the European Economic Area, you have the right to:</p>
        <ul>
          <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
          <li><strong>Rectification</strong> — ask us to correct inaccurate data.</li>
          <li><strong>Erasure</strong> — ask us to delete your data (&ldquo;right to be forgotten&rdquo;).</li>
          <li><strong>Restriction</strong> — ask us to restrict processing while a dispute is resolved.</li>
          <li><strong>Portability</strong> — receive your data in a machine-readable format.</li>
          <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
          <li><strong>Withdraw consent</strong> — where processing is based on consent, withdraw it at any time.</li>
        </ul>
        <p>
          To exercise any of these rights, email us at{' '}
          <a href="mailto:privacy@promptfence.ai" style={{ color: '#1a56db' }}>privacy@promptfence.ai</a>.
          We will respond within 30 days.
        </p>
        <p>
          You also have the right to lodge a complaint with your national data protection authority.
        </p>
      </Section>

      <Section title="8. Data security">
        <p>
          We use industry-standard security measures including HTTPS encryption in transit,
          bcrypt password hashing, JWT token authentication with server-side session management,
          and regular security updates. The database is hosted on Railway infrastructure with
          access controls in place.
        </p>
      </Section>

      <Section title="9. Cookies">
        <p>
          The PromptFence admin dashboard uses a session token stored in localStorage — not a cookie —
          for authentication. We do not use tracking or advertising cookies. If we introduce analytics
          tools in future, we will update this policy and seek consent where required.
        </p>
      </Section>

      <Section title="10. International transfers">
        <p>
          Your data is stored and processed within the EU (Railway EU region). If any sub-processor
          processes data outside the EU, appropriate safeguards (Standard Contractual Clauses) are in place.
        </p>
      </Section>

      <Section title="11. Children">
        <p>
          PromptFence is a business product not intended for use by children under 16.
          We do not knowingly collect personal data from children.
        </p>
      </Section>

      <Section title="12. Changes to this policy">
        <p>
          We may update this policy from time to time. When we make material changes, we will
          notify admin account holders by email and update the &ldquo;Last updated&rdquo; date above.
          Continued use of the service after changes constitutes acceptance.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          For any privacy questions or to exercise your rights:<br />
          <strong>[COMPANY_NAME]</strong><br />
          <strong>[REGISTERED ADDRESS]</strong><br />
          <a href="mailto:privacy@promptfence.ai" style={{ color: '#1a56db' }}>privacy@promptfence.ai</a>
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: '#1e293b' }}>{title}</h2>
      <div style={{ fontSize: 15, color: '#374151' }}>{children}</div>
    </div>
  );
}
