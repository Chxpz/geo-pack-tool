import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuth = vi.hoisted(() => vi.fn());
const mockCreateScanRun = vi.hoisted(() => vi.fn());
const mockUpdateScanRunProgress = vi.hoisted(() => vi.fn());
const mockMarkScanRunCompleted = vi.hoisted(() => vi.fn());
const mockMarkScanRunFailed = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    after: async (callback: () => unknown) => {
      callback();
    },
  };
});

vi.mock('@/lib/auth-server', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {},
}));

vi.mock('@/lib/stripe', () => ({
  getUserSubscription: mockGetUserSubscription,
}));

vi.mock('@/lib/scanner', () => ({
  runBusinessScanner: vi.fn(),
}));

vi.mock('@/lib/scan-runs', () => ({
  createScanRun: mockCreateScanRun,
  markScanRunCompleted: mockMarkScanRunCompleted,
  markScanRunFailed: mockMarkScanRunFailed,
  updateScanRunProgress: mockUpdateScanRunProgress,
}));

import { POST } from '@/app/api/scan/trigger/route';

describe('POST /api/scan/trigger', () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockCreateScanRun.mockReset();
    mockUpdateScanRunProgress.mockReset();
    mockMarkScanRunCompleted.mockReset();
    mockMarkScanRunFailed.mockReset();
    mockGetUserSubscription.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/scan/trigger', {
        method: 'POST',
        body: JSON.stringify({ business_id: 'business-1' }),
        headers: { 'Content-Type': 'application/json' },
      }) as never,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('validates that business_id is present', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const response = await POST(
      new Request('http://localhost/api/scan/trigger', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      }) as never,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'business_id is required' });
  });
});
