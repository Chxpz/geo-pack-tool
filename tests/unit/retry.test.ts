import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateRetryDelay, isRetryableError, retry } from '@/lib/retry';

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries transient failures and eventually succeeds', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
      .mockResolvedValueOnce('ok');

    const promise = retry(operation, {
      baseDelayMs: 10,
      maxDelayMs: 20,
    });

    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-transient failures', async () => {
    const operation = vi.fn<() => Promise<void>>().mockRejectedValueOnce(new Error('bad input'));

    const promise = retry(operation, { baseDelayMs: 10, maxDelayMs: 20 });

    await expect(promise).rejects.toThrow('bad input');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('classifies transient errors and delay bounds correctly', () => {
    expect(isRetryableError(Object.assign(new Error('unavailable'), { status: 503 }))).toBe(true);
    expect(isRetryableError(new TypeError('network failed'))).toBe(true);
    expect(isRetryableError(new Error('bad request'))).toBe(false);

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(calculateRetryDelay(3, 100, 500)).toBe(400);
  });
});
