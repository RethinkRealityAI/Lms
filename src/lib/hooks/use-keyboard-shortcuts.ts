import { useEffect } from 'react';

interface ShortcutHandlers {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onPrevSlide?: () => void;
  onNextSlide?: () => void;
}

function isEditableTarget(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target || typeof target.tagName !== 'string') return false;
  const tag = target.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag)) return true;
  if (target.isContentEditable || target.contentEditable === 'true') return true;
  return false;
}

export function useKeyboardShortcuts({
  onSave,
  onUndo,
  onRedo,
  onDelete,
  onPrevSlide,
  onNextSlide,
}: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 's') {
        e.preventDefault();
        onSave?.();
      } else if (ctrl && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        onRedo?.();
      } else if (ctrl && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        onUndo?.();
      } else if (ctrl && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        onRedo?.();
      } else if (e.key === 'Delete') {
        if (isEditableTarget(e)) return;
        onDelete?.();
      } else if (e.key === 'ArrowLeft') {
        if (isEditableTarget(e)) return;
        onPrevSlide?.();
      } else if (e.key === 'ArrowRight') {
        if (isEditableTarget(e)) return;
        onNextSlide?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onUndo, onRedo, onDelete, onPrevSlide, onNextSlide]);
}
