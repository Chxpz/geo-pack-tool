import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.hoisted(() => vi.fn());
const mockHash = vi.hoisted(() => vi.fn());
const mockGenerateAndStoreToken = vi.hoisted(() => vi.fn());
const mockSendVerificationEmail = vi.hoisted(() => vi.fn());
const mockSupabaseAdmin = vi.hoisted(() => ({ from: mockFrom }));

vi.mock('bcryptjs', () => ({
  hash: mockHash,
}));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

vi.mock('@/lib/tokens', () => ({
  generateAndStoreToken: mockGenerateAndStoreToken,
}));

vi.mock('@/lib/email', () => ({
  sendVerificationEmail: mockSendVerificationEmail,
}));

import { POST } from '@/app/api/auth/signup/route';

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockHash.mockReset().mockResolvedValue('hashed-password');
    mockGenerateAndStoreToken.mockReset().mockResolvedValue('verify-token');
    mockSendVerificationEmail.mockReset().mockResolvedValue(true);
  });

  it('rejects invalid input', async () => {
    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'short',
          fullName: '',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid email address' });
  });

  it('rejects duplicate emails', async () => {
    const selectSingle = vi.fn().mockResolvedValue({ data: { id: 'user-1' } });
    const eqEmail = vi.fn().mockReturnValue({ single: selectSingle });
    const select = vi.fn().mockReturnValue({ eq: eqEmail });

    mockFrom.mockReturnValueOnce({ select });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'founder@example.com',
          password: 'ValidPassword123',
          fullName: 'Founder',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Email already registered' });
  });

  it('creates a user and free subscription successfully', async () => {
    const existingUserSingle = vi.fn().mockResolvedValue({ data: null });
    const existingUserEq = vi.fn().mockReturnValue({ single: existingUserSingle });
    const existingUserSelect = vi.fn().mockReturnValue({ eq: existingUserEq });

    const insertUserSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'user-1',
        email: 'founder@example.com',
        full_name: 'Founder Example',
      },
      error: null,
    });
    const insertUserSelect = vi.fn().mockReturnValue({ single: insertUserSingle });
    const insertUser = vi.fn().mockReturnValue({ select: insertUserSelect });

    const insertSubscription = vi.fn().mockResolvedValue({ error: null });

    mockFrom
      .mockReturnValueOnce({ select: existingUserSelect })
      .mockReturnValueOnce({ insert: insertUser })
      .mockReturnValueOnce({ insert: insertSubscription });

    const response = await POST(
      new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'founder@example.com',
          password: 'ValidPassword123',
          fullName: 'Founder Example',
          companyName: 'AgenticRev',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      user: {
        id: 'user-1',
        email: 'founder@example.com',
      },
    });
    expect(insertSubscription).toHaveBeenCalled();
    expect(mockSendVerificationEmail).toHaveBeenCalled();
  });
});
