import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.hoisted(() => vi.fn());
const mockSupabase = vi.hoisted(() => ({ from: mockFrom }));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseAdmin: null,
}));

import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('returns the success response shape when the database is connected', async () => {
    const limit = vi.fn().mockResolvedValue({ error: null });
    const select = vi.fn().mockReturnValue({ limit });
    mockFrom.mockReturnValue({ select });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      database: 'connected',
    });
    expect(body.timestamp).toEqual(expect.any(String));
  });
});
