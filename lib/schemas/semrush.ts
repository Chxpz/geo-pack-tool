import { z } from 'zod';

// Domain Overview schema
export const domainOverviewSchema = z.object({
  Db: z.string(),
  Dn: z.string(),
  Rk: z.number(),
  Or: z.number(),
  Ot: z.number(),
  Oc: z.number(),
  Ad: z.number().optional(),
  At: z.number().optional(),
  Ac: z.number().optional(),
  FPla: z.any().optional(),
});

// Domain Organic Row schema
export const domainOrganicRowSchema = z.object({
  Ph: z.string(),
  Po: z.number(),
  Pp: z.number().optional(),
  Nq: z.number(),
  Cp: z.number().optional(),
  Tr: z.number().optional(),
  Tc: z.number().optional(),
  Co: z.number().optional(),
  Kd: z.number().optional(),
  Ur: z.string(),
  Fl: z.any().optional(),
  FK52: z.number().optional(),
  FP52: z.number().optional(),
});

// Backlinks Overview schema
export const backlinksOverviewSchema = z.object({
  total: z.number(),
  domains_num: z.number(),
  urls_num: z.number(),
  ips_num: z.number().optional(),
  follows_num: z.number().optional(),
  nofollows_num: z.number().optional(),
  score: z.number(),
});

// Keyword Overview schema
export const keywordOverviewSchema = z.object({
  Ph: z.string(),
  Nq: z.number(),
  Cp: z.number().optional(),
  Co: z.number().optional(),
  Nr: z.number().optional(),
  Kd: z.number().optional(),
  Td: z.any().optional(),
});

// Traffic Analytics schema
export const trafficAnalyticsSchema = z.object({
  visits_total: z.number(),
  visits_direct: z.number().optional(),
  visits_referral: z.number().optional(),
  visits_organic: z.number().optional(),
  visits_paid: z.number().optional(),
  visits_social: z.number().optional(),
  visits_email: z.number().optional(),
  visits_display: z.number().optional(),
  visits_ai_assistants: z.number().optional(),
  visits_ai_search: z.number().optional(),
  bounce_rate: z.number().optional(),
  pages_per_visit: z.number().optional(),
  avg_duration: z.number().optional(),
});

// Map Rank schema
export const mapRankSchema = z.object({
  keyword: z.string(),
  avg_rank: z.number().optional(),
  sov: z.number().optional(),
  good_pct: z.number().optional(),
  avg_pct: z.number().optional(),
  poor_pct: z.number().optional(),
});

// Inferred types
export type DomainOverview = z.infer<typeof domainOverviewSchema>;
export type DomainOrganicRow = z.infer<typeof domainOrganicRowSchema>;
export type BacklinksOverview = z.infer<typeof backlinksOverviewSchema>;
export type KeywordOverview = z.infer<typeof keywordOverviewSchema>;
export type TrafficAnalytics = z.infer<typeof trafficAnalyticsSchema>;
export type MapRank = z.infer<typeof mapRankSchema>;
