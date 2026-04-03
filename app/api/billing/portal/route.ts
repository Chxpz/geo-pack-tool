import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getStripe, getUserSubscription } from '@/lib/stripe';

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session so the user can manage their
 * subscription (cancel, update payment method, view invoices).
 * Returns { url } — the client should redirect to it.
 */
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });

  const sub = await getUserSubscription(session.user.id);

  if (!sub.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing account found. Upgrade to a paid plan first.' },
      { status: 400 },
    );
  }

  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${appUrl}/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
