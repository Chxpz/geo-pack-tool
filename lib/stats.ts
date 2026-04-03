/**
 * Dashboard stats — fetches all Visibility Dashboard metrics from Supabase.
 * Called from both the server component (initial render) and the API route (SWR refresh).
 * Supports both legacy e-commerce and new AEO/GEO business models.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { calculateVisibilityScore } from '@/lib/visibility-score';
import type {
  DashboardStats,
  TimelinePoint,
  PlatformPoint,
  TopProduct,
  CompetitorComparison,
  TopQuery,
  SEOSnapshot,
  GEOAudit,
  BrandVisibility,
  VisibilityScoreResult,
} from '@/lib/types';

// ─── Internal row types ───────────────────────────────────────────────────────

interface PlatformRow {
  id: number;
  slug: string;
  name: string;
}

interface MentionRow {
  platform_id: number;
  scanned_at: string;
  mentioned: boolean;
}

interface TopMentionRow {
  product_id: string;
  position: number | null;
}

interface ProductRow {
  id: string;
  name: string;
  image_url: string | null;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function emptyStats(): DashboardStats {
  const now = new Date();
  const timelineData: TimelinePoint[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    return {
      date: d.toISOString().slice(0, 10),
      chatgpt: 0,
      perplexity: 0,
      gemini: 0,
      claude: 0,
    };
  });
  return {
    totalMentions: 0,
    previousMentions: 0,
    visibilityScore: 0,
    openErrors: 0,
    platformBreakdown: [],
    timelineData,
    topProducts: [],
  };
}

// ─── New comprehensive fetch for AEO/GEO pivot ───────────────────────────────

export async function fetchDashboardStats(
  userId: string,
  businessId?: string
): Promise<DashboardStats> {
  if (!supabaseAdmin) return emptyStats();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // If businessId provided, fetch AEO/GEO metrics. Otherwise, fall back to e-commerce
  if (businessId) {
    return fetchBusinessDashboardStats(userId, businessId, now, thirtyDaysAgo, sevenDaysAgo);
  }

  // Legacy e-commerce path
  return fetchEcommerceDashboardStats(userId, now, sevenDaysAgo);
}

async function fetchEcommerceDashboardStats(
  userId: string,
  now: Date,
  sevenDaysAgo: string
): Promise<DashboardStats> {
  if (!supabaseAdmin) return emptyStats();

  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [
    platformsResult,
    currentCountResult,
    previousCountResult,
    timelineRowsResult,
    totalProductsResult,
    topMentionRowsResult,
    openErrorsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('ai_platforms')
      .select('id, slug, name')
      .eq('enabled', true),

    supabaseAdmin
      .from('ai_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mentioned', true)
      .gte('scanned_at', sevenDaysAgo),

    supabaseAdmin
      .from('ai_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mentioned', true)
      .gte('scanned_at', fourteenDaysAgo)
      .lt('scanned_at', sevenDaysAgo),

    supabaseAdmin
      .from('ai_mentions')
      .select('platform_id, scanned_at, mentioned')
      .eq('user_id', userId)
      .gte('scanned_at', sevenDaysAgo)
      .order('scanned_at', { ascending: true }),

    supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null),

    supabaseAdmin
      .from('ai_mentions')
      .select('product_id, position')
      .eq('user_id', userId)
      .eq('mentioned', true)
      .gte('scanned_at', sevenDaysAgo),

    supabaseAdmin
      .from('truth_engine_errors')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('resolved', false),
  ]);

  const platforms = (platformsResult.data ?? []) as PlatformRow[];
  const totalMentions = currentCountResult.count ?? 0;
  const previousMentions = previousCountResult.count ?? 0;
  const timelineRows = (timelineRowsResult.data ?? []) as MentionRow[];
  const totalProducts = totalProductsResult.count ?? 0;
  const topMentionRows = (topMentionRowsResult.data ?? []) as TopMentionRow[];
  const openErrors = openErrorsResult.count ?? 0;

  const platformMap = new Map<number, string>(
    platforms.map((p) => [p.id, p.slug]),
  );

  const platformCounts = new Map<string, number>(
    platforms.map((p) => [p.slug, 0]),
  );
  for (const row of timelineRows) {
    if (!row.mentioned) continue;
    const slug = platformMap.get(row.platform_id);
    if (slug) platformCounts.set(slug, (platformCounts.get(slug) ?? 0) + 1);
  }
  const platformBreakdown: PlatformPoint[] = platforms.map((p) => ({
    platform: p.name,
    slug: p.slug,
    mentions: platformCounts.get(p.slug) ?? 0,
  }));

  const timelineMap = new Map<string, TimelinePoint>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    timelineMap.set(key, { date: key, chatgpt: 0, perplexity: 0, gemini: 0, claude: 0 });
  }
  for (const row of timelineRows) {
    if (!row.mentioned) continue;
    const dateKey = row.scanned_at.slice(0, 10);
    const slug = platformMap.get(row.platform_id);
    const entry = timelineMap.get(dateKey);
    if (entry && slug) {
      if (slug === 'chatgpt') entry.chatgpt++;
      else if (slug === 'perplexity') entry.perplexity++;
      else if (slug === 'gemini') entry.gemini++;
      else if (slug === 'claude') entry.claude++;
    }
  }
  const timelineData = Array.from(timelineMap.values());

  const productStats = new Map<string, { count: number; positions: number[] }>();
  for (const row of topMentionRows) {
    const pid = row.product_id;
    const existing = productStats.get(pid) ?? { count: 0, positions: [] };
    existing.count++;
    if (row.position != null) existing.positions.push(row.position);
    productStats.set(pid, existing);
  }

  const topIds = Array.from(productStats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id]) => id);

  let topProducts: TopProduct[] = [];
  if (topIds.length > 0) {
    const { data: productRows } = await supabaseAdmin
      .from('products')
      .select('id, name, image_url')
      .in('id', topIds);

    topProducts = ((productRows ?? []) as ProductRow[])
      .map((p) => {
        const stats = productStats.get(p.id)!;
        const avg =
          stats.positions.length > 0
            ? Math.round(
                (stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length) * 10,
              ) / 10
            : null;
        return {
          id: p.id,
          name: p.name,
          image_url: p.image_url ?? undefined,
          mentions: stats.count,
          avg_position: avg,
        };
      })
      .sort((a, b) => b.mentions - a.mentions);
  }

  const mentionedProductCount = new Set(topMentionRows.map((r) => r.product_id)).size;
  const visibilityScore =
    totalProducts > 0 ? Math.round((mentionedProductCount / totalProducts) * 100) : 0;

  return {
    totalMentions,
    previousMentions,
    visibilityScore,
    openErrors,
    platformBreakdown,
    timelineData,
    topProducts,
  };
}

async function fetchBusinessDashboardStats(
  userId: string,
  businessId: string,
  now: Date,
  thirtyDaysAgo: string,
  sevenDaysAgo: string
): Promise<DashboardStats> {
  if (!supabaseAdmin) return emptyStats();

  const [
    visibilityScoreData,
    mentionsData,
    seoSnapshotResult,
    brandVisibilityResult,
    citationCountsData,
    competitorCountsData,
    topQueriesData,
    timelineDataResult,
  ] = await Promise.all([
    // Visibility score
    (async () => {
      const { data: queries } = await supabaseAdmin
        .from('tracked_queries')
        .select('id')
        .eq('business_id', businessId)
        .eq('is_active', true);

      const queryIds = (queries ?? []).map((q) => q.id);
      if (queryIds.length === 0) {
        return {
          score: 0,
          components: {
            mention_rate: { value: 0, weight: 0.4, contribution: 0 },
            avg_position: { value: 0, weight: 0.2, contribution: 0 },
            sentiment: { value: 0, weight: 0.2, contribution: 0 },
            own_citation_rate: { value: 0, weight: 0.2, contribution: 0 },
          },
        } as VisibilityScoreResult;
      }

      const { data: mentions } = await supabaseAdmin
        .from('ai_mentions')
        .select('mentioned, position, sentiment_score')
        .eq('business_id', businessId)
        .in('query_id', queryIds)
        .gte('scanned_at', thirtyDaysAgo);

      const { data: citations } = await supabaseAdmin
        .from('citations')
        .select('is_own_domain')
        .eq('business_id', businessId)
        .gte('scan_date', thirtyDaysAgo);

      const mentionData = mentions ?? [];
      const mentionedCount = mentionData.filter((m) => m.mentioned).length;
      const positions = mentionData
        .filter((m) => m.mentioned && m.position)
        .map((m) => m.position);
      const avgPosition = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : null;
      const sentimentScores = mentionData
        .filter((m) => m.mentioned && m.sentiment_score !== null)
        .map((m) => m.sentiment_score);
      const sentimentScore = sentimentScores.length > 0
        ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
        : 0.5;

      const citationData = citations ?? [];
      const ownCitations = citationData.filter((c) => c.is_own_domain).length;

      return calculateVisibilityScore({
        totalQueries: queryIds.length,
        mentionedQueries: mentionedCount,
        avgPosition,
        sentimentPositive: sentimentScore > 0.6 ? sentimentScores.length : 0,
        sentimentNeutral: sentimentScore >= 0.4 && sentimentScore <= 0.6 ? sentimentScores.length : 0,
        sentimentNegative: sentimentScore < 0.4 ? sentimentScores.length : 0,
        ownDomainCitations: ownCitations,
        totalCitations: citationData.length > 0 ? citationData.length : 1,
      });
    })(),

    // Latest mentions
    supabaseAdmin
      .from('ai_mentions')
      .select('id', { count: 'exact' })
      .eq('business_id', businessId)
      .eq('mentioned', true)
      .gte('scanned_at', sevenDaysAgo),

    // Latest SEO snapshot
    supabaseAdmin
      .from('seo_snapshots')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Latest brand visibility
    supabaseAdmin
      .from('brand_visibility')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Citation counts
    supabaseAdmin
      .from('citations')
      .select('is_own_domain', { count: 'exact' })
      .eq('business_id', businessId),

    // Competitor counts
    supabaseAdmin
      .from('competitors')
      .select('id, competitor_name')
      .eq('business_id', businessId),

    // Top queries
    (async () => {
      const { data: mentions } = await supabaseAdmin
        .from('ai_mentions')
        .select('query_id, mentioned')
        .eq('business_id', businessId)
        .gte('scanned_at', thirtyDaysAgo);

      const queryMentionCounts = new Map<string, number>();
      for (const m of mentions ?? []) {
        if (m.mentioned && m.query_id) {
          queryMentionCounts.set(m.query_id, (queryMentionCounts.get(m.query_id) ?? 0) + 1);
        }
      }

      const topQueryIds = Array.from(queryMentionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      if (topQueryIds.length === 0) return [];

      const { data: queries } = await supabaseAdmin
        .from('tracked_queries')
        .select('id, query_text')
        .in('id', topQueryIds);

      return (queries ?? []) as TopQuery[];
    })(),

    // Timeline data (last 30 days)
    (async () => {
      const { data } = await supabaseAdmin
        .from('ai_mentions')
        .select('scanned_at, mentioned')
        .eq('business_id', businessId)
        .gte('scanned_at', thirtyDaysAgo);

      const timelineMap = new Map<string, TimelinePoint>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        timelineMap.set(key, { date: key, chatgpt: 0, perplexity: 0, gemini: 0, claude: 0 });
      }

      for (const m of data ?? []) {
        if (m.mentioned) {
          const dateKey = m.scanned_at.slice(0, 10);
          const entry = timelineMap.get(dateKey);
          if (entry) entry.chatgpt++;
        }
      }

      return Array.from(timelineMap.values());
    })(),
  ]);

  const citationCount = (citationCountsData.count ?? 0) as number;
  const ownCitationCount = (await supabaseAdmin
    .from('citations')
    .select('id', { count: 'exact' })
    .eq('business_id', businessId)
    .eq('is_own_domain', true)).count ?? 0;

  const competitors = (competitorCountsData.data ?? []) as Array<{ id: string; competitor_name: string }>;
  const competitorData: CompetitorComparison[] = competitors.map((c) => ({
    competitor_id: c.id,
    name: c.competitor_name,
    visibility_score: 0,
    mentions: 0,
    trend: 0,
  }));

  const seoSnapshotData = seoSnapshotResult.data as SEOSnapshot | null;
  const brandVisibilityData = brandVisibilityResult.data as BrandVisibility | null;

  return {
    totalMentions: mentionsData.count ?? 0,
    previousMentions: 0,
    visibilityScore: Math.round(visibilityScoreData.score),
    openErrors: 0,
    platformBreakdown: [
      { platform: 'ChatGPT', slug: 'chatgpt', mentions: mentionsData.count ?? 0 },
    ],
    timelineData: timelineDataResult ?? [],
    topProducts: [],
    // New AEO/GEO fields
    aiVisibilityScore: visibilityScoreData.score,
    shareOfVoice: brandVisibilityData?.share_of_voice ?? 0,
    citationCount,
    authorityScore: seoSnapshotData?.authority_score ?? 0,
    competitorData,
    topQueries: topQueriesData,
  };
}
