import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>PromptFence</h1>
      <p style={{ color: '#6b7280', marginBottom: '40px', fontSize: '18px' }}>
        Protect sensitive data from AI prompts
      </p>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '40px' }}>
        <Link
          href="/signup"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#2563eb',
            color: 'white',
            borderRadius: '6px',
            fontWeight: '500',
            textDecoration: 'none'
          }}
        >
          Get Started
        </Link>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#e5e7eb',
            color: '#374151',
            borderRadius: '6px',
            fontWeight: '500',
            textDecoration: 'none'
          }}
        >
          Log In
        </Link>
      </div>

      <div style={{ textAlign: 'left', background: '#f9fafb', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '12px' }}>Default Rules</h3>
        <ul style={{ lineHeight: '1.8', marginLeft: '20px' }}>
          <li>EMAIL: Warn</li>
          <li>PHONE: Warn</li>
          <li>IBAN: Block</li>
        </ul>
      </div>

      <p style={{ color: '#9ca3af', fontSize: '14px' }}>
        No clipboard content or prompts are ever stored.
      </p>
    </div>
  );
}
