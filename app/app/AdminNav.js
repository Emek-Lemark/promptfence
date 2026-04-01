'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAuth } from '../lib/api';

const navLinks = [
  { href: '/dashboard',  label: 'Dashboard' },
  { href: '/policy',     label: 'Policy' },
  { href: '/team',       label: 'Team' },
  { href: '/events',     label: 'Events' },
  { href: '/compliance', label: 'Compliance' },
  { href: '/developer',  label: 'Developer' },
  { href: '/billing',    label: 'Billing' },
];

export default function AdminNav({ active, orgName }) {
  const router = useRouter();

  function handleLogout(e) {
    e.preventDefault();
    clearAuth();
    router.push('/login');
  }

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: 56,
      background: '#0c0a14',
      borderBottom: '1px solid #2d2645',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <Link href="/dashboard" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 700,
          fontSize: 16,
          color: '#fafafa',
          textDecoration: 'none',
          letterSpacing: '-0.02em',
          flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
              fill="#7c3aed" opacity="0.15" stroke="#7c3aed" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
              fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          PromptFence
        </Link>

        <div style={{ display: 'flex', gap: 2 }}>
          {navLinks.map((link) => {
            const isActive = active?.toLowerCase() === link.label.toLowerCase();
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  color: isActive ? '#c4b5fd' : '#6b608a',
                  background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 0.12s, color 0.12s',
                  whiteSpace: 'nowrap',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {orgName && (
          <span style={{
            fontSize: 12,
            color: '#6b608a',
            fontWeight: 500,
            background: '#1a1628',
            border: '1px solid #2d2645',
            borderRadius: 5,
            padding: '3px 9px',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {orgName}
          </span>
        )}
        <a
          href="#"
          onClick={handleLogout}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#6b608a',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => e.target.style.color = '#a89ec0'}
          onMouseLeave={e => e.target.style.color = '#6b608a'}
        >
          Log out
        </a>
      </div>
    </nav>
  );
}
