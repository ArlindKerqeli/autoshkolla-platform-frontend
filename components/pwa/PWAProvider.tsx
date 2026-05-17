'use client';

import { useEffect } from 'react';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Dynamically import to avoid SSR issues
    import('@/lib/sw-register').then(({ registerServiceWorker }) => {
      registerServiceWorker();
    });

    const handleUpdate = () => {
      console.log('[PWA] New version available. Refresh to update.');
    };

    window.addEventListener('sw-update-available', handleUpdate);
    return () => {
      window.removeEventListener('sw-update-available', handleUpdate);
    };
  }, []);

  return <>{children}</>;
}
