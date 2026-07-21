'use client';

/**
 * ReturningLearnerSection — public wrapper for the "Returning from EdApp" section.
 *
 * Fetches the institution's ACTIVE content via the anon
 * `get_landing_returning_info` RPC (migration 066) and renders the shared
 * LandingReturningView. Admin-editable copy; if the admin toggles the section
 * off (or there's no row) the RPC returns nothing and the section is hidden.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveLandingReturningInfo } from '@/lib/db/landing-returning';
import { LandingReturningView, type LandingReturningContent } from './landing-returning-view';

interface ReturningLearnerSectionProps {
  institutionSlug: string;
  signInHref: string;
  signUpHref: string;
}

export function ReturningLearnerSection({ institutionSlug, signInHref, signUpHref }: ReturningLearnerSectionProps) {
  const [content, setContent] = useState<LandingReturningContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const row = await getActiveLandingReturningInfo(supabase, institutionSlug);
        if (!cancelled) setContent(row);
      } catch {
        if (!cancelled) setContent(null);
      }
    })();
    return () => { cancelled = true; };
  }, [institutionSlug]);

  if (!content) return null;

  return <LandingReturningView content={content} signInHref={signInHref} signUpHref={signUpHref} />;
}
