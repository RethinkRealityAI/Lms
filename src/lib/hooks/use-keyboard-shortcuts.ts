import { useEffect } from 'react';

interface ShortcutHandlers {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useKeyboardShortcuts({ onSave, onUndo, onRedo }: ShortcutHandlers) {
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
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onUndo, onRedo]);
}
