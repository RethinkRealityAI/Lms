import { z } from 'zod';
import React from 'react';
import { registerBlockType } from '@/lib/content/block-registry';
import { richTextDataSchema } from './rich-text/schema';
import { imageGalleryDataSchema } from './image-gallery/schema';
import { ctaDataSchema } from './cta/schema';
import { calloutDataSchema } from './callout/schema';
import { quizInlineDataSchema } from './quiz-inline/schema';
import { videoDataSchema } from './video/schema';

registerBlockType({
  type: 'rich_text',
  label: 'Rich Text',
  description: 'Narrative and instructional content with optional media.',
  icon: 'type',
  category: 'content',
  dataSchema: richTextDataSchema,
  defaultData: { html: '', mode: 'standard' as const },
  ViewerComponent: React.lazy(() => import('@/components/blocks/rich-text/viewer')),
  EditorComponent: null,
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'image_gallery',
  label: 'Image Gallery',
  description: 'Swipeable image gallery or slider.',
  icon: 'images',
  category: 'media',
  dataSchema: imageGalleryDataSchema,
  defaultData: { images: [], mode: 'gallery' as const },
  ViewerComponent: React.lazy(() => import('@/components/blocks/image-gallery/viewer')),
  EditorComponent: null,
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'cta',
  label: 'Call to Action',
  description: 'End-of-lesson action button.',
  icon: 'mouse-pointer-click',
  category: 'navigation',
  dataSchema: ctaDataSchema,
  defaultData: { text: '', action: 'complete_lesson' as const, button_label: 'Continue' },
  ViewerComponent: React.lazy(() => import('@/components/blocks/cta/viewer')),
  EditorComponent: null,
  version: 1,
});

registerBlockType({
  type: 'callout',
  label: 'Callout',
  description: 'Info, warning, or tip highlight box.',
  icon: 'info',
  category: 'content',
  dataSchema: calloutDataSchema,
  defaultData: { variant: 'info' as const, html: '' },
  ViewerComponent: React.lazy(() => import('@/components/blocks/callout/viewer')),
  EditorComponent: null,
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'quiz_inline',
  label: 'Inline Quiz',
  description: 'Interactive question embedded within a lesson.',
  icon: 'help-circle',
  category: 'assessment',
  dataSchema: quizInlineDataSchema,
  defaultData: { question_type: 'multiple_choice' as const, show_feedback: true },
  ViewerComponent: React.lazy(() => import('@/components/blocks/quiz-inline/viewer')),
  EditorComponent: null,
  version: 1,
});

registerBlockType({
  type: 'video',
  label: 'Video',
  description: 'Hosted or CDN video.',
  icon: 'play-circle',
  category: 'media',
  dataSchema: videoDataSchema,
  defaultData: { url: '', autoplay: false },
  ViewerComponent: React.lazy(() => import('@/components/blocks/video/viewer')),
  EditorComponent: null,
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'pdf',
  label: 'PDF',
  description: 'Document viewer.',
  icon: 'file-text',
  category: 'media',
  dataSchema: z.object({ url: z.string() }),
  defaultData: { url: '' },
  ViewerComponent: React.lazy(() => import('@/components/blocks/pdf/viewer')),
  EditorComponent: null,
  version: 1,
});

registerBlockType({
  type: 'iframe',
  label: 'iFrame',
  description: 'Embedded external content.',
  icon: 'code',
  category: 'interactive',
  dataSchema: z.object({ url: z.string(), height: z.number().optional() }),
  defaultData: { url: '' },
  ViewerComponent: React.lazy(() => import('@/components/blocks/iframe/viewer')),
  EditorComponent: null,
  version: 1,
});

registerBlockType({
  type: 'h5p',
  label: 'H5P Activity',
  description: 'Interactive H5P learning object.',
  icon: 'zap',
  category: 'interactive',
  dataSchema: z.object({ contentKey: z.string() }),
  defaultData: { contentKey: '' },
  ViewerComponent: React.lazy(() => import('@/components/blocks/h5p/viewer')),
  EditorComponent: null,
  version: 1,
});
