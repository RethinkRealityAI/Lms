'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorToolbar } from './editor-toolbar';
import { EditorStoreContext } from './editor-store-context';
import { createEditorStore } from '@/lib/stores/editor-store';
import type { EditorStore } from '@/lib/stores/editor-store';

vi.mock('@/lib/db', () => ({
  publishCourse: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { institution_id: 'inst-1' }, error: null }),
        }),
      }),
    }),
  })),
}));

function renderWithStore(store: EditorStore, onSave?: () => void) {
  return render(
    <EditorStoreContext.Provider value={store}>
      <EditorToolbar onSave={onSave} />
    </EditorStoreContext.Provider>,
  );
}

describe('EditorToolbar', () => {
  let store: EditorStore;

  beforeEach(() => {
    store = createEditorStore();
  });

  it('shows Publish button when courseStatus is draft', () => {
    store.getState().setCourseStatus('draft');
    renderWithStore(store);
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
  });

  it('shows Published check when courseStatus is published', () => {
    store.getState().setCourseStatus('published');
    renderWithStore(store);
    expect(screen.getByText(/published/i)).toBeInTheDocument();
  });

  it('Publish button is disabled when courseStatus is published', () => {
    store.getState().setCourseStatus('published');
    renderWithStore(store);
    const btn = screen.getByRole('button', { name: /published/i });
    expect(btn).toBeDisabled();
  });

  it('calls publishCourse on click when draft', async () => {
    store.getState().loadCourse({
      courseId: 'c1',
      modules: [],
      lessons: new Map(),
      slides: new Map(),
      blocks: new Map(),
    });
    const publishSpy = vi.spyOn(store.getState(), 'publishCourse');
    renderWithStore(store);
    const btn = screen.getByRole('button', { name: /publish/i });
    fireEvent.click(btn);
    expect(publishSpy).toHaveBeenCalled();
  });

  it('shows Draft badge when courseStatus is draft', () => {
    store.getState().setCourseStatus('draft');
    renderWithStore(store);
    expect(screen.getByText(/draft/i)).toBeInTheDocument();
  });

  it('does not show Draft badge when courseStatus is published', () => {
    store.getState().setCourseStatus('published');
    renderWithStore(store);
    // "Published ✓" text is there but not the standalone "Draft" badge
    expect(screen.queryByText(/^draft$/i)).not.toBeInTheDocument();
  });

  it('shows spinner and Publishing... text and disables button when isPublishing is true', () => {
    store.setState({ isPublishing: true });
    renderWithStore(store);
    expect(screen.getByText(/publishing\.\.\./i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /publishing/i });
    expect(btn).toBeDisabled();
    // The Loader2 spinner should be rendered with animate-spin
    const spinner = btn.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
