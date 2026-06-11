import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant/server';
import { getSurveyTemplates } from '@/lib/db/survey-templates';
import { getSurveyAssignments } from '@/lib/db/survey-assignments';
import { getPrograms } from '@/lib/db/programs';
import { SurveysManager } from '@/components/admin/surveys-manager';

export const dynamic = 'force-dynamic';

export default async function SurveysPage() {
  const supabase = await createClient();
  const { institutionId, institutionSlug } = await getTenantContext();

  if (!institutionId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-500">
        No institution context — open this page from your institution&apos;s admin URL.
      </div>
    );
  }

  const [templates, assignments, programs] = await Promise.all([
    getSurveyTemplates(supabase, institutionId),
    getSurveyAssignments(supabase, institutionId),
    getPrograms(supabase, institutionId).catch(() => []),
  ]);

  // Courses: id, title, display_order, completion_survey_template_id
  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, title, display_order, completion_survey_template_id')
    .eq('institution_id', institutionId)
    .is('deleted_at', null)
    .order('display_order', { ascending: true, nullsFirst: false });

  const courses = ((coursesData ?? []) as Array<{
    id: string;
    title: string;
    display_order: number | null;
    completion_survey_template_id: string | null;
  }>).sort((a, b) => {
    const ao = a.display_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.display_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.title.localeCompare(b.title);
  });

  return (
    <SurveysManager
      institutionId={institutionId}
      institutionSlug={institutionSlug ?? 'gansid'}
      initialTemplates={templates}
      initialAssignments={assignments}
      courses={courses}
      programs={programs}
    />
  );
}
