import type { SlideType } from '@/types';

export interface SlideTemplateConfig {
  /** Unique picker id (multiple templates may share the same slide_type) */
  id: string;
  type: SlideType;
  name: string;
  description: string;
  defaultBlocks: Array<{ block_type: string; data: Record<string, unknown> }>;
  defaultSettings: Record<string, unknown>;
  accentColor: string;
}

// THEMING RULE: templates must NOT pin `background: '#FFFFFF'` in defaultSettings.
// An unset background means "inherit" — the slide falls back to the course
// `default_background`, then the institution theme, then white (resolveEffectiveTheme).
// Only templates with a DELIBERATE distinct look (gradient title, black media,
// tinted quiz/disclaimer) may pin a background.
export const SLIDE_TEMPLATES: SlideTemplateConfig[] = [
  {
    id: 'title',
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
    id: 'learning_objectives',
    type: 'content',
    name: 'Learning Objectives',
    description: 'Animated bullet list of lesson objectives',
    defaultBlocks: [
      {
        block_type: 'content_list',
        data: {
          items: [
            { html: '<p>Describe the first learning objective</p>', animation: 'left' },
            { html: '<p>Describe the second learning objective</p>', animation: 'right' },
            { html: '<p>Describe the third learning objective</p>', animation: 'up' },
          ],
          bullet_style: 'disc',
          font_size: 'auto',
          enable_animations: true,
          animation_stagger_ms: 150,
        },
      },
    ],
    defaultSettings: {},
    accentColor: '#0891B2',
  },
  {
    id: 'references',
    type: 'content',
    name: 'References',
    description: 'Citation list with rich text links — no animations',
    defaultBlocks: [
      {
        block_type: 'content_list',
        data: {
          items: [
            { html: '<p><strong>Author, A.</strong> (2024). <em>Title of article</em>. <a href="https://example.com" target="_blank">https://example.com</a></p>', animation: 'none' },
            { html: '<p><strong>Organization.</strong> (2023). <em>Resource name</em>. Retrieved from <a href="https://example.com" target="_blank">link</a></p>', animation: 'none' },
          ],
          bullet_style: 'decimal',
          font_size: 'auto',
          enable_animations: false,
        },
      },
    ],
    defaultSettings: {},
    accentColor: '#64748B',
  },
  {
    id: 'content',
    type: 'content',
    name: 'Content',
    description: 'Text content with optional image',
    defaultBlocks: [
      { block_type: 'rich_text', data: { html: '<h2>Title</h2><p>Your content here...</p>', mode: 'standard' } },
    ],
    defaultSettings: {},
    accentColor: '#2563EB',
  },
  {
    id: 'media',
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
    id: 'quiz',
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
    id: 'disclaimer',
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
    id: 'interactive',
    type: 'interactive',
    name: 'Interactive',
    description: 'Embedded interactive content',
    defaultBlocks: [
      { block_type: 'iframe', data: { url: '', height: 600 } },
    ],
    defaultSettings: {},
    accentColor: '#0099CA',
  },
  {
    id: 'canvas',
    type: 'canvas',
    name: 'Freeform Canvas',
    description: 'Free-form layout with tldraw — place content anywhere',
    defaultBlocks: [],
    defaultSettings: {},
    accentColor: '#8B5CF6',
  },
];

export function getTemplateByType(type: SlideType): SlideTemplateConfig | undefined {
  // Prefer template whose id matches the slide type (e.g. id "content" not "learning_objectives")
  return SLIDE_TEMPLATES.find((t) => t.id === type) ?? SLIDE_TEMPLATES.find((t) => t.type === type);
}

export function getTemplateById(id: string): SlideTemplateConfig | undefined {
  return SLIDE_TEMPLATES.find((t) => t.id === id);
}
