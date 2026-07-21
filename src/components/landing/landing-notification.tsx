'use client';

/**
 * LandingNotification — public wrapper that fetches the live landing-page
 * notification(s) for the active institution and renders them below the hero.
 *
 * The landing page is unauthenticated, so reads go through the anon
 * `get_active_landing_notifications` RPC and "dismiss" is a client-side
 * localStorage flag keyed by the notification id + updated_at (so editing a
 * notification re-shows it even to someone who dismissed the old version).
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveLandingNotifications, type PublicLandingNotification } from '@/lib/db/landing-notifications';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import { LandingNotificationView } from './landing-notification-view';

const DISMISS_PREFIX = 'landing-notif-dismissed:';

function dismissKey(n: PublicLandingNotification): string {
  return `${DISMISS_PREFIX}${n.id}:${n.updated_at}`;
}

export function LandingNotification({ institutionSlug }: { institutionSlug: string }) {
  const [notifications, setNotifications] = useState<PublicLandingNotification[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const rows = await getActiveLandingNotifications(supabase, institutionSlug);
        if (cancelled) return;
        // Filter out ones the visitor already dismissed (this exact version).
        const visible = rows.filter((n) => {
          if (!n.dismissible) return true;
          try {
            return localStorage.getItem(dismissKey(n)) === null;
          } catch {
            return true; // storage blocked → show it
          }
        });
        setNotifications(visible);
      } catch {
        // Never break the landing page over a notification fetch.
        if (!cancelled) setNotifications([]);
      }
    })();
    return () => { cancelled = true; };
  }, [institutionSlug]);

  if (notifications.length === 0) return null;

  const branding = getInstitutionBranding(institutionSlug);

  const handleDismiss = (n: PublicLandingNotification) => {
    try { localStorage.setItem(dismissKey(n), '1'); } catch { /* ignore */ }
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
  };

  return (
    <section className="relative z-20 -mt-2 pb-2">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {notifications.map((n) => (
          <LandingNotificationView
            key={n.id}
            notification={n}
            branding={{
              institutionName: branding.fullName,
              logoUrl: branding.logoUrl,
              primaryColor: branding.primaryColor,
            }}
            onDismiss={() => handleDismiss(n)}
          />
        ))}
      </div>
    </section>
  );
}
