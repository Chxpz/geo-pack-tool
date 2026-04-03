import {
  OtterlySearchPromptsRow,
  OtterlyCitationsFullRow,
  OtterlyCitationsSummaryRow,
  otterlySearchPromptsRowSchema,
  otterlyCitationsFullRowSchema,
  otterlyCitationsSummaryRowSchema,
} from './schemas/otterly-csv';
import { ZodError } from 'zod';

// Simple CSV parser (replaces csv-parse dependency)
function parseCSV(
  csvContent: string,
  options?: { columns?: (header: string[]) => string[]; skip_empty_lines?: boolean }
): Record<string, string>[] {
  const lines = csvContent
    .split('\n')
    .filter((line) => (options?.skip_empty_lines === false ? true : line.trim() !== ''));
  if (lines.length === 0) return [];

  // Parse header
  const headerLine = lines[0];
  let headers = parseCSVLine(headerLine);

  if (options?.columns) {
    headers = options.columns(headers);
  }

  // Parse rows
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] ?? '';
    });
    records.push(record);
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export interface ParseResult<T> {
  rows: T[];
  validRows: number;
  invalidRows: number;
  errors: Array<{
    rowIndex: number;
    error: string;
  }>;
}

export interface DiffSummary {
  newCitations: number;
  lostCitations: number;
  newTrackedQueries: number;
  coverageRateChange: number;
  nssScoreChange: number;
  periodStart: string;
  periodEnd: string;
}

const PLATFORM_KEYS = ['chatgpt', 'perplexity', 'copilot', 'google_aio', 'ai_mode', 'gemini'] as const;

type PlatformKey = typeof PLATFORM_KEYS[number];

export function parseSearchPromptsCSV(csvContent: string): ParseResult<OtterlySearchPromptsRow> {
  const records = parseCSV(csvContent, {
    columns: (header) =>
      header.map((h: string) => h.trim().toLowerCase().replace(/\s+/g, '_')),
  });

  const rows: OtterlySearchPromptsRow[] = [];
  const errors: Array<{ rowIndex: number; error: string }> = [];

  records.forEach((record: Record<string, string>, index: number) => {
    try {
      const parsed = otterlySearchPromptsRowSchema.parse(record);
      rows.push(parsed);
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push({
          rowIndex: index + 2,
          error: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        });
      }
    }
  });

  return {
    rows,
    validRows: rows.length,
    invalidRows: errors.length,
    errors,
  };
}

export function parseCitationsFullCSV(csvContent: string): ParseResult<OtterlyCitationsFullRow> {
  const records = parseCSV(csvContent, {
    columns: (header) =>
      header.map((h: string) => h.trim().toLowerCase().replace(/\s+/g, '_')),
    skip_empty_lines: true,
  });

  const rows: OtterlyCitationsFullRow[] = [];
  const errors: Array<{ rowIndex: number; error: string }> = [];

  records.forEach((record: Record<string, string>, index: number) => {
    try {
      const parsed = otterlyCitationsFullRowSchema.parse(record);
      rows.push(parsed);
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push({
          rowIndex: index + 2,
          error: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        });
      }
    }
  });

  return {
    rows,
    validRows: rows.length,
    invalidRows: errors.length,
    errors,
  };
}

export function parseCitationsSummaryCSV(csvContent: string): ParseResult<OtterlyCitationsSummaryRow> {
  const records = parseCSV(csvContent, {
    columns: (header) =>
      header.map((h: string) => h.trim().toLowerCase().replace(/\s+/g, '_')),
    skip_empty_lines: true,
  });

  const rows: OtterlyCitationsSummaryRow[] = [];
  const errors: Array<{ rowIndex: number; error: string }> = [];

  records.forEach((record: Record<string, string>, index: number) => {
    try {
      const parsed = otterlyCitationsSummaryRowSchema.parse(record);
      rows.push(parsed);
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push({
          rowIndex: index + 2,
          error: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        });
      }
    }
  });

  return {
    rows,
    validRows: rows.length,
    invalidRows: errors.length,
    errors,
  };
}

/**
 * Transform search prompts into ai_mentions and tracked_queries records
 */
export function transformSearchPromptsToMentions(
  rows: OtterlySearchPromptsRow[],
  businessId: string,
  userId: string,
  sourceImportId: string
) {
  const aiMentions: any[] = [];
  const trackedQueries: any[] = [];
  const brandVisibilityData: any = {
    businessId,
    userId,
    sourceImportId,
    platformMetrics: {} as Record<PlatformKey, { mentionCount: number; totalQueries: number }>,
  };

  // Initialize platform metrics
  PLATFORM_KEYS.forEach((key) => {
    brandVisibilityData.platformMetrics[key] = {
      mentionCount: 0,
      totalQueries: 0,
    };
  });

  rows.forEach((row) => {
    // Create tracked query for each prompt
    const trackedQuery = {
      business_id: businessId,
      user_id: userId,
      query_text: row.search_prompt,
      query_type: 'otterly_imported' as const,
      intent_category: 'discovery' as const,
      intent_volume: row.intent_volume,
      growth_3m: row.growth_3m,
      tags: row.tags ? row.tags.split(',').map((t) => t.trim()) : [],
      is_active: true,
    };
    trackedQueries.push(trackedQuery);

    // Create ai_mentions for each platform
    PLATFORM_KEYS.forEach((platform) => {
      const brandMentionKey = `brand_mentioned_${platform}` as keyof OtterlySearchPromptsRow;
      const domainCitedKey = `domain_cited_${platform}` as keyof OtterlySearchPromptsRow;

      const isMentioned = row[brandMentionKey];
      const domainCited = row[domainCitedKey];

      if (isMentioned) {
        brandVisibilityData.platformMetrics[platform].mentionCount++;
      }
      brandVisibilityData.platformMetrics[platform].totalQueries++;

      const mention = {
        business_id: businessId,
        user_id: userId,
        query: row.search_prompt,
        platform: platform,
        mentioned: !!isMentioned,
        domain_cited: domainCited || null,
        source: 'otterly_import' as const,
        scanned_at: new Date().toISOString(),
      };
      aiMentions.push(mention);
    });
  });

  return {
    aiMentions,
    trackedQueries,
    brandVisibilityData,
  };
}

/**
 * Transform citations full into citations records
 */
export function transformCitationsFullToCitations(
  rows: OtterlyCitationsFullRow[],
  businessId: string,
  userId: string
) {
  const citations: any[] = rows.map((row) => ({
    business_id: businessId,
    user_id: userId,
    cited_url: row.url,
    cited_domain: row.domain,
    cited_title: row.title,
    platform_id: row.service,
    position: row.position,
    domain_category: (row.domain_category || 'other') as any,
    is_own_domain: row.my_brand_mentioned === true,
    is_competitor_domain: row.competitors_mentioned === true,
    source: 'otterly_import' as const,
    scan_date: row.date,
  }));

  return { citations };
}

/**
 * Transform citations summary into citations records
 */
export function transformCitationsSummaryToCitations(
  rows: OtterlyCitationsSummaryRow[],
  businessId: string,
  userId: string
) {
  const citations: any[] = rows.map((row) => ({
    business_id: businessId,
    user_id: userId,
    cited_url: row.url,
    cited_domain: row.domain,
    cited_title: row.title,
    domain_category: (row.domain_category || 'other') as any,
    is_own_domain: row.my_brand_mentioned === true,
    is_competitor_domain: row.competitors_mentioned === true,
    source: 'otterly_import' as const,
    scan_date: new Date().toISOString().split('T')[0],
  }));

  return { citations };
}

/**
 * Parse GEO Audit data from import
 */
export function transformGEOAuditData(auditData: any, businessId: string, userId: string) {
  return {
    business_id: businessId,
    user_id: userId,
    audit_type: 'on_demand' as const,
    crawlability_score: auditData.crawlability_score || 0,
    crawlability_details: auditData.crawlability_details || {},
    content_score: auditData.content_score || 0,
    content_details: auditData.content_details || {},
    structured_data_score: auditData.structured_data_score || 0,
    structured_data_details: auditData.structured_data_details || {},
    strengths: auditData.strengths || [],
    weaknesses: auditData.weaknesses || [],
    opportunities: auditData.opportunities || [],
    threats: auditData.threats || [],
    recommendations: auditData.recommendations || [],
    evaluation_factors: auditData.evaluation_factors || {},
    overall_score: auditData.overall_score || 0,
    source: 'otterly' as const,
    audit_date: new Date().toISOString().split('T')[0],
  };
}

/**
 * Generate diff summary comparing new import to previous import
 */
export async function generateDiffSummary(
  businessId: string,
  supabase: any,
  newCitationCount: number
): Promise<DiffSummary> {
  // Fetch previous import stats
  const { data: prevImports } = await supabase
    .from('data_imports')
    .select('diff_summary, created_at')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1);

  const prevDiff = prevImports?.[0]?.diff_summary || {};

  // Count current citations
  const { count: currentCitationCount } = await supabase
    .from('citations')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('source', 'otterly_import');

  // Get brand visibility metrics
  const { data: prevVisibility } = await supabase
    .from('brand_visibility')
    .select('coverage_rate, nss_score')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1);

  return {
    newCitations: newCitationCount - ((prevDiff.newCitations as number) || 0),
    lostCitations: (prevDiff.lostCitations as number) || 0,
    newTrackedQueries: 0,
    coverageRateChange: 0,
    nssScoreChange: 0,
    periodStart: new Date().toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
  };
}

/**
 * Create operator task for onboarding
 */
export async function createOnboardingTask(
  businessId: string,
  userId: string,
  planId: string,
  supabase: any
) {
  // Determine task type and due date based on plan
  let taskType: 'otterly_setup' | 'geo_audit' = 'otterly_setup';
  let dueDate = new Date();

  if (planId === 'enterprise') {
    taskType = 'geo_audit';
    dueDate.setDate(dueDate.getDate() + 1); // 24 hour SLA
  } else if (planId === 'business') {
    dueDate.setDate(dueDate.getDate() + 2); // 48 hour SLA
  } else {
    dueDate.setDate(dueDate.getDate() + 7); // 7 day default
  }

  const { data: task, error } = await supabase
    .from('operator_tasks')
    .insert([
      {
        business_id: businessId,
        user_id: userId,
        task_type: taskType,
        status: 'pending',
        due_date: dueDate.toISOString(),
        notes: `Auto-created onboarding task for plan: ${planId}`,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating onboarding task:', error);
    return null;
  }

  return task;
}
