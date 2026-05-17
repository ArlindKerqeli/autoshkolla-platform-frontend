'use client';

import { RefreshCw } from 'lucide-react';

interface SyncStatusIndicatorProps {
  isSyncing: boolean;
  queueCount: number;
}

export function SyncStatusIndicator({ isSyncing, queueCount }: SyncStatusIndicatorProps) {
  if (!isSyncing && queueCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
      <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">
        {isSyncing ? 'Sinkronizimi...' : `${queueCount} në pritje`}
      </span>
    </div>
  );
}
