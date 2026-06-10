import { getTenantContext } from '@/lib/tenant/server';
import { EmailAdminDashboard } from '@/components/admin/email-admin-dashboard';

export default async function AdminEmailPage() {
  const { institutionId, institutionSlug } = await getTenantContext();
  if (!institutionId) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        Open this page from a tenant URL (e.g. /gansid/admin/email).
      </p>
    );
  }
  return (
    <EmailAdminDashboard institutionId={institutionId} institutionSlug={institutionSlug} />
  );
}
