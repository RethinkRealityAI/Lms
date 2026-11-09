/**
 * Re-host the generated SCAGO cover art on Supabase Storage.
 *
 * WHY THIS EXISTS
 * The module covers and landing-page imagery were generated with an external
 * image model and currently load straight from that provider's CDN (see
 * `src/lib/content/scago-curriculum.ts`). That is fine for review but wrong for
 * production: the URLs are outside our control and could rotate or expire,
 * which would leave the public landing page and every course card leaning on
 * their fallback gradient. This script copies each file into the Supabase
 * `course-thumbnails` bucket we already own, repoints `courses.thumbnail_url`
 * at the copy, and rewrites the URLs in the curriculum module so the public
 * page and the in-platform cards move together.
 *
 * It is idempotent: files are uploaded with `upsert`, and re-running after a
 * successful pass is a no-op that simply re-confirms the same URLs.
 *
 * USAGE
 *   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/migrate-generated-images/index.ts --dry-run
 *   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/migrate-generated-images/index.ts
 *
 * The service-role key is required because Storage writes and the course
 * update both bypass RLS. Never commit it.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  SCAGO_MODULES,
  SCAGO_LANDING_IMAGES,
} from '../../src/lib/content/scago-curriculum';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ylmnbbrpaeiogdeqezlo.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCAGO_INSTITUTION_ID = 'ba52611f-9ad5-44b7-824e-97725a177336';
const BUCKET = 'course-thumbnails';
const PREFIX = 'scago-covers';
const CURRICULUM_FILE = path.join(
  __dirname,
  '../../src/lib/content/scago-curriculum.ts'
);

const DRY_RUN = process.argv.includes('--dry-run');

interface Job {
  /** Stable destination filename (no generation timestamps). */
  name: string;
  sourceUrl: string;
  /** Module number when this cover belongs to a course; null for page imagery. */
  moduleNumber: number | null;
}

function buildJobs(): Job[] {
  const jobs: Job[] = SCAGO_MODULES.map((m) => ({
    name: `module-${String(m.number).padStart(2, '0')}.png`,
    sourceUrl: m.image,
    moduleNumber: m.number,
  }));

  for (const [key, url] of Object.entries(SCAGO_LANDING_IMAGES)) {
    jobs.push({ name: `landing-${key}.png`, sourceUrl: url, moduleNumber: null });
  }

  return jobs;
}

function publicUrlFor(name: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}/${name}`;
}

async function main() {
  if (!SERVICE_ROLE_KEY) {
    console.error(
      'SUPABASE_SERVICE_ROLE_KEY is required (Storage writes bypass RLS).'
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const jobs = buildJobs();
  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}Re-hosting ${jobs.length} images into ${BUCKET}/${PREFIX}/\n`
  );

  const rewrites = new Map<string, string>();
  let uploaded = 0;
  let failed = 0;

  for (const job of jobs) {
    // Already re-hosted (e.g. a partially completed earlier run) — skip the fetch.
    if (job.sourceUrl.startsWith(SUPABASE_URL)) {
      console.log(`  = ${job.name} already on Supabase, skipping`);
      continue;
    }

    try {
      const res = await fetch(job.sourceUrl);
      if (!res.ok) throw new Error(`source responded ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());

      if (DRY_RUN) {
        console.log(
          `  + ${job.name} <- ${(bytes.length / 1024).toFixed(0)} KB (not uploaded)`
        );
      } else {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(`${PREFIX}/${job.name}`, bytes, {
            contentType: 'image/png',
            upsert: true,
          });
        if (error) throw error;
        console.log(`  + ${job.name} (${(bytes.length / 1024).toFixed(0)} KB)`);
      }

      rewrites.set(job.sourceUrl, publicUrlFor(job.name));
      uploaded++;

      if (job.moduleNumber !== null && !DRY_RUN) {
        // Match the course the same way the landing page numbers them, so a
        // renamed title can never silently attach art to the wrong module.
        const { data, error } = await supabase
          .from('courses')
          .select('id, title')
          .eq('institution_id', SCAGO_INSTITUTION_ID)
          .is('deleted_at', null)
          .ilike('title', `Module ${job.moduleNumber}%`);
        if (error) throw error;

        if (!data || data.length !== 1) {
          console.warn(
            `    ! expected exactly 1 course for module ${job.moduleNumber}, found ${data?.length ?? 0} — thumbnail_url left unchanged`
          );
        } else {
          const { error: upErr } = await supabase
            .from('courses')
            .update({ thumbnail_url: publicUrlFor(job.name) })
            .eq('id', data[0].id)
            .select('id');
          if (upErr) throw upErr;
          console.log(`    -> courses.thumbnail_url updated for "${data[0].title}"`);
        }
      }
    } catch (err) {
      failed++;
      console.error(`  x ${job.name}: ${(err as Error).message}`);
    }
  }

  // Point the curriculum module at the copies we now own.
  if (!DRY_RUN && rewrites.size > 0) {
    let source = fs.readFileSync(CURRICULUM_FILE, 'utf8');
    let replaced = 0;
    for (const [from, to] of rewrites) {
      if (source.includes(from)) {
        source = source.split(from).join(to);
        replaced++;
      }
    }
    fs.writeFileSync(CURRICULUM_FILE, source);
    console.log(`\nRewrote ${replaced} URL(s) in scago-curriculum.ts`);
    console.log('Commit that file so the landing page serves the re-hosted art.');
  }

  console.log(
    `\nDone. ${uploaded} re-hosted, ${failed} failed.${DRY_RUN ? ' (dry run — nothing written)' : ''}`
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
