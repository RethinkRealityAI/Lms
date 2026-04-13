import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';
import { getCertificateTemplates, getCourseCertificateAssignments } from '@/lib/db/certificate-templates';
import { getIssuedCertificates } from '@/lib/db/certificates';
import { getInstitutionName } from '@/lib/db/institutions';
import { CertificatesDashboard } from './certificates-dashboard';

export default async function CertificatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Use tenant context (from URL slug) so platform_admin sees the right institution
  const { institutionId: tenantInstitutionId } = await getTenantContext();

  // Fall back to user's own institution if tenant context unavailable
  let institutionId = tenantInstitutionId;
  if (!institutionId) {
    const { data: userData } = await supabase
      .from('users')
      .select('institution_id')
      .eq('id', user.id)
      .single();
    institutionId = userData?.institution_id;
  }

  if (!institutionId) return <p className="p-8">No institution found.</p>;

  const [templates, certificates, assignments, institutionName] = await Promise.all([
    getCertificateTemplates(supabase, institutionId),
    getIssuedCertificates(supabase, institutionId),
    getCourseCertificateAssignments(supabase, institutionId),
    getInstitutionName(supabase, institutionId),
  ]);

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('institution_id', institutionId)
    .order('title');

  return (
    <CertificatesDashboard
      templates={templates}
      certificates={certificates}
      assignments={assignments}
      courses={courses ?? []}
      institutionId={institutionId}
      institutionName={institutionName}
    />
  );
}
