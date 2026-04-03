'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface PlanGateProps {
  feature: string;
  currentPlan: string;
  children: ReactNode;
}

export function PlanGate({ feature, currentPlan, children }: PlanGateProps) {
  // List of features that require paid plans
  const featureReqs: Record<string, string> = {
    otterly: 'business',
    concierge: 'enterprise',
    geo_audit: 'enterprise',
  };

  const requiredPlan = featureReqs[feature];

  if (!requiredPlan) {
    // Feature not gated, render children
    return <>{children}</>;
  }

  const plans = ['free', 'pro', 'business', 'enterprise'];
  const currentIndex = plans.indexOf(currentPlan);
  const requiredIndex = plans.indexOf(requiredPlan);

  if (currentIndex >= requiredIndex) {
    // User has access, render children
    return <>{children}</>;
  }

  // User doesn't have access, show upgrade CTA
  return (
    <div className="p-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg">
      <p className="text-sm text-yellow-900 font-semibold mb-3">
        {feature.charAt(0).toUpperCase() + feature.slice(1)} is only available on the{' '}
        {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan and above.
      </p>
      <Link
        href="/billing"
        className="inline-block px-4 py-2 bg-yellow-600 text-white text-sm font-semibold rounded-lg hover:bg-yellow-700 transition"
      >
        Upgrade to {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
      </Link>
    </div>
  );
}
