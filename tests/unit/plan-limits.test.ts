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
    expect(canAccessFeature('free', 'geo_audit')).toBe(true);
    expect(canAccessFeature('business', 'geo_audit')).toBe(true);
    expect(canAccessFeature('enterprise', 'concierge')).toBe(true);
    expect(canAccessFeature('free', 'concierge')).toBe(false);
  });

  it('exposes geo audit monthly limits per plan', () => {
    expect(PLAN_LIMITS.free.maxGeoAuditsPerMonth).toBe(1);
    expect(PLAN_LIMITS.pro.maxGeoAuditsPerMonth).toBe(3);
    expect(PLAN_LIMITS.business.maxGeoAuditsPerMonth).toBe(10);
    expect(PLAN_LIMITS.enterprise.maxGeoAuditsPerMonth).toBe(999);
  });

  it('throws when an asserted limit is exceeded', () => {
    expect(() => assertPlanLimit('free', 1, 'maxBusinesses', 'user-1')).toThrow(
      /Upgrade to pro/,
    );
  });
});
