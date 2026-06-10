/**
 * Import EdApp per-user course-completion data into legacy_course_completions.
 *
 * Usage:
 *   npx tsx scripts/import-legacy-completions/index.ts "<csv path>" [--dry-run]
 *
 * Reads .env.local for NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Uses the service-role key because RLS has no client write policy on this table.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith('--')) ?? '';
const isDryRun = args.includes('--dry-run');

if (!csvPath) {
  console.error(
    'Usage: npx tsx scripts/import-legacy-completions/index.ts "<csv path>" [--dry-run]'
  );
  process.exit(1);
}

// ── Supabase client (service-role) ────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in .env.local'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// ── CSV row interface ─────────────────────────────────────────────────────────

interface CsvRow {
  UserID: string;
  'User Details': string;
  Username: string;
  Email: string;
  'Groups/Sites': string;
  'First Name': string;
  'Last Name': string;
  CourseID: string;
  Course: string;
  Language: string;
  'Training Mode': string;
  'Due Date': string;
  'Date Completed': string;
  'Time Completed': string;
  'Completion Date': string;
  'Required Lessons Completed': string;
  'Required Lessons': string;
  'Time Spent': string;
  'Time Spent (h mm)': string;
  'Average Score': string;
  'Progress': string;
  'Progress (%)': string;
  'Progress (Percent)': string;
  'Full name': string;
  'Time Spent (minutes)': string;
  'User Status': string;
  'Assigned Status': string;
  SECONDARY_DISPLAY_NAME: string;
  'Completed Version': string;
  'Published Version': string;
  'Expiry Date': string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract module number from a title like "Module 5: ..." or "Module 5 - ..." */
function extractModuleNumber(title: string): number | null {
  const m = title.match(/module\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/** Parse "2025-07-23 16:02:28" → ISO string (treat as UTC). Returns null for empty. */
function parseCompletionDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return new Date(trimmed.replace(' ', 'T') + 'Z').toISOString();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Legacy Course Completions Import${isDryRun ? ' (DRY RUN)' : ''} ===\n`);

  // 1. Parse CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const parseResult = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0) {
    console.warn('CSV parse warnings:', parseResult.errors.slice(0, 5));
  }

  const rows = parseResult.data;
  console.log(`Parsed ${rows.length} CSV rows`);

  const distinctCsvUsers = new Set(rows.map((r) => r.UserID.trim())).size;
  console.log(`Distinct users in CSV: ${distinctCsvUsers}`);

  // 2. Resolve SCAGO institution id
  const { data: institutionData, error: instErr } = await supabase
    .from('institutions')
    .select('id, slug')
    .eq('slug', 'scago')
    .single();

  if (instErr || !institutionData) {
    console.error('Failed to resolve SCAGO institution:', instErr?.message);
    process.exit(1);
  }

  const institutionId: string = institutionData.id;
  console.log(`SCAGO institution id: ${institutionId}`);

  // 3. Build course map (module number → course id)
  const { data: coursesData, error: coursesErr } = await supabase
    .from('courses')
    .select('id, title')
    .eq('institution_id', institutionId)
    .is('deleted_at', null);

  if (coursesErr || !coursesData) {
    console.error('Failed to fetch courses:', coursesErr?.message);
    process.exit(1);
  }

  // Filter out "Test Course" titles
  const courseModuleMap = new Map<number, string>(); // moduleNum → course id
  for (const course of coursesData) {
    if (/test\s*course/i.test(course.title)) continue;
    const num = extractModuleNumber(course.title);
    if (num !== null) {
      courseModuleMap.set(num, course.id);
    }
  }

  console.log(`Loaded ${coursesData.length} courses; ${courseModuleMap.size} mapped by module number`);

  // 4. Fetch ALL legacy_users for the institution (paginate past 1000)
  const allLegacyUsers: Array<{ id: string; email: string; external_id: string | null }> = [];
  const PAGE_SIZE = 1000;
  let page = 0;

  while (true) {
    const { data: pageData, error: pageErr } = await supabase
      .from('legacy_users')
      .select('id, email, external_id')
      .eq('institution_id', institutionId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (pageErr) {
      console.error('Failed to fetch legacy_users:', pageErr.message);
      process.exit(1);
    }

    if (!pageData || pageData.length === 0) break;
    allLegacyUsers.push(...pageData);
    if (pageData.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`Loaded ${allLegacyUsers.length} legacy users from DB`);

  // Build lookup maps
  const legacyByExternalId = new Map<string, string>(); // external_id → legacy_user id
  const legacyByEmail = new Map<string, string>();       // email (lowercase) → legacy_user id

  for (const lu of allLegacyUsers) {
    if (lu.external_id) {
      legacyByExternalId.set(lu.external_id.trim(), lu.id);
    }
    if (lu.email) {
      legacyByEmail.set(lu.email.trim().toLowerCase(), lu.id);
    }
  }

  // 5. Build records
  interface CompletionRecord {
    institution_id: string;
    legacy_user_id: string;
    external_user_id: string;
    email: string;
    external_course_id: string;
    course_title: string;
    course_id: string | null;
    completed_at: string | null;
    progress_percent: number;
    lessons_completed: number | null;
    lessons_total: number | null;
    time_spent_minutes: number | null;
  }

  const records: CompletionRecord[] = [];
  const unmatchedEmails = new Set<string>();
  const unmappedCourseCounts = new Map<string, number>(); // course title → count
  let module14Count = 0;
  let completedCount = 0;
  let partialCount = 0;
  let zeroProgressCount = 0;
  let skippedNoUser = 0;

  for (const row of rows) {
    const userId = row.UserID.trim();
    const email = (row.Email || '').trim().toLowerCase();
    const courseId = row.CourseID.trim();
    const courseTitle = (row.Course || '').trim();

    // Resolve legacy user: external_id first, then email
    let legacyUserId = legacyByExternalId.get(userId) ?? legacyByEmail.get(email) ?? null;

    if (!legacyUserId) {
      unmatchedEmails.add(email || userId);
      skippedNoUser++;
      continue;
    }

    // Resolve course by module number
    const moduleNum = extractModuleNumber(courseTitle);
    let resolvedCourseId: string | null = null;

    if (moduleNum === 14) {
      // EdApp pseudo-course — expected unmapped
      module14Count++;
      resolvedCourseId = null;
    } else if (moduleNum !== null) {
      resolvedCourseId = courseModuleMap.get(moduleNum) ?? null;
      if (!resolvedCourseId) {
        // Unexpected unmapped (not module 14)
        const prev = unmappedCourseCounts.get(courseTitle) ?? 0;
        unmappedCourseCounts.set(courseTitle, prev + 1);
      }
    } else {
      // No module number at all
      const prev = unmappedCourseCounts.get(courseTitle) ?? 0;
      unmappedCourseCounts.set(courseTitle, prev + 1);
    }

    const completedAt = parseCompletionDate(row['Completion Date'] || '');
    const progressPct = Number(row['Progress (Percent)']) || 0;
    const lessonsCompleted = row['Required Lessons Completed'].trim() !== ''
      ? Number(row['Required Lessons Completed']) || null
      : null;
    const lessonsTotal = row['Required Lessons'].trim() !== ''
      ? Number(row['Required Lessons']) || null
      : null;
    const timeSpentMinutes = row['Time Spent (minutes)'].trim() !== ''
      ? Number(row['Time Spent (minutes)']) || null
      : null;

    if (completedAt) {
      completedCount++;
    } else if (progressPct > 0 && progressPct < 100) {
      partialCount++;
    } else if (progressPct === 0) {
      zeroProgressCount++;
    }

    records.push({
      institution_id: institutionId,
      legacy_user_id: legacyUserId,
      external_user_id: userId,
      email,
      external_course_id: courseId,
      course_title: courseTitle,
      course_id: resolvedCourseId,
      completed_at: completedAt,
      progress_percent: progressPct,
      lessons_completed: lessonsCompleted !== null && !isNaN(lessonsCompleted) ? lessonsCompleted : null,
      lessons_total: lessonsTotal !== null && !isNaN(lessonsTotal) ? lessonsTotal : null,
      time_spent_minutes: timeSpentMinutes !== null && !isNaN(timeSpentMinutes) ? timeSpentMinutes : null,
    });
  }

  const mappedToCourse = records.filter((r) => r.course_id !== null).length;
  const unmappedTotal = records.filter((r) => r.course_id === null).length;

  // 6. Upsert (unless dry run)
  let upsertedCount = 0;

  if (!isDryRun && records.length > 0) {
    const BATCH_SIZE = 200;
    const batches = Math.ceil(records.length / BATCH_SIZE);

    for (let i = 0; i < batches; i++) {
      const batch = records.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const { error: upsertErr } = await supabase
        .from('legacy_course_completions')
        .upsert(batch, { onConflict: 'legacy_user_id,external_course_id' });

      if (upsertErr) {
        console.error(`\nBatch ${i + 1}/${batches} FAILED: ${upsertErr.message}`);
        console.error('Aborting — no further batches will be written.');
        process.exit(1);
      }

      upsertedCount += batch.length;
      process.stdout.write(`  Upserted batch ${i + 1}/${batches} (${upsertedCount}/${records.length} rows)\r`);
    }

    process.stdout.write('\n');
  }

  // 7. Final report
  console.log('\n─── Import Report ───────────────────────────────────────');
  console.log(`Total CSV rows:               ${rows.length}`);
  console.log(`Distinct users in CSV:        ${distinctCsvUsers}`);
  console.log(`Users matched (legacy_users): ${distinctCsvUsers - unmatchedEmails.size}`);
  console.log(`Users unmatched (skipped):    ${unmatchedEmails.size}`);

  if (unmatchedEmails.size > 0) {
    console.log('\nUnmatched user emails/IDs:');
    for (const e of [...unmatchedEmails].sort()) {
      console.log(`  - ${e}`);
    }
  }

  console.log(`\nRows built (matched users):   ${records.length}`);
  console.log(`  → Mapped to a course:       ${mappedToCourse}`);
  console.log(`  → Unmapped (course_id null): ${unmappedTotal}`);
  console.log(`    of which Module 14 (CME):  ${module14Count}`);

  if (unmappedCourseCounts.size > 0) {
    console.log('\nOther unmapped course titles (non-Module-14):');
    for (const [title, count] of [...unmappedCourseCounts.entries()].sort()) {
      console.log(`  [${count}x] ${title}`);
    }
  }

  console.log(`\nCompletion status breakdown:`);
  console.log(`  Completed (has completion date): ${completedCount}`);
  console.log(`  Partial (0 < pct < 100):         ${partialCount}`);
  console.log(`  Zero progress (pct = 0):         ${zeroProgressCount}`);
  console.log(`  Skipped (no matching user):      ${skippedNoUser}`);

  if (!isDryRun) {
    console.log(`\nRows upserted to DB:          ${upsertedCount}`);
  } else {
    console.log(`\n[DRY RUN] No rows written to DB.`);
  }

  console.log('─────────────────────────────────────────────────────────\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
