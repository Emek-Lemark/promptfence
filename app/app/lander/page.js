'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ALLOWED_HOSTS = [
  'promptfence.ai',
  'app.promptfence.ai',
  'promptfenceapp-production.up.railway.app',
];

function LanderRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const oref = params.get('oref');
    if (oref) {
      try {
        const url = new URL(oref);
        if (ALLOWED_HOSTS.includes(url.hostname)) {
          window.location.href = oref;
          return;
        }
      } catch { /* invalid URL */ }
    }
    router.replace('/');
  }, [params, router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0c0a14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid #2d2645',
        borderTopColor: '#7c3aed',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function LanderPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0c0a14' }} />
    }>
      <LanderRedirect />
    </Suspense>
  );
}
