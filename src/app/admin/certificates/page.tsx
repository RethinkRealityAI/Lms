import { createClient } from '@/lib/supabase/server';
import { getCertificateTemplates, getCourseCertificateAssignments } from '@/lib/db/certificate-templates';
import { getIssuedCertificates } from '@/lib/db/certificates';
import { CertificatesDashboard } from './certificates-dashboard';

export default async function CertificatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('institution_id')
    .eq('id', user.id)
    .single();

  const institutionId = userData?.institution_id;
  if (!institutionId) return <p className="p-8">No institution found.</p>;

  const [templates, certificates, assignments] = await Promise.all([
    getCertificateTemplates(supabase, institutionId),
    getIssuedCertificates(supabase, institutionId),
    getCourseCertificateAssignments(supabase, institutionId),
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
    />
  );
}
