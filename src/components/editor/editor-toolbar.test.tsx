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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/gansid/admin/courses/course-1/editor',
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
      <EditorToolbar onSave={onSave} devicePreview="desktop" onDevicePreviewChange={() => {}} />
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

  // ── Regression: draft slides in a published course must stay publishable ──────
  // A published course whose individual slides were flipped to draft (edit-then-
  // republish, or draft-by-default new slides) and then SAVED lands in
  // courseStatus='published' + isDirty=false. Gating Publish on those two alone
  // left the button reading "Published" and disabled — trapping the drafts with no
  // way to publish them. The button must derive its state from the slides too.
  function loadWithDraftSlide(status: 'published' | 'draft' = 'published') {
    const slides = new Map<string, unknown>([
      ['l1', [
        { id: 's1', title: 'Slide 1', lesson_id: 'l1', order_index: 0, slide_type: 'content', status: 'published' },
        { id: 's2', title: 'Slide 2', lesson_id: 'l1', order_index: 1, slide_type: 'content', status: 'draft' },
      ]],
    ]);
    store.getState().loadCourse({
      courseId: 'c1',
      courseStatus: status,
      modules: [],
      lessons: new Map(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slides: slides as any,
      blocks: new Map(),
    });
  }

  it('keeps Publish actionable when the course is published but a slide is still draft', () => {
    loadWithDraftSlide('published');
    // Not dirty (loadCourse clears it), course published, yet one draft slide exists.
    expect(store.getState().isDirty).toBe(false);
    renderWithStore(store);
    const btn = screen.getByRole('button', { name: /publish/i });
    expect(btn).toBeEnabled();
    // It is NOT the disabled "Published" done-state...
    expect(screen.queryByText('Published')).not.toBeInTheDocument();
    // ...and it surfaces the draft count so the admin knows why it's active.
    expect(btn).toHaveTextContent('1');
  });

  it('publishes the drafts when clicked in the stuck state', () => {
    loadWithDraftSlide('published');
    const publishSpy = vi.spyOn(store.getState(), 'publishCourse');
    renderWithStore(store);
    fireEvent.click(screen.getByRole('button', { name: /publish/i }));
    expect(publishSpy).toHaveBeenCalled();
  });

  it('shows the disabled Published state only when every slide is published', () => {
    const slides = new Map<string, unknown>([
      ['l1', [
        { id: 's1', title: 'Slide 1', lesson_id: 'l1', order_index: 0, slide_type: 'content', status: 'published' },
      ]],
    ]);
    store.getState().loadCourse({
      courseId: 'c1',
      courseStatus: 'published',
      modules: [],
      lessons: new Map(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      slides: slides as any,
      blocks: new Map(),
    });
    renderWithStore(store);
    const btn = screen.getByRole('button', { name: /published/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Published');
  });

  it('displays publishError text when publishError is set', () => {
    store.setState({ publishError: 'Failed to publish' });
    renderWithStore(store);
    expect(screen.getByText('Failed to publish')).toBeInTheDocument();
  });

  it('does not display publishError when publishError is null', () => {
    store.setState({ publishError: null });
    renderWithStore(store);
    expect(screen.queryByText(/failed to publish/i)).not.toBeInTheDocument();
  });
});
