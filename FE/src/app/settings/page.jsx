'use client';

// Settings are now integrated into the main Pilot workspace (Settings view in the left nav).
// This page redirects there.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/Atoms';

export default function SettingsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);

  return (
    <div style={{
      display: 'flex', height: '100vh',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--ink-60)', fontSize: 13,
      gap: 10,
    }}>
      <Spinner size={14}/> Redirecting to settings…
    </div>
  );
}
