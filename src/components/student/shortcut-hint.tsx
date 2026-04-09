'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'gansid-shortcuts-dismissed';

export function ShortcutHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50" onClick={dismiss}>
      <div
        className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Keyboard Shortcuts</h3>
          <button onClick={dismiss} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {[
            { keys: '← →', desc: 'Navigate slides' },
            { keys: 'F', desc: 'Toggle fullscreen' },
            { keys: 'Esc', desc: 'Exit fullscreen' },
          ].map(({ keys, desc }) => (
            <div key={keys} className="flex items-center gap-3">
              <kbd className="px-2 py-0.5 text-xs font-mono bg-slate-100 border border-slate-200 rounded text-slate-700 min-w-[40px] text-center">
                {keys}
              </kbd>
              <span className="text-sm text-slate-600">{desc}</span>
            </div>
          ))}
        </div>
        <button
          onClick={dismiss}
          className="w-full py-2 text-sm font-medium text-white bg-[#1E3A5F] rounded-lg hover:bg-[#162d4a] transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
