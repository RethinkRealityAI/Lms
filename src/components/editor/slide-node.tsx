'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, Move, Copy, Pencil, ChevronUp, ChevronDown } from 'lucide-react';
import { SlideThumbnail } from './slide-thumbnail';
import { useEditorStore } from './editor-store-context';
import { MoveSlideDialog } from './move-slide-dialog';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { createClient } from '@/lib/supabase/client';
import { deleteSlide as dbDeleteSlide } from '@/lib/db/slides';
import type { Slide } from '@/types';

const EMPTY_SLIDES: Slide[] = [];

interface SlideNodeProps {
  slide: Slide;
  lessonId: string;
  slideIndex: number;
  onMoveSlide?: (slideId: string, fromLessonId: string, toLessonId: string) => void;
  onDuplicateSlide?: (slideId: string, lessonId: string) => void;
}

export function SlideNode({ slide, lessonId, slideIndex, onMoveSlide, onDuplicateSlide }: SlideNodeProps) {
  const selectedEntity = useEditorStore((s) => s.selectedEntity);
  const selectEntity = useEditorStore((s) => s.selectEntity);
  const removeSlide = useEditorStore((s) => s.removeSlide);
  const updateSlide = useEditorStore((s) => s.updateSlide);
  const reorderSlides = useEditorStore((s) => s.reorderSlides);
  const lessonSlides = useEditorStore((s) => s.slides.get(lessonId) ?? EMPTY_SLIDES);
  const institutionId = useEditorStore((s) => s.institutionId);
  const modules = useEditorStore((s) => s.modules);
  const lessons = useEditorStore((s) => s.lessons);
  const slideBlocks = useEditorStore((s) => s.blocks.get(slide.id));
  const isSelected = selectedEntity?.type === 'slide' && selectedEntity.id === slide.id;
  // Keep the slide highlighted while editing a block that lives on it, so the
  // structure panel always reflects the slide currently being worked on.
  const containsSelectedBlock =
    selectedEntity?.type === 'block' &&
    (slideBlocks?.some((b) => b.id === selectedEntity.id) ?? false);
  const isActive = isSelected || containsSelectedBlock;

  const isFirst = slideIndex === 0;
  const isLast = slideIndex >= lessonSlides.length - 1;

  function moveSlide(e: React.MouseEvent, dir: -1 | 1) {
    e.stopPropagation();
    const target = slideIndex + dir;
    if (target < 0 || target >= lessonSlides.length) return;
    const ids = lessonSlides.map((s) => s.id);
    [ids[slideIndex], ids[target]] = [ids[target], ids[slideIndex]];
    reorderSlides(lessonId, ids);
  }

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  // Trash button: open the in-app confirmation modal (not the native browser dialog).
  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setContextMenu(null);
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    setShowDeleteConfirm(false);
    // DB-first (matches the shell's delete path): persist the soft-delete BEFORE
    // removing it locally, otherwise the slide reappears on refresh because the
    // editor load query filters on deleted_at IS NULL. Without this the structure-
    // panel trash button only mutated local state and never hit the database.
    try {
      const supabase = createClient();
      if (institutionId) {
        await dbDeleteSlide(supabase, slide.id, institutionId);
      }
      removeSlide(lessonId, slide.id);
      // If the deleted slide was selected, fall back to its parent lesson.
      if (selectedEntity?.type === 'slide' && selectedEntity.id === slide.id) {
        selectEntity({ type: 'lesson', id: lessonId });
      }
    } catch (err) {
      console.error('Failed to delete slide:', err);
      alert('Could not delete the slide. Please try again.');
    }
  }

  // Build lessons map for MoveSlideDialog (moduleId → lessons)
  const lessonsMap = new Map<string, { id: string; title: string }[]>();
  for (const mod of modules) {
    const modLessons = lessons.get(mod.id) ?? [];
    lessonsMap.set(mod.id, modLessons.map(l => ({ id: l.id, title: l.title })));
  }

  const displayTitle = slide.title || slide.slide_type;
  const slideLabel = `${slideIndex + 1}. ${displayTitle}`;

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
          isActive ? 'bg-[#DC2626] text-white' : 'hover:bg-gray-50 text-gray-600'
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
          <>
            <span className="text-[10px] font-semibold tabular-nums shrink-0 opacity-70">{slideIndex + 1}</span>
            <span className="text-xs truncate flex-1 min-w-0" title={slideLabel}>
              {displayTitle}
            </span>
            {slide.status !== 'published' && (
              <span
                className={`shrink-0 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-px rounded-full border ${
                  isActive
                    ? 'bg-white/15 border-white/30 text-amber-100'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}
                title="Draft — not visible to students until the course is published"
              >
                Draft
              </span>
            )}
          </>
        )}
        {!isRenaming && (
          <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => moveSlide(e, -1)}
              disabled={isFirst}
              title="Move slide up"
              className={`p-0.5 rounded disabled:opacity-30 disabled:cursor-not-allowed ${
                isActive ? 'hover:bg-red-700' : 'hover:bg-gray-200'
              }`}
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => moveSlide(e, 1)}
              disabled={isLast}
              title="Move slide down"
              className={`p-0.5 rounded disabled:opacity-30 disabled:cursor-not-allowed ${
                isActive ? 'hover:bg-red-700' : 'hover:bg-gray-200'
              }`}
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={handleDelete}
              title="Delete slide"
              className={`p-0.5 rounded ${isActive ? 'hover:bg-red-700' : 'hover:bg-gray-200'}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
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

      {/* In-app delete confirmation (replaces the native browser confirm dialog) */}
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        entityType="slide"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
