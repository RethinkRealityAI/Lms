'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, Loader2, ScrollText } from 'lucide-react';
import { requestCmeCertificate, getMyCmeRequest } from '@/lib/db';
import type { CmeCertificateRequest } from '@/types';

interface CmeRequestBannerProps {
  userId: string;
  /** Active portal institution — CME requests are per-institution (migration 057). */
  institutionId: string;
  eligible: boolean;
  initialRequest: CmeCertificateRequest | null;
  profileHref: string;
}

export function CmeRequestBanner({
  userId,
  institutionId,
  eligible,
  initialRequest,
  profileHref,
}: CmeRequestBannerProps) {
  const supabase = createClient();
  const [request, setRequest] = useState<CmeCertificateRequest | null>(initialRequest);
  const [busy, setBusy] = useState(false);

  const status = request?.status ?? null;

  // Nothing to show: not eligible and no existing request to surface.
  if (!eligible && !status) return null;

  const handleRequest = async () => {
    setBusy(true);
    try {
      const { error } = await requestCmeCertificate(supabase, institutionId, null);
      if (error) {
        toast.error('Could not submit request', { description: error });
        return;
      }
      toast.success('Certificate request submitted', {
        description: 'Your request is now pending review.',
      });
      const updated = await getMyCmeRequest(supabase, userId, institutionId);
      setRequest(updated);
    } finally {
      setBusy(false);
    }
  };

  if (status === 'issued') {
    return (
      <Card className="border-none shadow-sm bg-green-50 ring-1 ring-green-100">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
          <p className="font-bold text-green-800">Certificate issued ✓</p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'pending') {
    return (
      <Card className="border-none shadow-sm bg-amber-50 ring-1 ring-amber-100">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-amber-600 shrink-0 animate-spin" />
            <p className="font-bold text-amber-800">Certificate requested — pending review.</p>
          </div>
          <Link
            href={profileHref}
            className="text-sm font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 shrink-0"
          >
            View on profile
          </Link>
        </CardContent>
      </Card>
    );
  }

  // eligible && no open request (status null, or declined with eligibility)
  if (!eligible) return null;

  return (
    <Card className="border-none shadow-md bg-gradient-to-r from-[#1A3C6E] to-[#0F172A] overflow-hidden">
      <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-white/10 p-2 shrink-0">
            <ScrollText className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-black text-white leading-tight">
              You&apos;ve completed all modules 🎉
            </p>
            <p className="text-slate-300 text-sm font-medium">
              Request your Certificate of Completion.
            </p>
          </div>
        </div>
        <Button
          onClick={handleRequest}
          disabled={busy}
          className="bg-[#C8262A] hover:bg-[#A81E22] text-white font-bold px-6 h-11 rounded-xl shadow-lg shrink-0"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Request Certificate'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
