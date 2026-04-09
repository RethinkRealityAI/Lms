'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface AddEntityDialogProps {
  entityType: 'module' | 'lesson';
  onAdd: (title: string) => void;
  onClose: () => void;
}

export function AddEntityDialog({ entityType, onAdd, onClose }: AddEntityDialogProps) {
  const [title, setTitle] = useState('');
  const label = entityType === 'module' ? 'Module' : 'Lesson';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Add {label}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {label} title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()} title...`}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent"
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-[#1E3A5F] rounded-lg hover:bg-[#162d4a] disabled:opacity-50"
            >
              Add {label}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
