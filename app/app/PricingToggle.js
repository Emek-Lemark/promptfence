'use client';

import { useState } from 'react';
import styles from './page.module.css';
import Link from 'next/link';

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
          Annual <span className={styles.pricingSave}>−20%</span>
        </span>
      </div>

      <div className={styles.pricingGrid}>

        {/* Free */}
        <div className={styles.pricingCard}>
          <div className={styles.pricingCardHeader}>
            <h3>Personal</h3>
            <p className={styles.pricingCardDesc}>For individual use — free forever</p>
          </div>
          <div className={styles.pricingCardPrice}>
            <span className={styles.pricingAmount}>€0</span>
            <span className={styles.pricingPeriod}>/month</span>
          </div>
          <ul className={styles.pricingFeatures}>
            <li>Chrome + Firefox extension</li>
            <li>All detection types (email, IBAN, passwords…)</li>
            <li>5 presets (Personal, Finance, Health, Work, Dev)</li>
            <li>One-click anonymisation</li>
            <li>100% local — nothing sent anywhere</li>
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

        {/* Team — featured */}
        <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
          <div className={styles.pricingBadge}>MOST POPULAR</div>
          <div className={styles.pricingCardHeader}>
            <h3>Team</h3>
            <p className={styles.pricingCardDesc}>Up to 25 seats</p>
          </div>
          <div className={styles.pricingCardPrice}>
            <span className={styles.pricingAmount}>€{annual ? '39' : '49'}</span>
            <span className={styles.pricingPeriod}>/month{annual ? ', billed annually' : ''}</span>
          </div>
          <ul className={styles.pricingFeatures}>
            <li>Everything in Personal</li>
            <li>Admin dashboard</li>
            <li>Company-wide policy management</li>
            <li>Team invite via email</li>
            <li>Aggregate audit trail + CSV export</li>
            <li>EU AI Act compliance reports</li>
            <li>AI literacy training scores</li>
          </ul>
          <Link href="/signup" className={`${styles.pricingBtn} ${styles.pricingBtnPrimary}`}>
            Start free 14-day trial
          </Link>
          <p className={styles.pricingNote}>No credit card required</p>
        </div>

        {/* Business */}
        <div className={styles.pricingCard}>
          <div className={styles.pricingCardHeader}>
            <h3>Business</h3>
            <p className={styles.pricingCardDesc}>Up to 100 seats</p>
          </div>
          <div className={styles.pricingCardPrice}>
            <span className={styles.pricingAmount}>€{annual ? '119' : '149'}</span>
            <span className={styles.pricingPeriod}>/month{annual ? ', billed annually' : ''}</span>
          </div>
          <ul className={styles.pricingFeatures}>
            <li>Everything in Team</li>
            <li>Developer API + OpenAI proxy</li>
            <li>Priority support</li>
            <li>DPA included</li>
            <li>Custom detection rules</li>
            <li>Webhook events</li>
            <li>Weekly digest emails</li>
          </ul>
          <Link href="/signup" className={`${styles.pricingBtn} ${styles.pricingBtnPrimary}`}>
            Start free 14-day trial
          </Link>
          <p className={styles.pricingNote}>No credit card required</p>
        </div>

      </div>
    </>
  );
}
