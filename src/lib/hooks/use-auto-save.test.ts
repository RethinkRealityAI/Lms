import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './use-auto-save';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call saveFn when not dirty', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutoSave(false, saveFn, 1000));
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(saveFn).not.toHaveBeenCalled();
  });

  it('calls saveFn after delay when dirty', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutoSave(true, saveFn, 1000));
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(saveFn).toHaveBeenCalledOnce();
  });

  it('debounces multiple dirty triggers', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ dirty }) => useAutoSave(dirty, saveFn, 1000),
      { initialProps: { dirty: true } }
    );
    await act(async () => { vi.advanceTimersByTime(500); });
    rerender({ dirty: true });
    await act(async () => { vi.advanceTimersByTime(500); });
    rerender({ dirty: true });
    await act(async () => { vi.advanceTimersByTime(1500); });
    // Should only have called once (debounced)
    expect(saveFn).toHaveBeenCalledOnce();
  });

  it('saveNow triggers immediate save', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave(true, saveFn, 5000));
    await act(async () => { await result.current.saveNow(); });
    expect(saveFn).toHaveBeenCalledOnce();
  });
});
