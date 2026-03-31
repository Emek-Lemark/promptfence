import Link from 'next/link';
import PricingToggle from './PricingToggle';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.topNav}>
        <div className={styles.topNavInner}>
          <span className={styles.logo}>PromptFence</span>
          <div className={styles.topNavLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#compliance">Compliance</a>
            <Link href="/login">Log in</Link>
            <Link href="/signup" className={styles.navCta}>Start free trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.heroTitle}>
            Stop sensitive data from reaching AI&nbsp;tools
          </h1>
          <p className={styles.heroSub}>
            PromptFence detects emails, phone numbers, bank details, and API keys before they leave your browser. 100% local. Nothing to configure. GDPR&#8209;compliant by&nbsp;design.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/signup" className={styles.btnPrimary}>Start free team trial</Link>
            <a
              href="https://chromewebstore.google.com/detail/promptfence"
              target="_blank"
              rel="noopener"
              className={styles.btnSecondary}
            >
              Install free extension
            </a>
          </div>
          <div className={styles.trustBadges}>
            <span className={styles.trustBadge}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a.75.75 0 01.596.3l6 8a.75.75 0 01-.596 1.2H4a.75.75 0 01-.596-1.2l6-8A.75.75 0 0110 1zM4.5 13a.75.75 0 01.75-.75h9.5a.75.75 0 010 1.5h-9.5a.75.75 0 01-.75-.75zm2 3a.75.75 0 01.75-.75h5.5a.75.75 0 010 1.5h-5.5a.75.75 0 01-.75-.75z" clipRule="evenodd"/></svg>
              100% local processing
            </span>
            <span className={styles.trustBadge}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
              No data collection
            </span>
            <span className={styles.trustBadge}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              GDPR compliant
            </span>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className={styles.sectionAlt} id="problem">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Your team is pasting client data into ChatGPT</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>68%</span>
              <span className={styles.statLabel}>of employees paste sensitive data into AI tools without checking</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>&euro;4.2M</span>
              <span className={styles.statLabel}>average cost of a GDPR fine in 2024</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>SOC2</span>
              <span className={styles.statLabel}>auditors now ask about AI data governance controls</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.section} id="how-it-works">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Protected in three steps</h2>
          <div className={styles.stepsGrid}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>Install</h3>
              <p>Admin signs up, shares a link with the team. Extension installs in one click.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>Detect</h3>
              <p>Extension scans paste and submit events locally in the browser. Nothing leaves the device.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>Protect</h3>
              <p>Sensitive data is blocked or anonymized before it reaches the AI. Admin sees aggregate stats.</p>
            </div>
          </div>
        </div>
      </section>

      {/* What we detect */}
      <section className={styles.sectionAlt} id="detection">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>What we detect</h2>
          <div className={styles.detectGrid}>
            <div className={styles.detectCard}>
              <span className={styles.detectIcon}>@</span>
              <h4>Email addresses</h4>
            </div>
            <div className={styles.detectCard}>
              <span className={styles.detectIcon}>#</span>
              <h4>Phone numbers</h4>
            </div>
            <div className={styles.detectCard}>
              <span className={styles.detectIcon}>IBAN</span>
              <h4>Bank accounts</h4>
            </div>
            <div className={styles.detectCard}>
              <span className={styles.detectIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/></svg>
              </span>
              <h4>Credit cards</h4>
            </div>
            <div className={styles.detectCard}>
              <span className={styles.detectIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
              </span>
              <h4>Addresses (EU + US/UK)</h4>
            </div>
            <div className={styles.detectCard}>
              <span className={styles.detectIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"/></svg>
              </span>
              <h4>API keys &amp; secrets</h4>
            </div>
          </div>
          <p className={styles.detectNote}>All detection runs locally in your browser. We never see your data.</p>
        </div>
      </section>

      {/* Platform coverage */}
      <section className={styles.section} id="platforms">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Works everywhere your team uses AI</h2>
          <div className={styles.platformGrid}>
            {['ChatGPT', 'Claude', 'Gemini', 'Slack', 'Gmail', 'Notion', 'Linear', 'Outlook'].map(name => (
              <div key={name} className={styles.platformBadge}>{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.sectionAlt} id="pricing">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
          <PricingToggle />
        </div>
      </section>

      {/* Compliance */}
      <section className={styles.section} id="compliance">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Built for EU compliance</h2>
          <div className={styles.complianceGrid}>
            <div className={styles.complianceItem}>
              <h4>100% local processing</h4>
              <p>Sensitive data never leaves the browser. Detection runs entirely on the user&rsquo;s device.</p>
            </div>
            <div className={styles.complianceItem}>
              <h4>GDPR-compliant by design</h4>
              <p>No personal data is collected, transmitted, or stored. Privacy is architectural, not policy.</p>
            </div>
            <div className={styles.complianceItem}>
              <h4>EU AI Act ready</h4>
              <p>Demonstrate AI governance controls to regulators. Show that data boundaries exist.</p>
            </div>
            <div className={styles.complianceItem}>
              <h4>Exportable audit trail</h4>
              <p>Aggregate event logs for SOC2, ISO 27001, and GDPR compliance reviews. No individual surveillance.</p>
            </div>
            <div className={styles.complianceItem}>
              <h4>DPA included</h4>
              <p>Data Processing Agreement included on Business plans. Ready for procurement.</p>
            </div>
            <div className={styles.complianceItem}>
              <h4>EU-hosted infrastructure</h4>
              <p>Backend runs in EU data centres. Your metadata stays in Europe.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.container}>
          <h2>Protect your team in minutes</h2>
          <p>14-day free trial. No credit card required. Self-serve setup.</p>
          <div className={styles.heroCtas}>
            <Link href="/signup" className={styles.btnPrimary}>Start free trial</Link>
            <a
              href="https://chromewebstore.google.com/detail/promptfence"
              target="_blank"
              rel="noopener"
              className={styles.btnSecondary}
            >
              Install free extension
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <span className={styles.logo}>PromptFence</span>
            <span className={styles.footerEu}>Made in the EU</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="https://chromewebstore.google.com/detail/promptfence" target="_blank" rel="noopener">Chrome Web Store</a>
            <a href="#" target="_blank" rel="noopener">Firefox Add-ons</a>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms</Link>
            <a href="mailto:hello@promptfence.ai">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
