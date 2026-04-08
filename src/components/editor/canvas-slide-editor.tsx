'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Tldraw, createShapeId } from 'tldraw';
import type { Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { lmsShapeUtils, CANVAS_BLOCK_TYPES } from '@/lib/canvas/register-shapes';
import {
  serializeCanvas,
  loadCanvasSnapshot,
  fitCanvasToContent,
  createDesignFrame,
  CanvasBlockContext,
} from '@/lib/canvas/canvas-utils';
import type { Slide, LessonBlock } from '@/types';

interface CanvasSlideEditorProps {
  slide: Slide;
  blocks: LessonBlock[];
  onCanvasChange: (canvasData: Record<string, unknown>) => void;
  onAddBlock: (blockType: string) => Promise<LessonBlock | null>;
  onSelectBlock: (blockId: string | null) => void;
}

export default function CanvasSlideEditor({
  slide,
  blocks,
  onCanvasChange,
  onAddBlock,
  onSelectBlock,
}: CanvasSlideEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const isLoadingRef = useRef(false);
  const blockMapRef = useRef<Map<string, LessonBlock>>(new Map());

  // Keep blockMap ref in sync with blocks prop
  useEffect(() => {
    const map = new Map<string, LessonBlock>();
    for (const block of blocks) {
      map.set(block.id, block);
    }
    blockMapRef.current = map;
  }, [blocks]);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      isLoadingRef.current = true;

      try {
        if (slide.canvas_data) {
          loadCanvasSnapshot(editor, slide.canvas_data);
          fitCanvasToContent(editor);
        } else {
          createDesignFrame(editor);
          editor.zoomToFit({ animation: { duration: 0 } });
        }
      } finally {
        isLoadingRef.current = false;
      }

      // Listen for store changes and serialize
      const removeListener = editor.store.listen(
        () => {
          if (isLoadingRef.current) return;
          const data = serializeCanvas(editor);
          onCanvasChange(data);
        },
        { source: 'user', scope: 'document' },
      );

      return () => {
        removeListener();
      };
    },
    // We intentionally only depend on slide.id so that re-renders with the same slide
    // don't re-mount tldraw. onCanvasChange is captured via the closure at mount time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slide.id],
  );

  const handleAddLmsBlock = useCallback(
    async (blockType: string, shapeType: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      const newBlock = await onAddBlock(blockType);
      if (!newBlock) return;

      // Place shape at center of viewport
      const screenCenter = editor.getViewportScreenCenter();
      const pagePoint = editor.screenToPage(screenCenter);

      const shapeId = createShapeId();
      editor.createShape({
        id: shapeId,
        type: shapeType as 'lms-quiz' | 'lms-callout' | 'lms-cta' | 'lms-video',
        x: pagePoint.x - 150,
        y: pagePoint.y - 50,
        props: {
          blockId: newBlock.id,
        },
      });

      editor.select(shapeId);
      onSelectBlock(newBlock.id);
    },
    [onAddBlock, onSelectBlock],
  );

  // Memoize shapeUtils array so tldraw doesn't re-initialize
  const shapeUtils = useMemo(() => lmsShapeUtils, []);

  return (
    <div className="flex h-full w-full">
      {/* tldraw canvas */}
      <div className="flex-1 relative">
        <CanvasBlockContext.Provider value={{
          resolveBlock: (id) => blockMapRef.current.get(id),
          onQuizCorrect: undefined,
        }}>
          <Tldraw
            shapeUtils={shapeUtils}
            onMount={handleMount}
          />
        </CanvasBlockContext.Provider>
      </div>

      {/* LMS block palette sidebar */}
      <div className="w-48 shrink-0 border-l border-gray-200 bg-white p-3 flex flex-col gap-2 overflow-y-auto">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
          LMS Blocks
        </span>
        {CANVAS_BLOCK_TYPES.map((entry) => (
          <button
            key={entry.type}
            onClick={() => handleAddLmsBlock(entry.type, entry.shapeType)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
              {entry.icon}
            </span>
            {entry.label}
          </button>
        ))}
      </div>
    </div>
  );
}
