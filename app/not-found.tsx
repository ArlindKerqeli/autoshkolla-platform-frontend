'use client';

import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <FileQuestion className="mb-4 h-16 w-16 text-gray-400" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Faqja nuk u gjet</h1>
      <p className="mb-6 text-gray-600">Faqja qe po kerkoni nuk ekziston.</p>
      <Button asChild>
        <Link href="/dashboard">Kthehu ne panelin kryesor</Link>
      </Button>
    </div>
  );
}
