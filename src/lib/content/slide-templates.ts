import type { SlideType } from '@/types';

export interface SlideTemplateConfig {
  type: SlideType;
  name: string;
  description: string;
  defaultBlocks: Array<{ block_type: string; data: Record<string, unknown> }>;
  defaultSettings: Record<string, unknown>;
  accentColor: string;
}

export const SLIDE_TEMPLATES: SlideTemplateConfig[] = [
  {
    type: 'title',
    name: 'Title',
    description: 'Lesson introduction with heading and description',
    defaultBlocks: [
      { block_type: 'rich_text', data: { html: '<h1>Lesson Title</h1><p>Description goes here</p>', mode: 'standard' } },
    ],
    defaultSettings: { background: 'gradient', textColor: '#FFFFFF' },
    accentColor: '#1E3A5F',
  },
  {
    type: 'content',
    name: 'Content',
    description: 'Text content with optional image',
    defaultBlocks: [
      { block_type: 'rich_text', data: { html: '<h2>Title</h2><p>Your content here...</p>', mode: 'standard' } },
    ],
    defaultSettings: { background: '#FFFFFF' },
    accentColor: '#2563EB',
  },
  {
    type: 'media',
    name: 'Media',
    description: 'Full-width video, image, or embed',
    defaultBlocks: [
      { block_type: 'video', data: { url: '', title: '' } },
    ],
    defaultSettings: { background: '#000000', textColor: '#FFFFFF' },
    accentColor: '#7C3AED',
  },
  {
    type: 'quiz',
    name: 'Quiz',
    description: 'Multiple choice knowledge check',
    defaultBlocks: [
      {
        block_type: 'quiz_inline',
        data: {
          question_type: 'multiple_choice',
          question: 'Your question here?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_answer: 'Option A',
          show_feedback: true,
        },
      },
    ],
    defaultSettings: { background: '#F8FAFC' },
    accentColor: '#059669',
  },
  {
    type: 'disclaimer',
    name: 'Disclaimer',
    description: 'Warning or legal notice',
    defaultBlocks: [
      { block_type: 'callout', data: { variant: 'warning', title: 'Disclaimer', html: '<p>Important information here...</p>' } },
    ],
    defaultSettings: { background: '#FFFBEB' },
    accentColor: '#D97706',
  },
  {
    type: 'interactive',
    name: 'Interactive',
    description: 'Embedded interactive content',
    defaultBlocks: [
      { block_type: 'iframe', data: { url: '', height: 600 } },
    ],
    defaultSettings: { background: '#FFFFFF' },
    accentColor: '#0099CA',
  },
  {
    type: 'cta',
    name: 'Call to Action',
    description: 'Navigation prompt with button',
    defaultBlocks: [
      { block_type: 'rich_text', data: { html: '<h2>Ready to continue?</h2>', mode: 'standard' } },
      { block_type: 'cta', data: { action: 'next_lesson', button_label: 'Next Lesson', text: '' } },
    ],
    defaultSettings: { background: 'gradient' },
    accentColor: '#DC2626',
  },
];

export function getTemplateByType(type: SlideType): SlideTemplateConfig | undefined {
  return SLIDE_TEMPLATES.find((t) => t.type === type);
}
