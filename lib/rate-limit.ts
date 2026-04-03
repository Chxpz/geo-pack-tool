export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly requests = new Map<string, number[]>();
  private readonly now: () => number;

  constructor(private readonly options: RateLimitOptions) {
    this.now = options.now ?? Date.now;
  }

  check(key: string): RateLimitResult {
    const now = this.now();
    const windowStart = now - this.options.windowMs;
    const timestamps = (this.requests.get(key) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (timestamps.length >= this.options.limit) {
      const oldestTimestamp = timestamps[0];
      const resetAt = oldestTimestamp + this.options.windowMs;
      this.requests.set(key, timestamps);

      return {
        allowed: false,
        limit: this.options.limit,
        remaining: 0,
        resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      };
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);

    return {
      allowed: true,
      limit: this.options.limit,
      remaining: Math.max(0, this.options.limit - timestamps.length),
      resetAt: now + this.options.windowMs,
      retryAfterSeconds: 0,
    };
  }

  cleanup(): void {
    const cutoff = this.now() - this.options.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const active = timestamps.filter((timestamp) => timestamp > cutoff);
      if (active.length > 0) {
        this.requests.set(key, active);
      } else {
        this.requests.delete(key);
      }
    }
  }

  clear(): void {
    this.requests.clear();
  }
}

export const authRateLimiter = new SlidingWindowRateLimiter({
  limit: 5,
  windowMs: 60_000,
});

export function buildRateLimitKey(scope: string, identifier: string): string {
  return `${scope}:${identifier}`;
}

export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'Retry-After': result.retryAfterSeconds.toString(),
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };
}
