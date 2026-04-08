'use client';

import { useCallback, useRef, useEffect, useMemo } from 'react';
import { Tldraw, type Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { lmsShapeUtils } from '@/lib/canvas/register-shapes';
import { loadCanvasSnapshot, fitCanvasToContent, CanvasBlockContext } from '@/lib/canvas/canvas-utils';
import type { LessonBlock } from '@/types';

interface CanvasSlideViewerProps {
  canvasData: Record<string, unknown>;
  blocks: LessonBlock[];
  onQuizCorrect?: (blockId: string) => void;
}

export default function CanvasSlideViewer({
  canvasData,
  blocks,
  onQuizCorrect,
}: CanvasSlideViewerProps) {
  const editorRef = useRef<Editor | null>(null);
  const blockMapRef = useRef(new Map<string, LessonBlock>());

  useEffect(() => {
    blockMapRef.current.clear();
    for (const b of blocks) blockMapRef.current.set(b.id, b);
  }, [blocks]);

  const contextValue = useMemo(() => ({
    resolveBlock: (id: string) => blockMapRef.current.get(id),
    onQuizCorrect,
  }), [onQuizCorrect]);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    editor.updateInstanceState({ isReadonly: true });
    loadCanvasSnapshot(editor, canvasData);
    fitCanvasToContent(editor);
  }, [canvasData]);

  return (
    <div className="w-full h-full relative">
      <CanvasBlockContext.Provider value={contextValue}>
        <Tldraw
          shapeUtils={lmsShapeUtils}
          onMount={handleMount}
          hideUi
        />
      </CanvasBlockContext.Provider>
    </div>
  );
}
