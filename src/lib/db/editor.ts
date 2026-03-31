import type { SupabaseClient } from '@supabase/supabase-js';
import type { Slide } from '@/types';
import type { ModuleData, LessonData, BlockData } from '@/lib/stores/editor-store';

export interface EditorCourseData {
  course: {
    id: string;
    title: string;
    description: string | null;
    theme_overrides: Record<string, unknown>;
    status: string;
    institution_id: string;
  };
  modules: ModuleData[];
  lessonsByModule: Map<string, LessonData[]>;
  slidesByLesson: Map<string, Slide[]>;
  blocksBySlide: Map<string, BlockData[]>;
}

export async function loadEditorCourseData(
  supabase: SupabaseClient,
  courseId: string,
  institutionId: string
): Promise<EditorCourseData> {
  // Fetch course scoped to institution
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('id, title, description, theme_overrides, status, institution_id')
    .eq('id', courseId)
    .eq('institution_id', institutionId)
    .is('deleted_at', null)
    .single();

  if (courseErr || !course) throw new Error('Course not found or access denied');

  // Fetch modules for this course
  const { data: modulesRaw, error: modErr } = await supabase
    .from('modules')
    .select('id, title, description, course_id, order_index')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('order_index');

  if (modErr) throw modErr;
  const modules: ModuleData[] = (modulesRaw ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    title: m.title as string,
    description: (m.description as string | null) ?? undefined,
    course_id: m.course_id as string,
    order_index: m.order_index as number,
  }));

  // Fetch lessons via module_id — more reliable than course_id since newly
  // created lessons always have module_id set (course_id may be null on older rows).
  const moduleIds = modules.map((m) => m.id);
  const { data: lessonsRaw, error: lesErr } = moduleIds.length > 0
    ? await supabase
        .from('lessons')
        .select('id, title, description, module_id, course_id, order_index')
        .in('module_id', moduleIds)
        .is('deleted_at', null)
        .order('order_index')
    : { data: [], error: null };

  if (lesErr) throw lesErr;
  const lessons: LessonData[] = (lessonsRaw ?? []).map((l: Record<string, unknown>) => ({
    id: l.id as string,
    title: l.title as string,
    description: (l.description as string | null) ?? undefined,
    module_id: (l.module_id as string | null) ?? undefined,
    course_id: l.course_id as string,
    order_index: l.order_index as number,
  }));

  // Group lessons by module
  const lessonsByModule = new Map<string, LessonData[]>();
  for (const lesson of lessons) {
    const key = lesson.module_id ?? '__unassigned__';
    if (!lessonsByModule.has(key)) lessonsByModule.set(key, []);
    lessonsByModule.get(key)!.push(lesson);
  }

  // Fetch slides for all lessons
  const lessonIds = lessons.map((l) => l.id);
  const slidesByLesson = new Map<string, Slide[]>();

  if (lessonIds.length > 0) {
    const { data: slidesRaw, error: slideErr } = await supabase
      .from('slides')
      .select('*')
      .in('lesson_id', lessonIds)
      .is('deleted_at', null)
      .order('order_index');

    if (slideErr) throw slideErr;
    for (const slide of slidesRaw ?? []) {
      const key = slide.lesson_id as string;
      if (!slidesByLesson.has(key)) slidesByLesson.set(key, []);
      slidesByLesson.get(key)!.push(slide as Slide);
    }
  }

  // Fetch blocks for all slides
  const slideIds = Array.from(slidesByLesson.values()).flat().map((s) => s.id);
  const blocksBySlide = new Map<string, BlockData[]>();

  if (slideIds.length > 0) {
    const { data: blocksRaw, error: blockErr } = await supabase
      .from('lesson_blocks')
      .select('id, slide_id, block_type, data, order_index, is_visible')
      .in('slide_id', slideIds)
      .order('order_index');

    if (blockErr) throw blockErr;
    for (const block of blocksRaw ?? []) {
      const key = block.slide_id as string;
      if (!blocksBySlide.has(key)) blocksBySlide.set(key, []);
      blocksBySlide.get(key)!.push(block as BlockData);
    }
  }

  return {
    course,
    modules,
    lessonsByModule,
    slidesByLesson,
    blocksBySlide,
  };
}
