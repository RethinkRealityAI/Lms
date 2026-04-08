import { LmsQuizShapeUtil } from './shapes/lms-quiz-shape';
import { LmsCalloutShapeUtil } from './shapes/lms-callout-shape';
import { LmsCtaShapeUtil } from './shapes/lms-cta-shape';
import { LmsVideoShapeUtil } from './shapes/lms-video-shape';

export const lmsShapeUtils = [
  LmsQuizShapeUtil,
  LmsCalloutShapeUtil,
  LmsCtaShapeUtil,
  LmsVideoShapeUtil,
];

export const CANVAS_BLOCK_TYPES = [
  { type: 'quiz_inline', shapeType: 'lms-quiz', label: 'Quiz', icon: '?' },
  { type: 'callout', shapeType: 'lms-callout', label: 'Callout', icon: 'i' },
  { type: 'cta', shapeType: 'lms-cta', label: 'CTA Button', icon: '#' },
  { type: 'video', shapeType: 'lms-video', label: 'Video', icon: '>' },
] as const;
