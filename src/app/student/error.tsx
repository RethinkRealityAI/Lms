'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Student error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5">
        <AlertTriangle className="h-8 w-8 text-[#DC2626]" />
      </div>
      <p className="text-[#DC2626] text-xs font-black uppercase tracking-widest mb-2">Error</p>
      <h2 className="text-2xl font-black text-[#0F172A] mb-2">Something went wrong</h2>
      <p className="text-slate-500 font-medium mb-6 max-w-sm">
        We hit an unexpected snag. Try refreshing the page or head back to your dashboard.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400 font-mono mb-5">ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset} className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button asChild variant="outline" className="border-slate-300 text-slate-700 font-bold">
          <Link href="/gansid/student">
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
