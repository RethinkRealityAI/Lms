import Link from 'next/link';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_INSTITUTION_SLUG } from '@/lib/tenant/path';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-[#1E3A5F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="h-10 w-10 text-[#1E3A5F]" />
        </div>
        <p className="text-[#DC2626] text-sm font-black uppercase tracking-widest mb-3">404 — Page Not Found</p>
        <h1 className="text-3xl font-black text-[#0F172A] mb-3">We couldn&apos;t find that page</h1>
        <p className="text-slate-500 font-medium mb-8">
          The page you&apos;re looking for may have moved or doesn&apos;t exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-bold">
            <Link href={`/${DEFAULT_INSTITUTION_SLUG}/student`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-300 text-slate-700 font-bold hover:bg-slate-50">
            <Link href={`/${DEFAULT_INSTITUTION_SLUG}/admin`}>Admin Portal</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
