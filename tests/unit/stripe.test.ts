import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('stripe helpers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      STRIPE_PRICE_ID_PRO: 'price_pro',
      STRIPE_PRICE_ID_BUSINESS: 'price_business',
      STRIPE_PRICE_ID_ENTERPRISE: 'price_enterprise',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('resolves plans from Stripe price IDs', async () => {
    const { resolvePlanFromPriceId } = await import('@/lib/stripe');

    expect(resolvePlanFromPriceId('price_pro').id).toBe('pro');
    expect(resolvePlanFromPriceId('price_business').id).toBe('business');
    expect(resolvePlanFromPriceId('unknown').id).toBe('free');
  });

  it('maps Stripe subscription states into product states', async () => {
    const { mapStripeStatus } = await import('@/lib/stripe');

    expect(mapStripeStatus('active')).toBe('active');
    expect(mapStripeStatus('trialing')).toBe('active');
    expect(mapStripeStatus('past_due')).toBe('past_due');
    expect(mapStripeStatus('unpaid')).toBe('past_due');
    expect(mapStripeStatus('canceled')).toBe('canceled');
  });
});
