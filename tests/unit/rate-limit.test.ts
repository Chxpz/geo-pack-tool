import { describe, expect, it } from 'vitest';

import { SlidingWindowRateLimiter } from '@/lib/rate-limit';

describe('SlidingWindowRateLimiter', () => {
  it('enforces a fixed request budget within the window', () => {
    let now = 1_000;
    const limiter = new SlidingWindowRateLimiter({
      limit: 2,
      windowMs: 1_000,
      now: () => now,
    });

    expect(limiter.check('ip-1').allowed).toBe(true);
    expect(limiter.check('ip-1').allowed).toBe(true);

    const blocked = limiter.check('ip-1');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);

    now += 1_001;
    expect(limiter.check('ip-1').allowed).toBe(true);
  });

  it('cleans up expired keys', () => {
    let now = 10_000;
    const limiter = new SlidingWindowRateLimiter({
      limit: 1,
      windowMs: 1_000,
      now: () => now,
    });

    limiter.check('ip-1');
    now += 5_000;
    limiter.cleanup();

    expect(limiter.check('ip-1').allowed).toBe(true);
  });
});
