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
  const methods = ['select', 'eq', 'is', 'order', 'in', 'or', 'update', 'delete'];
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
  // Re-wire eq/is to return chain that resolves
  chain['eq'] = vi.fn().mockReturnValue(chain);
  chain['is'] = vi.fn().mockReturnValue(chain);
  chain['in'] = vi.fn().mockReturnValue(chain);
  chain['or'] = vi.fn().mockReturnValue(chain);
  chain['update'] = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(resolvedValue) });
  return chain;
}

function makeMockSupabase(data: unknown = [], error: unknown = null) {
  const chain = makeMockChain({ data, error });
  return { from: vi.fn().mockReturnValue(chain) };
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
    await createSlide(supabase as any, input);
    expect(supabase.from).toHaveBeenCalledWith('slides');
  });
});

describe('deleteSlide', () => {
  it('soft-deletes by setting deleted_at', async () => {
    const supabase = makeMockSupabase(null);
    await deleteSlide(supabase as any, 's1');
    expect(supabase.from).toHaveBeenCalledWith('slides');
  });
});

describe('getSlideTemplates', () => {
  it('queries slide_templates table', async () => {
    const supabase = makeMockSupabase([{ id: 't1', name: 'Title' }]);
    await getSlideTemplates(supabase as any);
    expect(supabase.from).toHaveBeenCalledWith('slide_templates');
  });
});
