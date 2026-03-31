import { useEffect, useRef, useCallback } from 'react';

export function useAutoSave(
  isDirty: boolean,
  saveFn: () => Promise<void>,
  delayMs: number = 2000
): { saveNow: () => Promise<void> } {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);

  // Keep ref up to date without retriggering the effect
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  useEffect(() => {
    if (!isDirty) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      await saveFnRef.current();
    }, delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isDirty, delayMs]);

  const saveNow = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await saveFnRef.current();
  }, []);

  return { saveNow };
}
