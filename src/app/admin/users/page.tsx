import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';
import { getActiveUsers } from '@/lib/db/users';
import { getInvitations } from '@/lib/db/invitations';
import { getLegacyUsers, getUnclaimedLegacyUsers, getLegacyCompletionSummaries } from '@/lib/db/legacy-users';
import { getPendingCmeRequestByUser } from '@/lib/db/cme-requests';
import { UserManagementDashboard } from './user-management-dashboard';

export default async function UsersPage() {
  const supabase = await createClient();
  const { institutionId } = await getTenantContext();

  if (!institutionId) {
    return <div className="text-center py-12 text-slate-500">Institution not found.</div>;
  }

  const [activeUsers, invitations, legacyUsers, pendingCmeByUser, unclaimedLegacyUsers, legacyCompletionSummaries] = await Promise.all([
    getActiveUsers(supabase, institutionId),
    getInvitations(supabase, institutionId),
    getLegacyUsers(supabase, institutionId),
    getPendingCmeRequestByUser(supabase, institutionId),
    getUnclaimedLegacyUsers(supabase, institutionId),
    getLegacyCompletionSummaries(supabase, institutionId),
  ]);

  return (
    <UserManagementDashboard
      activeUsers={activeUsers}
      invitations={invitations}
      legacyUsers={legacyUsers}
      pendingCmeByUser={pendingCmeByUser}
      unclaimedLegacyUsers={unclaimedLegacyUsers}
      legacyCompletionSummaries={legacyCompletionSummaries}
      institutionId={institutionId}
    />
  );
}
