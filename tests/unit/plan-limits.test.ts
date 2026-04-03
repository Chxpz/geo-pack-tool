import { describe, expect, it } from 'vitest';

import {
  PLAN_LIMITS,
  assertPlanLimit,
  canAccessFeature,
  checkBusinessLimit,
  checkCompetitorLimit,
  checkQueryLimit,
  getPlanLimits,
} from '@/lib/plan-limits';

describe('plan limits', () => {
  it('returns limits for every supported plan', () => {
    for (const planId of Object.keys(PLAN_LIMITS)) {
      expect(getPlanLimits(planId)).toEqual(PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS]);
    }
  });

  it('returns upgrade guidance when limits are exceeded', () => {
    expect(checkBusinessLimit('free', 1)).toMatchObject({
      allowed: false,
      max: 1,
      current: 1,
      upgradeTo: 'pro',
    });

    expect(checkCompetitorLimit('business', 10).upgradeTo).toBe('enterprise');
    expect(checkQueryLimit('enterprise', 500).upgradeTo).toBeUndefined();
  });

  it('reports feature access by plan', () => {
    expect(canAccessFeature('free', 'otterly')).toBe(false);
    expect(canAccessFeature('business', 'otterly')).toBe(true);
    expect(canAccessFeature('enterprise', 'concierge')).toBe(true);
  });

  it('throws when an asserted limit is exceeded', () => {
    expect(() => assertPlanLimit('free', 1, 'maxBusinesses', 'user-1')).toThrow(
      /Upgrade to pro/,
    );
  });
});
