import Link from 'next/link';
import PricingToggle from './PricingToggle';
import s from './page.module.css';

export default function Home() {
  return (
    <div className={s.page}>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <Link href="/" className={s.navLogo}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
                fill="#7c3aed" opacity="0.15" stroke="#7c3aed" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
                fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinejoin="round"/>
              <line x1="12" y1="2" x2="12" y2="22" stroke="#7c3aed" strokeWidth="1" opacity="0.4"/>
            </svg>
            <span>PromptFence</span>
          </Link>
          <div className={s.navLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#compliance">Compliance</a>
          </div>
          <div className={s.navActions}>
            <Link href="/login" className={s.navLogin}>Log in</Link>
            <Link href="/signup" className={s.navCta}>Start free trial</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className={s.hero}>
        <div className={s.heroInner}>
          <div className={s.heroText}>
            <div className={s.eyebrow}>
              <span className={s.eyebrowDot} />
              AI Policy Enforcement
            </div>
            <h1 className={s.h1}>
              Give your team<br />
              clear AI rules.<br />
              <span className={s.h1Accent}>Enforced automatically.</span>
            </h1>
            <p className={s.heroSub}>
              Your team is pasting client emails, bank details and internal
              passwords into ChatGPT without a second thought. PromptFence
              blocks it before it leaves the browser — and keeps a record
              you can show clients and regulators.
            </p>
            <div className={s.heroCtas}>
              <Link href="/signup" className={s.btnPrimary}>
                Start free 14-day trial
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </Link>
              <a href="https://chromewebstore.google.com/detail/promptfence" target="_blank" rel="noopener" className={s.btnGhost}>
                Install free extension
              </a>
            </div>
            <div className={s.trustRow}>
              <span>✓ No credit card</span>
              <span>✓ 100% local processing</span>
              <span>✓ GDPR-compliant</span>
            </div>
          </div>

          {/* Live product demo */}
          <div className={s.heroDemo}>
            <div className={s.demoCard}>
              <div className={s.demoHeader}>
                <div className={s.demoDots}>
                  <span /><span /><span />
                </div>
                <span className={s.demoTitle}>ChatGPT</span>
                <span className={s.demoStatus}>
                  <span className={s.demoStatusDot} />
                  PromptFence active
                </span>
              </div>
              <div className={s.demoBody}>
                <div className={s.demoPromptLabel}>Your message</div>
                <div className={s.demoPrompt}>
                  <span>Can you draft a follow-up to </span>
                  <span className={s.demoHighlight} data-type="EMAIL">alice@acme.com</span>
                  <span> about invoice </span>
                  <span className={s.demoHighlight} data-type="IBAN">GB33BUKB20201555555555</span>
                  <span> from last quarter?</span>
                </div>
                <div className={s.demoBlock}>
                  <div className={s.demoBlockHeader}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    Blocked: 2 items detected
                  </div>
                  <div className={s.demoMatches}>
                    <div className={s.demoMatch}>
                      <code className={s.demoMatchType}>EMAIL</code>
                      <span className={s.demoMatchVal}>alice@acme.com</span>
                    </div>
                    <div className={s.demoMatch}>
                      <code className={s.demoMatchType}>IBAN</code>
                      <span className={s.demoMatchVal}>GB33BUKB2020…5555</span>
                    </div>
                  </div>
                  <div className={s.demoActions}>
                    <button className={s.demoAnon}>Anonymise and send</button>
                    <button className={s.demoCancel}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating stat */}
            <div className={s.demoStat}>
              <span className={s.demoStatNum}>847</span>
              <span className={s.demoStatLabel}>items blocked this month</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGOS / PLATFORMS ───────────────────────────────────────── */}
      <div className={s.platforms}>
        <div className={s.container}>
          <p className={s.platformsLabel}>Scans everything your team types into</p>
          <div className={s.platformList}>
            {['ChatGPT', 'Claude', 'Gemini', 'Grok', 'Copilot', 'Perplexity', 'Mistral', 'Slack', 'Notion', 'Gmail', 'Outlook'].map(p => (
              <span key={p} className={s.platformItem}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROBLEM ─────────────────────────────────────────────────── */}
      <section className={s.section} id="problem">
        <div className={s.container}>
          <div className={s.sectionLabel}>[ 01 ] THE PROBLEM</div>
          <h2 className={s.h2}>
            Sensitive data is leaking<br />into AI tools every day.
          </h2>
          <p className={s.sectionSub}>
            Most teams have no visibility into what their employees paste into ChatGPT, Claude, or Gemini.
            They also have no way to prove their AI products handled customer data responsibly.
            One careless prompt can expose client data, trigger a GDPR fine, or lose a deal.
          </p>
          <div className={s.statsGrid}>
            {[
              { n: '11', label: 'data types detected — email, IBAN, card numbers, passwords, national IDs, API keys, and more' },
              { n: '5 min', label: 'to deploy across your whole team. Admin sets policy, shares an install link, done.' },
              { n: '0 bytes', label: 'of prompt content ever stored. Detection runs locally in the browser, not on our servers.' },
            ].map(({ n, label }) => (
              <div key={n} className={s.statCard}>
                <span className={s.statNum}>{n}</span>
                <span className={s.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section className={s.sectionAlt} id="how-it-works">
        <div className={s.container}>
          <div className={s.sectionLabel}>[ 02 ] HOW IT WORKS</div>
          <h2 className={s.h2}>Protected in three steps.</h2>
          <div className={s.stepsGrid}>
            {[
              {
                n: '01',
                title: 'Admin sets policy',
                body: 'Sign up and configure what to block: emails, IBANs, passwords, national IDs, and custom terms. Takes five minutes.',
              },
              {
                n: '02',
                title: 'Team installs extension',
                body: 'Invite team members by email or share an install link. Each person installs the Chrome or Firefox extension in one click. No account required.',
              },
              {
                n: '03',
                title: 'Extension intercepts PII',
                body: 'Every prompt is scanned locally before submit. Sensitive items are flagged, blocked, or anonymised automatically.',
              },
            ].map(({ n, title, body }) => (
              <div key={n} className={s.step}>
                <span className={s.stepN}>{n}</span>
                <h3 className={s.stepTitle}>{title}</h3>
                <p className={s.stepBody}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT WE DETECT ──────────────────────────────────────────── */}
      <section className={s.section} id="detection">
        <div className={s.container}>
          <div className={s.sectionLabel}>[ 03 ] DETECTION</div>
          <h2 className={s.h2}>Everything that shouldn&rsquo;t reach an AI.</h2>
          <div className={s.detectGrid}>
            {[
              { type: 'EMAIL',       eg: 'alice@company.com',              label: 'Email addresses' },
              { type: 'PHONE',       eg: '+44 7911 123 456',               label: 'Phone numbers' },
              { type: 'IBAN',        eg: 'GB33 BUKB 2020 1555 5555 55',    label: 'Bank accounts (IBAN)' },
              { type: 'CREDIT_CARD', eg: '4111 1111 1111 1111',            label: 'Credit & debit cards' },
              { type: 'NATIONAL_ID', eg: 'ES 12345678A · NL 123456789',    label: 'National IDs (7 EU countries)' },
              { type: 'PASSWORD',    eg: 'P@ssw0rd123!',                   label: 'Passwords & secrets' },
              { type: 'IP_ADDRESS',  eg: '192.168.1.1',                    label: 'IP addresses' },
              { type: 'VAT',         eg: 'GB 123 456 789',                 label: 'VAT numbers' },
              { type: 'ADDRESS',     eg: '10 Downing Street, London',      label: 'Physical addresses' },
              { type: 'API_KEY',     eg: 'sk-proj-xxxxxxxxxxxx',           label: 'API keys & tokens' },
              { type: 'CUSTOM',      eg: 'Your own terms & phrases',       label: 'Custom terms (admin-defined)' },
              { type: 'LOCAL',       eg: '100% in browser. Nothing sent.',  label: 'All detection is local' },
            ].map(({ type, eg, label }) => (
              <div key={type} className={s.detectCard}>
                <code className={s.detectType}>{type}</code>
                <span className={s.detectLabel}>{label}</span>
                <span className={s.detectEg}>{eg}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE ──────────────────────────────────────────────── */}
      <section className={s.section} id="compliance">
        <div className={s.container}>
          <div className={s.sectionLabel}>[ 04 ] COMPLIANCE</div>
          <h2 className={s.h2}>Prove it to auditors.<br />Prove it to customers.</h2>
          <p className={s.sectionSub}>
            Enterprise buyers ask how you handle their data in AI systems.
            PromptFence generates the evidence trail that answers that question.
            Not a checkbox, but actual proof that your controls were active and working.
          </p>
          <div className={s.complianceGrid}>
            {[
              {
                tag: 'GDPR · Art. 32',
                title: '100% local processing',
                body: 'Detection runs in the browser. Sensitive data never leaves the device. Zero data transfer, built into the architecture rather than a policy you hope people follow.',
              },
              {
                tag: 'EU AI Act · Art. 4',
                title: 'Company AI policy',
                body: 'Set rules by data type — block, warn, or allow. Policy applies to every team member the moment they install the extension. No config per employee.',
              },
              {
                tag: 'EU AI Act · Art. 12',
                title: 'Immutable audit log',
                body: 'Every intercept is logged with timestamp, data type, and action. Export a full compliance report in two clicks.',
              },
              {
                tag: 'EU AI Act · Art. 10',
                title: 'AI platform visibility',
                body: 'Every incident is tagged with the AI tool it happened on — ChatGPT, Claude, Gemini, Copilot. See where your team is using AI and where sensitive data is at risk.',
              },
              {
                tag: 'SOC 2 / ISO 27001',
                title: 'No individual surveillance',
                body: 'Logs are aggregate-only. No per-user content is stored. Audit evidence without monitoring employees.',
              },
              {
                tag: 'Enterprise',
                title: 'DPA included',
                body: 'Data Processing Agreement on Business plans. EU-hosted infrastructure. Ready for procurement and legal review.',
              },
            ].map(({ tag, title, body }) => (
              <div key={tag} className={s.compCard}>
                <span className={s.compTag}>{tag}</span>
                <h4 className={s.compTitle}>{title}</h4>
                <p className={s.compBody}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────── */}
      <section className={s.sectionAlt} id="pricing">
        <div className={s.container}>
          <div className={s.sectionLabel}>[ 05 ] PRICING</div>
          <h2 className={s.h2}>Simple pricing. No surprises.</h2>
          <p className={s.sectionSub}>
            14-day free trial on all plans. No credit card required.
          </p>
          <PricingToggle />
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────── */}
      <section className={s.cta}>
        <div className={s.ctaInner}>
          <h2 className={s.ctaH2}>
            Set your policy once.<br />Protect every prompt from day one.
          </h2>
          <p className={s.ctaSub}>
            5 minutes to deploy. No code. No IT ticket. No credit card.
          </p>
          <div className={s.heroCtas}>
            <Link href="/signup" className={s.btnPrimary}>
              Start free trial
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </Link>
            <a href="https://chromewebstore.google.com/detail/promptfence" target="_blank" rel="noopener" className={s.btnGhost}>
              Install free extension
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>
            <span className={s.footerLogo}>PromptFence</span>
            <span className={s.footerTagline}>AI data protection · Made in the EU</span>
          </div>
          <div className={s.footerLinks}>
            <a href="https://chromewebstore.google.com/detail/promptfence" target="_blank" rel="noopener">Chrome</a>
            <Link href="/developer/docs">API Docs</Link>
            <Link href="/security">Security</Link>
            <Link href="/legal/dpa">DPA</Link>
            <Link href="/privacy">Privacy</Link>
            <a href="mailto:hello@promptfence.ai">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
