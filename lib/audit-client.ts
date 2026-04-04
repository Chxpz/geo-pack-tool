/**
 * Stack3 Audit System — HTTP client, types, and data mapping.
 *
 * Single point of integration between AgenticRevops and the Stack3 Audit API.
 * All server-to-server communication with the audit engine goes through this file.
 */

// ── Environment helpers ─────────────────────────────────────────────────────

const BASE = () => {
  const url = process.env.STACK3_AUDIT_API_URL;
  if (!url) throw new Error('STACK3_AUDIT_API_URL is not configured');
  return url;
};

const KEY = () => {
  const key = process.env.STACK3_AUDIT_API_KEY;
  if (!key) throw new Error('STACK3_AUDIT_API_KEY is not configured');
  return key;
};

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${KEY()}`,
});

// ── Types ───────────────────────────────────────────────────────────────────

export interface TriggerAuditInput {
  clientName: string;
  domain: string;
  pages: string[];
  config?: {
    maxPages?: number;
    includeAccessibility?: boolean;
    crawlerIdentity?: 'default' | 'gptbot' | 'perplexitybot' | 'claudebot' | 'applebot' | 'bingbot';
    reportPreparedBy?: string;
  };
}

export interface AuditStatusResponse {
  id: string;
  status: 'queued' | 'crawling' | 'analyzing' | 'generating' | 'delivering' | 'complete' | 'failed';
  totalScore: number | null;
  verdict: string | null;
  findingsCount: number | null;
  criticalFindings: number | null;
  reportUrl: string | null;
  reportFormat: 'pdf' | 'docx' | null;
  error: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

export interface DimensionScore {
  number: number;
  name: string;
  maxScore: number;
  score: number;
  justification: string;
  pointsBreakdown: Array<{ point: string; earned: number; max: number }>;
  contentSubFactors?: Record<string, { score: number; recommendation: string }>;
}

export interface AuditFinding {
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Opportunity';
  category: string;
  title: string;
  description: string;
  recommendation: string;
  affectedPages?: string[];
}

export interface FullAuditResult {
  id: string;
  domain: string;
  totalScore: number;
  verdict: string;
  reportUrl: string;
  reportFormat: string;
  completedAt: string;
  durationMs: number;
  pagesAudited: string[];
  auditResult: {
    dimensionScores: DimensionScore[];
    executiveSummary: string;
    findings: AuditFinding[];
    actionPlan: { critical: string[]; nearTerm: string[]; strategic: string[] };
    quickWins: Array<{ title: string; description: string; effort: string; impact: string }>;
    doesWell: string[];
    missingForCitation: string[];
    unknowns: string[];
    pageNotes: Array<{ url: string; issues: Array<{ type: string; severity: string; description: string }> }>;
    competitiveContext: {
      competitors: Array<{ domain: string; allowsGptBot: boolean; schemaUsed: boolean; avgWordCount: number }>;
    };
    swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  };
}

// ── API calls ───────────────────────────────────────────────────────────────

export async function triggerAudit(input: TriggerAuditInput): Promise<{ id: string; status: string }> {
  const res = await fetch(`${BASE()}/api/v1/audits`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Stack3 Audit trigger failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function getAuditStatus(auditId: string): Promise<AuditStatusResponse> {
  const res = await fetch(`${BASE()}/api/v1/audits/${encodeURIComponent(auditId)}`, {
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`Stack3 Audit status fetch failed: ${res.status}`);
  }
  return res.json();
}

export async function getAuditResult(auditId: string): Promise<FullAuditResult> {
  const res = await fetch(`${BASE()}/api/v1/audits/${encodeURIComponent(auditId)}/result`, {
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error(`Stack3 Audit result fetch failed: ${res.status}`);
  }
  return res.json();
}

// ── Data mapping ────────────────────────────────────────────────────────────

/**
 * Maps the full Stack3 Audit result into the geo_audits table row shape.
 * Called once when the audit completes, to persist the final result.
 */
export function mapAuditResultToGeoAudit(result: FullAuditResult) {
  const ar = result.auditResult;

  const pctScore = (n: number): number | null => {
    const d = ar.dimensionScores.find(x => x.number === n);
    return d ? Math.round((d.score / d.maxScore) * 100) : null;
  };

  const avg = (nums: (number | null)[]): number => {
    const valid = nums.filter((v): v is number => v !== null);
    return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  };

  return {
    status: 'complete' as const,

    // Scores
    overall_score: result.totalScore,
    verdict: result.verdict,
    crawlability_score: avg([pctScore(1), pctScore(2), pctScore(9)]),
    content_score: avg([pctScore(3), pctScore(4), pctScore(7), pctScore(8)]),
    structured_data_score: avg([pctScore(5), pctScore(6), pctScore(10), pctScore(11), pctScore(12)]),

    // Full 12-dimension output
    dimension_scores: ar.dimensionScores,

    // Findings and actions
    findings: ar.findings,
    action_plan: ar.actionPlan,
    quick_wins: ar.quickWins,
    does_well: ar.doesWell,
    missing_for_citation: ar.missingForCitation,

    // SWOT
    strengths: ar.swot.strengths,
    weaknesses: ar.swot.weaknesses,
    opportunities: ar.swot.opportunities,
    threats: ar.swot.threats,

    // Recommendations: mapped from findings for user-managed status tracking
    recommendations: ar.findings.map(f => ({
      title: f.title,
      description: `${f.description} ${f.recommendation}`.trim(),
      priority: f.severity === 'Critical' || f.severity === 'High' ? 'high'
        : f.severity === 'Medium' ? 'medium' : 'low',
      category: f.category,
      status: 'pending',
    })),

    // Page breakdown
    page_notes: ar.pageNotes,

    // Report
    report_url: result.reportUrl,
    report_format: result.reportFormat,

    // Metadata
    pages_crawled: result.pagesAudited?.length ?? ar.pageNotes?.length ?? null,
    audit_duration_ms: result.durationMs,
    audit_date: new Date(result.completedAt),
  };
}
