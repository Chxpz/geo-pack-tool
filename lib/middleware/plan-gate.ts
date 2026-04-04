/**
 * Plan gate middleware — restricts API routes by subscription tier.
 *
 * Usage:
 *   const handler = withPlanCheck(
 *     async (request, session) => { ... },
 *     ['geo_audit', 'concierge']
 *   );
 *
 *   export const POST = handler;
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getUserSubscription } from '@/lib/stripe';
import { canAccessFeature } from '@/lib/plan-limits';
import type { Session } from 'next-auth';

export type RequiredFeature = 'geo_audit' | 'concierge';

export interface GatedRequest {
  request: NextRequest;
  session: Session;
}

export type GatedHandler = (gated: GatedRequest) => Promise<Response>;

/**
 * Higher-order function that wraps an API route handler with plan checking.
 * Returns a Next.js API route handler.
 */
export function withPlanCheck(handler: GatedHandler, requiredFeatures: RequiredFeature[] = []) {
  return async (request: NextRequest) => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get subscription
    const sub = await getUserSubscription(session.user.id);

    // Check required features
    for (const feature of requiredFeatures) {
      if (!canAccessFeature(sub.plan, feature)) {
        return NextResponse.json(
          {
            error: `Feature '${feature}' requires a higher plan`,
            currentPlan: sub.plan,
          },
          { status: 403 }
        );
      }
    }

    // Call the actual handler
    return handler({ request, session });
  };
}
