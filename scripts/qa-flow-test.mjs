#!/usr/bin/env node
/**
 * QA flow-test helper — manages the disposable student account used to test the
 * full completion → survey → certificate flow end-to-end as a REAL student.
 *
 *   node scripts/qa-flow-test.mjs create [--slug scago]   → creates the QA student, prints credentials
 *   node scripts/qa-flow-test.mjs cleanup                  → deletes ALL rows for the QA student + the account
 *   node scripts/qa-flow-test.mjs status                   → shows what data currently exists for the QA student
 *
 * The account uses a FIXED email (qa.certflow.test@example.com) so cleanup is
 * idempotent. Uses the service-role key from .env.local (bypasses RLS) — this
 * touches the LIVE Supabase project, so always run `cleanup` when done.
 * Course-flow testing should use the designated Test Course only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QA_EMAIL = 'qa.certflow.test@example.com';
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

const authHeaders = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };
const rest = (p) => `${URL_}/rest/v1/${p}`;

async function findQaUser() {
  const r = await fetch(rest(`users?email=eq.${encodeURIComponent(QA_EMAIL)}&select=id,role,institution_id`), { headers: authHeaders });
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

// Every user-scoped table the flow can write to. Order matters only for readability.
const USER_TABLES = [
  'certificates', 'course_feedback_responses', 'survey_responses',
  'quiz_block_responses', 'progress', 'course_enrollments', 'analytics_events', 'course_reviews',
];

async function cmdCreate(slug = 'scago') {
  const existing = await findQaUser();
  if (existing) {
    console.log(`QA user already exists (${existing.id}). Run "cleanup" first for a fresh start,`);
    console.log('or reset the password by running cleanup + create.');
    process.exit(1);
  }
  const password = `QaTest-${Math.random().toString(36).slice(2, 10)}!7`;
  const r = await fetch(`${URL_}/auth/v1/admin/users`, {
    method: 'POST', headers: authHeaders,
    body: JSON.stringify({
      email: QA_EMAIL, password, email_confirm: true,
      user_metadata: { full_name: 'QA CertFlow Test', institution_slug: slug },
    }),
  });
  const j = await r.json();
  if (!r.ok) { console.error('Create failed:', JSON.stringify(j)); process.exit(1); }
  console.log('QA student created.');
  console.log(`  email:    ${QA_EMAIL}`);
  console.log(`  password: ${password}`);
  console.log(`  user_id:  ${j.id}`);
  console.log(`  tenant:   ${slug}`);
  console.log(`\nLog in at /${slug}/login, then run "cleanup" when the test is done.`);
}

async function cmdStatus() {
  const user = await findQaUser();
  if (!user) { console.log('No QA user exists. Clean.'); return; }
  console.log(`QA user: ${user.id} (role ${user.role})`);
  for (const t of USER_TABLES) {
    const r = await fetch(rest(`${t}?user_id=eq.${user.id}&select=id`), { headers: { ...authHeaders, Prefer: 'count=exact', Range: '0-0' } });
    const count = r.headers.get('content-range')?.split('/')[1] ?? '?';
    if (count !== '0') console.log(`  ${t}: ${count} row(s)`);
  }
}

async function cmdCleanup() {
  const user = await findQaUser();
  if (!user) { console.log('No QA user found — nothing to clean.'); return; }
  for (const t of USER_TABLES) {
    const r = await fetch(rest(`${t}?user_id=eq.${user.id}`), { method: 'DELETE', headers: authHeaders });
    if (!r.ok) console.error(`  WARN: delete from ${t} → HTTP ${r.status}`);
  }
  const r = await fetch(`${URL_}/auth/v1/admin/users/${user.id}`, { method: 'DELETE', headers: authHeaders });
  if (!r.ok) { console.error(`Auth user delete failed: HTTP ${r.status}`); process.exit(1); }
  // Verify
  const gone = !(await findQaUser());
  console.log(gone ? 'QA user and all associated data deleted. Clean.' : 'WARN: public.users row still present — check manually.');
}

const cmd = process.argv[2];
const slugArg = (process.argv.find((a) => a.startsWith('--slug=')) ?? '--slug=scago').split('=')[1];
if (cmd === 'create') await cmdCreate(slugArg);
else if (cmd === 'cleanup') await cmdCleanup();
else if (cmd === 'status') await cmdStatus();
else { console.log('Usage: node scripts/qa-flow-test.mjs <create [--slug=scago]|status|cleanup>'); process.exit(1); }
