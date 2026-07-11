#!/usr/bin/env node
/**
 * Certificate-attainability audit — READ-ONLY.
 *
 * For every published, non-deleted course (all institutions), replicates the
 * student viewer's completion rules (src/components/student/course-viewer.tsx)
 * and flags anything that would prevent a real student from reaching 100%
 * completion and receiving a certificate:
 *
 *   1. Visible slides for students = deleted_at IS NULL AND status = 'published'
 *      (the viewer only filters deleted_at; RLS enforces the published filter).
 *   2. Rendered pages = visible slides that are canvas-type or have blocks,
 *      plus a trailing page of blocks with slide_id NULL. Special case: a lesson
 *      with ZERO visible slides but ≥1 block renders ALL its blocks as one page.
 *      A lesson with zero visible slides AND zero blocks renders a synthesized
 *      fallback block and IS completable (warning only).
 *   3. Quiz gate: rendered quiz_inline blocks with a gated question type that
 *      pass isQuizSatisfiable must be answered correctly. (Faithful port of
 *      src/lib/content/blocks/quiz-inline/validation.ts — unsatisfiable quizzes
 *      are EXCLUDED from the gate by the viewer, so they are warnings, not blockers.)
 *   4. Per-slide gate: image_gallery with data.requireAllClicked === true blocks
 *      Next until every url-bearing image is opened. Zero url-bearing images →
 *      onComplete can never fire → slide is bricked. Also bricked (extra checks
 *      beyond the base rule, from image-gallery/viewer.tsx): mode 'hotspot'
 *      (HotspotView never registers clicks) and enableLightbox === false without
 *      clickForMore (open handler is undefined, clicks never register).
 *   5. Certificate template must resolve: course_certificate_templates row OR
 *      institution-default certificate_templates(is_default = true).
 *   6. If courses.completion_survey_required, a survey template must resolve:
 *      courses.completion_survey_template_id → survey_assignments scope='course'
 *      → survey_assignments scope='all_courses' (institution default).
 *
 * Usage: node scripts/audit-cert-attainability.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1); }

const supabase = createClient(URL_, KEY, { auth: { persistSession: false } });

/** Fetch every row of a query, paging past the 1000-row PostgREST limit. READ-ONLY. */
async function fetchAll(table, select, applyFilters) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1);
    if (applyFilters) q = applyFilters(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

// ── Faithful port of src/lib/content/blocks/quiz-inline/validation.ts ─────────
const GATED_QUIZ_TYPES = new Set(['multiple_choice', 'true_false', 'categorize', 'select_all']);
const isGatedQuizType = (t) => !!t && GATED_QUIZ_TYPES.has(t);

function parseSelectAllCorrect(ca) {
  const parts = Array.isArray(ca) ? ca.map((v) => String(v)) : String(ca ?? '').split('; ');
  return parts.map((s) => s.trim()).filter(Boolean);
}

function getQuizConfigError(data) {
  if (!data) return null;
  const type = data.question_type;
  const options = (data.options ?? []).map((o) => String(o).trim());

  if (type === 'multiple_choice' || type === 'true_false') {
    const ca = typeof data.correct_answer === 'string' ? data.correct_answer.trim() : '';
    if (!ca) return 'No correct answer is selected.';
    if (!options.includes(ca)) return 'The correct answer does not match any of the options.';
    return null;
  }
  if (type === 'select_all') {
    const tokens = parseSelectAllCorrect(data.correct_answer);
    if (tokens.length === 0) return 'No correct options are selected.';
    if (tokens.some((t) => !options.includes(t))) return 'One or more correct answers do not match any option.';
    return null;
  }
  if (type === 'categorize') {
    const cats = data.categories ?? [];
    const hasItems = cats.some((c) => (c.items ?? []).length > 0);
    if (cats.length === 0 || !hasItems) return 'No categories or items are configured.';
    return null;
  }
  if (type === 'swipe') return null;
  return 'No question type is set, so this block renders as a broken placeholder.';
}
const isQuizSatisfiable = (data) => getQuizConfigError(data) === null;

// ── requireAllClicked gallery satisfiability (image-gallery/viewer.tsx) ───────
function galleryBrickReason(data) {
  if (data?.requireAllClicked !== true) return null;
  const urlImages = (Array.isArray(data.images) ? data.images : []).filter((i) => i && i.url);
  if (urlImages.length === 0) {
    return 'unsatisfiable requireAllClicked gallery: images array is empty or has no url-bearing entries (viewer drops url-less entries; onComplete can never fire)';
  }
  // Extra checks derived from viewer.tsx beyond the base rule:
  const mode = data.mode ?? (urlImages.length > 1 ? 'gallery' : 'single');
  if (mode === 'hotspot') {
    return 'unsatisfiable requireAllClicked gallery: mode is "hotspot" (HotspotView is self-contained and never registers image clicks)';
  }
  const lightboxEnabled = data.enableLightbox !== false || data.clickForMore === true;
  if (!lightboxEnabled) {
    return 'unsatisfiable requireAllClicked gallery: enableLightbox is false and clickForMore is not true (no click handler is wired, views can never be registered)';
  }
  return null;
}

// ── Replicate currentSlides from course-viewer.tsx ────────────────────────────
/** Returns array of { slideLabel, blocks } pages exactly as a student sees them. */
function buildRenderedPages(visibleSlides, blocks) {
  const pages = [];
  if (visibleSlides.length > 0 && blocks.some((b) => b.slide_id)) {
    const bySlide = {};
    for (const b of blocks) {
      const sid = b.slide_id ?? '__no_slide__';
      (bySlide[sid] ??= []).push(b);
    }
    const sorted = [...visibleSlides].sort((a, b) => a.order_index - b.order_index);
    sorted.forEach((s, i) => {
      const sBlocks = bySlide[s.id] ?? [];
      if (s.slide_type === 'canvas' || sBlocks.length > 0) {
        pages.push({ slideLabel: `slide ${i + 1}${s.title ? ` "${s.title}"` : ''} (${s.id})`, settings: s.settings, blocks: sBlocks });
      }
    });
    if (bySlide['__no_slide__']?.length) {
      pages.push({ slideLabel: 'no-slide fallback page', settings: undefined, blocks: bySlide['__no_slide__'] });
    }
  } else if (blocks.length > 0) {
    // Zero visible slides (or no block carries a slide_id) → ALL blocks render as one page
    pages.push({ slideLabel: 'single fallback page (all blocks)', settings: undefined, blocks });
  }
  // blocks.length === 0 → synthesized fallback block; completable (handled by caller as warning)
  return pages;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const institutions = await fetchAll('institutions', 'id, name, slug');
  const instById = new Map(institutions.map((i) => [i.id, i]));

  const courses = await fetchAll(
    'courses',
    'id, title, institution_id, completion_survey_required, completion_survey_template_id',
    (q) => q.eq('is_published', true).is('deleted_at', null),
  );
  const courseIds = courses.map((c) => c.id);
  if (courseIds.length === 0) { console.log('No published courses found.'); return; }

  const lessons = await fetchAll('lessons', 'id, course_id, title, order_index',
    (q) => q.in('course_id', courseIds).is('deleted_at', null).order('order_index', { ascending: true }));
  const lessonIds = lessons.map((l) => l.id);

  const slides = lessonIds.length
    ? await fetchAll('slides', 'id, lesson_id, order_index, title, slide_type, status, deleted_at, settings',
        (q) => q.in('lesson_id', lessonIds))
    : [];
  const blocks = lessonIds.length
    ? await fetchAll('lesson_blocks', 'id, lesson_id, slide_id, block_type, data',
        (q) => q.in('lesson_id', lessonIds).order('order_index', { ascending: true }))
    : [];

  const certAssignments = await fetchAll('course_certificate_templates', 'course_id, template_id',
    (q) => q.in('course_id', courseIds));
  const defaultCertTemplates = await fetchAll('certificate_templates', 'id, institution_id',
    (q) => q.eq('is_default', true));
  const surveyAssignments = await fetchAll('survey_assignments', 'institution_id, scope, course_id, survey_template_id');
  const surveyTemplates = await fetchAll('survey_templates', 'id');
  const surveyTemplateIds = new Set(surveyTemplates.map((t) => t.id));

  const lessonsByCourse = new Map();
  for (const l of lessons) (lessonsByCourse.get(l.course_id) ?? lessonsByCourse.set(l.course_id, []).get(l.course_id)).push(l);
  const slidesByLesson = new Map();
  for (const s of slides) (slidesByLesson.get(s.lesson_id) ?? slidesByLesson.set(s.lesson_id, []).get(s.lesson_id)).push(s);
  const blocksByLesson = new Map();
  for (const b of blocks) (blocksByLesson.get(b.lesson_id) ?? blocksByLesson.set(b.lesson_id, []).get(b.lesson_id)).push(b);
  const certAssignedCourses = new Set(certAssignments.map((r) => r.course_id));
  const instWithDefaultCert = new Set(defaultCertTemplates.map((t) => t.institution_id));

  const results = [];

  for (const course of courses) {
    const inst = instById.get(course.institution_id);
    const instName = inst ? (inst.slug ?? inst.name) : '(unknown institution)';
    const courseLessons = (lessonsByCourse.get(course.id) ?? []).sort((a, b) => a.order_index - b.order_index);
    const blockers = [];
    const warnings = [];

    if (courseLessons.length === 0) {
      warnings.push('course has no live lessons — issue_course_certificate has nothing to verify (0/0 lessons complete); verify RPC behavior for empty courses');
    }

    for (const lesson of courseLessons) {
      const lBlocks = blocksByLesson.get(lesson.id) ?? [];
      const allSlides = slidesByLesson.get(lesson.id) ?? [];
      const visibleSlides = allSlides.filter((s) => s.deleted_at == null && s.status === 'published');

      if (visibleSlides.length === 0 && lBlocks.length === 0) {
        warnings.push(`lesson "${lesson.title}": no visible slides and no blocks — renders synthesized fallback block (completable, but empty for students)`);
        continue;
      }
      if (visibleSlides.length === 0 && allSlides.some((s) => s.deleted_at == null) && lBlocks.length > 0) {
        warnings.push(`lesson "${lesson.title}": has only DRAFT (unpublished) slides — students see all ${lBlocks.length} blocks on one fallback page instead of the authored slides`);
      }

      const pages = buildRenderedPages(visibleSlides, lBlocks);

      for (const page of pages) {
        // Rule 4 — requireAllClicked galleries that can never be satisfied brick the slide
        for (const b of page.blocks) {
          if (b.block_type === 'image_gallery') {
            const reason = galleryBrickReason(b.data ?? {});
            if (reason) blockers.push(`lesson "${lesson.title}", ${page.slideLabel}: ${reason} [block ${b.id}]`);
          }
          // Rule 3 — gated+satisfiable quizzes gate but are answerable (fine).
          // Unsatisfiable gated-type quizzes are excluded from the gate by the
          // viewer (no brick) but render as never-correct content → warning.
          if (b.block_type === 'quiz_inline') {
            const qErr = getQuizConfigError(b.data ?? null);
            if (qErr && isGatedQuizType(b.data?.question_type)) {
              warnings.push(`lesson "${lesson.title}", ${page.slideLabel}: misconfigured quiz (${qErr}) — viewer excludes it from the completion gate, but students can never answer it correctly [block ${b.id}]`);
            } else if (qErr) {
              warnings.push(`lesson "${lesson.title}", ${page.slideLabel}: broken quiz block (${qErr}) [block ${b.id}]`);
            }
          }
        }
        // nav_url on a non-final page: primary footer button opens an external URL
        // instead of advancing; only keyboard arrows advance → near-brick on touch.
        const navUrl = page.settings?.nav_url;
        if (navUrl && String(navUrl).trim()) {
          warnings.push(`lesson "${lesson.title}", ${page.slideLabel}: settings.nav_url set ("${navUrl}") — footer button opens the URL instead of advancing; only keyboard arrow keys move forward (touch users effectively stuck)`);
        }
      }
    }

    // Rule 5 — certificate template resolution
    if (!certAssignedCourses.has(course.id) && !instWithDefaultCert.has(course.institution_id)) {
      blockers.push('no certificate template resolvable: no course_certificate_templates assignment AND institution has no default certificate template');
    }

    // Rule 6 — required completion survey resolution
    if (course.completion_survey_required === true) {
      let resolved = null;
      if (course.completion_survey_template_id) resolved = { id: course.completion_survey_template_id, via: 'course override' };
      if (!resolved) {
        const ca = surveyAssignments.find((a) => a.scope === 'course' && a.course_id === course.id);
        if (ca) resolved = { id: ca.survey_template_id, via: 'course assignment' };
      }
      if (!resolved) {
        const da = surveyAssignments.find((a) => a.scope === 'all_courses' && a.institution_id === course.institution_id);
        if (da) resolved = { id: da.survey_template_id, via: 'institution default' };
      }
      if (!resolved) {
        blockers.push('completion_survey_required is true but NO survey template resolves (no course override, course assignment, or institution default) — the required survey silently cannot be shown');
      } else if (!surveyTemplateIds.has(resolved.id)) {
        blockers.push(`completion_survey_required is true but the resolved survey template (${resolved.id}, via ${resolved.via}) does not exist in survey_templates`);
      }
    }

    results.push({
      course: course.title,
      institution: instName,
      lessonCount: courseLessons.length,
      blockers,
      warnings,
    });
  }

  // ── Detailed output ─────────────────────────────────────────────────────────
  console.log('CERTIFICATE ATTAINABILITY AUDIT — ' + new Date().toISOString());
  console.log(`Published courses audited: ${results.length}\n`);
  for (const r of results) {
    const status = r.blockers.length ? 'BLOCKED' : (r.warnings.length ? 'PASS (warnings)' : 'PASS');
    console.log(`── [${r.institution}] ${r.course} — ${r.lessonCount} lesson(s) — ${status}`);
    for (const b of r.blockers) console.log(`   BLOCKER: ${b}`);
    for (const w of r.warnings) console.log(`   warning: ${w}`);
  }

  // ── Summary table ───────────────────────────────────────────────────────────
  console.log('\n================= SUMMARY =================');
  const rows = results.map((r) => ({
    course: `[${r.institution}] ${r.course}`,
    status: r.blockers.length ? 'BLOCKED' : (r.warnings.length ? 'PASS*' : 'PASS'),
    blockers: r.blockers.length ? r.blockers.join(' | ') : (r.warnings.length ? `(warnings only: ${r.warnings.length})` : '—'),
  }));
  const w1 = Math.max(6, ...rows.map((r) => r.course.length));
  const w2 = Math.max(7, ...rows.map((r) => r.status.length));
  console.log(`${'course'.padEnd(w1)} | ${'status'.padEnd(w2)} | blockers`);
  console.log(`${'-'.repeat(w1)}-+-${'-'.repeat(w2)}-+---------`);
  for (const r of rows) console.log(`${r.course.padEnd(w1)} | ${r.status.padEnd(w2)} | ${r.blockers}`);

  const blocked = results.filter((r) => r.blockers.length);
  console.log(`\nTotal: ${results.length} course(s) — ${results.length - blocked.length} attainable, ${blocked.length} BLOCKED. (* = passes with warnings)`);
}

main().catch((err) => { console.error('AUDIT FAILED:', err.message ?? err); process.exit(1); });
