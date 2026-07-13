'use client';
import { z } from 'zod';
import React from 'react';
import { registerBlockType } from '@/lib/content/block-registry';
import { richTextDataSchema } from './rich-text/schema';
import { imageGalleryDataSchema } from './image-gallery/schema';
import { ctaDataSchema } from './cta/schema';
import { calloutDataSchema } from './callout/schema';
import { quizInlineDataSchema } from './quiz-inline/schema';
import { videoDataSchema } from './video/schema';
import { pageBreakDataSchema } from './page-break/schema';
import { sliderDataSchema } from './slider/schema';
import { scratchRevealDataSchema } from './scratch-reveal/schema';
import { matchPairsDataSchema } from './match-pairs/schema';
import { fillBlankDataSchema } from './fill-blank/schema';
import { tableDataSchema } from './table/schema';
import { surveyDataSchema } from './survey/schema';
import { contentListDataSchema } from './content-list/schema';
import { imageCompareDataSchema } from './image-compare/schema';
import { iconListDataSchema } from './icon-list/schema';
import { audioDataSchema } from './audio/schema';

registerBlockType({
  type: 'rich_text',
  label: 'Rich Text',
  description: 'Narrative and instructional content with optional media.',
  icon: 'type',
  category: 'content',
  dataSchema: richTextDataSchema,
  defaultData: { html: '', mode: 'standard' as const },
  ViewerComponent: React.lazy(() => import('@/components/blocks/rich-text/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/rich-text/editor').then((m) => ({ default: m.RichTextEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'image_gallery',
  label: 'Image',
  description: 'A single image, or switch to a gallery / slider / carousel.',
  icon: 'images',
  category: 'media',
  dataSchema: imageGalleryDataSchema,
  defaultData: { images: [], mode: 'single' as const, objectFit: 'contain' as const, displaySize: 'md' as const },
  ViewerComponent: React.lazy(() => import('@/components/blocks/image-gallery/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/image-gallery/editor').then((m) => ({ default: m.ImageGalleryEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'cta',
  label: 'Call to Action',
  description: 'Styled link button for external content — customizable color, label, size, shape, and alignment.',
  icon: 'mouse-pointer-click',
  category: 'navigation',
  dataSchema: ctaDataSchema,
  defaultData: {
    text: '',
    button_label: 'Click Here',
    button_style: 'solid' as const,
    font_size: 'md' as const,
    align: 'center' as const,
    radius: 'lg' as const,
    full_width: false,
    show_icon: true,
  },
  ViewerComponent: React.lazy(() => import('@/components/blocks/cta/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/cta/editor').then((m) => ({ default: m.CTAEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'callout',
  label: 'Callout',
  description: 'Info, warning, or tip highlight box.',
  icon: 'info',
  category: 'content',
  dataSchema: calloutDataSchema,
  defaultData: {
    mode: 'callout' as const,
    variant: 'info' as const,
    html: '',
    bubble_text: '',
    direction: 'right' as const,
    bubble_style: 'light' as const,
    avatar_style: 'circle' as const,
    media_position: 'top' as const,
  },
  ViewerComponent: React.lazy(() => import('@/components/blocks/callout/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/callout/editor').then((m) => ({ default: m.CalloutEditor }))
  ),
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
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/quiz-inline/editor').then((m) => ({ default: m.QuizInlineEditor }))
  ),
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
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/video/editor').then((m) => ({ default: m.VideoEditor }))
  ),
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
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/pdf/editor').then((m) => ({ default: m.PDFEditor }))
  ),
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
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/iframe/editor').then((m) => ({ default: m.IframeEditor }))
  ),
  version: 1,
});

registerBlockType({
  type: 'h5p',
  label: 'H5P Activity',
  description: 'Interactive H5P learning object.',
  icon: 'zap',
  category: 'interactive',
  dataSchema: z.object({ contentKey: z.string() }).passthrough(),
  defaultData: { contentKey: '' },
  ViewerComponent: React.lazy(() => import('@/components/blocks/h5p/viewer')),
  EditorComponent: null,
  version: 1,
});

registerBlockType({
  type: 'slider',
  label: 'Slider',
  description: 'Self-assessment or survey scale with numeric range.',
  icon: 'sliders-horizontal',
  category: 'interactive',
  dataSchema: sliderDataSchema,
  defaultData: {
    question: '',
    min_value: 1,
    max_value: 10,
    increment: 1,
    decimals: 0,
    show_ticks: true,
    required: false,
  },
  ViewerComponent: React.lazy(() => import('@/components/blocks/slider/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/slider/editor').then((m) => ({ default: m.SliderEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'scratch_reveal',
  label: 'Scratch to Reveal',
  description: 'Scratch off a cover to reveal an image or message underneath.',
  icon: 'sparkles',
  category: 'interactive',
  dataSchema: scratchRevealDataSchema,
  defaultData: {
    before: { type: 'text' as const, text: 'Scratch to reveal!', bg_color: '#1A3C6E', text_color: '#FFFFFF' },
    after: { type: 'text' as const, text: 'Surprise! 🎉', bg_color: '#FFFFFF', text_color: '#0F172A' },
    brush_size: 42,
    reveal_threshold: 55,
    animation: 'confetti' as const,
    aspect: '16/9' as const,
    fit: 'contain' as const,
    required: false,
  },
  ViewerComponent: React.lazy(() => import('@/components/blocks/scratch-reveal/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/scratch-reveal/editor').then((m) => ({ default: m.ScratchRevealEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'image_compare',
  label: 'Before / After',
  description: 'Drag a slider to compare two images side by side or top to bottom.',
  icon: 'columns-2',
  category: 'interactive',
  dataSchema: imageCompareDataSchema,
  defaultData: {
    mode: 'image' as const,
    before: { url: '' },
    after: { url: '' },
    initial_position: 50,
    direction: 'horizontal' as const,
    aspect: '16/9' as const,
    fit: 'cover' as const,
    handle_style: 'circle' as const,
    handle_color: '#FFFFFF',
    divider_color: '#FFFFFF',
    show_labels: 'always' as const,
    require_interaction: false,
  },
  ViewerComponent: React.lazy(() => import('@/components/blocks/image-compare/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/image-compare/editor').then((m) => ({ default: m.ImageCompareEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'match_pairs',
  label: 'Drag to Match',
  description: 'Match prompts to their answers — image or text, drag or tap.',
  icon: 'shuffle',
  category: 'assessment',
  dataSchema: matchPairsDataSchema,
  defaultData: {
    pairs: [],
    prompt_side: 'left' as const,
    shuffle: true,
    show_feedback: true,
    required: false,
  },
  ViewerComponent: React.lazy(() => import('@/components/blocks/match-pairs/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/match-pairs/editor').then((m) => ({ default: m.MatchPairsEditor }))
  ),
  version: 1,
});

registerBlockType({
  type: 'fill_blank',
  label: 'Fill in the Blank / Strike Out',
  description: 'Word-bank fill-in-the-blank, OR strikeout mode where learners tap the wrong word to reveal the correction. Tap words to mark them — no brackets needed.',
  icon: 'text-cursor-input',
  category: 'assessment',
  dataSchema: fillBlankDataSchema,
  defaultData: {
    mode: 'word_bank' as const,
    instructions: 'Drag each word into the correct blank.',
    text: 'Water is made of [hydrogen] and [oxygen].',
    distractors: ['carbon'],
    shuffle: true,
    show_feedback: true,
    required: false,
  },
  ViewerComponent: React.lazy(() => import('@/components/blocks/fill-blank/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/fill-blank/editor').then((m) => ({ default: m.FillBlankEditor }))
  ),
  version: 1,
});

registerBlockType({
  type: 'survey',
  label: 'Survey',
  description: 'Multi-question survey with mixed question types and saved responses.',
  icon: 'clipboard-list',
  category: 'assessment',
  dataSchema: surveyDataSchema,
  defaultData: {
    title: 'Survey',
    submit_label: 'Submit Survey',
    questions: [],
  },
  ViewerComponent: React.lazy(() => import('@/components/blocks/survey/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/survey/editor').then((m) => ({ default: m.SurveyEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'table',
  label: 'Table',
  description: 'A titled data table with columns, rows, alignment, striping, and theme colours.',
  icon: 'table',
  category: 'content',
  dataSchema: tableDataSchema,
  defaultData: {
    title: '',
    columns: [
      { id: 'col-1', label: 'Column 1', align: 'left' },
      { id: 'col-2', label: 'Column 2', align: 'left' },
    ],
    rows: [
      { id: 'row-1', cells: { 'col-1': '', 'col-2': '' } },
      { id: 'row-2', cells: { 'col-1': '', 'col-2': '' } },
    ],
    striped: true,
    first_column_header: false,
    density: 'comfortable',
  },
  ViewerComponent: React.lazy(() => import('@/components/blocks/table/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/table/editor').then((m) => ({ default: m.TableEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'content_list',
  label: 'List',
  description: 'Bulleted/numbered list OR an expand-collapse accordion (title + revealed content), with links, sizing, colors, and entrance animations.',
  icon: 'list',
  category: 'content',
  dataSchema: contentListDataSchema,
  defaultData: {
    items: [],
    display_mode: 'list' as const,
    bullet_style: 'disc' as const,
    font_size: 'auto' as const,
    accordion_icon: 'caret' as const,
    accordion_icon_position: 'right' as const,
    accordion_multiple: false,
    accordion_default_open: 'none' as const,
    enable_animations: true,
    animation_duration_ms: 500,
    animation_stagger_ms: 120,
    animation_uniform: false,
    media_position: 'left' as const,
  },
  ViewerComponent: React.lazy(() => import('@/components/blocks/content-list/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/content-list/editor').then((m) => ({ default: m.ContentListEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'audio',
  label: 'Audio',
  description: 'An audio clip player with optional title, caption, and credit.',
  icon: 'volume-2',
  category: 'media',
  dataSchema: audioDataSchema,
  defaultData: { url: '', autoplay: false },
  ViewerComponent: React.lazy(() => import('@/components/blocks/audio/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/audio/editor').then((m) => ({ default: m.AudioEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'icon_list',
  label: 'Icon List',
  description: 'A grid of icon tiles — each with an icon/image, a title, and a short body. Great for "supports", "steps", or feature highlights.',
  icon: 'layout-grid',
  category: 'content',
  dataSchema: iconListDataSchema,
  defaultData: {
    items: [],
    columns: 'auto' as const,
    icon_size: 64,
    layout: 'stacked' as const,
    card: true,
  },
  ViewerComponent: React.lazy(() => import('@/components/blocks/icon-list/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/icon-list/editor').then((m) => ({ default: m.IconListEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});

registerBlockType({
  type: 'page_break',
  label: 'Page Break',
  description: 'Split slide content into viewer pages.',
  icon: 'separator-horizontal',
  category: 'layout',
  dataSchema: pageBreakDataSchema,
  defaultData: {},
  ViewerComponent: React.lazy(() => import('@/components/blocks/page-break/viewer')),
  EditorComponent: React.lazy(() =>
    import('@/components/blocks/page-break/editor').then((m) => ({ default: m.PageBreakEditor }))
  ),
  completionCriteria: () => true,
  version: 1,
});
