import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the session-aware server client the route derives user_id + institution from.
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
import { createClient } from '@/lib/supabase/server';
import { POST } from './route';

let ipCounter = 0;
/** Build a minimal NextRequest-like object; each call gets a fresh IP so the
 *  per-IP in-memory rate limiter never trips across tests. */
function makeReq(body: unknown, headers: Record<string, string> = {}) {
  const hdrs: Record<string, string> = { 'x-forwarded-for': `10.0.0.${++ipCounter}`, ...headers };
  return {
    headers: { get: (k: string) => hdrs[k] ?? null },
    cookies: { get: () => undefined },
    json: async () => body,
  } as unknown as Parameters<typeof POST>[0];
}

function mockSupabaseSuccess() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn((t: string) => {
      if (t === 'institutions') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'inst-1' } }) }) }) };
      if (t === 'users') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { institution_id: 'inst-1' } }) }) }) };
      return { insert };
    }),
  });
  return { insert };
}

describe('/api/feedback POST validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a missing message', async () => {
    const res = await POST(makeReq({ type: 'issue', email: 'a@b.com' }));
    expect(res.status).toBe(400);
  });

  it('rejects an invalid email', async () => {
    const res = await POST(makeReq({ type: 'issue', message: 'x', email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('rejects a category that is not valid for the type', async () => {
    const res = await POST(makeReq({ type: 'issue', message: 'x', email: 'a@b.com', category: 'accessibility' }));
    expect(res.status).toBe(400); // 'accessibility' is a suggestion slug, not an issue slug
  });

  it('inserts and returns success for a valid submission (deriving user_id + institution)', async () => {
    const { insert } = mockSupabaseSuccess();
    const res = await POST(makeReq(
      { type: 'issue', message: 'Video broken', email: 'a@b.com', category: 'media_broken', context: { course_id: 'c1' } },
      { 'x-institution-slug': 'scago' },
    ));
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0][0];
    expect(row).toMatchObject({ type: 'issue', category: 'media_broken', user_id: 'u1', institution_id: 'inst-1', status: 'new' });
  });

  it('defaults an unknown type to contact', async () => {
    const { insert } = mockSupabaseSuccess();
    const res = await POST(makeReq({ type: 'garbage', message: 'hi', email: 'a@b.com' }, { 'x-institution-slug': 'scago' }));
    expect(res.status).toBe(200);
    expect(insert.mock.calls[0][0].type).toBe('contact');
  });
});
