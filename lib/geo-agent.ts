/**
 * GEO/AEO Agent — RAG context builder, system prompts, and Perplexity integration
 * Provides context assembly and agent interaction for geo-specialized AI assistance
 */

import { supabaseAdmin } from '@/lib/supabase';
import { querySonar, type SonarQueryOptions } from '@/lib/perplexity-sonar';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentContext {
  businessProfile: {
    id: string;
    name: string;
    type: string;
    address?: string;
    website?: string;
  };
  recentMentions: Array<{
    query: string;
    platform: string;
    mentioned: boolean;
    sentiment: string;
    position?: number;
  }>;
  visibilityMetrics: {
    shareOfVoice?: number;
    coverageRate?: number;
    citationCount: number;
    sentimentBreakdown: Record<string, number>;
  };
  citationData: Array<{
    url: string;
    domain: string;
    title?: string;
    isOwn: boolean;
    isCompetitor: boolean;
  }>;
  seoSnapshot?: {
    domainAuthority?: number;
    organicTraffic?: number;
    aiOverviewPresent?: number;
    mapsRank?: number;
    topKeywords?: Array<{ keyword: string; position: number }>;
  };
  geoAudit?: {
    score?: number;
    verdict?: string;
    weakDimensions?: Array<{ name: string; score: number; maxScore: number }>;
    criticalFindings?: Array<{ severity: string; title: string; description: string }>;
    actionPlan?: { critical: string[]; nearTerm: string[]; strategic: string[] };
    reportUrl?: string;
  };
  competitors: Array<{
    id: string;
    name: string;
    visibility?: number;
  }>;
}

// ─── RAG Context Builder ──────────────────────────────────────────────────────

/**
 * Build comprehensive RAG context for agent from business data
 * Queries last 30 days of mentions, latest snapshots, and audit data
 */
export async function buildAgentContext(businessId: string): Promise<AgentContext> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured');
  }

  // Fetch business profile
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, business_type, address_street, address_city, address_state, website_url')
    .eq('id', businessId)
    .single();

  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  // Fetch recent AI mentions (30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: mentions } = await supabaseAdmin
    .from('ai_mentions')
    .select('query, platform_id, mentioned, sentiment, position, scanned_at')
    .eq('business_id', businessId)
    .gte('scanned_at', thirtyDaysAgo)
    .order('scanned_at', { ascending: false })
    .limit(20);

  // Fetch latest SEO snapshot
  const { data: seoSnapshot } = await supabaseAdmin
    .from('seo_snapshots')
    .select(
      'domain_authority_rank, organic_traffic, ai_overview_keywords_present, maps_avg_rank, top_keywords'
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch latest brand visibility
  const { data: brandVisibility } = await supabaseAdmin
    .from('brand_visibility')
    .select(
      'share_of_voice, coverage_rate, mention_count, sentiment_positive_pct, sentiment_neutral_pct, sentiment_negative_pct'
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch citations (90 days)
  const ninetydaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: citations } = await supabaseAdmin
    .from('citations')
    .select('cited_url, cited_domain, cited_title, is_own_domain, is_competitor_domain')
    .eq('business_id', businessId)
    .gte('created_at', ninetydaysAgo)
    .order('created_at', { ascending: false })
    .limit(30);

  // Fetch latest complete GEO audit
  const { data: geoAudit } = await supabaseAdmin
    .from('geo_audits')
    .select('overall_score, verdict, dimension_scores, findings, action_plan, report_url')
    .eq('business_id', businessId)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch competitors
  const { data: competitors } = await supabaseAdmin
    .from('competitors')
    .select('id, competitor_name')
    .eq('business_id', businessId);

  // Calculate sentiment breakdown
  const sentimentCounts = {
    positive: mentions?.filter(m => m.sentiment === 'positive').length || 0,
    neutral: mentions?.filter(m => m.sentiment === 'neutral').length || 0,
    negative: mentions?.filter(m => m.sentiment === 'negative').length || 0,
  };

  // Map platform IDs to names (simplified)
  const platformMap: Record<string, string> = {
    '1': 'ChatGPT',
    '2': 'Perplexity',
    '3': 'Google Gemini',
    '4': 'Claude',
  };

  const address = [
    business.address_street,
    business.address_city,
    business.address_state,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    businessProfile: {
      id: business.id,
      name: business.business_name,
      type: business.business_type,
      address: address || undefined,
      website: business.website_url || undefined,
    },
    recentMentions: (mentions || []).map(m => ({
      query: m.query,
      platform: platformMap[String(m.platform_id)] || `Platform ${m.platform_id}`,
      mentioned: m.mentioned,
      sentiment: m.sentiment || 'neutral',
      position: m.position || undefined,
    })),
    visibilityMetrics: {
      shareOfVoice: brandVisibility?.share_of_voice || undefined,
      coverageRate: brandVisibility?.coverage_rate || undefined,
      citationCount: citations?.length || 0,
      sentimentBreakdown: sentimentCounts,
    },
    citationData: (citations || []).map(c => ({
      url: c.cited_url,
      domain: c.cited_domain,
      title: c.cited_title || undefined,
      isOwn: c.is_own_domain,
      isCompetitor: c.is_competitor_domain,
    })),
    seoSnapshot: seoSnapshot
      ? {
          domainAuthority: seoSnapshot.domain_authority_rank || undefined,
          organicTraffic: seoSnapshot.organic_traffic || undefined,
          aiOverviewPresent: seoSnapshot.ai_overview_keywords_present || undefined,
          mapsRank: seoSnapshot.maps_avg_rank || undefined,
          topKeywords: (seoSnapshot.top_keywords as any[])?.slice(0, 5) || undefined,
        }
      : undefined,
    geoAudit: geoAudit
      ? {
          score: geoAudit.overall_score || undefined,
          verdict: geoAudit.verdict || undefined,
          weakDimensions: (geoAudit.dimension_scores as Array<{ number: number; name: string; score: number; maxScore: number }>)
            ?.sort((a, b) => (a.score / a.maxScore) - (b.score / b.maxScore))
            .slice(0, 3)
            .map(d => ({ name: d.name, score: d.score, maxScore: d.maxScore })),
          criticalFindings: (geoAudit.findings as Array<{ severity: string; title: string; description: string }>)
            ?.filter(f => f.severity === 'Critical' || f.severity === 'High')
            .slice(0, 5),
          actionPlan: geoAudit.action_plan as { critical: string[]; nearTerm: string[]; strategic: string[] } | undefined,
          reportUrl: geoAudit.report_url || undefined,
        }
      : undefined,
    competitors: (competitors || []).map(c => ({
      id: c.id,
      name: c.competitor_name,
      visibility: undefined,
    })),
  };
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

/**
 * Build comprehensive system prompt for agent
 * Includes role, context, instructions, and guidelines
 */
export function buildSystemPrompt(context: AgentContext): string {
  const contextBlock = formatContextSnapshot(context);

  return `You are an expert GEO (Geolocation SEO) and AEO (AI-Optimized SEO) specialist with deep access to ${context.businessProfile.name}'s proprietary data. Your role is to provide strategic, actionable insights grounded in their real business metrics, market position, and competitive landscape.

## Your Role
You are a trusted advisor and specialist in:
- AI search visibility (ChatGPT, Google AI Overviews, Perplexity, Claude)
- Local SEO and geolocation optimization
- Brand visibility and positioning in AI-generated content
- Competitive benchmarking and market strategy
- Citation and backlink quality analysis
- Content and structured data recommendations

## Critical Guidelines
1. **Always cite specific data**: Reference actual metrics, dates, and observations from the provided context. Never make up numbers or statistics.
2. **Never hallucinate**: If you don't know something, say so. If data is missing, indicate what's needed.
3. **Provide context**: Always explain the business relevance and strategic importance of recommendations.
4. **Include disclaimers**: Note when data is preliminary, outdated (>30 days old), or incomplete.
5. **Prioritize recommendations**: Mark as HIGH/MEDIUM/LOW priority based on business impact and difficulty.

## Data Snapshot
${contextBlock}

## Response Format
When making recommendations:
- Start with the key insight or finding
- Provide supporting data/metrics
- Explain the business impact
- Suggest specific action items
- Estimate effort level (quick win / medium / strategic)

When analyzing metrics:
- Compare to competitor benchmarks when available
- Identify trends over time
- Highlight opportunities vs. threats
- Recommend next steps for deeper research

## Tone
Be professional, data-driven, and encouraging. The user is a business owner or marketer seeking expert guidance to improve their AI search visibility and local presence.`;
}

/**
 * Format context snapshot as readable text for system prompt
 */
function formatContextSnapshot(context: AgentContext): string {
  const lines: string[] = [];

  lines.push(`### Business Profile`);
  lines.push(`- Name: ${context.businessProfile.name}`);
  lines.push(`- Type: ${context.businessProfile.type}`);
  if (context.businessProfile.address) {
    lines.push(`- Location: ${context.businessProfile.address}`);
  }
  if (context.businessProfile.website) {
    lines.push(`- Website: ${context.businessProfile.website}`);
  }

  lines.push('');
  lines.push(`### AI Visibility Metrics`);
  lines.push(`- Recent mentions analyzed: ${context.recentMentions.length} queries (last 30 days)`);
  lines.push(`- Citations found: ${context.visibilityMetrics.citationCount}`);
  lines.push(`- Sentiment: ${context.visibilityMetrics.sentimentBreakdown.positive} positive, ${context.visibilityMetrics.sentimentBreakdown.neutral} neutral, ${context.visibilityMetrics.sentimentBreakdown.negative} negative`);

  if (context.visibilityMetrics.shareOfVoice !== undefined) {
    lines.push(`- Share of Voice: ${context.visibilityMetrics.shareOfVoice.toFixed(1)}%`);
  }
  if (context.visibilityMetrics.coverageRate !== undefined) {
    lines.push(`- Coverage Rate: ${context.visibilityMetrics.coverageRate.toFixed(1)}%`);
  }

  if (context.seoSnapshot) {
    lines.push('');
    lines.push(`### SEO & Traffic Metrics`);
    if (context.seoSnapshot.domainAuthority !== undefined) {
      lines.push(`- Domain Authority Rank: ${context.seoSnapshot.domainAuthority}`);
    }
    if (context.seoSnapshot.organicTraffic !== undefined) {
      lines.push(`- Organic Traffic: ${context.seoSnapshot.organicTraffic.toLocaleString()}`);
    }
    if (context.seoSnapshot.aiOverviewPresent !== undefined) {
      lines.push(`- Keywords in AI Overviews: ${context.seoSnapshot.aiOverviewPresent}`);
    }
    if (context.seoSnapshot.mapsRank !== undefined) {
      lines.push(`- Maps Average Rank: ${context.seoSnapshot.mapsRank}`);
    }
  }

  if (context.geoAudit) {
    lines.push('');
    lines.push(`### GEO Audit`);
    if (context.geoAudit.score !== undefined) {
      lines.push(`- Overall Score: ${context.geoAudit.score}/100 (${context.geoAudit.verdict ?? 'N/A'})`);
    }
    if (context.geoAudit.weakDimensions?.length) {
      lines.push(`- Weakest Dimensions:`);
      for (const d of context.geoAudit.weakDimensions) {
        lines.push(`  - ${d.name}: ${d.score}/${d.maxScore}`);
      }
    }
    if (context.geoAudit.criticalFindings?.length) {
      lines.push(`- Critical/High Findings:`);
      for (const f of context.geoAudit.criticalFindings) {
        lines.push(`  - [${f.severity}] ${f.title}: ${f.description}`);
      }
    }
    if (context.geoAudit.actionPlan?.critical?.length) {
      lines.push(`- Critical Actions: ${context.geoAudit.actionPlan.critical.join('; ')}`);
    }
    if (context.geoAudit.reportUrl) {
      lines.push(`- Full Report: ${context.geoAudit.reportUrl}`);
    }
  }

  if (context.competitors.length > 0) {
    lines.push('');
    lines.push(`### Competitors Tracked`);
    context.competitors.forEach(c => {
      lines.push(`- ${c.name}`);
    });
  }

  return lines.join('\n');
}

// ─── Perplexity Web Search Integration ────────────────────────────────────────

/**
 * Query Perplexity with business context for competitive/market research
 * Used when user asks questions requiring web search
 */
export async function queryWithWebSearch(
  question: string,
  businessContext: string,
  options?: SonarQueryOptions
): Promise<{
  answer: string;
  citations: Array<{ url: string; title?: string }>;
  relatedQuestions: string[];
}> {
  const systemPrompt = `You are assisting a business owner in researching their market, competitors, and industry trends.
Use the provided business context to give relevant, insightful answers.

Business Context:
${businessContext}

Provide thorough research-backed answers citing your sources.`;

  try {
    const response = await querySonar(systemPrompt, question, {
      ...options,
      model: options?.model || 'sonar-pro',
      returnCitations: true,
      returnRelatedQuestions: true,
      searchContextSize: 'high',
    });

    const answer = response.choices[0]?.message?.content || '';
    const citations = response.citations?.map(c => ({
      url: c.url,
      title: c.title,
    })) || [];

    return {
      answer,
      citations,
      relatedQuestions: response.related_questions || [],
    };
  } catch (error) {
    throw new Error(
      `Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
