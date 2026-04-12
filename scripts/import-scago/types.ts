// ─── SCAGO Import Pipeline — Type Definitions ─────────────────────────────────

export interface ModuleDef {
  number: number;
  title: string;
  slug: string;
  file: string;
  expectedLessons: number;
}

export interface ParsedBlock {
  kind: 'rich_text' | 'image_gallery' | 'video' | 'quiz_inline';
  data: RichTextData | ImageGalleryData | VideoData | QuizInlineData;
}

export interface RichTextData {
  html: string;
  mode: 'scrolling';
}

export interface ImageGalleryData {
  images: { url: string; caption: string | null }[];
  mode: 'gallery';
}

export interface VideoData {
  url: string;
  provider: 'youtube';
}

export interface QuizInlineData {
  question: string;
  options: string[];
  correct_answer: string;
  question_type: 'multiple_choice' | 'true_false' | 'select_all';
  show_feedback: true;
  explanation?: string;
}

export interface ParsedSlide {
  title: string;
  blocks: ParsedBlock[];
}

export interface ParsedLesson {
  title: string;
  slides: ParsedSlide[];
}

export interface ParsedModule {
  def: ModuleDef;
  lessons: ParsedLesson[];
}
