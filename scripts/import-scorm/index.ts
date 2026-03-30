import path from 'path';
import fs from 'fs';
import { readScormConfig, parseEdAppConfig } from './extract';
import { mapSlidesToBlocks } from './map-slides';
import { writeSeedFile } from './generate-seed';

const [,, scormDir, outputDir = 'scripts/import-scorm/output'] = process.argv;

if (!scormDir) {
  console.error('Usage: npx tsx scripts/import-scorm/index.ts <path-to-scorm-dir> [output-dir]');
  process.exit(1);
}

const zipFiles = fs.readdirSync(scormDir).filter((f) => f.endsWith('.zip'));
if (zipFiles.length === 0) {
  console.error(`No .zip files found in ${scormDir}`);
  process.exit(1);
}

const lessons = zipFiles.map((zipFile) => {
  const zipPath = path.join(scormDir, zipFile);
  console.log(`Processing: ${zipFile}`);
  const config = readScormConfig(zipPath);
  const extracted = parseEdAppConfig(config);
  const blocks = mapSlidesToBlocks(extracted.slides);
  return { ...extracted, blocks };
});

const moduleTitle = path.basename(scormDir);
const outputPath = writeSeedFile(outputDir, moduleTitle, lessons);
console.log(`\nSeed file written to: ${outputPath}`);
console.log(`Lessons extracted: ${lessons.length}`);
console.log(`Total blocks: ${lessons.reduce((sum, l) => sum + l.blocks.length, 0)}`);
