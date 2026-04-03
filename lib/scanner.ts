/**
 * AI Scanner — queries ChatGPT, Perplexity, Gemini, and Claude for business competitor mentions.
 * Scans tracked_queries for a business and stores results in the ai_mentions table.
 */

import { supabaseAdmin } from '@/lib/supabase';
import {
  createScanRun,
  markScanRunCompleted,
  markScanRunFailed,
  updateScanRunProgress,
} from '@/lib/scan-runs';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScanBusiness {
  id: string;
  user_id: string;
  business_name: string;
  website_url?: string;
}

export interface ScanQuery {
  id: string;
  query_text: string;
}

export interface ScanCompetitor {
  id: string;
  competitor_name: string;
}

interface AIPlatformRow {
  id: number;
  slug: string;
  name: string;
}

type PlatformSlug = 'chatgpt' | 'perplexity' | 'gemini' | 'claude';

interface CompetitorMention {
  name: string;
  position?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface MentionResult {
  business_mentioned: boolean;
  position?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  competitors: CompetitorMention[];
  response_text: string;
  citations?: string[];
}

export interface ScanRunResult {
  scanned: number;
  mentions: number;
  errors: number;
}

export interface ScanRunProgress extends ScanRunResult {
  totalQueries: number;
}

// ─── Response Parsing ────────────────────────────────────────────────────────

function extractPosition(text: string, businessName: string): number | undefined {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(businessName.toLowerCase())) {
      const match = lines[i].trim().match(/^(\d+)[.)]/);
      if (match) return parseInt(match[1], 10);
      return Math.min(i + 1, 10);
    }
  }
  return undefined;
}

function analyzeSentiment(text: string, businessName: string): 'positive' | 'neutral' | 'negative' {
  const sentences = text
    .split('.')
    .filter((s) => s.toLowerCase().includes(businessName.toLowerCase()));

  const body = sentences.join(' ').toLowerCase();

  const positiveWords = ['best', 'top', 'excellent', 'recommended', 'great', 'premium', 'popular', 'trusted', 'leading', 'highly rated'];
  const negativeWords = ['avoid', 'worst', 'poor', 'disappointing', 'overpriced', 'unreliable', 'bad', 'negative', 'complaint'];

  const pos = positiveWords.filter((w) => body.includes(w)).length;
  const neg = negativeWords.filter((w) => body.includes(w)).length;

  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

// ─── Platform Scanners ───────────────────────────────────────────────────────

async function scanOpenAI(query: string): Promise<MentionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful local business recommendation assistant. When asked about businesses or services, provide specific recommendations with business names. Return response as JSON with structure: {business_mentioned: boolean, position: number|null, sentiment: string, competitors: [{name: string, position: number|null, sentiment: string}]}',
        },
        { role: 'user', content: query },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  const response_text = data.choices[0]?.message?.content ?? '';

  // Attempt to parse JSON response
  let parsed: any = { business_mentioned: false, competitors: [] };
  try {
    const jsonMatch = response_text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fall back to text parsing if JSON parse fails
  }

  return {
    business_mentioned: parsed.business_mentioned ?? false,
    position: parsed.position,
    sentiment: parsed.sentiment,
    competitors: parsed.competitors ?? [],
    response_text,
  };
}

async function scanPerplexity(query: string): Promise<MentionResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not set');

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-small-online',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful local business recommendation assistant. When asked about businesses or services, provide specific recommendations with business names. Return response as JSON with structure: {business_mentioned: boolean, position: number|null, sentiment: string, competitors: [{name: string, position: number|null, sentiment: string}]}',
        },
        { role: 'user', content: query },
      ],
      max_tokens: 500,
      temperature: 0.2,
      return_citations: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Perplexity error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    citations?: string[];
  };
  const response_text = data.choices[0]?.message?.content ?? '';
  const citations = data.citations ?? [];

  // Attempt to parse JSON response
  let parsed: any = { business_mentioned: false, competitors: [] };
  try {
    const jsonMatch = response_text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fall back to text parsing if JSON parse fails
  }

  return {
    business_mentioned: parsed.business_mentioned ?? false,
    position: parsed.position,
    sentiment: parsed.sentiment,
    competitors: parsed.competitors ?? [],
    response_text,
    citations,
  };
}

async function scanGemini(query: string): Promise<MentionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `System: You are a helpful local business recommendation assistant. When asked about businesses or services, provide specific recommendations with business names. Return response as JSON with structure: {business_mentioned: boolean, position: number|null, sentiment: string, competitors: [{name: string, position: number|null, sentiment: string}]}\n\nUser: ${query}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const response_text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Attempt to parse JSON response
  let parsed: any = { business_mentioned: false, competitors: [] };
  try {
    const jsonMatch = response_text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fall back to text parsing if JSON parse fails
  }

  return {
    business_mentioned: parsed.business_mentioned ?? false,
    position: parsed.position,
    sentiment: parsed.sentiment,
    competitors: parsed.competitors ?? [],
    response_text,
  };
}

async function scanClaude(query: string): Promise<MentionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      temperature: 0.7,
      system: 'You are a helpful local business recommendation assistant. When asked about businesses or services, provide specific recommendations with business names. Return response as JSON with structure: {business_mentioned: boolean, position: number|null, sentiment: string, competitors: [{name: string, position: number|null, sentiment: string}]}',
      messages: [{ role: 'user', content: query }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude error ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    content?: Array<{ type: string; text?: string }>;
  };
  const response_text = data.content?.find((b) => b.type === 'text')?.text ?? '';

  // Attempt to parse JSON response
  let parsed: any = { business_mentioned: false, competitors: [] };
  try {
    const jsonMatch = response_text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fall back to text parsing if JSON parse fails
  }

  return {
    business_mentioned: parsed.business_mentioned ?? false,
    position: parsed.position,
    sentiment: parsed.sentiment,
    competitors: parsed.competitors ?? [],
    response_text,
  };
}

// ─── Fuzzy Matching for Competitor Names ─────────────────────────────────────

/**
 * Simple Levenshtein distance calculation for fuzzy matching
 */
function levenshteinDistance(s1: string, s2: string): number {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Matches competitor names from AI response to stored competitors in database.
 * Uses fuzzy matching with case-insensitive and partial matching.
 *
 * @param mentionedNames Raw competitor names extracted from AI response
 * @param storedCompetitors Competitors from database
 * @returns Enhanced array with matched competitor_id values
 */
export function matchCompetitorMentions(
  mentionedNames: CompetitorMention[],
  storedCompetitors: ScanCompetitor[],
): Array<CompetitorMention & { competitor_id?: string }> {
  if (!mentionedNames || !storedCompetitors) {
    return mentionedNames.map((m) => ({ ...m }));
  }

  return mentionedNames.map((mention) => {
    const mentioned = mention.name.toLowerCase();

    // Try exact match first
    let bestMatch = storedCompetitors.find(
      (c) => c.competitor_name.toLowerCase() === mentioned,
    );

    // Try partial match (substring)
    if (!bestMatch) {
      bestMatch = storedCompetitors.find(
        (c) =>
          mentioned.includes(c.competitor_name.toLowerCase()) ||
          c.competitor_name.toLowerCase().includes(mentioned),
      );
    }

    // Try fuzzy match (Levenshtein distance)
    if (!bestMatch) {
      let minDistance = Infinity;
      let closestMatch: ScanCompetitor | undefined;

      for (const competitor of storedCompetitors) {
        const distance = levenshteinDistance(mention.name, competitor.competitor_name);
        // Match if distance is small relative to string length
        if (distance < Math.max(mention.name.length, competitor.competitor_name.length) * 0.3) {
          if (distance < minDistance) {
            minDistance = distance;
            closestMatch = competitor;
          }
        }
      }

      bestMatch = closestMatch;
    }

    return {
      ...mention,
      competitor_id: bestMatch?.id,
    };
  });
}

// ─── Platform Dispatch ───────────────────────────────────────────────────────

async function callPlatform(slug: PlatformSlug, query: string): Promise<MentionResult> {
  switch (slug) {
    case 'chatgpt':
      return scanOpenAI(query);
    case 'perplexity':
      return scanPerplexity(query);
    case 'gemini':
      return scanGemini(query);
    case 'claude':
      return scanClaude(query);
  }
}

// ─── Core Scanner ────────────────────────────────────────────────────────────

async function scanBusinessOnPlatform(
  business: ScanBusiness,
  query: ScanQuery,
  platform: AIPlatformRow,
  competitors: ScanCompetitor[],
): Promise<{ mentions: number; errors: number }> {
  if (!supabaseAdmin) {
    return { mentions: 0, errors: 1 };
  }

  let result: MentionResult;
  try {
    result = await callPlatform(platform.slug as PlatformSlug, query.query_text);
  } catch (err) {
    console.error(`[scanner] ${platform.slug} error for business ${business.id} query ${query.id}:`, err);
    return { mentions: 0, errors: 1 };
  }

  // Check if business website appears in response
  const domain_cited = business.website_url
    ? result.response_text.toLowerCase().includes(business.website_url.toLowerCase())
    : false;

  // Build competitors_mentioned JSONB with fuzzy matching against stored competitors
  const enrichedMentions = matchCompetitorMentions(result.competitors, competitors);
  const competitors_mentioned = enrichedMentions.map((comp) => ({
    name: comp.name,
    competitor_id: comp.competitor_id,
    position: comp.position,
    sentiment: comp.sentiment,
  }));

  const { error } = await supabaseAdmin.from('ai_mentions').insert({
    business_id: business.id,
    query_id: query.id,
    platform_id: platform.id,
    competitors_mentioned: competitors_mentioned,
    source: 'llm_scan',
    domain_cited,
    ai_response: result.response_text,
  });

  if (error) {
    console.error(`[scanner] DB insert error for business ${business.id}:`, error.message);
    return { mentions: 0, errors: 1 };
  }

  return {
    mentions: result.competitors.length > 0 ? 1 : 0,
    errors: 0,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Runs a business competitor scan across all 4 AI platforms.
 *
 * @param businessId  The business to scan for competitor mentions.
 * @param queryIds    Optional specific query IDs to scan. If omitted, scans all active queries for the business.
 */
export async function runBusinessScanner(
  businessId: string,
  queryIds?: string[],
  options?: {
    onProgress?: (progress: ScanRunProgress) => Promise<void> | void;
  },
): Promise<ScanRunResult> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  // Load business
  const { data: businessData, error: businessErr } = await supabaseAdmin
    .from('businesses')
    .select('id, user_id, business_name, website_url')
    .eq('id', businessId)
    .single();

  if (businessErr || !businessData) {
    throw new Error(`Failed to load business ${businessId}: ${businessErr?.message}`);
  }

  const business = businessData as ScanBusiness;

  // Load enabled AI platforms
  const { data: platforms, error: platformErr } = await supabaseAdmin
    .from('ai_platforms')
    .select('id, slug, name')
    .eq('enabled', true);

  if (platformErr || !platforms || platforms.length === 0) {
    throw new Error(`Failed to load AI platforms: ${platformErr?.message}`);
  }

  // Load tracked queries for the business
  let queryBuilder = supabaseAdmin
    .from('tracked_queries')
    .select('id, query_text')
    .eq('business_id', businessId)
    .eq('is_active', true);

  if (queryIds !== undefined) {
    if (queryIds.length === 0) {
      await options?.onProgress?.({
        scanned: 0,
        mentions: 0,
        errors: 0,
        totalQueries: 0,
      });
      return { scanned: 0, mentions: 0, errors: 0 };
    }

    queryBuilder = queryBuilder.in('id', queryIds);
  }

  const { data: queries, error: queryErr } = await queryBuilder;

  if (queryErr) {
    throw new Error(`Failed to load tracked queries: ${queryErr.message}`);
  }

  if (!queries || queries.length === 0) {
    await options?.onProgress?.({
      scanned: 0,
      mentions: 0,
      errors: 0,
      totalQueries: 0,
    });
    return { scanned: 0, mentions: 0, errors: 0 };
  }

  // Load competitors for the business
  const { data: competitors, error: competitorErr } = await supabaseAdmin
    .from('competitors')
    .select('id, competitor_name')
    .eq('business_id', businessId);

  if (competitorErr) {
    console.warn(`[scanner] Failed to load competitors for business ${businessId}:`, competitorErr.message);
  }

  const competitorList = (competitors as ScanCompetitor[]) ?? [];
  const totalQueries = (queries as ScanQuery[]).length;

  let scanned = 0;
  let mentions = 0;
  let errors = 0;

  for (const q of queries as ScanQuery[]) {
    for (const platform of platforms as AIPlatformRow[]) {
      try {
        const platformResult = await scanBusinessOnPlatform(
          business,
          q,
          platform,
          competitorList,
        );
        mentions += platformResult.mentions;
        errors += platformResult.errors;
      } catch (err) {
        console.error(`[scanner] Error scanning business ${business.id} on platform ${platform.slug}:`, err);
        errors++;
      }
      // Pause between platforms to respect rate limits
      await sleep(500);
    }
    scanned++;
    await options?.onProgress?.({
      scanned,
      mentions,
      errors,
      totalQueries,
    });
    // Pause between queries
    await sleep(300);
  }

  return { scanned, mentions, errors };
}

export async function runScanner(
  userId?: string,
  maxBusinesses: number = 50,
): Promise<ScanRunResult> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available');
  }

  let businessQuery = supabaseAdmin
    .from('businesses')
    .select('id, user_id')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(maxBusinesses);

  if (userId) {
    businessQuery = businessQuery.eq('user_id', userId);
  }

  const { data: businesses, error } = await businessQuery;
  if (error) {
    throw new Error(`Failed to load businesses for scan: ${error.message}`);
  }

  let totals: ScanRunResult = { scanned: 0, mentions: 0, errors: 0 };
  for (const business of businesses ?? []) {
    const businessId = business.id as string;
    const userIdForBusiness = business.user_id as string;
    const scanRun = await createScanRun({
      businessId,
      userId: userIdForBusiness,
      queryIds: [],
    });

    try {
      const result = await runBusinessScanner(businessId, undefined, {
        onProgress: async (progress) => {
          await updateScanRunProgress(scanRun.id, progress);
        },
      });

      await markScanRunCompleted(scanRun.id, result);
      totals = {
        scanned: totals.scanned + result.scanned,
        mentions: totals.mentions + result.mentions,
        errors: totals.errors + result.errors,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scan failed';
      await markScanRunFailed(scanRun.id, message);
      totals = {
        scanned: totals.scanned,
        mentions: totals.mentions,
        errors: totals.errors + 1,
      };
    }
  }

  return totals;
}
