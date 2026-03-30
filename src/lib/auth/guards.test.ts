import { describe, it, expect, vi, beforeEach } from 'vitest';

// Sentinel used to simulate Next.js redirect() throwing to stop execution
class RedirectError extends Error {
  constructor(public destination: string) {
    super(`NEXT_REDIRECT:${destination}`);
    this.name = 'RedirectError';
  }
}

// Mock next/navigation — redirect throws RedirectError so execution stops,
// matching real Next.js behaviour and preventing downstream null-dereferences.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new RedirectError(url); }),
}));

// Mock @/lib/supabase/server so tests don't need a real DB
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('isAdminRole', () => {
  it('returns true for platform_admin', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('platform_admin')).toBe(true);
  });

  it('returns true for institution_admin', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('institution_admin')).toBe(true);
  });

  it('returns true for instructor', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('instructor')).toBe(true);
  });

  it('returns true for legacy admin', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('admin')).toBe(true);
  });

  it('returns false for student', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('student')).toBe(false);
  });

  it('returns false for unknown role', async () => {
    const { isAdminRole } = await import('./guards');
    expect(isAdminRole('unknown')).toBe(false);
  });
});

describe('requireAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('redirects to /login when no user session', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as any);

    const { requireAuth } = await import('./guards');
    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('redirects to /login when profile not found', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    } as any);

    const { requireAuth } = await import('./guards');
    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });
});

describe('requireAdminAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('redirects to /student when user has student role', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'u1', role: 'student' }, error: null }),
      }),
    } as any);

    const { requireAdminAuth } = await import('./guards');
    await expect(requireAdminAuth()).rejects.toThrow('NEXT_REDIRECT:/student');
  });
});
