import fs from 'fs';
import path from 'path';
import { SCAGO_MODULES, parseModule, warnings } from './parse-markdown';
import { generateSQL } from './generate-sql';
import { uploadAllImages, rewriteImageUrls } from './upload-images';
import { generateLegacyUserSQL } from './import-legacy-users';
import type { ParsedModule } from './types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const INSTITUTION_ID = 'ba52611f-9ad5-44b7-824e-97725a177336';
const SCAGO_BASE = path.resolve(
  'C:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/SCAGO Modules'
);
const OUTPUT_DIR = path.join(process.cwd(), 'scripts/import-scago/output');
const USERS_CSV = path.join(SCAGO_BASE, 'Users/users (1).csv');

// ─── CLI argument parsing ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const parseOnly = args.includes('--parse-only');
const legacyUsersOnly = args.includes('--legacy-users');
const moduleArg = args.find(a => a.startsWith('--module='));
const moduleNumber = moduleArg ? parseInt(moduleArg.split('=')[1], 10) : null;

// ─── Ensure output directory ───────────────────────────────────────────────────

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ─── Legacy users mode ─────────────────────────────────────────────────────────

if (legacyUsersOnly) {
  console.log('Generating legacy user import SQL...\n');

  if (!fs.existsSync(USERS_CSV)) {
    console.error(`CSV file not found: ${USERS_CSV}`);
    process.exit(1);
  }

  const sql = generateLegacyUserSQL(USERS_CSV);
  const outputPath = path.join(OUTPUT_DIR, 'legacy-users.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');

  console.log(`Legacy user SQL written to: ${outputPath}`);
  process.exit(0);
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────

async function main() {
  console.log('SCAGO Markdown Import Pipeline');
  console.log('==============================\n');

  // Determine which modules to parse
  const modulesToParse = moduleNumber
    ? SCAGO_MODULES.filter(m => m.number === moduleNumber)
    : SCAGO_MODULES;

  if (modulesToParse.length === 0) {
    console.error(`Module ${moduleNumber} not found in SCAGO_MODULES`);
    process.exit(1);
  }

  // ── Step 1: Parse all modules ──────────────────────────────────────────────

  console.log(`Parsing ${modulesToParse.length} module(s)...\n`);

  const parsedModules: ParsedModule[] = [];

  for (const def of modulesToParse) {
    const filePath = path.join(SCAGO_BASE, def.file);
    if (!fs.existsSync(filePath)) {
      warnings.push(`File not found: ${filePath}`);
      continue;
    }

    try {
      const parsed = parseModule(def, SCAGO_BASE);
      parsedModules.push(parsed);
      console.log(`  Module ${def.number}: ${def.title} — ${parsed.lessons.length} lessons`);
    } catch (err) {
      warnings.push(`Error parsing Module ${def.number}: ${String(err)}`);
      console.error(`  ERROR: Module ${def.number}: ${err}`);
    }
  }

  // ── Step 2: Print statistics ───────────────────────────────────────────────

  console.log('\n' + '='.repeat(60));
  console.log('  PARSE STATISTICS');
  console.log('='.repeat(60));
  console.log(`  Courses to insert:       ${parsedModules.length}`);

  let totalLessons = 0;
  let totalSlides = 0;
  let totalBlocks = 0;
  let blockCounts: Record<string, number> = {
    rich_text: 0,
    image_gallery: 0,
    video: 0,
    quiz_inline: 0,
  };

  for (const mod of parsedModules) {
    let modSlides = 0;
    let modBlocks = 0;
    const modBlockCounts: Record<string, number> = {
      rich_text: 0,
      image_gallery: 0,
      video: 0,
      quiz_inline: 0,
    };

    for (const lesson of mod.lessons) {
      modSlides += lesson.slides.length;
      for (const slide of lesson.slides) {
        modBlocks += slide.blocks.length;
        for (const block of slide.blocks) {
          modBlockCounts[block.kind] = (modBlockCounts[block.kind] || 0) + 1;
        }
      }
    }

    totalLessons += mod.lessons.length;
    totalSlides += modSlides;
    totalBlocks += modBlocks;
    for (const [k, v] of Object.entries(modBlockCounts)) {
      blockCounts[k] = (blockCounts[k] || 0) + v;
    }

    console.log(`\n  Module ${mod.def.number}: ${mod.def.title}`);
    console.log(`    Lessons: ${mod.lessons.length}  |  Slides: ${modSlides}  |  Blocks: ${modBlocks}`);
    console.log(`    Block types: rich_text=${modBlockCounts.rich_text}, image_gallery=${modBlockCounts.image_gallery}, video=${modBlockCounts.video}, quiz_inline=${modBlockCounts.quiz_inline}`);

    for (const lesson of mod.lessons) {
      const slideCount = lesson.slides.length;
      const lessonBlockCount = lesson.slides.reduce((sum, s) => sum + s.blocks.length, 0);
      const quizCount = lesson.slides.reduce(
        (sum, s) => sum + s.blocks.filter(b => b.kind === 'quiz_inline').length, 0
      );
      console.log(`      "${lesson.title}": ${slideCount} slides, ${lessonBlockCount} blocks (${quizCount} quiz)`);
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`  Total lessons:           ${totalLessons}`);
  console.log(`  Total slides:            ${totalSlides}`);
  console.log(`  Total blocks:            ${totalBlocks}`);
  console.log(`    - rich_text:           ${blockCounts.rich_text}`);
  console.log(`    - image_gallery:       ${blockCounts.image_gallery}`);
  console.log(`    - video:               ${blockCounts.video}`);
  console.log(`    - quiz_inline:         ${blockCounts.quiz_inline}`);
  console.log('-'.repeat(60));

  // ── Warnings ───────────────────────────────────────────────────────────────

  if (warnings.length > 0) {
    console.log(`\n  WARNINGS (${warnings.length}):`);
    for (const w of warnings) {
      console.log(`    WARNING: ${w}`);
    }
  } else {
    console.log('\n  No warnings.');
  }

  // ── Step 3: Upload images (unless --parse-only) ────────────────────────────

  if (!parseOnly) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      console.log('\nUploading images to Supabase Storage...');
      const imagesDir = path.join(SCAGO_BASE, 'images');
      const urlMap = await uploadAllImages(imagesDir, supabaseUrl, supabaseServiceKey);

      if (urlMap.size > 0) {
        console.log(`\nRewriting image URLs...`);
        const { rewritten, missing } = rewriteImageUrls(parsedModules, urlMap);
        console.log(`  Rewritten: ${rewritten}`);
        if (missing.length > 0) {
          console.log(`  Missing URLs (${missing.length}):`);
          for (const m of missing.slice(0, 10)) {
            console.log(`    - ${m}`);
          }
          if (missing.length > 10) {
            console.log(`    ... and ${missing.length - 10} more`);
          }
        }
      }
    } else {
      console.log('\nSkipping image upload (SUPABASE_SERVICE_ROLE_KEY not set)');
      console.log('  Image URLs will remain as relative markdown paths');
    }

    // ── Step 4: Generate SQL ───────────────────────────────────────────────────

    console.log('\nGenerating SQL...');
    const sql = generateSQL(parsedModules, INSTITUTION_ID);
    const outputPath = path.join(OUTPUT_DIR, 'scago-modules.sql');
    fs.writeFileSync(outputPath, sql, 'utf8');

    console.log(`\n  SQL written to: ${outputPath}`);
  } else {
    console.log('\n  --parse-only mode: skipping image upload and SQL generation');
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Done.');
  console.log('='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
