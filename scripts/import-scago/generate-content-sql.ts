/**
 * Generates slides + blocks SQL for modules 3-13, using existing lesson IDs.
 * Uses dollar-quoting for JSONB to avoid MCP escaping issues.
 *
 * Run: npx tsx scripts/import-scago/generate-content-sql.ts
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SCAGO_MODULES, parseModule } from './parse-markdown';
import { sqlStr } from './generate-sql';

const INSTITUTION_ID = 'ba52611f-9ad5-44b7-824e-97725a177336';
const SCAGO_BASE = path.resolve('C:/Users/devel/OneDrive/Documents/RethinkReality/GANSID-LMS/SCAGO Modules');
const OUTPUT_DIR = path.join(process.cwd(), 'scripts/import-scago/output/content');

// Existing lesson IDs from the database (modules 3-13)
const LESSON_IDS: Record<string, string[]> = {
  // Module 3: Acute Pain (5 lessons)
  '3': [
    '84ac0565-a8e7-4f27-b4ee-34fbd66d9483',
    'cc1bf51f-4861-45db-87ab-0ab7607f937b',
    '30e80099-dd11-4e6a-9c6a-ee6c9cc9a77e',
    '169e886f-4e59-499b-aa96-ec1182f259c6',
    'a8c84073-ec6f-48d8-93fd-0a64f484818d',
  ],
  // Module 4: Transfusions (4 lessons)
  '4': [
    'c8ecef6b-fbbb-4233-a204-5fe0150fa39f',
    '1fd76e25-a765-413e-95e2-e53cd76ad256',
    '27719392-cdb7-4d8d-b89d-bd35b609326a',
    '8e9f6cce-9b33-4a79-b8cd-00dc5a9e4250',
  ],
  // Module 5: Common Complications (5 lessons)
  '5': [
    'd69e16f3-18c9-4d17-82af-658aa1aa8e76',
    '18fa84a9-22e6-4e0f-a16c-f36da59af548',
    '6d33ba90-9e91-4723-b0af-100d23ad8e68',
    'dfc7838e-f436-46e3-b61b-48f2e8dec581',
    '307cc831-d034-4900-9fe1-db4b26c54d60',
  ],
  // Module 6: Transitions (4 lessons)
  '6': [
    'e35a5e11-ac98-473a-bcc4-2b3372a796cc',
    'be1bd650-6a67-4ede-9ad3-ff157c93302a',
    '54189237-6962-45e1-9ebd-e5c6155c245a',
    'd0281f9e-0a21-4b84-be59-6ef26c6d4d3d',
  ],
  // Module 7: Anti-Oppressive Healthcare (4 lessons)
  '7': [
    '66fc7d57-494a-4e10-ba80-c4d03398cab1',
    '1a1d46f5-e972-4f60-b3b9-3236b00b9b93',
    '8b1259cc-fdc0-44e5-a011-20a117b48808',
    'f9395225-5195-4143-8120-6478d16dc606',
  ],
  // Module 8: Advocacy (4 lessons)
  '8': [
    'b40ef613-729d-4afc-a6e6-31b9b691e6f4',
    '5e706ca0-95a0-4b21-86ca-0197afedcff3',
    '6cea4d09-b9e1-4e6a-ac49-8c4ee7868234',
    '34ff69f3-0fd1-4452-9ce6-9d668a6e6943',
  ],
  // Module 9: Fertility (4 lessons)
  '9': [
    'bbf808a8-bfb2-4720-93f7-29238f1014cf',
    '6650013a-fe11-4d9b-9749-f8034d83151f',
    'd562391a-c763-4577-a3b1-88ad0fe5cf3f',
    '3a56ff41-b58c-44ae-ae4c-a6949b4b8ed5',
  ],
  // Module 10: Mental Health (3 lessons)
  '10': [
    'f5361ae1-8aa6-4cd0-8eae-9b7f18de47ff',
    '8128f63e-621c-45de-8445-6f237d0f7ff8',
    '1f90134c-7704-4578-ac3a-7ca4770cfacc',
  ],
  // Module 11: Innovations (3 lessons)
  '11': [
    'd8184daa-5c48-4eeb-b9d7-695770372599',
    '96636595-9b65-4b7d-badd-9a3fe8c6774f',
    '63e3f2e7-a69c-4982-9789-bb72f117d011',
  ],
  // Module 12: Prevention (2 lessons)
  '12': [
    '6b4648ad-f980-4cbf-89bb-e2f85c949590',
    'ba7ff06c-c397-41f0-b8b8-526a75e6370c',
  ],
  // Module 13: PCPs (4 lessons)
  '13': [
    '93a6da7a-814c-42af-b4af-4c1e9e5c9550',
    '4ee9f472-529c-4fbd-9182-5587841ceedd',
    '67185a5f-27ef-4b15-9041-71bde1d0159d',
    '6b2aac5c-f2c9-4238-9a1d-767a7713bdaa',
  ],
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Parse and generate SQL for each module 3-13
for (const def of SCAGO_MODULES) {
  if (def.number < 3) continue; // Skip 1-2 (already loaded)

  const lessonIds = LESSON_IDS[String(def.number)];
  if (!lessonIds) {
    console.error(`No lesson IDs for module ${def.number}`);
    continue;
  }

  const parsed = parseModule(def, SCAGO_BASE);
  const lines: string[] = [];

  lines.push(`-- Module ${def.number}: ${def.title} — slides + blocks only`);
  lines.push('');

  let slideCount = 0;
  let blockCount = 0;

  for (let li = 0; li < parsed.lessons.length; li++) {
    const lesson = parsed.lessons[li];
    const lessonId = lessonIds[li];

    if (!lessonId) {
      console.error(`  No lesson ID for module ${def.number} lesson ${li}`);
      continue;
    }

    for (let si = 0; si < lesson.slides.length; si++) {
      const slide = lesson.slides[si];
      const slideId = crypto.randomUUID();
      const slideTitle = slide.title || `${lesson.title} - Slide ${si + 1}`;

      slideCount++;

      lines.push(`INSERT INTO slides (id, lesson_id, slide_type, title, order_index, status, settings)`);
      lines.push(`VALUES ('${slideId}', '${lessonId}', 'content', ${sqlStr(slideTitle)}, ${si}, 'published', '{}');`);

      for (let bi = 0; bi < slide.blocks.length; bi++) {
        const block = slide.blocks[bi];
        const blockId = crypto.randomUUID();
        const dataJson = JSON.stringify(block.data);
        let tag = 'JD';
        while (dataJson.includes(`$${tag}$`)) tag += 'X';

        blockCount++;

        lines.push(`INSERT INTO lesson_blocks (id, lesson_id, slide_id, institution_id, block_type, data, order_index, is_visible, settings, version)`);
        lines.push(`VALUES ('${blockId}', '${lessonId}', '${slideId}', '${INSTITUTION_ID}', '${block.kind}', $${tag}$${dataJson}$${tag}$::jsonb, ${bi}, true, '{}', 1);`);
      }
      lines.push('');
    }
  }

  const sql = lines.join('\n');
  const outFile = path.join(OUTPUT_DIR, `module-${def.number}.sql`);
  fs.writeFileSync(outFile, sql);
  console.log(`Module ${def.number}: ${slideCount} slides, ${blockCount} blocks → ${outFile} (${Math.round(Buffer.byteLength(sql) / 1024)} KB)`);
}
