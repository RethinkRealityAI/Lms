/**
 * Build the image manifest for a SCAGO module.
 *
 * SCAGO images are ALREADY uploaded to the public `scago-assets` bucket; the public URL is a
 * deterministic transform of the local path:
 *   <SCAGO Modules>/images/<rel>  ->  <SUPABASE_URL>/storage/v1/object/public/scago-assets/images/<rel>
 * and the Markdown references them as `../images/<rel>`.
 *
 * This script walks the module's local image directory and emits a manifest mapping the EXACT
 * Markdown path (`../images/<rel>`) -> absolute public URL, so planner subagents reference only
 * real, existing image URLs (no hallucination).
 *
 * Usage:
 *   npx tsx scripts/import-scago-modules/build-manifest.ts <moduleNumber>
 *
 * Output: scripts/import-scago-modules/output/module-<N>-image-manifest.json
 */
import fs from 'fs';
import path from 'path';
import { SCAGO_MODULES } from '../import-scago/parse-markdown';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCAGO_BASE = path.resolve(REPO_ROOT, '..', 'SCAGO Modules');
const IMAGES_ROOT = path.join(SCAGO_BASE, 'images');
const OUTPUT_DIR = path.join(__dirname, 'output');
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);

function getSupabaseUrl(): string {
  const raw = fs.readFileSync(path.join(REPO_ROOT, '.env.local'), 'utf8');
  const m = raw.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m);
  if (!m) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  return m[1].trim().replace(/\/$/, '');
}

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function main() {
  const moduleNumber = parseInt(process.argv[2] ?? '', 10);
  const def = SCAGO_MODULES.find((m) => m.number === moduleNumber);
  if (!def) throw new Error(`Unknown module number: ${process.argv[2]}`);

  // The module's image folder mirrors the MD filename (minus extension).
  const moduleDir = path.basename(def.file, '.md');
  const moduleImagesDir = path.join(IMAGES_ROOT, moduleDir);
  if (!fs.existsSync(moduleImagesDir)) {
    throw new Error(`Module image dir not found: ${moduleImagesDir}`);
  }

  const base = getSupabaseUrl();
  const files = walk(moduleImagesDir);
  const manifest: Record<string, string> = {};

  for (const file of files) {
    const rel = path.relative(IMAGES_ROOT, file).replace(/\\/g, '/'); // Module_6_.../Lesson_01_.../file.png
    const mdPath = `../images/${rel}`;
    manifest[mdPath] = `${base}/storage/v1/object/public/scago-assets/images/${rel}`;
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `module-${moduleNumber}-image-manifest.json`);
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`Module ${moduleNumber} (${moduleDir})`);
  console.log(`  ${files.length} images -> ${outPath}`);
  const sample = Object.values(manifest)[0];
  if (sample) console.log(`  sample: ${sample}`);
}

main();
