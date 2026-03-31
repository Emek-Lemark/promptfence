'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function PricingToggle() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <div className={styles.pricingToggle}>
        <span className={!annual ? styles.pricingToggleActive : ''}>Monthly</span>
        <button
          className={styles.pricingSwitch}
          onClick={() => setAnnual(!annual)}
          aria-label="Toggle annual billing"
        >
          <span className={`${styles.pricingSwitchDot} ${annual ? styles.pricingSwitchDotOn : ''}`} />
        </button>
        <span className={annual ? styles.pricingToggleActive : ''}>
          Annual <span className={styles.pricingSave}>Save 20%</span>
        </span>
      </div>

      <div className={styles.pricingGrid}>
        {/* Personal */}
        <div className={styles.pricingCard}>
          <div className={styles.pricingCardHeader}>
            <h3>Personal</h3>
            <p className={styles.pricingCardDesc}>For individual use</p>
          </div>
          <div className={styles.pricingCardPrice}>
            <span className={styles.pricingAmount}>Free</span>
            <span className={styles.pricingPeriod}>forever</span>
          </div>
          <ul className={styles.pricingFeatures}>
            <li>Chrome + Firefox extension</li>
            <li>All detection types</li>
            <li>5 presets (Personal, Finance, Health, Work, Dev)</li>
            <li>One-click anonymization</li>
            <li>100% local processing</li>
          </ul>
          <a
            href="https://chromewebstore.google.com/detail/promptfence"
            target="_blank"
            rel="noopener"
            className={`${styles.pricingBtn} ${styles.pricingBtnSecondary}`}
          >
            Install free extension
          </a>
        </div>

        {/* Team */}
        <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
          <div className={styles.pricingBadge}>Most popular</div>
          <div className={styles.pricingCardHeader}>
            <h3>Team</h3>
            <p className={styles.pricingCardDesc}>Up to 10 users</p>
          </div>
          <div className={styles.pricingCardPrice}>
            <span className={styles.pricingAmount}>€{annual ? '39' : '49'}</span>
            <span className={styles.pricingPeriod}>/month{annual ? ', billed annually' : ''}</span>
          </div>
          <ul className={styles.pricingFeatures}>
            <li>Everything in Personal</li>
            <li>Admin dashboard</li>
            <li>Company-wide policy management</li>
            <li>Team invitation via email</li>
            <li>Aggregate audit trail</li>
            <li>CSV/JSON export</li>
          </ul>
          <a href="/signup" className={`${styles.pricingBtn} ${styles.pricingBtnPrimary}`}>
            Start free 14-day trial
          </a>
          <p className={styles.pricingNote}>No credit card required</p>
        </div>

        {/* Business */}
        <div className={styles.pricingCard}>
          <div className={styles.pricingCardHeader}>
            <h3>Business</h3>
            <p className={styles.pricingCardDesc}>Up to 50 users</p>
          </div>
          <div className={styles.pricingCardPrice}>
            <span className={styles.pricingAmount}>€{annual ? '119' : '149'}</span>
            <span className={styles.pricingPeriod}>/month{annual ? ', billed annually' : ''}</span>
          </div>
          <ul className={styles.pricingFeatures}>
            <li>Everything in Team</li>
            <li>Priority support</li>
            <li>Weekly digest emails</li>
            <li>DPA included</li>
            <li>Compliance-ready audit reports</li>
            <li>Custom detection rules</li>
          </ul>
          <a href="/signup" className={`${styles.pricingBtn} ${styles.pricingBtnPrimary}`}>
            Start free 14-day trial
          </a>
          <p className={styles.pricingNote}>No credit card required</p>
        </div>
      </div>
    </>
  );
}
