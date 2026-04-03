import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.hoisted(() => vi.fn());
const mockSupabaseAdmin = vi.hoisted(() => ({ from: mockFrom }));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

import { generateAndStoreToken, verifyAndConsumeToken } from '@/lib/tokens';

describe('tokens', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('generates and stores a token after clearing previous tokens', async () => {
    const invalidateExisting = vi.fn().mockResolvedValue({ error: null });
    const deleteEqType = vi.fn().mockReturnValue({ is: invalidateExisting });
    const deleteEqUser = vi.fn().mockReturnValue({ eq: deleteEqType });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqUser });
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    mockFrom
      .mockReturnValueOnce({ delete: deleteMock })
      .mockReturnValueOnce({ insert: insertMock });

    const token = await generateAndStoreToken('user-1', 'email_verification');

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'email_verification',
      }),
    );
  });

  it('verifies a valid token and marks it as used', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'row-1',
        user_id: 'user-1',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        used_at: null,
      },
    });
    const selectEqType = vi.fn().mockReturnValue({ maybeSingle });
    const selectEqToken = vi.fn().mockReturnValue({ eq: selectEqType });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqToken });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEq });

    mockFrom
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ update: updateMock });

    await expect(
      verifyAndConsumeToken('token-1', 'email_verification'),
    ).resolves.toEqual({ userId: 'user-1' });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ used_at: expect.any(String) }),
    );
  });

  it('rejects expired tokens', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'row-1',
        user_id: 'user-1',
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        used_at: null,
      },
    });
    const selectEqType = vi.fn().mockReturnValue({ maybeSingle });
    const selectEqToken = vi.fn().mockReturnValue({ eq: selectEqType });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqToken });

    mockFrom.mockReturnValueOnce({ select: selectMock });

    await expect(
      verifyAndConsumeToken('token-1', 'email_verification'),
    ).resolves.toBeNull();
  });
});
