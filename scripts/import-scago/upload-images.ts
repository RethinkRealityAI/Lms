import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { ParsedModule } from './types';

// ─── Image upload to Supabase Storage ──────────────────────────────────────────

const BUCKET_NAME = 'scago-assets';

/**
 * Recursively walks a directory and returns all file paths.
 */
function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Upload all images from the SCAGO Modules/images/ directory to Supabase Storage.
 * Returns a map of relative markdown paths to public Supabase URLs.
 */
export async function uploadAllImages(
  imagesDir: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<Map<string, string>> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const urlMap = new Map<string, string>();

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });
    if (error) {
      console.error(`Failed to create bucket ${BUCKET_NAME}:`, error.message);
      return urlMap;
    }
    console.log(`Created storage bucket: ${BUCKET_NAME}`);
  }

  const allFiles = walkDir(imagesDir);
  const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);

  const imageFiles = allFiles.filter(f =>
    imageExtensions.has(path.extname(f).toLowerCase())
  );

  console.log(`Found ${imageFiles.length} images to upload...`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of imageFiles) {
    // Build the storage path: images/Module_X/Lesson_Y/file.ext
    const relativePath = path.relative(imagesDir, filePath).replace(/\\/g, '/');
    const storagePath = `images/${relativePath}`;

    // Build the markdown relative path: ../images/Module_X/...
    const markdownPath = `../images/${relativePath}`;

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
      };

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: mimeTypes[ext] || 'application/octet-stream',
          upsert: true,
        });

      if (error) {
        console.error(`  Failed: ${storagePath} — ${error.message}`);
        failed++;
        continue;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      urlMap.set(markdownPath, publicUrlData.publicUrl);
      uploaded++;

      if (uploaded % 50 === 0) {
        console.log(`  Uploaded ${uploaded}/${imageFiles.length}...`);
      }
    } catch (err) {
      console.error(`  Error uploading ${storagePath}:`, err);
      failed++;
    }
  }

  console.log(`\nUpload complete: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
  return urlMap;
}

/**
 * Rewrite image URLs in all image_gallery blocks from relative markdown paths
 * to public Supabase Storage URLs.
 */
export function rewriteImageUrls(
  modules: ParsedModule[],
  urlMap: Map<string, string>
): { rewritten: number; missing: string[] } {
  let rewritten = 0;
  const missing: string[] = [];

  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      for (const slide of lesson.slides) {
        for (const block of slide.blocks) {
          if (block.kind === 'image_gallery') {
            const data = block.data as { images: { url: string; caption: string | null }[]; mode: string };
            for (const img of data.images) {
              const publicUrl = urlMap.get(img.url);
              if (publicUrl) {
                img.url = publicUrl;
                rewritten++;
              } else {
                missing.push(img.url);
              }
            }
          }
        }
      }
    }
  }

  return { rewritten, missing };
}
