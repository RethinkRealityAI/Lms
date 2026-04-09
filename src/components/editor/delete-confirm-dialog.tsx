'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DeleteConfirmDialogProps {
  open: boolean;
  entityType: 'module' | 'lesson' | 'slide' | 'block' | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  open,
  entityType,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open || !entityType) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-gray-200 px-6 py-5 max-w-sm w-full mx-4 animate-in zoom-in-95 fade-in duration-150"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Delete {entityType}?</p>
            <p className="text-xs text-gray-500 mt-0.5">This action can&apos;t be undone.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} className="h-8 text-xs px-3">
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} className="h-8 text-xs px-3">
            Delete
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
