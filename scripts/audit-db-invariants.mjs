#!/usr/bin/env node
/**
 * DB invariants regression suite — READ-ONLY.
 *
 * Calls the qa_db_invariants() RPC (migration 054) which asserts, against the
 * LIVE database, every schema-level guarantee the app depends on but cannot
 * unit-test: RLS write policies on certificates (phantom-revoke incident),
 * no student progress deletion, analytics views reading the real quiz store
 * and excluding revoked certs / deleted lessons, reset clearing quiz answers,
 * legacy-import event tagging, and server-side quiz verification in the
 * certificate RPC.
 *
 * Run: node scripts/audit-db-invariants.mjs   (exit 1 on any failed invariant)
 * Part of the qa-lms protocol — see docs/qa-playbook.md.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await supabase.rpc('qa_db_invariants');
if (error) {
  console.error('qa_db_invariants() failed:', error.message);
  process.exit(1);
}

let failed = 0;
const rows = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
for (const [name, ok] of rows) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
console.log(`\n${rows.length - failed}/${rows.length} invariants hold.`);
if (failed > 0) {
  console.error(`\n${failed} invariant(s) FAILED — a schema regression re-introduced a known bug class.`);
  process.exit(1);
}
