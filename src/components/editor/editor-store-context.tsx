'use client';

import { createContext, useContext } from 'react';
import { useStore } from 'zustand/react';
import type { EditorStore } from '@/lib/stores/editor-store';

export const EditorStoreContext = createContext<EditorStore | null>(null);

export function useEditorStore<T>(
  selector: (state: ReturnType<EditorStore['getState']>) => T
): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error('useEditorStore must be used within EditorStoreContext.Provider');
  return useStore(store, selector);
}
