/**
 * Perplexity Sonar API client for AgenticRev
 * Supports business visibility scanning, deep research, and structured outputs
 */

import { z } from 'zod';
import { withLogContext } from '@/lib/logger';
import {
  sonarResponseSchema,
  structuredScanOutputSchema,
  type SonarCitation,
  type SonarSearchResult,
  type SonarResponse,
  type StructuredScanOutput,
} from '@/lib/schemas/perplexity';

const SONAR_API_BASE = 'https://api.perplexity.ai/chat/completions';
const SONAR_API_KEY = process.env.PERPLEXITY_SONAR_API_KEY;
const sonarLogger = withLogContext({ scope: 'perplexity-sonar' });

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SonarQueryOptions {
  model?: 'sonar' | 'sonar-pro' | 'sonar-deep-research';
  searchDomainFilter?: string[];
  searchRecencyFilter?: 'hour' | 'day' | 'week' | 'month' | 'year';
  searchContextSize?: 'low' | 'medium' | 'high';
  returnCitations?: boolean;
  returnRelatedQuestions?: boolean;
  responseFormat?: object;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface BusinessVisibilityScan {
  mentioned: boolean;
  position: number | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  competitors: Array<{
    name: string;
    position: number | null;
    sentiment: string;
  }>;
  citations: SonarCitation[];
  searchResults: SonarSearchResult[];
  relatedQuestions: string[];
  responseText: string;
  tokenUsage: SonarResponse['usage'];
}

// ─── Core Query Function ──────────────────────────────────────────────────────

/**
 * Execute a Sonar query with optional structured output
 */
export async function querySonar(
  systemPrompt: string,
  userQuery: string,
  options?: SonarQueryOptions,
): Promise<SonarResponse> {
  if (!SONAR_API_KEY) {
    throw new Error('PERPLEXITY_SONAR_API_KEY is not set');
  }

  const requestBody: Record<string, unknown> = {
    model: options?.model || 'sonar',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userQuery,
      },
    ],
    search_domain_filter: options?.searchDomainFilter,
    search_recency_filter: options?.searchRecencyFilter,
    search_context_size: options?.searchContextSize || 'high',
    return_citations: options?.returnCitations !== false,
    return_related_questions: options?.returnRelatedQuestions !== false,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens || 4096,
    stream: options?.stream || false,
  };

  if (options?.responseFormat) {
    requestBody.response_format = options.responseFormat;
  }

  // Remove undefined values
  Object.keys(requestBody).forEach(
    (key) =>
      requestBody[key] === undefined && delete requestBody[key],
  );

  try {
    const response = await fetch(SONAR_API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SONAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      sonarLogger.error(
        { status: response.status, errorText },
        'Perplexity Sonar API request failed',
      );
      throw new Error(
        `Perplexity API error: ${response.status} ${errorText.slice(0, 100)}`,
      );
    }

    const data = await response.json();
    const parsed = sonarResponseSchema.parse(data);

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      sonarLogger.error({ error: error.errors }, 'Perplexity Sonar response validation failed');
      throw new Error(`Invalid Sonar API response: ${error.errors[0].message}`);
    }
    throw error;
  }
}

// ─── Structured Scan for Business Visibility ──────────────────────────────────

/**
 * Scan for business visibility across AI platforms with competitor comparison
 * Uses JSON Schema response_format for structured output
 */
export async function scanBusinessVisibility(
  businessName: string,
  query: string,
  competitorNames: string[],
  options?: { model?: SonarQueryOptions['model']; domainFilter?: string[] },
): Promise<BusinessVisibilityScan> {
  const systemPrompt = `You are analyzing business visibility in AI search results.
Given a search query, determine:
1. Whether the primary business is mentioned in the search results
2. The position/rank of the business mention (if mentioned)
3. The sentiment of any business mention (positive/neutral/negative)
4. For each competitor, their position and sentiment

Respond with structured JSON matching this schema:
{
  "business_mentioned": boolean,
  "position": number or null,
  "sentiment": "positive" | "neutral" | "negative",
  "competitors": [
    {
      "name": string,
      "position": number or null,
      "sentiment": "positive" | "neutral" | "negative"
    }
  ]
}`;

  const userPrompt = `Primary business: "${businessName}"
Query: "${query}"
Competitors to track: ${competitorNames.join(', ')}

Analyze this query's AI search results and identify where each business appears.`;

  const responseFormat = {
    type: 'json_schema',
    json_schema: {
      name: 'BusinessVisibilityAnalysis',
      schema: {
        type: 'object',
        properties: {
          business_mentioned: { type: 'boolean' },
          position: { type: ['integer', 'null'] },
          sentiment: { enum: ['positive', 'neutral', 'negative'] },
          competitors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                position: { type: ['integer', 'null'] },
                sentiment: { enum: ['positive', 'neutral', 'negative'] },
              },
              required: ['name'],
            },
          },
        },
        required: ['business_mentioned', 'sentiment', 'competitors'],
      },
    },
  };

  const response = await querySonar(systemPrompt, userPrompt, {
    model: options?.model || 'sonar-pro',
    searchDomainFilter: options?.domainFilter,
    returnCitations: true,
    returnRelatedQuestions: true,
    responseFormat,
  });

  // Parse the structured output
  let structuredData: StructuredScanOutput;

  try {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in Sonar response');
    }

    // Try to extract JSON if wrapped in markdown
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);
    structuredData = structuredScanOutputSchema.parse(parsed);
  } catch (error) {
    sonarLogger.error(
      {
        err: error,
        responseContent: response.choices[0]?.message?.content?.slice(0, 200),
      },
      'Failed to parse structured Sonar output',
    );
    throw new Error('Failed to parse business visibility scan response');
  }

  return {
    mentioned: structuredData.business_mentioned,
    position: structuredData.position ?? null,
    sentiment: structuredData.sentiment,
    competitors: structuredData.competitors.map((competitor) => ({
      ...competitor,
      position: competitor.position ?? null,
    })),
    citations: response.citations || [],
    searchResults: response.search_results || [],
    relatedQuestions: response.related_questions || [],
    responseText: response.choices[0]?.message?.content || '',
    tokenUsage: response.usage,
  };
}

// ─── Deep Research Submission (Async for Enterprise) ────────────────────────

/**
 * Submit a deep research query (async, for Sonar Pro/Enterprise)
 * Deep research queries are processed asynchronously
 */
export async function submitDeepResearch(
  query: string,
  options?: SonarQueryOptions,
): Promise<SonarResponse> {
  return querySonar(
    'You are a research assistant. Conduct thorough research on the given topic.',
    query,
    {
      ...options,
      model: 'sonar-deep-research',
    },
  );
}

// ─── Batch Query Support ──────────────────────────────────────────────────────

/**
 * Execute multiple queries with rate limiting
 */
export async function batchQuerySonar(
  queries: Array<{
    systemPrompt: string;
    userQuery: string;
    options?: SonarQueryOptions;
  }>,
  options?: { concurrency?: number; delayMs?: number },
): Promise<SonarResponse[]> {
  const concurrency = options?.concurrency || 3;
  const delayMs = options?.delayMs || 1000;

  const results: SonarResponse[] = [];
  const queue = [...queries];

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);

    if (batch.length === 0) break;

    const batchResults = await Promise.all(
      batch.map((q) => querySonar(q.systemPrompt, q.userQuery, q.options)),
    );

    results.push(...batchResults);

    if (queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
