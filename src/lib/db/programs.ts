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
  id: string,
  changes: Partial<Pick<Program, 'title' | 'description' | 'certificate_template_id'>>,
): Promise<Program> {
  const { data, error } = await supabase
    .from('programs')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Program;
}

export async function deleteProgram(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) throw error;
}

/** Replace a program's course membership with the given ordered list. */
export async function setProgramCourses(
  supabase: SupabaseClient,
  programId: string,
  courseIds: string[],
): Promise<void> {
  const { error: delErr } = await supabase.from('program_courses').delete().eq('program_id', programId);
  if (delErr) throw delErr;
  if (courseIds.length > 0) {
    const rows = courseIds.map((course_id, i) => ({ program_id: programId, course_id, order_index: i }));
    const { error: insErr } = await supabase.from('program_courses').insert(rows);
    if (insErr) throw insErr;
  }
}
