import type { Lesson, LessonBlock, LessonBlockType } from "@/types";
import { getBlockGridLayout } from "./gridConstants";

export function mapLegacyContentTypeToBlockType(contentType: Lesson["content_type"]): LessonBlockType {
  switch (contentType) {
    case "video":
      return "video";
    case "pdf":
      return "pdf";
    case "iframe":
      return "iframe";
    case "3d":
      return "model3d";
    default:
      return "rich_text";
  }
}

export function createLegacyBlockPayload(lesson: Pick<Lesson, "content_type" | "content_url" | "title" | "description">) {
  return {
    url: lesson.content_url,
    title: lesson.title,
    description: lesson.description || "",
  };
}

export function sortBlocks(blocks: LessonBlock[]): LessonBlock[] {
  return [...blocks].sort((a, b) => a.order_index - b.order_index);
}

/**
 * Order blocks the way the EDITOR renders them: by grid position — gridY, then gridX —
 * falling back to order_index only when the grid coordinates tie (e.g. imported blocks
 * that were never positioned, all gridY=0). This is the exact key slide-preview.tsx uses
 * for its visual top-to-bottom order, so the student viewer stays byte-for-byte WYSIWYG
 * with the editor even when a slide's blocks are full-width (where the viewer would
 * otherwise fall back to a stale order_index stack). See slide-preview.tsx's block sort.
 */
export function sortBlocksByGrid(blocks: LessonBlock[]): LessonBlock[] {
  return [...blocks].sort((a, b) => {
    const ga = getBlockGridLayout((a.data ?? {}) as Record<string, unknown>);
    const gb = getBlockGridLayout((b.data ?? {}) as Record<string, unknown>);
    return ga.gridY - gb.gridY || ga.gridX - gb.gridX || a.order_index - b.order_index;
  });
}
