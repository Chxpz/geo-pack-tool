import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStripe, getOrCreateStripeCustomer, PLAN_CONFIG } from '@/lib/stripe';

const schema = z.object({
  planId: z.enum(['pro', 'business', 'enterprise']),
});

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout session for a plan upgrade.
 * Returns { url } — the client should redirect to it.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
  if (!supabaseAdmin) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const body = await request.json() as unknown;
  const validation = schema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const plan = PLAN_CONFIG[validation.data.planId];
  if (!plan.stripePriceId) {
    return NextResponse.json({ error: 'Plan price not configured' }, { status: 503 });
  }

  // Get user's name/email for customer profile
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('email, full_name')
    .eq('id', session.user.id)
    .single();

  const customerId = await getOrCreateStripeCustomer(
    session.user.id,
    userRow?.email ?? session.user.email!,
    userRow?.full_name ?? undefined,
  );

  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId ?? undefined,
    customer_email: customerId ? undefined : (userRow?.email ?? session.user.email!),
    mode: 'subscription',
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/billing?upgraded=true`,
    cancel_url: `${appUrl}/billing?canceled=true`,
    metadata: { userId: session.user.id, planId: plan.id },
    subscription_data: {
      metadata: { userId: session.user.id },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
