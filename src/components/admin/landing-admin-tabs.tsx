'use client';

/**
 * Landing-page admin hub — tabs for the two editable landing sections:
 *   - Notification banner (list + editor)
 *   - "Returning from EdApp" section (single-config editor)
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Sparkles } from 'lucide-react';
import { LandingNotificationsManager } from '@/components/admin/landing-notifications-manager';
import { ReturningSectionEditor } from '@/components/admin/returning-section-editor';
import type { LandingNotification } from '@/lib/db/landing-notifications';
import type { LandingReturningInfo } from '@/lib/db/landing-returning';

interface LandingAdminTabsProps {
  notifications: LandingNotification[];
  returning: LandingReturningInfo | null;
  institutionId: string;
  institutionSlug: string;
}

export function LandingAdminTabs({ notifications, returning, institutionId, institutionSlug }: LandingAdminTabsProps) {
  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Landing page</h1>
        <p className="mt-1 text-sm text-slate-500 font-medium">
          Edit the sections shown on your public landing page — content and appearance
        </p>
      </div>

      <Tabs defaultValue="notification" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notification" className="gap-1.5">
            <Bell className="h-4 w-4" /> Notification banner
          </TabsTrigger>
          <TabsTrigger value="returning" className="gap-1.5">
            <Sparkles className="h-4 w-4" /> Returning-EdApp section
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notification">
          <LandingNotificationsManager
            initialNotifications={notifications}
            institutionId={institutionId}
            institutionSlug={institutionSlug}
          />
        </TabsContent>

        <TabsContent value="returning">
          <ReturningSectionEditor
            initial={returning}
            institutionId={institutionId}
            institutionSlug={institutionSlug}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
