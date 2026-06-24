/**
 * One-off: normalize legacy match_pairs block data (the `{left,right}` shorthand
 * with a string `prompt`) into the canonical `{id, prompt:Side, match:Side}` shape.
 * Idempotent — already-correct blocks are left unchanged. Uses the SERVICE ROLE key.
 *
 *   npx tsx scripts/fix-match-pairs.ts [--dry]
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeMatchPairsData } from '../src/lib/content/blocks/match-pairs/schema';

const REPO_ROOT = path.resolve(__dirname, '..');
function env(k: string): string {
  const raw = fs.readFileSync(path.join(REPO_ROOT, '.env.local'), 'utf8');
  const m = raw.match(new RegExp(`^${k}=(.*)$`, 'm'));
  if (!m) throw new Error(`Missing ${k} in .env.local`);
  return m[1].trim();
}

function isLegacy(data: Record<string, unknown>): boolean {
  const pairs = Array.isArray(data.pairs) ? (data.pairs as Record<string, unknown>[]) : [];
  const badPair = pairs.some((p) => p && typeof p === 'object' && (('left' in p) || ('right' in p) || !('id' in p) || typeof p.prompt !== 'object'));
  const stringPrompt = typeof data.prompt === 'string';
  return badPair || stringPrompt;
}

async function main() {
  const dry = process.argv.includes('--dry');
  const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: blocks, error } = await supabase
    .from('lesson_blocks')
    .select('id, data')
    .eq('block_type', 'match_pairs');
  if (error) throw error;

  let fixed = 0;
  for (const b of blocks ?? []) {
    const data = (b.data ?? {}) as Record<string, unknown>;
    if (!isLegacy(data)) continue;
    const normalized = normalizeMatchPairsData(data);
    console.log(`Fixing ${b.id}: ${(data.pairs as unknown[])?.length ?? 0} pairs → canonical shape`);
    if (!dry) {
      const { error: upErr } = await supabase.from('lesson_blocks').update({ data: normalized }).eq('id', b.id);
      if (upErr) throw new Error(`update ${b.id}: ${upErr.message}`);
    }
    fixed++;
  }
  console.log(`${dry ? '[dry] ' : ''}Done — ${fixed} block(s) ${dry ? 'would be' : ''} fixed of ${blocks?.length ?? 0} total.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
