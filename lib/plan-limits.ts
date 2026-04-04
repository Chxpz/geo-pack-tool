export type PlanId = 'free' | 'pro' | 'business' | 'enterprise';

export interface PlanLimits {
  maxBusinesses: number;
  maxCompetitors: number;
  maxQueries: number;
  scanFrequency: 'weekly' | 'daily' | 'realtime';
  semrushDepth: 'overview_only' | 'full' | 'full_historical';
  perplexityModel: 'sonar' | 'sonar-pro' | 'sonar-pro-deep';
  geoAuditAccess: boolean;
  maxGeoAuditsPerMonth: number;
  conciergeAccess: boolean;
  dataRetentionDays: number;
  operatorSlaHours: number | null;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxBusinesses: 1,
    maxCompetitors: 2,
    maxQueries: 10,
    scanFrequency: 'weekly',
    semrushDepth: 'overview_only',
    perplexityModel: 'sonar',
    geoAuditAccess: true,
    maxGeoAuditsPerMonth: 1,
    conciergeAccess: false,
    dataRetentionDays: 30,
    operatorSlaHours: null,
  },
  pro: {
    maxBusinesses: 1,
    maxCompetitors: 5,
    maxQueries: 50,
    scanFrequency: 'daily',
    semrushDepth: 'full',
    perplexityModel: 'sonar',
    geoAuditAccess: true,
    maxGeoAuditsPerMonth: 3,
    conciergeAccess: false,
    dataRetentionDays: 90,
    operatorSlaHours: null,
  },
  business: {
    maxBusinesses: 3,
    maxCompetitors: 10,
    maxQueries: 150,
    scanFrequency: 'daily',
    semrushDepth: 'full',
    perplexityModel: 'sonar-pro',
    geoAuditAccess: true,
    maxGeoAuditsPerMonth: 10,
    conciergeAccess: false,
    dataRetentionDays: 180,
    operatorSlaHours: 48,
  },
  enterprise: {
    maxBusinesses: 10,
    maxCompetitors: 25,
    maxQueries: 500,
    scanFrequency: 'realtime',
    semrushDepth: 'full_historical',
    perplexityModel: 'sonar-pro-deep',
    geoAuditAccess: true,
    maxGeoAuditsPerMonth: 999,
    conciergeAccess: true,
    dataRetentionDays: 365,
    operatorSlaHours: 24,
  },
};

export function getPlanLimits(planId: string): PlanLimits {
  const limits = PLAN_LIMITS[planId as PlanId];
  if (!limits) {
    throw new Error(`Unknown plan ID: ${planId}`);
  }
  return limits;
}

interface LimitCheckResult {
  allowed: boolean;
  max: number;
  current: number;
  upgradeTo?: PlanId;
}

function getNextUpgradePlan(currentPlan: PlanId): PlanId | undefined {
  const upgradeMap: Record<PlanId, PlanId | undefined> = {
    free: 'pro',
    pro: 'business',
    business: 'enterprise',
    enterprise: undefined,
  };
  return upgradeMap[currentPlan];
}

export function checkBusinessLimit(
  planId: string,
  currentCount: number
): LimitCheckResult {
  const limits = getPlanLimits(planId);
  const allowed = currentCount < limits.maxBusinesses;
  const result: LimitCheckResult = {
    allowed,
    max: limits.maxBusinesses,
    current: currentCount,
  };
  if (!allowed) {
    result.upgradeTo = getNextUpgradePlan(planId as PlanId);
  }
  return result;
}

export function checkCompetitorLimit(
  planId: string,
  currentCount: number
): LimitCheckResult {
  const limits = getPlanLimits(planId);
  const allowed = currentCount < limits.maxCompetitors;
  const result: LimitCheckResult = {
    allowed,
    max: limits.maxCompetitors,
    current: currentCount,
  };
  if (!allowed) {
    result.upgradeTo = getNextUpgradePlan(planId as PlanId);
  }
  return result;
}

export function checkQueryLimit(
  planId: string,
  currentCount: number
): LimitCheckResult {
  const limits = getPlanLimits(planId);
  const allowed = currentCount < limits.maxQueries;
  const result: LimitCheckResult = {
    allowed,
    max: limits.maxQueries,
    current: currentCount,
  };
  if (!allowed) {
    result.upgradeTo = getNextUpgradePlan(planId as PlanId);
  }
  return result;
}

export function canAccessFeature(
  planId: string,
  feature: 'geo_audit' | 'concierge'
): boolean {
  const limits = getPlanLimits(planId);
  switch (feature) {
    case 'geo_audit':
      return limits.geoAuditAccess;
    case 'concierge':
      return limits.conciergeAccess;
    default:
      throw new Error(`Unknown feature: ${feature}`);
  }
}

export function getSemrushDepth(planId: string): string {
  const limits = getPlanLimits(planId);
  return limits.semrushDepth;
}

export function getPerplexityModel(planId: string): string {
  const limits = getPlanLimits(planId);
  return limits.perplexityModel;
}

export function getDataRetentionDays(planId: string): number {
  const limits = getPlanLimits(planId);
  return limits.dataRetentionDays;
}

export function getOperatorSlaHours(planId: string): number | null {
  const limits = getPlanLimits(planId);
  return limits.operatorSlaHours;
}

/**
 * Assertion function for plan limit checks in API routes.
 * Throws an error if the limit is exceeded.
 */
export function assertPlanLimit(
  planId: string,
  currentCount: number,
  limitType: 'maxBusinesses' | 'maxCompetitors' | 'maxQueries',
  userId: string
): void {
  const limits = getPlanLimits(planId);
  const max = limits[limitType];

  if (currentCount >= max) {
    const nextPlan = getNextUpgradePlan(planId as PlanId);
    throw new Error(
      `${limitType} limit (${max}) exceeded for plan '${planId}'${
        nextPlan ? `. Upgrade to ${nextPlan} for higher limits.` : '.'
      }`
    );
  }
}
