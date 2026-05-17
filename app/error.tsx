'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <AlertTriangle className="mb-4 h-16 w-16 text-red-400" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Ndodhi nje gabim</h1>
      <p className="mb-6 text-gray-600">Dicka shkoi keq. Ju lutem provoni perseri.</p>
      <Button onClick={reset}>Provo perseri</Button>
    </div>
  );
}
