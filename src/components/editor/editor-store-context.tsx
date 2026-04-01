'use client';

import { createContext, useContext, useRef, useCallback } from 'react';
import { useStore } from 'zustand/react';
import type { EditorStore } from '@/lib/stores/editor-store';

export const EditorStoreContext = createContext<EditorStore | null>(null);

/**
 * Zustand selector hook with referential stability.
 *
 * React 19's useSyncExternalStore requires getSnapshot to return a cached value
 * when the underlying data hasn't changed.  Selectors like `s.lessons.get(id) ?? []`
 * create a NEW empty array on every invocation, which useSyncExternalStore
 * interprets as a change → re-render → new array → infinite loop.
 *
 * We wrap useStore with a custom equality function that does shallow comparison
 * for arrays and Maps so that structurally-equal results are treated as identical.
 */
function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  // Both arrays – compare length + each element by identity
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  // Both Maps – compare size + entries by identity
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!Object.is(val, b.get(key))) return false;
    }
    return true;
  }

  // Both plain objects (but not null) – shallow compare keys
  if (
    a !== null && b !== null &&
    typeof a === 'object' && typeof b === 'object' &&
    !Array.isArray(a) && !Array.isArray(b) &&
    !(a instanceof Map) && !(b instanceof Map)
  ) {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
    }
    return true;
  }

  return false;
}

export function useEditorStore<T>(
  selector: (state: ReturnType<EditorStore['getState']>) => T
): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error('useEditorStore must be used within EditorStoreContext.Provider');

  // Cache the previous result to provide referential stability
  const prevRef = useRef<T | undefined>(undefined);
  const stableSelector = useCallback(
    (state: ReturnType<EditorStore['getState']>) => {
      const next = selector(state);
      if (prevRef.current !== undefined && shallowEqual(prevRef.current, next)) {
        return prevRef.current;
      }
      prevRef.current = next;
      return next;
    },
    [selector],
  );

  return useStore(store, stableSelector);
}
