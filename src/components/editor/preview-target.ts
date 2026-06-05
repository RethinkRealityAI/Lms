import type { EntitySelection, Slide } from '@/types';
import type { BlockData } from '@/lib/stores/editor-store';

export interface PreviewTarget {
  /** Lesson to open in the preview (null → first lesson of the course) */
  lessonId: string | null;
  /** Slide to jump to within that lesson (null → title slide) */
  slideId: string | null;
}

/**
 * Resolve which lesson + slide the preview should open on, based on the
 * editor's current selection. Used by both the in-editor lesson preview dialog
 * and the full-course preview route so "Preview" always lands the admin on the
 * exact slide they were editing instead of the start of the course.
 *
 * - lesson selected → that lesson's title slide
 * - slide selected  → that slide (and its owning lesson)
 * - block selected  → the slide containing the block (and its owning lesson)
 */
export function resolvePreviewTarget(
  selectedEntity: EntitySelection | null,
  slides: Map<string, Slide[]>,
  blocks: Map<string, BlockData[]>,
): PreviewTarget {
  if (!selectedEntity) return { lessonId: null, slideId: null };

  if (selectedEntity.type === 'lesson') {
    return { lessonId: selectedEntity.id, slideId: null };
  }

  if (selectedEntity.type === 'slide') {
    for (const [lessonId, list] of slides) {
      if (list.some((s) => s.id === selectedEntity.id)) {
        return { lessonId, slideId: selectedEntity.id };
      }
    }
    return { lessonId: null, slideId: selectedEntity.id };
  }

  if (selectedEntity.type === 'block') {
    let owningSlideId: string | null = null;
    for (const [slideId, blockList] of blocks) {
      if (blockList.some((b) => b.id === selectedEntity.id)) {
        owningSlideId = slideId;
        break;
      }
    }
    if (owningSlideId) {
      for (const [lessonId, list] of slides) {
        if (list.some((s) => s.id === owningSlideId)) {
          return { lessonId, slideId: owningSlideId };
        }
      }
    }
  }

  return { lessonId: null, slideId: null };
}
