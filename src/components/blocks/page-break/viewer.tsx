'use client';

/**
 * Page Break Viewer — renders nothing in the student view.
 * The course-viewer splits blocks into pages at page_break blocks,
 * so this component is never actually displayed to students.
 * It exists only to satisfy the block registry.
 */
export default function PageBreakViewer() {
  return null;
}
