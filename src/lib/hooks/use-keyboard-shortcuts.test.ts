import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './use-keyboard-shortcuts';

function fireKeyDown(key: string, options: Partial<KeyboardEventInit> = {}, target?: EventTarget) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...options });
  if (target) {
    Object.defineProperty(event, 'target', { value: target });
  }
  window.dispatchEvent(event);
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useKeyboardShortcuts — existing shortcuts', () => {
  it('calls onSave on Ctrl+S', () => {
    const onSave = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onSave }));
    fireKeyDown('s', { ctrlKey: true });
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('calls onUndo on Ctrl+Z', () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo }));
    fireKeyDown('z', { ctrlKey: true });
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('calls onRedo on Ctrl+Y', () => {
    const onRedo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onRedo }));
    fireKeyDown('y', { ctrlKey: true });
    expect(onRedo).toHaveBeenCalledOnce();
  });
});

describe('useKeyboardShortcuts — Delete key', () => {
  it('calls onDelete when Delete key is pressed', () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onDelete }));
    fireKeyDown('Delete');
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('does NOT call onDelete when focus is on an input', () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onDelete }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(onDelete).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('does NOT call onDelete when focus is on a textarea', () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onDelete }));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
    Object.defineProperty(event, 'target', { value: textarea });
    window.dispatchEvent(event);

    expect(onDelete).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it('does NOT call onDelete when focus is on a select', () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onDelete }));

    const select = document.createElement('select');
    document.body.appendChild(select);
    select.focus();

    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
    Object.defineProperty(event, 'target', { value: select });
    window.dispatchEvent(event);

    expect(onDelete).not.toHaveBeenCalled();
    document.body.removeChild(select);
  });

  it('does NOT call onDelete when focus is on a contenteditable element', () => {
    const onDelete = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onDelete }));

    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    div.focus();

    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
    Object.defineProperty(event, 'target', { value: div });
    window.dispatchEvent(event);

    expect(onDelete).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it('does not throw if onDelete is not provided', () => {
    renderHook(() => useKeyboardShortcuts({}));
    expect(() => fireKeyDown('Delete')).not.toThrow();
  });
});

describe('useKeyboardShortcuts — arrow key slide navigation', () => {
  it('calls onPrevSlide on ArrowLeft', () => {
    const onPrevSlide = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onPrevSlide }));
    fireKeyDown('ArrowLeft');
    expect(onPrevSlide).toHaveBeenCalledOnce();
  });

  it('calls onNextSlide on ArrowRight', () => {
    const onNextSlide = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onNextSlide }));
    fireKeyDown('ArrowRight');
    expect(onNextSlide).toHaveBeenCalledOnce();
  });

  it('does NOT call onPrevSlide when focus is on a textarea', () => {
    const onPrevSlide = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onPrevSlide }));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    Object.defineProperty(event, 'target', { value: textarea });
    window.dispatchEvent(event);

    expect(onPrevSlide).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it('does NOT call onNextSlide when focus is on an input', () => {
    const onNextSlide = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onNextSlide }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(onNextSlide).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('ArrowLeft does NOT call onPrevSlide when focused on a select element', () => {
    const onPrevSlide = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onPrevSlide }));

    const select = document.createElement('select');
    document.body.appendChild(select);
    select.focus();

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    Object.defineProperty(event, 'target', { value: select });
    window.dispatchEvent(event);

    expect(onPrevSlide).not.toHaveBeenCalled();
    document.body.removeChild(select);
  });

  it('ArrowRight does NOT call onNextSlide when focused on a select element', () => {
    const onNextSlide = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onNextSlide }));

    const select = document.createElement('select');
    document.body.appendChild(select);
    select.focus();

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(event, 'target', { value: select });
    window.dispatchEvent(event);

    expect(onNextSlide).not.toHaveBeenCalled();
    document.body.removeChild(select);
  });

  it('does NOT call onPrevSlide when focus is on a contenteditable element', () => {
    const onPrevSlide = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onPrevSlide }));

    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    div.focus();

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    Object.defineProperty(event, 'target', { value: div });
    window.dispatchEvent(event);

    expect(onPrevSlide).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it('does not throw if onPrevSlide is not provided', () => {
    renderHook(() => useKeyboardShortcuts({}));
    expect(() => fireKeyDown('ArrowLeft')).not.toThrow();
  });

  it('does not throw if onNextSlide is not provided', () => {
    renderHook(() => useKeyboardShortcuts({}));
    expect(() => fireKeyDown('ArrowRight')).not.toThrow();
  });
});

describe('useKeyboardShortcuts — ? key (shortcuts overlay)', () => {
  it('calls onShowShortcuts when ? is pressed', () => {
    const onShowShortcuts = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onShowShortcuts }));
    fireKeyDown('?');
    expect(onShowShortcuts).toHaveBeenCalledOnce();
  });

  it('does not throw if onShowShortcuts is not provided', () => {
    renderHook(() => useKeyboardShortcuts({}));
    expect(() => fireKeyDown('?')).not.toThrow();
  });

  it('does not call onShowShortcuts when Ctrl+? is pressed', () => {
    const onShowShortcuts = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onShowShortcuts }));
    fireKeyDown('?', { ctrlKey: true });
    expect(onShowShortcuts).not.toHaveBeenCalled();
  });
});
