/**
 * Stripe — billing utilities, plan config, subscription helpers.
 *
 * Plan limits are the single source of truth for the whole app.
 * Any feature gating (max products, ACP, store limits) reads from PLAN_CONFIG.
 */

import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import type { Subscription } from '@/lib/types';

// ─── Plan configuration ───────────────────────────────────────────────────────

export interface PlanConfig {
  id: 'free' | 'pro' | 'business' | 'enterprise';
  name: string;
  price: number; // USD / month, 0 for free
  maxBusinesses: number;
  maxCompetitors: number;
  maxQueries: number;
  scanFrequency: string; // e.g., 'daily', 'weekly'
  semrushDepth: string; // e.g., 'basic', 'advanced', 'full'
  perplexityModel: string; // e.g., 'default', 'advanced', 'pro'
  otterlyAccess: boolean;
  conciergeAccess: boolean;
  dataRetentionDays: number;
  features: string[];
  stripePriceId: string | null; // null for free plan
}

export const PLAN_CONFIG: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    maxBusinesses: 1,
    maxCompetitors: 2,
    maxQueries: 10,
    scanFrequency: 'weekly',
    semrushDepth: 'basic',
    perplexityModel: 'default',
    otterlyAccess: false,
    conciergeAccess: false,
    dataRetentionDays: 30,
    features: [
      '1 business',
      '2 competitors tracked',
      '10 monthly queries',
      '30-day data retention',
      'Basic GEO/AEO analysis',
      'Weekly scans',
    ],
    stripePriceId: null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 149,
    maxBusinesses: 1,
    maxCompetitors: 5,
    maxQueries: 50,
    scanFrequency: 'every_3_days',
    semrushDepth: 'advanced',
    perplexityModel: 'advanced',
    otterlyAccess: false,
    conciergeAccess: false,
    dataRetentionDays: 90,
    features: [
      '1 business',
      '5 competitors tracked',
      '50 monthly queries',
      '90-day data retention',
      'Advanced GEO/AEO analysis',
      'Every 3 days scans',
      'Semrush advanced depth',
    ],
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO ?? null,
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 399,
    maxBusinesses: 3,
    maxCompetitors: 10,
    maxQueries: 150,
    scanFrequency: 'daily',
    semrushDepth: 'full',
    perplexityModel: 'pro',
    otterlyAccess: true,
    conciergeAccess: false,
    dataRetentionDays: 180,
    features: [
      '3 businesses',
      '10 competitors tracked',
      '150 monthly queries',
      '180-day data retention',
      'Full GEO/AEO analysis',
      'Daily scans',
      'Semrush full depth',
      'Otterly access',
      'Priority support',
    ],
    stripePriceId: process.env.STRIPE_PRICE_ID_BUSINESS ?? null,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 899,
    maxBusinesses: 10,
    maxCompetitors: 25,
    maxQueries: 500,
    scanFrequency: 'realtime',
    semrushDepth: 'full',
    perplexityModel: 'pro',
    otterlyAccess: true,
    conciergeAccess: true,
    dataRetentionDays: 365,
    features: [
      '10 businesses',
      '25 competitors tracked',
      '500 monthly queries',
      '365-day data retention',
      'Full GEO/AEO analysis',
      'Real-time scans',
      'Semrush full depth',
      'Otterly access',
      'Concierge service',
      '24/7 priority support',
    ],
    stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? null,
  },
};

// ─── Stripe client ────────────────────────────────────────────────────────────

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
  });
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

interface SubscriptionRow {
  id: string;
  plan: string;
  status: string;
  max_businesses: number;
  max_competitors: number;
  max_queries: number;
  scan_frequency: string;
  semrush_depth: string;
  perplexity_model: string;
  otterly_access: boolean;
  concierge_access: boolean;
  data_retention_days: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
}

/**
 * Returns the user's current subscription row from Supabase.
 * Falls back to a synthetic free-plan object if none exists.
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionRow> {
  const freeFallback: SubscriptionRow = {
    id: '',
    plan: 'free',
    status: 'active',
    max_businesses: PLAN_CONFIG.free.maxBusinesses,
    max_competitors: PLAN_CONFIG.free.maxCompetitors,
    max_queries: PLAN_CONFIG.free.maxQueries,
    scan_frequency: PLAN_CONFIG.free.scanFrequency,
    semrush_depth: PLAN_CONFIG.free.semrushDepth,
    perplexity_model: PLAN_CONFIG.free.perplexityModel,
    otterly_access: PLAN_CONFIG.free.otterlyAccess,
    concierge_access: PLAN_CONFIG.free.conciergeAccess,
    data_retention_days: PLAN_CONFIG.free.dataRetentionDays,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_end: null,
  };

  if (!supabaseAdmin) return freeFallback;

  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select(
      'id, plan, status, max_businesses, max_competitors, max_queries, scan_frequency, semrush_depth, perplexity_model, otterly_access, concierge_access, data_retention_days, stripe_customer_id, stripe_subscription_id, current_period_end',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as SubscriptionRow | null) ?? freeFallback;
}

/**
 * Ensures a Stripe customer exists for the user and returns the customer ID.
 * Stores the ID back in `subscriptions` table for future use.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe || !supabaseAdmin) return null;

  const sub = await getUserSubscription(userId);

  if (sub.stripe_customer_id) return sub.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });

  // Persist customer ID
  await supabaseAdmin
    .from('subscriptions')
    .update({ stripe_customer_id: customer.id })
    .eq('user_id', userId);

  return customer.id;
}

// ─── Subscription sync (called from webhook handler) ─────────────────────────

interface StripeSubData {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: Stripe.Subscription.Status;
  priceId: string | null;
  currentPeriodEnd: number | null; // billing_cycle_anchor in Stripe v20
}

export function resolvePlanFromPriceId(priceId: string | null): PlanConfig {
  for (const plan of Object.values(PLAN_CONFIG)) {
    if (plan.stripePriceId && plan.stripePriceId === priceId) return plan;
  }
  return PLAN_CONFIG.free;
}

export function mapStripeStatus(
  status: Stripe.Subscription.Status,
): Subscription['status'] {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'active';
  }
}

/**
 * Upserts the subscription row from Stripe event data.
 * Looks up the user by stripe_customer_id.
 */
export async function syncSubscriptionFromStripe(data: StripeSubData): Promise<void> {
  if (!supabaseAdmin) return;

  // Find user by customer ID
  const { data: subRow } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', data.stripeCustomerId)
    .maybeSingle();

  if (!subRow) return;

  const plan = resolvePlanFromPriceId(data.priceId);
  const mappedStatus = mapStripeStatus(data.status);

  await supabaseAdmin
    .from('subscriptions')
    .update({
      plan: plan.id,
      status: mappedStatus,
      stripe_subscription_id: data.stripeSubscriptionId,
      max_businesses: plan.maxBusinesses,
      max_competitors: plan.maxCompetitors,
      max_queries: plan.maxQueries,
      scan_frequency: plan.scanFrequency,
      semrush_depth: plan.semrushDepth,
      perplexity_model: plan.perplexityModel,
      otterly_access: plan.otterlyAccess,
      concierge_access: plan.conciergeAccess,
      data_retention_days: plan.dataRetentionDays,
      price_per_month: plan.price,
      current_period_end: data.currentPeriodEnd
        ? new Date(data.currentPeriodEnd * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', subRow.user_id);
}

/**
 * Marks a subscription as canceled (called on subscription.deleted webhook).
 */
export async function cancelSubscriptionInDb(stripeCustomerId: string): Promise<void> {
  if (!supabaseAdmin) return;

  await supabaseAdmin
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      max_businesses: PLAN_CONFIG.free.maxBusinesses,
      max_competitors: PLAN_CONFIG.free.maxCompetitors,
      max_queries: PLAN_CONFIG.free.maxQueries,
      scan_frequency: PLAN_CONFIG.free.scanFrequency,
      semrush_depth: PLAN_CONFIG.free.semrushDepth,
      perplexity_model: PLAN_CONFIG.free.perplexityModel,
      otterly_access: PLAN_CONFIG.free.otterlyAccess,
      concierge_access: PLAN_CONFIG.free.conciergeAccess,
      data_retention_days: PLAN_CONFIG.free.dataRetentionDays,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', stripeCustomerId);
}

// ─── Plan-limit enforcement helpers ──────────────────────────────────────────

/**
 * Returns true if the user is within their business limit.
 * Pass the user's current total tracked businesses.
 */
export function isWithinBusinessLimit(
  sub: SubscriptionRow,
  currentBusinessCount: number,
): boolean {
  return currentBusinessCount < sub.max_businesses;
}
