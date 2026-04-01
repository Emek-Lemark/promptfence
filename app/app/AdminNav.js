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
      background: '#fff',
      borderBottom: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Link href="/dashboard" style={{
          fontWeight: 700,
          fontSize: 18,
          color: '#1e293b',
          textDecoration: 'none',
          letterSpacing: '-0.02em',
        }}>
          PromptFence
        </Link>

        <div style={{ display: 'flex', gap: 4 }}>
          {navLinks.map((link) => {
            const isActive = active?.toLowerCase() === link.label.toLowerCase();
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive ? '#1a56db' : '#64748b',
                  background: isActive ? '#eff6ff' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 0.15s, color 0.15s',
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
          <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
            {orgName}
          </span>
        )}
        <a
          href="#"
          onClick={handleLogout}
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#64748b',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          Log out
        </a>
      </div>
    </nav>
  );
}
