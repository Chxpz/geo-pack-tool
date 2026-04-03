import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, syncSubscriptionFromStripe, cancelSubscriptionInDb } from '@/lib/stripe';

export const runtime = 'nodejs';

function getPriceId(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  return typeof item?.price?.id === 'string' ? item.price.id : null;
}

/**
 * POST /api/webhooks/stripe
 * Handles Stripe subscription lifecycle events.
 * Signature is verified via STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });

  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscriptionFromStripe({
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          status: sub.status,
          priceId: getPriceId(sub),
          // billing_cycle_anchor is the next billing date in Stripe v20
          currentPeriodEnd: sub.billing_cycle_anchor ?? null,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await cancelSubscriptionInDb(sub.customer as string);
        break;
      }

      case 'invoice.paid': {
        // Ensure the subscription stays active when invoice is paid
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          invoice.parent?.type === 'subscription_details'
            ? (invoice.parent.subscription_details?.subscription as string | undefined)
            : undefined;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscriptionFromStripe({
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            status: sub.status,
            priceId: getPriceId(sub),
            currentPeriodEnd: sub.billing_cycle_anchor ?? null,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Mark subscription as past_due
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          invoice.parent?.type === 'subscription_details'
            ? (invoice.parent.subscription_details?.subscription as string | undefined)
            : undefined;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscriptionFromStripe({
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            status: sub.status,
            priceId: getPriceId(sub),
            currentPeriodEnd: sub.billing_cycle_anchor ?? null,
          });
        }
        break;
      }

      // Unhandled event types are fine — just acknowledge
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Handler error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
