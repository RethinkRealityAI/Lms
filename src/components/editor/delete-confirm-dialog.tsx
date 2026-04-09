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

  // Close if clicking outside the panel
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    // Delay to avoid the same click that opened it from closing it
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open, onCancel]);

  if (!open || !entityType) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-white border border-gray-200 shadow-xl rounded-xl px-4 py-3 animate-in slide-in-from-bottom-4 fade-in duration-200"
    >
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      <span className="text-sm text-gray-700">
        Delete this {entityType}? This can&apos;t be undone.
      </span>
      <div className="flex items-center gap-2 ml-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs">
          Cancel
        </Button>
        <Button variant="destructive" size="sm" onClick={onConfirm} className="h-7 text-xs">
          Delete
        </Button>
      </div>
    </div>,
    document.body,
  );
}
