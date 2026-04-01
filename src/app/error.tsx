'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-[#DC2626]" />
        </div>
        <p className="text-[#DC2626] text-sm font-black uppercase tracking-widest mb-3">Something went wrong</p>
        <h1 className="text-3xl font-black text-[#0F172A] mb-3">An unexpected error occurred</h1>
        <p className="text-slate-500 font-medium mb-8">
          We&apos;re sorry for the inconvenience. You can try refreshing the page or go back to the dashboard.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono mb-6">Error ID: {error.digest}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
          >
            <a href="/gansid/student">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
