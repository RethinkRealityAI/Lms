import AdmZip from 'adm-zip';
import type { EdAppConfig, EdAppSlide, ExtractedLesson } from './types';

export function parseEdAppConfig(config: EdAppConfig): ExtractedLesson {
  const mediaFiles = extractMediaPaths(config.slides);
  return {
    edappId: config.id,
    title: config.title,
    orderIndex: config.index,
    slides: config.slides,
    mediaFiles,
  };
}

export function extractMediaPaths(slides: EdAppSlide[]): string[] {
  const paths = new Set<string>();

  for (const slide of slides) {
    const data = slide.data;

    if (data.content) {
      for (const item of data.content) {
        if (item.contentType === 'image' || item.contentType === 'video') {
          paths.add(item.content);
        }
      }
    }

    if (data.items) {
      for (const item of data.items) {
        if (item.contentType === 'image') {
          paths.add(item.content);
        }
      }
    }
  }

  return [...paths];
}

export function readScormConfig(zipPath: string): EdAppConfig {
  const zip = new AdmZip(zipPath);
  const configEntry = zip.getEntry('config.json');
  if (!configEntry) {
    throw new Error(`No config.json found in ${zipPath}`);
  }
  const content = configEntry.getData().toString('utf8');
  return JSON.parse(content) as EdAppConfig;
}
