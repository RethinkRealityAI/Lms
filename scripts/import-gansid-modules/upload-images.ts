/**
 * Upload a GANSID module's referenced images to the `canva-exports` Supabase Storage
 * bucket and emit a manifest mapping each EXACT source-reference string to its public URL.
 *
 * Reference-driven: scans the module's *.md + index.html for image path references and uploads
 * exactly those files (resolving both local `images/lesson_NN/..` paths and named
 * `../../images/Module_X/..` paths). This handles modules that store images locally (M3) and
 * modules that reference the shared named hi-res folder (M4+).
 *
 * Usage:
 *   npx tsx scripts/import-gansid-modules/upload-images.ts <module-number> [--one]
 *
 * --one  Spike mode: upload only the first referenced image, then stop.
 *
 * Reads SUPABASE creds from .env.local.
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'canva-exports';
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCORM_ROOT = path.resolve(REPO_ROOT, '..', 'Course SCORM packages');

const CONTENT_TYPE: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

function loadEnv(): { url: string; serviceKey: string } {
  const raw = fs.readFileSync(path.join(REPO_ROOT, '.env.local'), 'utf8');
  const get = (k: string) => {
    const m = raw.match(new RegExp(`^${k}=(.*)$`, 'm'));
    if (!m) throw new Error(`Missing ${k} in .env.local`);
    return m[1].trim();
  };
  return { url: get('NEXT_PUBLIC_SUPABASE_URL'), serviceKey: get('SUPABASE_SERVICE_ROLE_KEY') };
}

/** Extract every quoted path that ends in an image extension from the given text. */
function extractRefs(text: string): string[] {
  const refs = new Set<string>();
  const re = /["']([^"']+\.(?:png|jpe?g|gif|webp|svg))["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) refs.add(m[1].trim());
  return [...refs];
}

/** Turn a source reference into a clean storage sub-path under gansid-modules/module-N/. */
function storageSubPath(ref: string): string {
  return ref.replace(/^\.?\//, '').replace(/\.\.\//g, '').split(/[\\/]/).join('/');
}

async function main() {
  const moduleNum = process.argv[2];
  const spike = process.argv.includes('--one');
  if (!moduleNum) throw new Error('Usage: upload-images.ts <module-number> [--one]');

  const moduleDir = path.join(SCORM_ROOT, `Module ${moduleNum}`);
  if (!fs.existsSync(moduleDir)) throw new Error(`No module dir: ${moduleDir}`);

  // Collect refs from all .md files + index.html
  const sourceFiles = fs.readdirSync(moduleDir).filter((f) => f.endsWith('.md') || f === 'index.html');
  const refs = new Set<string>();
  for (const f of sourceFiles) for (const r of extractRefs(fs.readFileSync(path.join(moduleDir, f), 'utf8'))) refs.add(r);

  // Resolve each ref to an actual file (relative to the module dir, so ../.. and images/.. both work)
  const resolved: Array<{ ref: string; file: string }> = [];
  const missing: string[] = [];
  for (const ref of refs) {
    const file = path.resolve(moduleDir, ref);
    if (fs.existsSync(file) && CONTENT_TYPE[path.extname(file).toLowerCase()]) resolved.push({ ref, file });
    else missing.push(ref);
  }
  // Dedupe by resolved file but keep all ref keys (multiple refs can point to one file)
  resolved.sort((a, b) => a.ref.localeCompare(b.ref));
  if (missing.length) console.warn(`⚠ ${missing.length} referenced image(s) not found on disk:\n  - ${missing.join('\n  - ')}`);
  if (resolved.length === 0) { console.log('No resolvable image references — module is text-only or images are missing.'); }

  const { url, serviceKey } = loadEnv();
  const supabase = createClient(url, serviceKey);

  const targets = spike ? resolved.slice(0, 1) : resolved;
  console.log(`Referenced images: ${refs.size} | resolvable: ${resolved.length} | uploading: ${targets.length}`);

  const manifest: Record<string, string> = {};
  const uploadedByKey: Record<string, string> = {};
  let done = 0;
  for (const { ref, file } of targets) {
    const key = `gansid-modules/module-${moduleNum}/${storageSubPath(ref)}`;
    let publicUrl = uploadedByKey[key];
    if (!publicUrl) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(key, fs.readFileSync(file), { contentType: CONTENT_TYPE[path.extname(file).toLowerCase()], upsert: true });
      if (error) { console.error(`FAIL ${ref}: ${error.message}`); continue; }
      publicUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
      uploadedByKey[key] = publicUrl;
    }
    manifest[ref] = publicUrl; // key = EXACT source reference string the planners will see
    done++;
    if (done % 10 === 0 || done === targets.length) console.log(`  ${done}/${targets.length}`);
  }

  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `module-${moduleNum}-image-manifest.json`);
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`Uploaded ${done}. Manifest (${Object.keys(manifest).length} refs) -> ${outPath}`);
  if (spike && Object.keys(manifest).length) console.log('Spike URL:', Object.values(manifest)[0]);
}

main().catch((e) => { console.error(e); process.exit(1); });
