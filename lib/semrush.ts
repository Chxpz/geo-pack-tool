/**
 * SEMrush API client — comprehensive SEO data collection for GEO/AEO pivot.
 *
 * Supports 9 endpoints:
 * 1. Domain Overview — traffic, visibility, rank metrics
 * 2. Domain Organic Keywords — organic search terms with FK52/FP52 AI columns
 * 3. Backlinks Overview — referring domain data
 * 4. Keyword Overview — search volume, difficulty, cost per click
 * 5. Position Tracking — keyword rank history (placeholder, project-based)
 * 6. Site Audit — technical SEO issues (placeholder, project-based)
 * 7. Trends API — traffic analytics by channel
 * 8. Map Rank Tracker (FREE) — local ranking
 * 9. Listing Management — GMB and local citations
 *
 * Rate limiting: 10 req/sec, 10 concurrent max.
 * Auth: API key via query parameter.
 * v3 API responses are semicolon-delimited CSV; v4 responses are JSON.
 */

import { z } from 'zod';
import { withLogContext } from '@/lib/logger';
import { retry } from '@/lib/retry';
import {
  domainOverviewSchema,
  domainOrganicRowSchema,
  backlinksOverviewSchema,
  keywordOverviewSchema,
  trafficAnalyticsSchema,
  mapRankSchema,
  type DomainOverview,
  type DomainOrganicRow,
  type BacklinksOverview,
  type KeywordOverview,
  type TrafficAnalytics,
  type MapRank,
} from '@/lib/schemas/semrush';

const SEMRUSH_API_BASE = 'https://api.semrush.com';
const SEMRUSH_API_KEY = process.env.SEMRUSH_API_KEY;
const semrushLogger = withLogContext({ scope: 'semrush' });

class SemrushApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SemrushApiError';
  }
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

/**
 * Simple token bucket rate limiter.
 * Enforces: 10 requests per second, 10 concurrent max.
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity = 10;
  private readonly refillRate = 10; // tokens per second
  private activeRequests = 0;
  private readonly maxConcurrent = 10;
  private queue: (() => void)[] = [];

  constructor() {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate,
    );
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    while (true) {
      this.refillTokens();

      if (this.tokens >= 1 && this.activeRequests < this.maxConcurrent) {
        this.tokens -= 1;
        this.activeRequests += 1;
        return;
      }

      await new Promise<void>((resolve) => {
        const notify = () => resolve();
        this.queue.push(notify);
        setTimeout(() => {
          const idx = this.queue.indexOf(notify);
          if (idx !== -1) this.queue.splice(idx, 1);
          notify();
        }, 100);
      });
    }
  }

  release(): void {
    this.activeRequests -= 1;
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }
}

const rateLimiter = new RateLimiter();

// ─── CSV Parser ──────────────────────────────────────────────────────────────

/**
 * Parses semicolon-delimited CSV response from SEMrush v3 API.
 * Returns array of objects keyed by header names.
 */
function parseSemrushCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';').map((v) => v.trim());
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j];
      }
      rows.push(row);
    }
  }

  return rows;
}

// ─── Helper: Make API request ────────────────────────────────────────────────

interface ApiRequestOptions {
  action: string;
  type?: string;
  domain?: string;
  phrase?: string;
  database?: string;
  displayLimit?: number;
  displayOffset?: number;
  displaySort?: string;
  projectId?: string;
  keywords?: string;
}

async function makeSemrushRequest<T>(
  options: ApiRequestOptions,
  parser: (data: string) => T,
): Promise<T> {
  if (!SEMRUSH_API_KEY) {
    throw new Error('SEMRUSH_API_KEY is not set');
  }

  await rateLimiter.acquire();

  try {
    const params = new URLSearchParams();
    params.append('key', SEMRUSH_API_KEY);
    params.append('action', options.action);

    if (options.type) params.append('type', options.type);
    if (options.domain) params.append('domain', options.domain);
    if (options.phrase) params.append('phrase', options.phrase);
    if (options.database) params.append('database', options.database);
    if (options.displayLimit !== undefined)
      params.append('display_limit', options.displayLimit.toString());
    if (options.displayOffset !== undefined)
      params.append('display_offset', options.displayOffset.toString());
    if (options.displaySort)
      params.append('display_sort', options.displaySort);
    if (options.projectId) params.append('project_id', options.projectId);
    if (options.keywords) params.append('keywords', options.keywords);

    const url = `${SEMRUSH_API_BASE}?${params.toString()}`;

    const response = await retry(
      async () => {
        const result = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'text/plain' },
        });

        if (!result.ok) {
          const errorText = await result.text();
          throw new SemrushApiError(
            `SEMrush API error: ${result.status} ${errorText.slice(0, 100)}`,
            result.status,
          );
        }

        return result;
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30_000,
        onRetry: async (error, attempt, delayMs) => {
          semrushLogger.warn(
            { err: error, action: options.action, attempt, delayMs },
            'Retrying SEMrush API request',
          );
        },
      },
    );

    const data = await response.text();
    return parser(data);
  } finally {
    rateLimiter.release();
  }
}

// ─── Endpoint 1: Domain Overview ──────────────────────────────────────────────

export async function getDomainOverview(
  domain: string,
  database?: string,
): Promise<DomainOverview> {
  const parser = (csv: string) => {
    const rows = parseSemrushCsv(csv);
    if (rows.length === 0) throw new Error(`No data for domain: ${domain}`);

    const row = rows[0];
    const parsed = {
      Db: row.Db || '',
      Dn: row.Dn || domain,
      Rk: parseInt(row.Rk || '0', 10),
      Or: parseInt(row.Or || '0', 10),
      Ot: parseInt(row.Ot || '0', 10),
      Oc: parseInt(row.Oc || '0', 10),
      Ad: row.Ad ? parseInt(row.Ad, 10) : undefined,
      At: row.At ? parseInt(row.At, 10) : undefined,
      Ac: row.Ac ? parseInt(row.Ac, 10) : undefined,
      FPla: row.FPla,
    };

    return domainOverviewSchema.parse(parsed);
  };

  return makeSemrushRequest(
    {
      action: 'report',
      type: 'domain_overview',
      domain,
      database: database || 'us',
    },
    parser,
  );
}

// ─── Endpoint 2: Domain Organic Keywords ──────────────────────────────────────

export async function getDomainOrganic(
  domain: string,
  opts?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    database?: string;
  },
): Promise<DomainOrganicRow[]> {
  const parser = (csv: string) => {
    const rows = parseSemrushCsv(csv);
    const parsed = rows.map((row) => ({
      Ph: row.Ph || '',
      Po: parseInt(row.Po || '0', 10),
      Pp: row.Pp ? parseInt(row.Pp, 10) : undefined,
      Nq: parseInt(row.Nq || '0', 10),
      Cp: row.Cp ? parseInt(row.Cp, 10) : undefined,
      Tr: row.Tr ? parseInt(row.Tr, 10) : undefined,
      Tc: row.Tc ? parseInt(row.Tc, 10) : undefined,
      Co: row.Co ? parseInt(row.Co, 10) : undefined,
      Kd: row.Kd ? parseInt(row.Kd, 10) : undefined,
      Ur: row.Ur || '',
      Fl: row.Fl,
      FK52: row.FK52 ? parseInt(row.FK52, 10) : undefined,
      FP52: row.FP52 ? parseInt(row.FP52, 10) : undefined,
    }));

    return parsed.map((p) => domainOrganicRowSchema.parse(p));
  };

  return makeSemrushRequest(
    {
      action: 'report',
      type: 'domain_organic',
      domain,
      database: opts?.database || 'us',
      displayLimit: opts?.limit || 100,
      displayOffset: opts?.offset || 0,
      displaySort: opts?.sortBy || 'Po_asc',
    },
    parser,
  );
}

// ─── Endpoint 3: Backlinks Overview ───────────────────────────────────────────

export async function getBacklinksOverview(
  domain: string,
): Promise<BacklinksOverview> {
  const parser = (csv: string) => {
    const rows = parseSemrushCsv(csv);
    if (rows.length === 0) throw new Error(`No backlink data for: ${domain}`);

    const row = rows[0];
    const parsed = {
      total: parseInt(row.backlinks || row.total || '0', 10),
      domains_num: parseInt(row.referring_domains || row.domains_num || '0', 10),
      urls_num: parseInt(row.referring_urls || row.urls_num || '0', 10),
      ips_num: row.referring_ips
        ? parseInt(row.referring_ips, 10)
        : undefined,
      follows_num: row.dofollow
        ? parseInt(row.dofollow, 10)
        : undefined,
      nofollows_num: row.nofollow
        ? parseInt(row.nofollow, 10)
        : undefined,
      score: parseInt(row.score || row.authority || '0', 10),
    };

    return backlinksOverviewSchema.parse(parsed);
  };

  return makeSemrushRequest(
    {
      action: 'report',
      type: 'backlinks_overview',
      domain,
    },
    parser,
  );
}

// ─── Endpoint 4: Keyword Overview (batch support) ────────────────────────────

export async function getKeywordOverview(
  keywords: string[],
  database?: string,
): Promise<KeywordOverview[]> {
  const parser = (csv: string) => {
    const rows = parseSemrushCsv(csv);
    const parsed = rows.map((row) => ({
      Ph: row.Ph || '',
      Nq: parseInt(row.Nq || '0', 10),
      Cp: row.Cp ? parseInt(row.Cp, 10) : undefined,
      Co: row.Co ? parseInt(row.Co, 10) : undefined,
      Nr: row.Nr ? parseInt(row.Nr, 10) : undefined,
      Kd: row.Kd ? parseInt(row.Kd, 10) : undefined,
      Td: row.Td,
    }));

    return parsed.map((p) => keywordOverviewSchema.parse(p));
  };

  return makeSemrushRequest(
    {
      action: 'keyword_overview',
      database: database || 'us',
      keywords: keywords.join(','),
    },
    parser,
  );
}

// ─── Endpoint 5: Position Tracking (placeholder, project-based) ───────────────

export async function getPositionTracking(projectId: string): Promise<unknown> {
  semrushLogger.warn(
    { projectId },
    'Position Tracking requires SEMrush project setup in dashboard',
  );
  return {
    placeholder: true,
    message:
      'Position Tracking requires project configuration in SEMrush dashboard',
  };
}

// ─── Endpoint 6: Site Audit (placeholder, project-based) ─────────────────────

export async function getSiteAudit(projectId: string): Promise<unknown> {
  semrushLogger.warn(
    { projectId },
    'Site Audit requires SEMrush project setup in dashboard',
  );
  return {
    placeholder: true,
    message: 'Site Audit requires project configuration in SEMrush dashboard',
  };
}

// ─── Endpoint 7: Trends API — Traffic Analytics ────────────────────────────────

export async function getTrafficAnalytics(
  domain: string,
): Promise<TrafficAnalytics> {
  const parser = (data: string) => {
    // Trends API may return JSON or CSV; try JSON first
    try {
      const json = JSON.parse(data);
      const parsed = {
        visits_total: parseInt(json.visits || json.visits_total || '0', 10),
        visits_direct: json.direct ? parseInt(json.direct, 10) : undefined,
        visits_referral: json.referral
          ? parseInt(json.referral, 10)
          : undefined,
        visits_organic: json.organic ? parseInt(json.organic, 10) : undefined,
        visits_paid: json.paid ? parseInt(json.paid, 10) : undefined,
        visits_social: json.social ? parseInt(json.social, 10) : undefined,
        visits_email: json.email ? parseInt(json.email, 10) : undefined,
        visits_display: json.display ? parseInt(json.display, 10) : undefined,
        visits_ai_assistants: json.ai_assistants
          ? parseInt(json.ai_assistants, 10)
          : undefined,
        visits_ai_search: json.ai_search
          ? parseInt(json.ai_search, 10)
          : undefined,
        bounce_rate: json.bounce_rate
          ? parseFloat(json.bounce_rate)
          : undefined,
        pages_per_visit: json.pages_per_visit
          ? parseFloat(json.pages_per_visit)
          : undefined,
        avg_duration: json.avg_duration
          ? parseFloat(json.avg_duration)
          : undefined,
      };
      return trafficAnalyticsSchema.parse(parsed);
    } catch {
      // Fall back to CSV parsing
      const rows = parseSemrushCsv(data);
      if (rows.length === 0) throw new Error(`No traffic data for: ${domain}`);

      const row = rows[0];
      const parsed = {
        visits_total: parseInt(row.visits || row.visits_total || '0', 10),
        visits_direct: row.direct ? parseInt(row.direct, 10) : undefined,
        visits_referral: row.referral ? parseInt(row.referral, 10) : undefined,
        visits_organic: row.organic ? parseInt(row.organic, 10) : undefined,
        visits_paid: row.paid ? parseInt(row.paid, 10) : undefined,
        visits_social: row.social ? parseInt(row.social, 10) : undefined,
        visits_email: row.email ? parseInt(row.email, 10) : undefined,
        visits_display: row.display ? parseInt(row.display, 10) : undefined,
        visits_ai_assistants: row.ai_assistants
          ? parseInt(row.ai_assistants, 10)
          : undefined,
        visits_ai_search: row.ai_search
          ? parseInt(row.ai_search, 10)
          : undefined,
        bounce_rate: row.bounce_rate
          ? parseFloat(row.bounce_rate)
          : undefined,
        pages_per_visit: row.pages_per_visit
          ? parseFloat(row.pages_per_visit)
          : undefined,
        avg_duration: row.avg_duration
          ? parseFloat(row.avg_duration)
          : undefined,
      };
      return trafficAnalyticsSchema.parse(parsed);
    }
  };

  return makeSemrushRequest(
    {
      action: 'trends',
      type: 'traffic_analytics',
      domain,
    },
    parser,
  );
}

// ─── Endpoint 8: Map Rank Tracker (FREE endpoint) ────────────────────────────

export async function getMapRanking(
  domain: string,
  keywords: string[],
): Promise<MapRank[]> {
  const parser = (data: string) => {
    const json = JSON.parse(data);
    const results = Array.isArray(json) ? json : json.results || [];

    const parsed = results.map((r: Record<string, unknown>) => ({
      keyword: r.keyword || '',
      avg_rank: r.avg_rank ? parseFloat(r.avg_rank as string) : undefined,
      sov: r.sov ? parseFloat(r.sov as string) : undefined,
      good_pct: r.good_pct
        ? parseFloat(r.good_pct as string)
        : undefined,
      avg_pct: r.avg_pct ? parseFloat(r.avg_pct as string) : undefined,
      poor_pct: r.poor_pct
        ? parseFloat(r.poor_pct as string)
        : undefined,
    }));

    return parsed.map((p: unknown) => mapRankSchema.parse(p));
  };

  return makeSemrushRequest(
    {
      action: 'map_rank',
      domain,
      keywords: keywords.join(','),
    },
    parser,
  );
}

// ─── Endpoint 9: Listing Management ───────────────────────────────────────────

export async function getListingLocations(): Promise<unknown> {
  semrushLogger.warn('Listing Management requires GMB connector setup');
  return {
    placeholder: true,
    message: 'Listing Management requires GMB connector setup',
  };
}

// ─── Composite: Pull full SEO snapshot ────────────────────────────────────────

export interface SEOSnapshotData {
  domainOverview: DomainOverview;
  organicKeywords: DomainOrganicRow[];
  backlinksOverview: BacklinksOverview;
  trafficAnalytics: TrafficAnalytics;
  mapRanking: MapRank[];
  lastUpdated: string;
}

/**
 * Pulls all available SEO data for a domain.
 * Respects rate limits and runs in parallel where safe.
 *
 * @param domain Target domain (e.g., example.com)
 * @param depth One of: 'basic', 'advanced', 'full'
 *   - basic: domain overview + organic keywords (limit 50)
 *   - advanced: adds backlinks + traffic analytics
 *   - full: adds map ranking (requires keyword list)
 */
export async function pullFullSeoSnapshot(
  domain: string,
  depth: string = 'basic',
): Promise<Partial<SEOSnapshotData>> {
  const result: Partial<SEOSnapshotData> = {
    lastUpdated: new Date().toISOString(),
  };

  try {
    // Always pull domain overview
    result.domainOverview = await getDomainOverview(domain);

    // Always pull organic keywords
    const keywordLimit = depth === 'basic' ? 50 : 200;
    result.organicKeywords = await getDomainOrganic(domain, {
      limit: keywordLimit,
    });

    if (depth === 'advanced' || depth === 'full') {
      // Parallel requests for backlinks and traffic
      const [backlinks, traffic] = await Promise.all([
        getBacklinksOverview(domain),
        getTrafficAnalytics(domain),
      ]);

      result.backlinksOverview = backlinks;
      result.trafficAnalytics = traffic;
    }

    if (depth === 'full' && result.organicKeywords) {
      // Extract top keywords for map ranking
      const topKeywords = result.organicKeywords
        .slice(0, 20)
        .map((kw) => kw.Ph)
        .filter(Boolean);

      if (topKeywords.length > 0) {
        result.mapRanking = await getMapRanking(domain, topKeywords);
      }
    }
  } catch (error) {
    semrushLogger.error(
      { err: error, domain, depth },
      'Error pulling full SEO snapshot',
    );
  }

  return result;
}
