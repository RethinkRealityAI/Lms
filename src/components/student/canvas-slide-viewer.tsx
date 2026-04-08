'use client';

import { useCallback, useRef } from 'react';
import { Tldraw, type Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { lmsShapeUtils } from '@/lib/canvas/register-shapes';
import { loadCanvasSnapshot, fitCanvasToContent } from '@/lib/canvas/canvas-utils';
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

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    editor.updateInstanceState({ isReadonly: true });
    loadCanvasSnapshot(editor, canvasData);
    fitCanvasToContent(editor);
  }, [canvasData]);

  return (
    <div className="w-full h-full relative">
      <Tldraw
        shapeUtils={lmsShapeUtils}
        onMount={handleMount}
        hideUi
      />
    </div>
  );
}
