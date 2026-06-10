'use client';

/**
 * AnnouncementHost — mounts on the student dashboard.
 *
 * Rendering rules:
 *  - Banners: ALL visible banner announcements, stacked (space-y-3), newest first.
 *  - Modals:  AT MOST ONE modal — the first (newest) style='modal' announcement.
 *
 * Display-mode semantics:
 *  - 'once'           → record dismissal on mount (fire-and-forget); still renders this visit.
 *  - 'until_dismissed'→ record only when the user explicitly dismisses.
 *  - 'always'         → never record a dismissal.
 *
 * Dismissal writes never block the UI; errors are swallowed with console.error.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { recordAnnouncementDismissal, type Announcement } from '@/lib/db/announcements';
import { AnnouncementDisplay, type AnnouncementBrandingContext, type AnnouncementUserContext } from '@/components/announcements/announcement-display';

interface AnnouncementHostProps {
  announcements: Announcement[];
  branding: AnnouncementBrandingContext;
  user: AnnouncementUserContext & { userId: string };
}

export function AnnouncementHost({ announcements, branding, user }: AnnouncementHostProps) {
  const [visible, setVisible] = useState<Announcement[]>(announcements);

  // For 'once' announcements: record the dismissal immediately on mount so the
  // row is written to announcement_dismissals. The announcement still renders
  // this visit (it stays in `visible`); it just won't appear on subsequent loads.
  useEffect(() => {
    const supabase = createClient();
    for (const a of announcements) {
      if (a.display_mode === 'once') {
        recordAnnouncementDismissal(supabase, a.id, user.userId).catch(console.error);
      }
    }
    // Run only on initial mount — announcements prop is stable from the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = (id: string, displayMode: Announcement['display_mode']) => {
    // Remove from local state immediately (optimistic).
    setVisible((prev) => prev.filter((a) => a.id !== id));

    // Write dismissal to DB only for 'until_dismissed' — 'once' is already
    // written on mount, 'always' is never recorded.
    if (displayMode === 'until_dismissed') {
      const supabase = createClient();
      recordAnnouncementDismissal(supabase, id, user.userId).catch(console.error);
    }
  };

  if (visible.length === 0) return null;

  const banners = visible.filter((a) => a.style === 'banner');
  // Only the first (newest) modal is shown; extras are silently suppressed.
  const modal = visible.find((a) => a.style === 'modal') ?? null;

  // AnnouncementDisplay expects a subset of the user props without `userId`.
  const displayUser: AnnouncementUserContext = {
    userName: user.userName,
    userEmail: user.userEmail,
    institutionId: user.institutionId,
  };

  return (
    <>
      {/* Single modal — shown on page load, sits above banners in the DOM */}
      {modal && (
        <AnnouncementDisplay
          key={modal.id}
          announcement={modal}
          branding={branding}
          user={displayUser}
          onDismiss={() => handleDismiss(modal.id, modal.display_mode)}
        />
      )}

      {/* Stacked banners */}
      {banners.length > 0 && (
        <div className="space-y-3">
          {banners.map((a) => (
            <AnnouncementDisplay
              key={a.id}
              announcement={a}
              branding={branding}
              user={displayUser}
              onDismiss={() => handleDismiss(a.id, a.display_mode)}
            />
          ))}
        </div>
      )}
    </>
  );
}
