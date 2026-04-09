import {
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  ListChecks,
  Quote,
  Image as ImageIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface BlockPreset {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  blockType: string;
  data: Record<string, unknown>;
}

export const BLOCK_PRESETS: BlockPreset[] = [
  {
    id: 'key-takeaway',
    label: 'Key Takeaway',
    description: 'Highlighted learning point',
    icon: Lightbulb,
    color: 'text-amber-500 bg-amber-50',
    blockType: 'callout',
    data: { variant: 'info', title: 'Key Takeaway', html: '<p>The main point your learners should remember...</p>' },
  },
  {
    id: 'warning-note',
    label: 'Warning',
    description: 'Important caution or disclaimer',
    icon: AlertTriangle,
    color: 'text-red-500 bg-red-50',
    blockType: 'callout',
    data: { variant: 'warning', title: 'Important', html: '<p>Please be aware that...</p>' },
  },
  {
    id: 'true-false',
    label: 'True / False',
    description: 'Quick knowledge check',
    icon: HelpCircle,
    color: 'text-green-500 bg-green-50',
    blockType: 'quiz_inline',
    data: {
      question_type: 'multiple_choice',
      question: 'Is this statement true or false?',
      options: ['True', 'False'],
      correct_answer: 'True',
      show_feedback: true,
    },
  },
  {
    id: 'multi-choice-4',
    label: '4-Option Quiz',
    description: 'Standard multiple choice',
    icon: ListChecks,
    color: 'text-orange-500 bg-orange-50',
    blockType: 'quiz_inline',
    data: {
      question_type: 'multiple_choice',
      question: 'Which of the following is correct?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: 'Option A',
      show_feedback: true,
    },
  },
  {
    id: 'pull-quote',
    label: 'Pull Quote',
    description: 'Emphasized quotation',
    icon: Quote,
    color: 'text-indigo-500 bg-indigo-50',
    blockType: 'rich_text',
    data: {
      html: '<blockquote><p>"Add an impactful quote here that reinforces the lesson content."</p><p>— Attribution</p></blockquote>',
    },
  },
  {
    id: 'image-with-caption',
    label: 'Image + Caption',
    description: 'Single image with description',
    icon: ImageIcon,
    color: 'text-teal-500 bg-teal-50',
    blockType: 'image_gallery',
    data: {
      mode: 'gallery',
      images: [{ url: '', alt: '', caption: 'Describe this image...' }],
    },
  },
];
