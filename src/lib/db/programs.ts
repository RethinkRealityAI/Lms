import type { SupabaseClient } from '@supabase/supabase-js';
import type { Program, ProgramWithCourses } from '@/types';

/**
 * All programs for an institution, each with its ordered course list.
 * Soft-deleted courses are always excluded; pass `publishedOnly` for progress
 * displays so the denominator matches award_program_certificates() (which
 * counts only live + published courses).
 */
export async function getPrograms(
  supabase: SupabaseClient,
  institutionId: string,
  opts: { publishedOnly?: boolean } = {},
): Promise<ProgramWithCourses[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*, program_courses(order_index, course:courses(id, title, is_published, deleted_at))')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    ...p,
    courses: (p.program_courses ?? [])
      .filter((pc: any) =>
        pc.course &&
        pc.course.deleted_at == null &&
        (!opts.publishedOnly || pc.course.is_published),
      )
      .map((pc: any) => ({ id: pc.course.id, title: pc.course.title, order_index: pc.order_index ?? 0 }))
      .sort((a: any, b: any) => a.order_index - b.order_index),
  })) as ProgramWithCourses[];
}

export async function createProgram(
  supabase: SupabaseClient,
  input: {
    institution_id: string;
    title: string;
    description?: string | null;
    certificate_template_id?: string | null;
    sequential?: boolean;
    program_certificate_only?: boolean;
  },
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .insert({
      institution_id: input.institution_id,
      title: input.title,
      description: input.description ?? null,
      certificate_template_id: input.certificate_template_id ?? null,
      sequential: input.sequential ?? false,
      program_certificate_only: input.program_certificate_only ?? false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Program;
}

export async function updateProgram(
  supabase: SupabaseClient,
  institutionId: string,
  id: string,
  changes: Partial<Pick<Program, 'title' | 'description' | 'certificate_template_id'>>
    & { sequential?: boolean; program_certificate_only?: boolean },
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('institution_id', institutionId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Program;
}

/**
 * True when the given course belongs to at least one program that suppresses
 * per-course certificates (`program_certificate_only`). Drives the student
 * viewer's completion-slide copy + celebration: a suppressed course shows
 * "module complete" rather than promising a per-course certificate, and the
 * program certificate (not the course one) is what gets celebrated. Read-only;
 * fails closed (false) so a query error never hides GANSID's course certs.
 */
export async function isCourseCertificateSuppressed(
  supabase: SupabaseClient,
  courseId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('program_courses')
    .select('program:programs!inner(program_certificate_only)')
    .eq('course_id', courseId);
  if (error) throw error;
  return (data ?? []).some((row: any) => {
    const prog = Array.isArray(row.program) ? row.program[0] : row.program;
    return prog?.program_certificate_only === true;
  });
}

export async function deleteProgram(
  supabase: SupabaseClient,
  institutionId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', id)
    .eq('institution_id', institutionId);
  if (error) throw error;
}

/** Replace a program's course membership with the given ordered list. */
export async function setProgramCourses(
  supabase: SupabaseClient,
  institutionId: string,
  programId: string,
  courseIds: string[],
): Promise<void> {
  // Verify the program belongs to this institution before touching membership
  const { data: program, error: progErr } = await supabase
    .from('programs')
    .select('id')
    .eq('id', programId)
    .eq('institution_id', institutionId)
    .maybeSingle();
  if (progErr) throw progErr;
  if (!program) throw new Error('Program not found in this institution');

  const { error: delErr } = await supabase.from('program_courses').delete().eq('program_id', programId);
  if (delErr) throw delErr;
  if (courseIds.length > 0) {
    const rows = courseIds.map((course_id, i) => ({ program_id: programId, course_id, order_index: i }));
    const { error: insErr } = await supabase.from('program_courses').insert(rows);
    if (insErr) throw insErr;
  }
}

/**
 * Retroactively award program certificates to every user who already holds
 * course certificates for all (live, published) courses in the program.
 * Admin-only — enforced server-side by the RPC. Returns the number awarded.
 */
export async function backfillProgramCertificates(
  supabase: SupabaseClient,
  programId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('backfill_program_certificates', { p_program_id: programId });
  if (error) throw error;
  return (data as number) ?? 0;
}

/** Number of users holding each program's certificate (admin dashboards). */
export async function getProgramCompletionCounts(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('certificates')
    .select('program_id')
    .eq('institution_id', institutionId)
    .not('program_id', 'is', null)
    .is('revoked_at', null);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { program_id: string }[]) {
    counts[row.program_id] = (counts[row.program_id] ?? 0) + 1;
  }
  return counts;
}

export interface NextProgramCourse {
  courseId: string;
  courseTitle: string;
  programId: string;
  programTitle: string;
}

/**
 * The next course after `courseId` in whichever program(s) contain it — used
 * by the completion/survey pages to offer "Continue to next module" instead
 * of stranding a student at "Back to Dashboard" once a course is finished.
 * Only considers live (non-deleted) + published courses, matching what the
 * student can actually navigate into. Certified courses are skipped (the
 * student already holds a certificate for them) so a student who finished
 * courses out of order still gets pointed at real remaining work. Returns
 * the first match across the course's program memberships, or null if this
 * course is the last (or only) one in every program it belongs to.
 */
export async function getNextProgramCourse(
  supabase: SupabaseClient,
  courseId: string,
  userId: string,
): Promise<NextProgramCourse | null> {
  const { data: pcs, error: pcsErr } = await supabase
    .from('program_courses')
    .select('program_id, order_index, programs(title)')
    .eq('course_id', courseId);
  if (pcsErr) throw pcsErr;
  if (!pcs || pcs.length === 0) return null;

  const programIds = [...new Set(pcs.map((pc: any) => pc.program_id as string))];

  const { data: allPcs, error: allErr } = await supabase
    .from('program_courses')
    .select('program_id, order_index, course:courses(id, title, is_published, deleted_at)')
    .in('program_id', programIds)
    .order('order_index', { ascending: true });
  if (allErr) throw allErr;

  const { data: certs, error: certErr } = await supabase
    .from('certificates')
    .select('course_id')
    .eq('user_id', userId)
    .is('revoked_at', null);
  if (certErr) throw certErr;
  const certified = new Set((certs ?? []).map((c: any) => c.course_id as string));

  const normalized = (allPcs ?? []).map((row: any) => ({
    program_id: row.program_id as string,
    course: (Array.isArray(row.course) ? row.course[0] : row.course) ?? null,
  }));

  for (const pc of pcs as any[]) {
    const programTitle = (Array.isArray(pc.programs) ? pc.programs[0] : pc.programs)?.title ?? 'Program';
    const seq = normalized.filter(row => row.program_id === pc.program_id);
    const myIdx = seq.findIndex(row => row.course?.id === courseId);
    if (myIdx === -1) continue;

    const next = seq.slice(myIdx + 1).find(row =>
      row.course &&
      row.course.deleted_at == null &&
      row.course.is_published &&
      !certified.has(row.course.id),
    );
    if (next?.course) {
      return {
        courseId: next.course.id,
        courseTitle: next.course.title,
        programId: pc.program_id,
        programTitle,
      };
    }
  }
  return null;
}

export interface ProgramProgress extends ProgramWithCourses {
  completedCourseIds: string[];
  totalCourses: number;
  earnedCertificate: boolean;
}

/**
 * Programs in the institution with the user's per-course completion
 * (a course counts as complete once its certificate is issued).
 */
export async function getProgramsWithProgress(
  supabase: SupabaseClient,
  institutionId: string,
  userId: string,
): Promise<ProgramProgress[]> {
  // publishedOnly keeps the progress denominator in sync with the award trigger,
  // so a program with an unpublished course can still reach 100%.
  const programs = await getPrograms(supabase, institutionId, { publishedOnly: true });
  if (programs.length === 0) return [];

  const { data: certs, error } = await supabase
    .from('certificates')
    .select('course_id, program_id')
    .eq('user_id', userId)
    .is('revoked_at', null);
  if (error) throw error;

  const completedCourses = new Set(
    (certs ?? []).filter((c: any) => c.course_id).map((c: any) => c.course_id as string),
  );
  const earnedPrograms = new Set(
    (certs ?? []).filter((c: any) => c.program_id).map((c: any) => c.program_id as string),
  );

  return programs.map(p => ({
    ...p,
    completedCourseIds: p.courses.map(c => c.id).filter(id => completedCourses.has(id)),
    totalCourses: p.courses.length,
    earnedCertificate: earnedPrograms.has(p.id),
  }));
}
