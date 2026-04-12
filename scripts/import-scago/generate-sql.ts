import crypto from 'crypto';
import type { ParsedModule } from './types';

// ─── SQL escaping ──────────────────────────────────────────────────────────────

export function sqlStr(s: string): string {
  if (s.includes("'") || s.includes('\\')) {
    const tag = 'SQLDQ';
    if (!s.includes(`$${tag}$`)) {
      return `$${tag}$${s}$${tag}$`;
    }
    return `'${s.replace(/'/g, "''")}'`;
  }
  return `'${s}'`;
}

// ─── SQL generator ─────────────────────────────────────────────────────────────

export function generateSQL(modules: ParsedModule[], institutionId: string): string {
  const lines: string[] = [];

  lines.push('-- ============================================================');
  lines.push('-- SCAGO LMS — Modules 1–13 seed');
  lines.push(`-- Institution: ${institutionId}`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('-- ============================================================');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  let totalCourses = 0;
  let totalLessons = 0;
  let totalSlides = 0;
  let totalBlocks = 0;

  for (const mod of modules) {
    const { def, lessons } = mod;
    const courseId = crypto.randomUUID();
    const moduleId = crypto.randomUUID();

    totalCourses++;

    lines.push(`-- ──────────────────────────────────────────────────────────`);
    lines.push(`-- Module ${def.number}: ${def.title}`);
    lines.push(`-- ──────────────────────────────────────────────────────────`);
    lines.push('');

    // Course
    lines.push(`INSERT INTO courses (id, title, slug, description, institution_id, status, thumbnail_url, is_published, category_id)`);
    lines.push(`VALUES (`);
    lines.push(`  '${courseId}',`);
    lines.push(`  ${sqlStr(def.title)},`);
    lines.push(`  ${sqlStr(def.slug)},`);
    lines.push(`  ${sqlStr(`Module ${def.number} of the SCAGO Sickle Cell Disease Education Program.`)},`);
    lines.push(`  '${institutionId}',`);
    lines.push(`  'published',`);
    lines.push(`  NULL,`);
    lines.push(`  true,`);
    lines.push(`  NULL`);
    lines.push(`);`);
    lines.push('');

    // Module (one per course)
    lines.push(`INSERT INTO modules (id, course_id, institution_id, title, description, order_index, is_published)`);
    lines.push(`VALUES (`);
    lines.push(`  '${moduleId}',`);
    lines.push(`  '${courseId}',`);
    lines.push(`  '${institutionId}',`);
    lines.push(`  ${sqlStr(def.title)},`);
    lines.push(`  ${sqlStr(`Module ${def.number}: ${def.title}`)},`);
    lines.push(`  0,`);
    lines.push(`  true`);
    lines.push(`);`);
    lines.push('');

    // Lessons
    for (let li = 0; li < lessons.length; li++) {
      const lesson = lessons[li];
      const lessonId = crypto.randomUUID();

      totalLessons++;

      lines.push(`-- Lesson ${li}: ${lesson.title}`);
      lines.push(`INSERT INTO lessons (id, course_id, module_id, title, order_index, content_type, is_required, institution_id)`);
      lines.push(`VALUES (`);
      lines.push(`  '${lessonId}',`);
      lines.push(`  '${courseId}',`);
      lines.push(`  '${moduleId}',`);
      lines.push(`  ${sqlStr(lesson.title)},`);
      lines.push(`  ${li},`);
      lines.push(`  'blocks',`);
      lines.push(`  true,`);
      lines.push(`  '${institutionId}'`);
      lines.push(`);`);
      lines.push('');

      // Slides
      for (let si = 0; si < lesson.slides.length; si++) {
        const slide = lesson.slides[si];
        const slideId = crypto.randomUUID();

        totalSlides++;

        const slideTitle = slide.title || `${lesson.title} - Slide ${si + 1}`;

        lines.push(`-- Slide ${si}`);
        lines.push(`INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)`);
        lines.push(`VALUES (`);
        lines.push(`  '${slideId}',`);
        lines.push(`  '${lessonId}',`);
        lines.push(`  'content',`);
        lines.push(`  ${sqlStr(slideTitle)},`);
        lines.push(`  ${si},`);
        lines.push(`  'published',`);
        lines.push(`  '{}'`);
        lines.push(`);`);
        lines.push('');

        // Blocks
        for (let bi = 0; bi < slide.blocks.length; bi++) {
          const block = slide.blocks[bi];
          const blockId = crypto.randomUUID();

          totalBlocks++;

          const dataJson = JSON.stringify(block.data)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "''");

          lines.push(`INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)`);
          lines.push(`VALUES (`);
          lines.push(`  '${blockId}',`);
          lines.push(`  '${lessonId}',`);
          lines.push(`  '${slideId}',`);
          lines.push(`  '${institutionId}',`);
          lines.push(`  '${block.kind}',`);
          lines.push(`  '${dataJson}'::jsonb,`);
          lines.push(`  ${bi},`);
          lines.push(`  true,`);
          lines.push(`  '{}',`);
          lines.push(`  1`);
          lines.push(`);`);
          lines.push('');
        }
      }
    }
  }

  lines.push('COMMIT;');
  lines.push('');
  lines.push(`-- Summary: ${totalCourses} courses, ${totalLessons} lessons, ${totalSlides} slides, ${totalBlocks} blocks`);
  lines.push('');

  return lines.join('\n');
}
