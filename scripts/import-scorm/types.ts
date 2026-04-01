export interface EdAppContentItem {
  content: string;
  contentType: 'text' | 'image' | 'video';
  caption?: string;
}

export interface EdAppSlideData {
  title?: string;
  titleType?: string;
  content?: EdAppContentItem[];
  items?: EdAppSlideItem[];
  pins?: EdAppPin[];
  categories?: EdAppCategory[];
  buttonText?: string;
  doneText?: string;
  prompt?: string;
  options?: Array<string | { text?: string; content?: string }>;
  correctAnswer?: number;
  correctAnswerIndex?: number;
}

export interface EdAppSlideItem {
  content: string;
  contentType: 'text' | 'image';
  caption?: string;
  position?: string;
  imagePosition?: string;
}

export interface EdAppPin {
  x: number;
  y: number;
  title?: string;
  description?: string;
}

export interface EdAppCategory {
  name: string;
  items: string[];
}

export type EdAppSlideType = 'scrolling-media' | 'image-slider' | 'image-gallery' | 'text-sequence' | 'image-map' | 'categorise' | 'exit';

export interface EdAppSlide {
  id: string;
  type: EdAppSlideType;
  subtype?: string;
  name: number;
  displayIndex: number;
  data: EdAppSlideData;
}

export interface EdAppConfig {
  id: string;
  title: string;
  index: number;
  slides: EdAppSlide[];
  config: {
    language: string;
    minimumScore?: number;
  };
}

export interface ExtractedLesson {
  edappId: string;
  title: string;
  orderIndex: number;
  slides: EdAppSlide[];
  mediaFiles: string[];
}

export interface MappedBlock {
  edapp_slide_id: string;
  block_type: string;
  order_index: number;
  title?: string;
  data: Record<string, unknown>;
}
