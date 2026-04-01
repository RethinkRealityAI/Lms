import type { EdAppSlide, MappedBlock } from './types';

export function mapSlideToBlock(slide: EdAppSlide, orderIndex: number): MappedBlock {
  const mapper = SLIDE_MAPPERS[slide.type];
  if (!mapper) {
    return {
      edapp_slide_id: slide.id,
      block_type: 'rich_text',
      order_index: orderIndex,
      data: { html: '', mode: 'fallback', original_type: slide.type },
    };
  }
  return mapper(slide, orderIndex);
}

export function mapSlidesToBlocks(slides: EdAppSlide[]): MappedBlock[] {
  return slides.map((slide, i) => mapSlideToBlock(slide, i));
}

function mapScrollingMedia(slide: EdAppSlide, orderIndex: number): MappedBlock {
  const content = slide.data.content ?? [];
  const htmlParts: string[] = [];
  const media: Array<{ type: string; url: string }> = [];

  for (const item of content) {
    if (item.contentType === 'text') {
      htmlParts.push(item.content);
    } else if (item.contentType === 'image') {
      media.push({ type: 'image', url: item.content });
      htmlParts.push(`<img src="${item.content}" alt="" />`);
    }
  }

  return {
    edapp_slide_id: slide.id,
    block_type: 'rich_text',
    order_index: orderIndex,
    title: slide.data.title?.replace(/<[^>]+>/g, '') ?? undefined,
    data: { html: htmlParts.join('\n'), media, mode: 'scrolling' },
  };
}

function mapImageSlider(slide: EdAppSlide, orderIndex: number): MappedBlock {
  const images = (slide.data.items ?? [])
    .filter((item) => item.contentType === 'image')
    .map((item) => ({ url: item.content, caption: item.caption ?? null }));

  return {
    edapp_slide_id: slide.id,
    block_type: 'image_gallery',
    order_index: orderIndex,
    data: { images, mode: 'slider' },
  };
}

function mapImageGallery(slide: EdAppSlide, orderIndex: number): MappedBlock {
  const images = (slide.data.items ?? [])
    .filter((item) => item.contentType === 'image')
    .map((item) => ({ url: item.content, caption: item.caption ?? null }));

  return {
    edapp_slide_id: slide.id,
    block_type: 'image_gallery',
    order_index: orderIndex,
    data: { images, mode: 'gallery' },
  };
}

function mapTextSequence(slide: EdAppSlide, orderIndex: number): MappedBlock {
  const segments = (slide.data.items ?? []).map((item, i) => ({
    text: item.content,
    reveal_order: i,
  }));
  return {
    edapp_slide_id: slide.id,
    block_type: 'rich_text',
    order_index: orderIndex,
    data: { segments, mode: 'sequence' },
  };
}

function mapImageMap(slide: EdAppSlide, orderIndex: number): MappedBlock {
  return {
    edapp_slide_id: slide.id,
    block_type: 'hotspot',
    order_index: orderIndex,
    data: { image_url: '', regions: slide.data.pins ?? [] },
  };
}

function mapCategorise(slide: EdAppSlide, orderIndex: number): MappedBlock {
  return {
    edapp_slide_id: slide.id,
    block_type: 'quiz_inline',
    order_index: orderIndex,
    data: {
      question_type: 'categorize',
      categories: slide.data.categories ?? [],
      instructions: slide.data.prompt ?? 'Sort the items into the correct categories.',
    },
  };
}

function mapMultipleChoiceGame(slide: EdAppSlide, orderIndex: number): MappedBlock {
  // EdApp multiple-choice-game: has prompt, options array, and correctAnswer index
  const options: string[] = (slide.data.options ?? []).map((o) =>
    typeof o === 'string' ? o : (o.text ?? o.content ?? '')
  );
  const correctIndex: number = slide.data.correctAnswer ?? slide.data.correctAnswerIndex ?? 0;
  const correctAnswer: string = options[correctIndex] ?? options[0] ?? '';

  return {
    edapp_slide_id: slide.id,
    block_type: 'quiz_inline',
    order_index: orderIndex,
    data: {
      question_type: 'multiple_choice',
      question: slide.data.prompt ?? slide.data.title ?? '',
      options,
      correct_answer: correctAnswer,
      show_feedback: true,
    },
  };
}

function mapExit(slide: EdAppSlide, orderIndex: number): MappedBlock {
  return {
    edapp_slide_id: slide.id,
    block_type: 'cta',
    order_index: orderIndex,
    data: {
      action: 'complete_lesson',
      text: typeof slide.data.content === 'string' ? slide.data.content : 'You have completed this lesson.',
      button_label: slide.data.buttonText ?? 'Continue',
    },
  };
}

type SlideMapper = (slide: EdAppSlide, index: number) => MappedBlock;

const SLIDE_MAPPERS: Partial<Record<string, SlideMapper>> = {
  'scrolling-media': mapScrollingMedia,
  'image-slider': mapImageSlider,
  'image-gallery': mapImageGallery,
  'text-sequence': mapTextSequence,
  'image-map': mapImageMap,
  'categorise': mapCategorise,
  'multiple-choice-game': mapMultipleChoiceGame,
  'exit': mapExit,
};
