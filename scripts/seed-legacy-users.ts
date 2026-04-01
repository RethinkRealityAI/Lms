/**
 * seed-legacy-users.ts
 *
 * Reads users.csv and user-completions.csv from ~/Downloads,
 * joins on email, deduplicates, and outputs a SQL INSERT for the legacy_users table.
 *
 * Usage: npx tsx scripts/seed-legacy-users.ts
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const INSTITUTION_ID = '725f40e5-a317-4b8f-80b8-1df6cf3bbe2a';

const USERS_CSV = path.resolve(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'users.csv');
const COMPLETIONS_CSV = path.resolve(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'user-completions.csv');
const OUTPUT_SQL = path.resolve(__dirname, 'import-scorm/output/legacy-users-seed.sql');

// Escape a string for SQL single-quoted literal
function sqlEsc(val: string | null | undefined): string {
  if (val == null || val === '') return 'NULL';
  // Replace single quotes with two single quotes
  const escaped = val.replace(/'/g, "''").trim();
  return `'${escaped}'`;
}

function sqlNum(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return 'NULL';
  return String(val);
}

function sqlTimestamp(val: string | null | undefined): string {
  if (val == null || val === '') return 'NULL';
  return `'${val.trim()}'`;
}

interface UserRow {
  'email (required)': string;
  'username (optional)': string;
  'firstname (optional)': string;
  'lastname (optional)': string;
  'roles (optional)': string;
  dateregistered: string;
  'password (optional)': string;
  'externalid (optional)': string;
  'occupation (optional)': string;
  'affiliation (optional)': string;
  'country (optional)': string;
}

interface CompletionRow {
  'User Id': string;
  'User Name': string;
  'Full Name': string;
  Courses: string;
  'Avg Progress': string;
  'Avg Progress (Percent)': string;
  'Avg Score': string;
  Completions: string;
  'Completed (Percent)': string;
}

// Parse CSV file
function parseCSV<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = Papa.parse<T>(content, {
    header: true,
    skipEmptyLines: true,
  });
  if (result.errors.length > 0) {
    console.warn(`Warnings parsing ${path.basename(filePath)}:`, result.errors.slice(0, 5));
  }
  return result.data;
}

function main() {
  console.log('Reading CSVs...');
  const users = parseCSV<UserRow>(USERS_CSV);
  const completions = parseCSV<CompletionRow>(COMPLETIONS_CSV);

  console.log(`  users.csv: ${users.length} rows`);
  console.log(`  user-completions.csv: ${completions.length} rows`);

  // Build completion lookup by email (lowercase)
  const completionMap = new Map<string, CompletionRow>();
  for (const c of completions) {
    const email = (c['User Name'] || '').trim().toLowerCase();
    if (email) {
      // Keep first occurrence
      if (!completionMap.has(email)) {
        completionMap.set(email, c);
      }
    }
  }

  // Deduplicate users by email, merge with completions
  const seen = new Set<string>();
  const merged: Array<{
    email: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    roles: string | null;
    occupation: string | null;
    affiliation: string | null;
    country: string | null;
    date_registered: string | null;
    external_id: string | null;
    avg_progress: number;
    avg_score: number | null;
    completions: number;
    completed_percent: number;
  }> = [];

  let withCompletion = 0;
  let withoutCompletion = 0;

  for (const u of users) {
    const email = (u['email (required)'] || '').trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);

    const comp = completionMap.get(email);

    const firstName = (u['firstname (optional)'] || '').trim() || null;
    const lastName = (u['lastname (optional)'] || '').trim() || null;
    let fullName: string | null = null;

    if (comp) {
      withCompletion++;
      fullName = (comp['Full Name'] || '').trim() || null;
    }
    // Fallback: construct from first/last
    if (!fullName && (firstName || lastName)) {
      fullName = [firstName, lastName].filter(Boolean).join(' ');
    }

    const avgProgress = comp ? parseFloat(comp['Avg Progress (Percent)']) || 0 : 0;
    const avgScoreRaw = comp ? parseFloat(comp['Avg Score']) : NaN;
    const avgScore = isNaN(avgScoreRaw) ? null : avgScoreRaw;
    const completionsCount = comp ? parseInt(comp['Completions'], 10) || 0 : 0;
    const completedPercent = comp ? parseFloat(comp['Completed (Percent)']) || 0 : 0;

    merged.push({
      email,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      roles: (u['roles (optional)'] || '').trim() || null,
      occupation: (u['occupation (optional)'] || '').trim() || null,
      affiliation: (u['affiliation (optional)'] || '').trim() || null,
      country: (u['country (optional)'] || '').trim() || null,
      date_registered: (u.dateregistered || '').trim() || null,
      external_id: (u['externalid (optional)'] || '').trim() || null,
      avg_progress: avgProgress,
      avg_score: avgScore,
      completions: completionsCount,
      completed_percent: completedPercent,
    });

    if (!comp) withoutCompletion++;
  }

  console.log(`\n--- Results ---`);
  console.log(`Total unique users after dedup: ${merged.length}`);
  console.log(`With completion data: ${withCompletion}`);
  console.log(`Without completion data: ${withoutCompletion}`);

  // Generate SQL
  const columns = [
    'institution_id', 'email', 'full_name', 'first_name', 'last_name',
    'roles', 'occupation', 'affiliation', 'country', 'date_registered',
    'external_id', 'avg_progress', 'avg_score', 'completions', 'completed_percent',
  ];

  const valueRows = merged.map((r) => {
    const vals = [
      `'${INSTITUTION_ID}'`,
      sqlEsc(r.email),
      sqlEsc(r.full_name),
      sqlEsc(r.first_name),
      sqlEsc(r.last_name),
      sqlEsc(r.roles),
      sqlEsc(r.occupation),
      sqlEsc(r.affiliation),
      sqlEsc(r.country),
      sqlTimestamp(r.date_registered),
      sqlEsc(r.external_id),
      sqlNum(r.avg_progress),
      sqlNum(r.avg_score),
      sqlNum(r.completions),
      sqlNum(r.completed_percent),
    ];
    return `  (${vals.join(', ')})`;
  });

  const sql = `-- Legacy users seed for GANSID institution
-- Generated: ${new Date().toISOString()}
-- Total: ${merged.length} users

INSERT INTO public.legacy_users (${columns.join(', ')})
VALUES
${valueRows.join(',\n')}
ON CONFLICT (institution_id, email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  roles = EXCLUDED.roles,
  occupation = EXCLUDED.occupation,
  affiliation = EXCLUDED.affiliation,
  country = EXCLUDED.country,
  date_registered = EXCLUDED.date_registered,
  external_id = EXCLUDED.external_id,
  avg_progress = EXCLUDED.avg_progress,
  avg_score = EXCLUDED.avg_score,
  completions = EXCLUDED.completions,
  completed_percent = EXCLUDED.completed_percent;
`;

  fs.writeFileSync(OUTPUT_SQL, sql, 'utf-8');
  console.log(`\nSQL written to: ${OUTPUT_SQL}`);
}

main();
