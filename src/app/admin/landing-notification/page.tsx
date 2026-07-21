import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';
import { getLandingNotifications } from '@/lib/db/landing-notifications';
import { LandingNotificationsManager } from '@/components/admin/landing-notifications-manager';
import { Bell } from 'lucide-react';

export default async function LandingNotificationPage() {
  const supabase = await createClient();
  const { institutionId, institutionSlug } = await getTenantContext();

  if (!institutionId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Bell className="h-8 w-8 text-slate-300" />
        </div>
        <h2 className="text-xl font-black text-slate-700 mb-2">No institution found</h2>
        <p className="text-sm text-slate-400 font-medium max-w-sm">
          Landing notifications are scoped to an institution. Make sure you are accessing this page
          via a valid tenant URL (e.g. <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">/scago/admin/landing-notification</code>).
        </p>
      </div>
    );
  }

  const initialNotifications = await getLandingNotifications(supabase, institutionId);

  return (
    <LandingNotificationsManager
      initialNotifications={initialNotifications}
      institutionId={institutionId}
      institutionSlug={institutionSlug}
    />
  );
}
