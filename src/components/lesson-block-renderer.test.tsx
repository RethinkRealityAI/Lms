import { describe, it, expect, vi } from 'vitest';
import { createFallbackBlockFromLesson } from './lesson-block-renderer';
import type { Lesson } from '@/types';

describe('createFallbackBlockFromLesson', () => {
  const baseLesson: Lesson = {
    id: 'les-1',
    course_id: 'c1',
    title: 'My Lesson',
    description: 'A description',
    content_type: 'video',
    content_url: 'https://example.com/video.mp4',
    order_index: 0,
    created_at: '2024-01-01T00:00:00Z',
    is_required: true,
  };

  it('creates a fallback block with the lesson title', () => {
    const block = createFallbackBlockFromLesson(baseLesson);
    expect(block.title).toBe('My Lesson');
  });

  it('uses the lesson content_url in block data', () => {
    const block = createFallbackBlockFromLesson(baseLesson);
    expect((block.data as Record<string, unknown>).url).toBe('https://example.com/video.mp4');
  });

  it('maps content_type to block_type correctly for video', () => {
    const block = createFallbackBlockFromLesson(baseLesson);
    expect(block.block_type).toBe('video');
  });

  it('maps content_type "3d" to "model3d"', () => {
    const lesson = { ...baseLesson, content_type: '3d' as const };
    const block = createFallbackBlockFromLesson(lesson);
    expect(block.block_type).toBe('model3d');
  });

  it('maps content_type "iframe" to "iframe"', () => {
    const lesson = { ...baseLesson, content_type: 'iframe' as const };
    const block = createFallbackBlockFromLesson(lesson);
    expect(block.block_type).toBe('iframe');
  });

  it('creates a block with is_visible true', () => {
    const block = createFallbackBlockFromLesson(baseLesson);
    expect(block.is_visible).toBe(true);
  });

  it('generates a deterministic fallback id from lesson id', () => {
    const block = createFallbackBlockFromLesson(baseLesson);
    expect(block.id).toBe('fallback-les-1');
  });
});
