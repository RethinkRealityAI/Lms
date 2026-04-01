/**
 * Seeds Module 1 and Module 2 into the database.
 * Run: npx tsx scripts/seed-modules.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedLesson {
  edappId: string;
  title: string;
  order_index: number;
  blocks: SeedBlock[];
}

interface SeedBlock {
  edapp_slide_id: string;
  block_type: string;
  order_index: number;
  title: string;
  data: Record<string, unknown>;
}

interface SeedFile {
  module: { title: string; slug: string };
  lessons: SeedLesson[];
}

const COURSE_DEFS = [
  {
    seedFile: 'module-1.seed.json',
    courseTitle: 'Fundamentals of Effective Advocacy',
    courseSlug: 'fundamentals-of-effective-advocacy',
    description: 'Learn the fundamentals of becoming effective patient advocates; how to advocate with hospitals and governments, and how to personalize the knowledge to your region.',
    moduleTitle: 'Module 1: Fundamentals of Effective Advocacy',
  },
  {
    seedFile: 'module-2.seed.json',
    courseTitle: 'Fundraising Strategies that Drive Results',
    courseSlug: 'fundraising-strategies',
    description: 'Explore practical fundraising strategies and tools that drive real results for patient organizations and advocacy groups.',
    moduleTitle: 'Module 2: Fundraising Strategies that Drive Results',
  },
];

async function getOrCreateInstitution() {
  const { data: existing } = await supabase
    .from('institutions')
    .select('id')
    .eq('slug', 'gansid')
    .maybeSingle();

  if (existing) {
    console.log('✓ Institution GANSID already exists:', existing.id);
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from('institutions')
    .insert({
      name: 'GANSID',
      slug: 'gansid',
      description: 'Global Action Network for Sickle Cell and Other Inherited Blood Disorders',
      is_active: true,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create institution: ${error.message}`);
  console.log('✓ Created institution GANSID:', data.id);
  return data.id as string;
}

async function seedCourse(institutionId: string, def: typeof COURSE_DEFS[0]) {
  const seedPath = path.join(__dirname, 'import-scorm/output', def.seedFile);
  const seed: SeedFile = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  // Upsert course
  const { data: existingCourse } = await supabase
    .from('courses')
    .select('id')
    .eq('slug', def.courseSlug)
    .maybeSingle();

  let courseId: string;

  if (existingCourse) {
    courseId = existingCourse.id;
    console.log(`✓ Course "${def.courseTitle}" already exists: ${courseId}`);
  } else {
    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        institution_id: institutionId,
        title: def.courseTitle,
        slug: def.courseSlug,
        description: def.description,
        is_published: true,
      })
      .select('id')
      .single();
    if (error) throw new Error(`Failed to create course: ${error.message}`);
    courseId = course.id;
    console.log(`✓ Created course "${def.courseTitle}": ${courseId}`);
  }

  // Upsert module
  const { data: existingModule } = await supabase
    .from('modules')
    .select('id')
    .eq('course_id', courseId)
    .eq('order_index', 0)
    .maybeSingle();

  let moduleId: string;

  if (existingModule) {
    moduleId = existingModule.id;
    console.log(`  ✓ Module already exists: ${moduleId}`);
  } else {
    const { data: mod, error } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        institution_id: institutionId,
        title: def.moduleTitle,
        order_index: 0,
        is_published: true,
      })
      .select('id')
      .single();
    if (error) throw new Error(`Failed to create module: ${error.message}`);
    moduleId = mod.id;
    console.log(`  ✓ Created module: ${moduleId}`);
  }

  // Seed lessons + blocks
  for (const lessonData of seed.lessons) {
    const { data: existingLesson } = await supabase
      .from('lessons')
      .select('id')
      .eq('module_id', moduleId)
      .eq('order_index', lessonData.order_index)
      .maybeSingle();

    let lessonId: string;

    if (existingLesson) {
      lessonId = existingLesson.id;
      console.log(`    ✓ Lesson "${lessonData.title}" already exists`);
    } else {
      const { data: lesson, error } = await supabase
        .from('lessons')
        .insert({
          course_id: courseId,
          module_id: moduleId,
          institution_id: institutionId,
          title: lessonData.title,
          order_index: lessonData.order_index,
          content_type: 'blocks',
          content_url: '',
          is_published: true,
          is_required: true,
        })
        .select('id')
        .single();
      if (error) throw new Error(`Failed to create lesson "${lessonData.title}": ${error.message}`);
      lessonId = lesson.id;
      console.log(`    ✓ Created lesson "${lessonData.title}": ${lessonId}`);
    }

    // Delete existing blocks for this lesson to avoid duplicates on re-run
    await supabase.from('lesson_blocks').delete().eq('lesson_id', lessonId);

    // Insert blocks in batches
    if (lessonData.blocks.length > 0) {
      const blockRows = lessonData.blocks.map((b) => ({
        lesson_id: lessonId,
        institution_id: institutionId,
        block_type: b.block_type,
        title: b.title,
        data: b.data,
        order_index: b.order_index,
        is_visible: true,
        version: 1,
        settings: {},
      }));

      const { error } = await supabase.from('lesson_blocks').insert(blockRows);
      if (error) throw new Error(`Failed to insert blocks for "${lessonData.title}": ${error.message}`);
      console.log(`      ✓ Inserted ${blockRows.length} blocks`);
    }
  }
}

async function main() {
  console.log('🌱 Seeding GANSID modules...\n');

  const institutionId = await getOrCreateInstitution();

  for (const def of COURSE_DEFS) {
    console.log(`\n📚 Seeding: ${def.courseTitle}`);
    await seedCourse(institutionId, def);
  }

  console.log('\n✅ Seeding complete!');
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
