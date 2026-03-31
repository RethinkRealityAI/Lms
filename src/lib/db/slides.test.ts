import { describe, it, expect, vi } from 'vitest';
import {
  getSlidesByLesson,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
  getSlideTemplates,
} from './slides';

function makeMockChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'is', 'order', 'in', 'or', 'delete'];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain['insert'] = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(resolvedValue),
    }),
  });
  chain['single'] = vi.fn().mockResolvedValue(resolvedValue);
  // Make the chain itself awaitable for queries without .single()
  chain['order'] = vi.fn().mockResolvedValue(resolvedValue);
  // Re-wire eq/is to return chain that resolves (and supports chaining)
  chain['eq'] = vi.fn().mockReturnValue(chain);
  chain['is'] = vi.fn().mockReturnValue(chain);
  chain['in'] = vi.fn().mockReturnValue(chain);
  chain['or'] = vi.fn().mockReturnValue(chain);
  // update returns the same chain so .eq().eq().select().single() all work
  chain['update'] = vi.fn().mockReturnValue(chain);
  return chain;
}

function makeMockSupabase(data: unknown = [], error: unknown = null) {
  const chain = makeMockChain({ data, error });
  // Make the chain also work as a thenable for logActivity's insert
  const activityChain = { insert: vi.fn().mockResolvedValue({ error: null }) };
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'content_activity_log') return activityChain;
    return chain;
  });
  return { from };
}

describe('getSlidesByLesson', () => {
  it('calls supabase.from("slides") with lesson_id filter', async () => {
    const supabase = makeMockSupabase([{ id: 's1', lesson_id: 'l1' }]);
    await getSlidesByLesson(supabase as any, 'l1');
    expect(supabase.from).toHaveBeenCalledWith('slides');
  });
});

describe('createSlide', () => {
  it('inserts a slide and returns it', async () => {
    const newSlide = { id: 's1', lesson_id: 'l1', slide_type: 'content', order_index: 0 };
    const supabase = makeMockSupabase(newSlide);
    const input = {
      lesson_id: 'l1',
      slide_type: 'content' as const,
      order_index: 0,
    };
    await createSlide(supabase as any, input, 'inst-1');
    expect(supabase.from).toHaveBeenCalledWith('slides');
  });

  it('logs activity after creating a slide', async () => {
    const newSlide = { id: 's1', lesson_id: 'l1', slide_type: 'content', order_index: 0 };
    const supabase = makeMockSupabase(newSlide);
    const input = { lesson_id: 'l1', slide_type: 'content' as const, order_index: 0 };
    await createSlide(supabase as any, input, 'inst-1');
    expect(supabase.from).toHaveBeenCalledWith('content_activity_log');
  });
});

describe('updateSlide', () => {
  it('updates a slide and logs activity', async () => {
    const updatedSlide = { id: 's1', lesson_id: 'l1', slide_type: 'content', order_index: 0 };
    const supabase = makeMockSupabase(updatedSlide);
    await updateSlide(supabase as any, 's1', { title: 'Updated' }, 'inst-1');
    expect(supabase.from).toHaveBeenCalledWith('slides');
    expect(supabase.from).toHaveBeenCalledWith('content_activity_log');
  });
});

describe('deleteSlide', () => {
  it('soft-deletes by setting deleted_at', async () => {
    const supabase = makeMockSupabase(null);
    await deleteSlide(supabase as any, 's1', 'inst-1');
    expect(supabase.from).toHaveBeenCalledWith('slides');
  });

  it('logs activity after deleting a slide', async () => {
    const supabase = makeMockSupabase(null);
    await deleteSlide(supabase as any, 's1', 'inst-1');
    expect(supabase.from).toHaveBeenCalledWith('content_activity_log');
  });
});

describe('reorderSlides', () => {
  it('logs activity after reordering slides', async () => {
    const supabase = makeMockSupabase(null);
    await reorderSlides(supabase as any, 'l1', ['s1', 's2'], 'inst-1');
    expect(supabase.from).toHaveBeenCalledWith('content_activity_log');
  });

  it('throws when one of the update calls returns an error', async () => {
    const updateError = { message: 'update failed' };
    // Build a chain where the second update call resolves with an error
    let callCount = 0;
    const makeChain = (resolvedValue: { data: unknown; error: unknown }) => {
      const chain: Record<string, unknown> = {};
      chain['eq'] = vi.fn().mockReturnValue(chain);
      chain['update'] = vi.fn().mockImplementation(() => chain);
      // The chain itself is awaitable — resolve with the given value
      chain['then'] = (resolve: (v: unknown) => unknown) => Promise.resolve(resolvedValue).then(resolve);
      return chain;
    };

    const successChain = makeChain({ data: null, error: null });
    const errorChain = makeChain({ data: null, error: updateError });

    const activityChain = { insert: vi.fn().mockResolvedValue({ error: null }) };
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'content_activity_log') return activityChain;
        callCount++;
        // First slide update succeeds, second fails
        return callCount % 2 === 0 ? errorChain : successChain;
      }),
    };

    await expect(
      reorderSlides(supabase as any, 'l1', ['s1', 's2'], 'inst-1')
    ).rejects.toEqual(updateError);
  });
});

describe('getSlideTemplates', () => {
  it('queries slide_templates table', async () => {
    const supabase = makeMockSupabase([{ id: 't1', name: 'Title' }]);
    await getSlideTemplates(supabase as any);
    expect(supabase.from).toHaveBeenCalledWith('slide_templates');
  });
});
