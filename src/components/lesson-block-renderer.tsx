'use client';

import React from 'react';
import type { LessonBlock, Lesson } from '@/types';
import { H5PPlayer } from '@/components/h5p/h5p-player';

interface LessonBlockRendererProps {
  block: LessonBlock;
  lessonTitle: string;
}

export function LessonBlockRenderer({ block, lessonTitle }: LessonBlockRendererProps) {
  const data = block.data || {};

  const url = typeof data.url === 'string' ? data.url : undefined;

  switch (block.block_type) {
    case 'video':
      return (
        <video src={url} controls className="w-full rounded-lg" style={{ maxHeight: '500px' }}>
          Your browser does not support the video tag.
        </video>
      );
    case 'pdf':
      return (
        <iframe
          src={url}
          className="w-full rounded-lg"
          style={{ height: '600px' }}
          title={block.title || lessonTitle}
        />
      );
    case 'iframe':
      return (
        <iframe
          src={url}
          className="w-full rounded-lg"
          style={{ height: '600px' }}
          title={block.title || lessonTitle}
        />
      );
    case 'model3d':
      return React.createElement('model-viewer', {
        src: url,
        alt: block.title || lessonTitle,
        'auto-rotate': true,
        'camera-controls': true,
        style: { width: '100%', height: '600px' },
        className: 'rounded-lg',
      });
    case 'rich_text': {
      const text = typeof data.text === 'string' ? data.text : typeof data.description === 'string' ? data.description : 'No content yet.';
      return (
        <div className="prose max-w-none rounded-lg border p-4">
          {text}
        </div>
      );
    }
    case 'h5p':
      return (
        <H5PPlayer
          title={block.title || lessonTitle}
          contentKey={String(data.contentKey || '')}
          metadata={data}
        />
      );
    default:
      return <p>Unsupported block type: {block.block_type}</p>;
  }
}

export function createFallbackBlockFromLesson(lesson: Lesson): LessonBlock {
  const blockType =
    lesson.content_type === '3d'
      ? 'model3d'
      : lesson.content_type === 'iframe'
      ? 'iframe'
      : lesson.content_type;

  return {
    id: `fallback-${lesson.id}`,
    institution_id: '',
    lesson_id: lesson.id,
    block_type: blockType,
    title: lesson.title,
    data: {
      url: lesson.content_url,
      title: lesson.title,
      description: lesson.description || '',
    },
    order_index: 0,
    created_by: '',
    created_at: lesson.created_at,
    updated_at: lesson.created_at,
    is_visible: true,
    settings: {},
    version: 1,
  };
}
