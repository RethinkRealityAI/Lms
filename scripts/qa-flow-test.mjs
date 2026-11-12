#!/usr/bin/env node
/**
 * QA flow-test helper — manages the disposable student account used to test the
 * full completion → survey → certificate flow end-to-end as a REAL student.
 *
 *   node scripts/qa-flow-test.mjs create [--slug scago]   → creates the QA student, prints credentials
 *   node scripts/qa-flow-test.mjs cleanup                  → deletes ALL rows for the QA student + the account
 *   node scripts/qa-flow-test.mjs status                   → shows what data currently exists for the QA student
 *
 *   node scripts/qa-flow-test.mjs email --to=you@gmail.com [--slug=scago] [--reset]
 *       → signs up a FRESH alias (you+lmsqa<timestamp>@gmail.com) through the
 *         same public signup endpoint the website uses, so Supabase sends the
 *         real confirmation email through the real mail server. Reports
 *         sent / rate-limited / mail-server error with the reason. --reset also
 *         sends a password-reset email. Needs only the anon key.
 *   node scripts/qa-flow-test.mjs email-cleanup            → deletes every +lmsqa alias account
 *       (needs the service-role key; without it, prints the SQL to run instead)
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
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local'); process.exit(1); }
function requireServiceKey() {
  if (!KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local (needed for this command).'); process.exit(1); }
}

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

// ── Email delivery test ─────────────────────────────────────────────────────
// Every alias carries this tag so email-cleanup can find them all.
const EMAIL_QA_TAG = 'lmsqa';

// Where each portal lives (mirrors primaryHost in src/lib/tenant/branding.ts).
const PORTAL_ORIGIN = {
  scago: 'https://learn.sicklecellanemia.ca',
  gansid: 'https://org-lms.netlify.app',
};

function aliasFor(inbox) {
  const m = /^([^@\s+]+)(?:\+[^@\s]*)?@([^@\s]+\.[^@\s]+)$/.exec(inbox ?? '');
  if (!m) return null;
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  return `${m[1]}+${EMAIL_QA_TAG}${stamp}@${m[2]}`;
}

function diagnose(status, body) {
  const code = body?.error_code ?? body?.code ?? '';
  const msg = body?.msg ?? body?.message ?? body?.error_description ?? JSON.stringify(body);
  if (status === 429 || code === 'over_email_send_rate_limit') {
    return 'RATE LIMITED — the project hit its emails-per-hour cap. Raise it in Supabase → Authentication → Rate Limits ("Rate limit for sending emails"), or wait an hour.';
  }
  if (status >= 500) {
    return `MAIL SERVER ERROR — Supabase could not hand the email to the SMTP server (${msg}). Check Authentication → Emails → SMTP Settings; the auth logs show the SMTP reply (e.g. 535 = wrong username/password).`;
  }
  return `UNEXPECTED (${status} ${code}): ${msg}`;
}

async function authPost(pathname, payload) {
  const r = await fetch(`${URL_}/auth/v1/${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify(payload),
  });
  let body = null;
  try { body = await r.json(); } catch { /* empty body */ }
  return { status: r.status, body };
}

async function cmdEmail(slug) {
  if (!ANON_KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'); process.exit(1); }
  const to = (process.argv.find((a) => a.startsWith('--to=')) ?? '').slice(5);
  const alias = aliasFor(to);
  if (!alias) {
    console.error('Usage: node scripts/qa-flow-test.mjs email --to=you@gmail.com [--slug=scago] [--reset]');
    console.error('  --to must be an inbox you can read that supports +aliases (Gmail, Outlook.com, iCloud).');
    process.exit(1);
  }
  const origin = PORTAL_ORIGIN[slug];
  if (!origin) { console.error(`Unknown --slug=${slug} (expected: ${Object.keys(PORTAL_ORIGIN).join(', ')})`); process.exit(1); }

  let failed = false;
  console.log(`Signing up ${alias} on the ${slug.toUpperCase()} portal…`);
  const password = `QaMail-${Math.random().toString(36).slice(2, 10)}!7`;
  // Same request the website makes: metadata drives the email's branding,
  // redirect_to is where the confirmation link returns.
  const signup = await authPost(`signup?redirect_to=${encodeURIComponent(`${origin}/auth/callback`)}`, {
    email: alias,
    password,
    data: { full_name: 'LMS Email QA', institution_slug: slug },
  });
  if (signup.status === 200) {
    console.log(`  ✔ confirmation email SENT — Supabase's mail server accepted it.`);
  } else {
    failed = true;
    console.log(`  ✘ ${diagnose(signup.status, signup.body)}`);
  }

  if (!failed && process.argv.includes('--reset')) {
    const reset = await authPost(`recover?redirect_to=${encodeURIComponent(`${origin}/reset-password`)}`, { email: alias });
    if (reset.status === 200) console.log('  ✔ password-reset email SENT.');
    else { failed = true; console.log(`  ✘ reset: ${diagnose(reset.status, reset.body)}`); }
  }

  console.log('');
  if (!failed) {
    console.log(`Check ${to} for the email(s). Expect:`);
    console.log(`  • From "HCP E-learning" <tech@sicklecellanemia.ca>, ${slug.toUpperCase()} branding and logo`);
    console.log(`  • The link returns to ${origin}/${slug}/… (signed in)`);
  }
  console.log(`Then delete the test account: node scripts/qa-flow-test.mjs email-cleanup`);
  if (failed) process.exit(2);
}

async function cmdEmailCleanup() {
  const like = `%+${EMAIL_QA_TAG}%`;
  if (!KEY) {
    console.log('No service-role key here. Run this SQL instead (Supabase MCP execute_sql or the SQL editor):');
    console.log(`  delete from auth.users where email like '${like}' returning email;`);
    return;
  }
  const r = await fetch(rest(`users?email=like.${encodeURIComponent(`*+${EMAIL_QA_TAG}*`)}&select=id,email`), { headers: authHeaders });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length === 0) { console.log('No email-QA accounts found. Clean.'); return; }
  for (const u of rows) {
    const d = await fetch(`${URL_}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: authHeaders });
    console.log(`${d.ok ? 'deleted' : `FAILED (HTTP ${d.status})`}: ${u.email}`);
  }
}

const cmd = process.argv[2];
const slugArg = (process.argv.find((a) => a.startsWith('--slug=')) ?? '--slug=scago').split('=')[1];
if (cmd === 'email') await cmdEmail(slugArg);
else if (cmd === 'email-cleanup') await cmdEmailCleanup();
else if (cmd === 'create') { requireServiceKey(); await cmdCreate(slugArg); }
else if (cmd === 'cleanup') { requireServiceKey(); await cmdCleanup(); }
else if (cmd === 'status') { requireServiceKey(); await cmdStatus(); }
else { console.log('Usage: node scripts/qa-flow-test.mjs <create [--slug=scago]|status|cleanup|email --to=you@gmail.com [--slug=scago] [--reset]|email-cleanup>'); process.exit(1); }
