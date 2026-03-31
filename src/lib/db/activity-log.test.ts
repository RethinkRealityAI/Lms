import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logActivity } from './activity-log';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeMockSupabase(error: unknown = null) {
  const mockInsert = vi.fn().mockResolvedValue({ error });
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
  return {
    supabase: { from: mockFrom } as unknown as SupabaseClient,
    mockFrom,
    mockInsert,
  };
}

describe('logActivity', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('inserts a row into content_activity_log', async () => {
    const { supabase, mockFrom, mockInsert } = makeMockSupabase();

    await logActivity(supabase, {
      institutionId: 'inst-1',
      entityType: 'slide',
      entityId: 'slide-1',
      action: 'create',
    });

    expect(mockFrom).toHaveBeenCalledWith('content_activity_log');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        institution_id: 'inst-1',
        entity_type: 'slide',
        entity_id: 'slide-1',
        action: 'create',
      }),
    );
  });

  it('does not throw when the insert fails', async () => {
    const { supabase } = makeMockSupabase({ message: 'DB error' });

    await expect(
      logActivity(supabase, {
        institutionId: 'inst-1',
        entityType: 'course',
        entityId: 'course-1',
        action: 'publish',
      }),
    ).resolves.toBeUndefined();
  });

  it('passes changes as jsonb', async () => {
    const { supabase, mockInsert } = makeMockSupabase();

    const changes = { title: 'New Title', status: 'published' };
    await logActivity(supabase, {
      institutionId: 'inst-1',
      entityType: 'slide',
      entityId: 'slide-1',
      action: 'update',
      changes,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ changes }),
    );
  });

  it('calls console.warn when insert fails', async () => {
    const { supabase } = makeMockSupabase({ message: 'constraint violation' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await logActivity(supabase, {
      institutionId: 'inst-1',
      entityType: 'block',
      entityId: 'block-1',
      action: 'delete',
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('logActivity'),
      expect.anything(),
    );
  });

  it('includes userId when provided', async () => {
    const { supabase, mockInsert } = makeMockSupabase();

    await logActivity(supabase, {
      institutionId: 'inst-1',
      userId: 'user-abc',
      entityType: 'lesson',
      entityId: 'lesson-1',
      action: 'update',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-abc' }),
    );
  });
});
