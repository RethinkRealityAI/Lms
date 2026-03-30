import fs from 'fs';
import path from 'path';
import type { MappedBlock } from './types';

interface SeedLesson {
  edappId: string;
  title: string;
  orderIndex: number;
  blocks: MappedBlock[];
}

export function writeSeedFile(
  outputDir: string,
  moduleTitle: string,
  lessons: SeedLesson[]
): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const slug = moduleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const outputPath = path.join(outputDir, `${slug}.seed.json`);
  const seed = {
    module: { title: moduleTitle, slug },
    lessons: lessons.map((l) => ({
      edappId: l.edappId,
      title: l.title,
      order_index: l.orderIndex,
      blocks: l.blocks,
    })),
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(outputPath, JSON.stringify(seed, null, 2));
  return outputPath;
}
