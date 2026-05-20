import { describe, it, expect, vi } from 'vitest';
import { getSurveyResponse, upsertSurveyResponse } from './surveys';

function makeMockSupabase({
  selectResult = { data: null, error: null },
  upsertResult = { error: null },
}: {
  selectResult?: { data: unknown; error: unknown };
  upsertResult?: { error: unknown };
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue(selectResult);
  const eqUser = vi.fn().mockReturnValue({ maybeSingle });
  const eqBlock = vi.fn().mockReturnValue({ eq: eqUser });
  const select = vi.fn().mockReturnValue({ eq: eqBlock });
  const upsert = vi.fn().mockResolvedValue(upsertResult);

  return {
    from: vi.fn().mockReturnValue({ select, upsert }),
    _mocks: { select, upsert, eqBlock, eqUser, maybeSingle },
  };
}

describe('getSurveyResponse', () => {
  it('returns null when no prior response exists', async () => {
    const supabase = makeMockSupabase({ selectResult: { data: null, error: null } });
    const result = await getSurveyResponse(supabase as never, 'block-1', 'user-1');
    expect(result).toBeNull();
  });

  it('returns the response when one exists', async () => {
    const mockResponse = {
      id: 'resp-1',
      block_id: 'block-1',
      user_id: 'user-1',
      responses: { q1: 'Very Likely' },
      submitted_at: '2026-01-01T00:00:00Z',
    };
    const supabase = makeMockSupabase({ selectResult: { data: mockResponse, error: null } });
    const result = await getSurveyResponse(supabase as never, 'block-1', 'user-1');
    expect(result).toEqual(mockResponse);
  });

  it('queries survey_responses table with correct filters', async () => {
    const supabase = makeMockSupabase();
    await getSurveyResponse(supabase as never, 'block-abc', 'user-xyz');
    expect(supabase.from).toHaveBeenCalledWith('survey_responses');
    expect(supabase._mocks.eqBlock).toHaveBeenCalledWith('block_id', 'block-abc');
    expect(supabase._mocks.eqUser).toHaveBeenCalledWith('user_id', 'user-xyz');
  });

  it('throws when supabase returns an error', async () => {
    const supabase = makeMockSupabase({ selectResult: { data: null, error: new Error('DB error') } });
    await expect(getSurveyResponse(supabase as never, 'block-1', 'user-1')).rejects.toThrow();
  });
});

describe('upsertSurveyResponse', () => {
  it('calls upsert with correct payload', async () => {
    const supabase = makeMockSupabase();
    const responses = { q1: 'Very Likely', q2: 'Great course!' };
    await upsertSurveyResponse(supabase as never, 'block-1', 'user-1', responses);

    expect(supabase.from).toHaveBeenCalledWith('survey_responses');
    const upsertArg = supabase._mocks.upsert.mock.calls[0][0];
    expect(upsertArg.block_id).toBe('block-1');
    expect(upsertArg.user_id).toBe('user-1');
    expect(upsertArg.responses).toEqual(responses);
    expect(upsertArg.submitted_at).toBeDefined();
  });

  it('uses block_id,user_id as conflict target', async () => {
    const supabase = makeMockSupabase();
    await upsertSurveyResponse(supabase as never, 'block-1', 'user-1', {});
    const upsertOptions = supabase._mocks.upsert.mock.calls[0][1];
    expect(upsertOptions.onConflict).toBe('block_id,user_id');
  });

  it('throws when upsert returns an error', async () => {
    const supabase = makeMockSupabase({ upsertResult: { error: new Error('write failed') } });
    await expect(upsertSurveyResponse(supabase as never, 'block-1', 'user-1', {})).rejects.toThrow();
  });
});
