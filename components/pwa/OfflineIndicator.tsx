'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showOnlineFlash, setShowOnlineFlash] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      setShowOnlineFlash(true);
      setTimeout(() => setShowOnlineFlash(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowOnlineFlash(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showOnlineFlash) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-300',
        isOffline
          ? 'bg-amber-100 text-amber-700'
          : 'bg-green-100 text-green-700'
      )}
      title={isOffline ? 'Jeni jashtë linje' : 'Lidhja u rikthye'}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Jashtë linje</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Në linje</span>
        </>
      )}
    </div>
  );
}
