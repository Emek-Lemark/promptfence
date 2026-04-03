import Link from 'next/link';

export const metadata = {
  title: 'Data Processing Agreement: PromptFence',
  description: 'PromptFence Data Processing Agreement (DPA) under GDPR Article 28. EU data residency. No data sold or used for AI training.',
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
};

function Clause({ num, title, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: D.text1, marginBottom: 12 }}>
        {num}. {title}
      </h2>
      <div style={{ fontSize: 14, color: D.text2, lineHeight: 1.9 }}>
        {children}
      </div>
    </div>
  );
}

function P({ children, style }) {
  return <p style={{ margin: '0 0 14px', ...style }}>{children}</p>;
}

function Ul({ items }) {
  return (
    <ul style={{ margin: '0 0 14px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export default function DPAPage() {
  const today = new Date().toISOString().split('T')[0];

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
          <Link href="/security" style={{ fontSize: 13, color: D.muted, textDecoration: 'none' }}>Security</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: D.muted, textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/signup" style={{ fontSize: 13, fontWeight: 600, color: D.text1, textDecoration: 'none', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 7, padding: '6px 14px' }}>
            Start free trial
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: D.accent, textTransform: 'uppercase', marginBottom: 16 }}>Legal</div>
          <h1 style={{ fontFamily: "'Cormorant Garant', Georgia, serif", fontSize: 48, fontWeight: 300, color: D.text1, margin: '0 0 20px', lineHeight: 1.1 }}>
            Data Processing Agreement
          </h1>
          <p style={{ fontSize: 15, color: D.text2, lineHeight: 1.7, marginBottom: 24 }}>
            This Data Processing Agreement ("DPA") forms part of the agreement between
            PromptFence and the Customer for the use of the PromptFence service. It is entered
            into to comply with the requirements of GDPR Article 28.
          </p>
          <div style={{ display: 'flex', gap: 24, fontSize: 13, color: D.muted }}>
            <span>Version 1.0</span>
            <span>Effective: {today}</span>
            <a href="mailto:privacy@promptfence.ai" style={{ color: D.muted, textDecoration: 'none' }}>privacy@promptfence.ai</a>
          </div>
        </div>

        {/* Parties */}
        <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 24, marginBottom: 40 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#c4b5fd', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Parties</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: D.text1, marginBottom: 8 }}>Data Controller</div>
              <div style={{ fontSize: 13, color: D.text2, lineHeight: 1.7 }}>
                The customer entity that has entered into a subscription agreement with PromptFence
                ("Customer" or "Controller").
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: D.text1, marginBottom: 8 }}>Data Processor</div>
              <div style={{ fontSize: 13, color: D.text2, lineHeight: 1.7 }}>
                PromptFence, a software service operated under Irish law, providing AI data protection
                infrastructure ("PromptFence" or "Processor").
              </div>
            </div>
          </div>
        </div>

        {/* Clauses */}
        <Clause num="1" title="Definitions">
          <P>In this DPA:</P>
          <Ul items={[
            '"Personal Data", "Data Subject", "Processing", "Controller", and "Processor" have the meanings given in GDPR Article 4.',
            '"Service" means the PromptFence browser extension, dashboard, developer proxy, and associated APIs.',
            '"Customer Data" means all data submitted to the Service by or on behalf of the Customer.',
            '"GDPR" means Regulation (EU) 2016/679 of the European Parliament and of the Council.',
            '"Sub-processor" means any third party engaged by PromptFence to process Customer Data.',
          ]} />
        </Clause>

        <Clause num="2" title="Subject Matter and Duration">
          <P>
            PromptFence processes personal data on behalf of the Customer for the purpose of
            providing the Service as described in the subscription agreement. Processing continues
            for the duration of the subscription and ceases upon termination, subject to the
            retention provisions in Clause 9.
          </P>
        </Clause>

        <Clause num="3" title="Nature and Purpose of Processing">
          <P>PromptFence processes personal data for the following purposes:</P>
          <Ul items={[
            'Detecting sensitive data categories in text submitted via the browser extension or developer proxy API',
            'Generating audit event logs recording the category of data detected, action taken, AI platform, and timestamp',
            'Providing the compliance dashboard and reporting features to Customer administrators',
            'Sending email notifications and alerts to Customer administrators',
            'Account management, billing, and subscription administration',
          ]} />
          <P>
            PromptFence does not process personal data for any purpose other than those specified
            above. PromptFence does not use Customer Data to train AI models or improve its own
            machine learning systems.
          </P>
        </Clause>

        <Clause num="4" title="Categories of Personal Data Processed">
          <P>PromptFence may process the following categories of personal data:</P>
          <Ul items={[
            'User account data: email address, hashed password, role, account creation timestamp',
            'Usage metadata: timestamps of AI platform visits, detected data type categories (not values), actions taken',
            'Administrator-supplied data: team member email addresses for invitations',
            'Billing data: payment processing is handled by Paddle (Sub-processor); PromptFence stores only plan status and subscription ID',
          ]} />
          <P style={{ color: D.accent, fontWeight: 500 }}>
            Important: The browser extension performs detection locally. The actual content of
            prompts — including any personal data values — is never transmitted to PromptFence
            servers and is not processed by PromptFence.
          </P>
          <P>
            When the developer proxy API is used, prompt content is transmitted to PromptFence
            for scanning. This content is processed in memory only and is not persisted to any
            storage system.
          </P>
        </Clause>

        <Clause num="5" title="Categories of Data Subjects">
          <Ul items={[
            'Customer employees, contractors, and agents who use the PromptFence browser extension',
            'Customer administrators who access the PromptFence dashboard',
            'End users whose personal data may appear in prompts submitted by Customer employees (processed in-memory only)',
          ]} />
        </Clause>

        <Clause num="6" title="Obligations of the Processor">
          <P>PromptFence shall:</P>
          <Ul items={[
            'Process personal data only on documented instructions from the Customer, including for international transfers, unless required to do so by EU or Member State law',
            'Ensure that persons authorised to process personal data have committed to confidentiality or are under an appropriate statutory obligation',
            'Implement appropriate technical and organisational measures as set out in Clause 8',
            'Respect the conditions for engaging sub-processors set out in Clause 7',
            'Assist the Customer in ensuring compliance with GDPR Articles 32-36, taking into account the nature of processing',
            'Assist the Customer in responding to requests to exercise data subject rights, to the extent possible given the nature of the processing',
            'At the Customer\'s choice, delete or return all personal data after the end of the provision of services, and delete existing copies unless EU or Member State law requires otherwise',
            'Make available all information necessary to demonstrate compliance with GDPR Article 28 and allow for audits',
            'Notify the Customer immediately if PromptFence believes an instruction infringes GDPR',
          ]} />
        </Clause>

        <Clause num="7" title="Sub-processors">
          <P>
            The Customer provides general authorisation for PromptFence to engage sub-processors.
            PromptFence will inform the Customer of any intended changes concerning the addition
            or replacement of sub-processors, giving the Customer the opportunity to object.
          </P>
          <P>Current sub-processors:</P>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                  {['Sub-processor','Purpose','Location','Data transferred'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: D.muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Railway', 'Infrastructure hosting and database storage', 'EU (Frankfurt)', 'Account data, event logs'],
                  ['Paddle', 'Payment processing and subscription management', 'UK / EU', 'Billing information only'],
                  ['Resend', 'Transactional email delivery', 'EU', 'Email addresses only'],
                ].map(([name, purpose, loc, data]) => (
                  <tr key={name} style={{ borderBottom: `1px solid ${D.border}` }}>
                    <td style={{ padding: '10px 12px', color: D.text1, fontWeight: 500 }}>{name}</td>
                    <td style={{ padding: '10px 12px', color: D.text2 }}>{purpose}</td>
                    <td style={{ padding: '10px 12px', color: D.text2 }}>{loc}</td>
                    <td style={{ padding: '10px 12px', color: D.text2 }}>{data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Clause>

        <Clause num="8" title="Technical and Organisational Measures">
          <P>PromptFence implements and maintains the following security measures:</P>
          <P style={{ fontWeight: 600, color: D.text1, marginBottom: 6 }}>Access controls</P>
          <Ul items={[
            'Role-based access control with admin and member roles',
            'JWT-based authentication with 30-day token expiry',
            'API keys hashed with bcrypt; plaintext shown once and not stored',
            'All API endpoints require authentication; admin endpoints require admin role',
          ]} />
          <P style={{ fontWeight: 600, color: D.text1, marginBottom: 6 }}>Encryption</P>
          <Ul items={[
            'All data encrypted at rest using AES-256 at the infrastructure layer',
            'All traffic served over TLS 1.3',
            'Database volumes encrypted at rest',
          ]} />
          <P style={{ fontWeight: 600, color: D.text1, marginBottom: 6 }}>Data minimisation</P>
          <Ul items={[
            'Browser extension processes all data locally; no prompt content transmitted',
            'Developer proxy processes prompt text in memory only; not persisted',
            'Audit logs store only metadata (type, action, platform); not personal data values',
          ]} />
          <P style={{ fontWeight: 600, color: D.text1, marginBottom: 6 }}>Availability and resilience</P>
          <Ul items={[
            'Infrastructure hosted on Railway with automated backups',
            'Database stored on persistent volumes with point-in-time recovery',
            'Service monitored continuously with automated alerting',
          ]} />
        </Clause>

        <Clause num="9" title="Data Retention and Deletion">
          <P>
            PromptFence retains Customer Data for the duration of the active subscription.
            Event logs are retained for 12 months by default.
          </P>
          <P>
            Upon termination of the subscription, Customer Data is deleted within 30 days.
            The Customer may request immediate deletion by contacting privacy@promptfence.ai.
            Anonymised aggregate statistics may be retained for service improvement purposes.
          </P>
        </Clause>

        <Clause num="10" title="International Data Transfers">
          <P>
            PromptFence processes all Customer Data within the EU (Railway Frankfurt region).
            No Customer Data is transferred outside the EEA in the ordinary course of providing
            the Service.
          </P>
          <P>
            Where any sub-processor is located outside the EEA, PromptFence ensures appropriate
            safeguards are in place in accordance with GDPR Chapter V, including Standard
            Contractual Clauses where applicable.
          </P>
        </Clause>

        <Clause num="11" title="Data Subject Rights">
          <P>
            Where a data subject exercises rights under GDPR (access, rectification, erasure,
            portability, restriction, objection), the Customer is responsible for responding as
            the Data Controller. PromptFence will provide reasonable assistance on request.
          </P>
          <P>
            To submit a data subject request relating to PromptFence-held data, contact
            privacy@promptfence.ai.
          </P>
        </Clause>

        <Clause num="12" title="Data Breach Notification">
          <P>
            PromptFence will notify the Customer without undue delay, and in any event within
            48 hours of becoming aware of a personal data breach involving Customer Data,
            providing sufficient information to allow the Customer to meet its obligations
            under GDPR Article 33.
          </P>
          <P>
            Breach notifications will be sent to the admin email address registered on the
            Customer account.
          </P>
        </Clause>

        <Clause num="13" title="Liability and Indemnification">
          <P>
            Each party's liability under this DPA is subject to the limitations and exclusions
            set out in the main subscription agreement. PromptFence does not exclude liability
            for breaches of GDPR Article 28 obligations where PromptFence is at fault.
          </P>
        </Clause>

        <Clause num="14" title="Governing Law">
          <P>
            This DPA is governed by the laws of Ireland and subject to the jurisdiction of
            the Irish courts, without prejudice to mandatory provisions of applicable EU law.
          </P>
        </Clause>

        {/* Contact */}
        <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: 24, marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: D.text1, marginBottom: 8 }}>Questions about this DPA</div>
          <div style={{ fontSize: 13, color: D.text2, lineHeight: 1.7 }}>
            To request an executed copy of this DPA or to ask questions about data processing,
            contact{' '}
            <a href="mailto:privacy@promptfence.ai" style={{ color: '#c4b5fd', textDecoration: 'none' }}>privacy@promptfence.ai</a>.
            Customers on Business plans receive an executed DPA as standard.
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${D.border}`, padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontSize: 12, color: D.muted }}>AI data protection · Made in the EU</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/privacy" style={{ fontSize: 12, color: D.muted, textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/security" style={{ fontSize: 12, color: D.muted, textDecoration: 'none' }}>Security</Link>
          <a href="mailto:privacy@promptfence.ai" style={{ fontSize: 12, color: D.muted, textDecoration: 'none' }}>privacy@promptfence.ai</a>
        </div>
      </footer>
    </div>
  );
}
