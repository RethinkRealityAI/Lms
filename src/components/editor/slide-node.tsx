'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, Move, Copy, Pencil } from 'lucide-react';
import { SlideThumbnail } from './slide-thumbnail';
import { useEditorStore } from './editor-store-context';
import { MoveSlideDialog } from './move-slide-dialog';
import type { Slide } from '@/types';

interface SlideNodeProps {
  slide: Slide;
  lessonId: string;
  onMoveSlide?: (slideId: string, fromLessonId: string, toLessonId: string) => void;
  onDuplicateSlide?: (slideId: string, lessonId: string) => void;
}

export function SlideNode({ slide, lessonId, onMoveSlide, onDuplicateSlide }: SlideNodeProps) {
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const selectEntity = useEditorStore((s) => s.selectEntity);
  const removeSlide = useEditorStore((s) => s.removeSlide);
  const updateSlide = useEditorStore((s) => s.updateSlide);
  const modules = useEditorStore((s) => s.modules);
  const lessons = useEditorStore((s) => s.lessons);
  const isSelected = selectedEntity?.type === 'slide' && selectedEntity.id === slide.id;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = (e: MouseEvent) => {
      if (contextMenuRef.current?.contains(e.target as Node)) return;
      setContextMenu(null);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClose);
      document.addEventListener('keydown', handleEsc);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenu]);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  function startRename() {
    setRenameValue(slide.title ?? '');
    setIsRenaming(true);
  }

  function commitRename() {
    const trimmed = renameValue.trim();
    const current = slide.title ?? '';
    if (trimmed !== current) {
      updateSlide(lessonId, slide.id, { title: trimmed || null });
    }
    setIsRenaming(false);
  }

  function cancelRename() {
    setIsRenaming(false);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(`Delete slide "${slide.title ?? slide.slide_type}"?`)) {
      removeSlide(lessonId, slide.id);
    }
  }

  // Build lessons map for MoveSlideDialog (moduleId → lessons)
  const lessonsMap = new Map<string, { id: string; title: string }[]>();
  for (const mod of modules) {
    const modLessons = lessons.get(mod.id) ?? [];
    lessonsMap.set(mod.id, modLessons.map(l => ({ id: l.id, title: l.title })));
  }

  const displayTitle = slide.title || slide.slide_type;

  return (
    <>
      <div
        onClick={() => selectEntity({ type: 'slide', id: slide.id })}
        onDoubleClick={(e) => {
          e.stopPropagation();
          startRename();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        className={`flex items-center gap-1.5 px-2 py-1.5 ml-8 rounded cursor-pointer group transition-colors ${
          isSelected ? 'bg-[#DC2626] text-white' : 'hover:bg-gray-50 text-gray-600'
        }`}
      >
        <SlideThumbnail slide={slide} />
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') cancelRename();
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs flex-1 min-w-0 bg-white text-gray-800 px-1.5 py-0.5 rounded border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            maxLength={200}
            placeholder={slide.slide_type}
          />
        ) : (
          <span className="text-xs truncate flex-1 min-w-0" title={displayTitle}>
            {displayTitle}
          </span>
        )}
        {!isRenaming && (
          <button
            onClick={handleDelete}
            className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
              isSelected ? 'hover:bg-red-700' : 'hover:bg-gray-200'
            }`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[90] bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              startRename();
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="w-3.5 h-3.5" />
            Rename
          </button>
          {onDuplicateSlide && (
            <button
              onClick={() => {
                onDuplicateSlide(slide.id, lessonId);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </button>
          )}
          {onMoveSlide && (
            <button
              onClick={() => {
                setShowMoveDialog(true);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Move className="w-3.5 h-3.5" />
              Move to...
            </button>
          )}
          <button
            onClick={(e) => {
              handleDelete(e);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}

      {/* Move slide dialog */}
      {showMoveDialog && (
        <MoveSlideDialog
          modules={modules.map(m => ({ id: m.id, title: m.title }))}
          lessons={lessonsMap}
          currentLessonId={lessonId}
          onMove={(targetLessonId) => {
            onMoveSlide?.(slide.id, lessonId, targetLessonId);
          }}
          onClose={() => setShowMoveDialog(false)}
        />
      )}
    </>
  );
}
