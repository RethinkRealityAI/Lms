import type { SupabaseClient } from '@supabase/supabase-js';
import type { Program, ProgramWithCourses } from '@/types';

/** All programs for an institution, each with its ordered course list. */
export async function getPrograms(
  supabase: SupabaseClient,
  institutionId: string,
): Promise<ProgramWithCourses[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*, program_courses(order_index, course:courses(id, title))')
    .eq('institution_id', institutionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    ...p,
    courses: (p.program_courses ?? [])
      .filter((pc: any) => pc.course)
      .map((pc: any) => ({ id: pc.course.id, title: pc.course.title, order_index: pc.order_index ?? 0 }))
      .sort((a: any, b: any) => a.order_index - b.order_index),
  })) as ProgramWithCourses[];
}

export async function createProgram(
  supabase: SupabaseClient,
  input: { institution_id: string; title: string; description?: string | null; certificate_template_id?: string | null },
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .insert({
      institution_id: input.institution_id,
      title: input.title,
      description: input.description ?? null,
      certificate_template_id: input.certificate_template_id ?? null,
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
  changes: Partial<Pick<Program, 'title' | 'description' | 'certificate_template_id'>>,
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
    .not('program_id', 'is', null);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { program_id: string }[]) {
    counts[row.program_id] = (counts[row.program_id] ?? 0) + 1;
  }
  return counts;
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
  const programs = await getPrograms(supabase, institutionId);
  if (programs.length === 0) return [];

  const { data: certs, error } = await supabase
    .from('certificates')
    .select('course_id, program_id')
    .eq('user_id', userId);
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
