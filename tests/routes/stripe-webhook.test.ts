import { beforeEach, describe, expect, it, vi } from 'vitest';

import invoicePaidFixture from '@/tests/fixtures/providers/stripe/invoice.paid.json';
import subscriptionCreatedFixture from '@/tests/fixtures/providers/stripe/customer.subscription.created.json';

const mockGetStripe = vi.hoisted(() => vi.fn());
const mockSyncSubscriptionFromStripe = vi.hoisted(() => vi.fn());
const mockCancelSubscriptionInDb = vi.hoisted(() => vi.fn());

vi.mock('@/lib/stripe', () => ({
  getStripe: mockGetStripe,
  syncSubscriptionFromStripe: mockSyncSubscriptionFromStripe,
  cancelSubscriptionInDb: mockCancelSubscriptionInDb,
}));

import { POST } from '@/app/api/webhooks/stripe/route';

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    mockGetStripe.mockReset();
    mockSyncSubscriptionFromStripe.mockReset();
    mockCancelSubscriptionInDb.mockReset();
  });

  it('rejects invalid signatures', async () => {
    mockGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error('invalid signature');
        }),
      },
    });

    const response = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(subscriptionCreatedFixture),
        headers: {
          'stripe-signature': 'bad-signature',
        },
      }) as never,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Webhook signature verification failed',
    });
  });

  it('syncs subscriptions for customer.subscription.created events', async () => {
    mockGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(subscriptionCreatedFixture),
      },
    });

    const response = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(subscriptionCreatedFixture),
        headers: {
          'stripe-signature': 'valid-signature',
        },
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(mockSyncSubscriptionFromStripe).toHaveBeenCalledWith({
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      status: 'active',
      priceId: 'price_pro',
      currentPeriodEnd: 1743686400,
    });
  });

  it('refreshes invoice-backed subscriptions after invoice.paid', async () => {
    const retrieve = vi.fn().mockResolvedValue({
      id: 'sub_123',
      customer: 'cus_123',
      status: 'active',
      billing_cycle_anchor: 1743686400,
      items: { data: [{ price: { id: 'price_pro' } }] },
    });

    mockGetStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(invoicePaidFixture),
      },
      subscriptions: {
        retrieve,
      },
    });

    const response = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(invoicePaidFixture),
        headers: {
          'stripe-signature': 'valid-signature',
        },
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(retrieve).toHaveBeenCalledWith('sub_123');
    expect(mockSyncSubscriptionFromStripe).toHaveBeenCalled();
  });
});
