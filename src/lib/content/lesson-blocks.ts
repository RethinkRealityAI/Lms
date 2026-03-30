import type { Lesson, LessonBlock, LessonBlockType } from "@/types";

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
