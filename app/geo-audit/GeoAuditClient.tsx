'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { GEOAudit } from '@/lib/types';

// ── Dimension groupings ─────────────────────────────────────────────────────

const DIMENSION_GROUPS = [
  {
    title: 'Crawl & Rendering',
    dimensions: [1, 2, 9],
  },
  {
    title: 'Content & Entity',
    dimensions: [3, 4, 5, 7, 8],
  },
  {
    title: 'Trust & Citation',
    dimensions: [6, 10, 11, 12],
  },
] as const;

const PROGRESS_LABELS: Record<string, string> = {
  queued: 'Queued',
  crawling: 'Crawling your website...',
  analyzing: 'Analyzing 12 dimensions...',
  generating: 'Generating report...',
};

// ── Score color helpers ─────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-teal-600';
  if (score >= 50) return 'text-orange-500';
  return 'text-red-600';
}

function scoreBgColor(score: number): string {
  if (score >= 85) return 'bg-green-500';
  if (score >= 70) return 'bg-teal-500';
  if (score >= 50) return 'bg-orange-400';
  return 'bg-red-500';
}

function scoreBorderColor(score: number): string {
  if (score >= 85) return 'border-green-200';
  if (score >= 70) return 'border-teal-200';
  if (score >= 50) return 'border-orange-200';
  return 'border-red-200';
}

// ── Main component ──────────────────────────────────────────────────────────

interface Props {
  businessId: string;
  businessName: string;
  audits: GEOAudit[];
  monthlyUsed: number;
  maxAudits: number;
}

export default function GeoAuditClient({
  businessId,
  businessName,
  audits: initialAudits,
  monthlyUsed,
  maxAudits,
}: Props) {
  const [audits, setAudits] = useState(initialAudits);
  const [selectedAuditIndex, setSelectedAuditIndex] = useState(0);
  const [isTriggering, setIsTriggering] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audit = audits[selectedAuditIndex] as GEOAudit | undefined;
  const isComplete = audit?.status === 'complete';

  // Check for in-progress audit on mount
  useEffect(() => {
    const inProgress = audits.find(
      a => a.status !== 'complete' && a.status !== 'failed',
    );
    if (inProgress) {
      setPollingJobId(inProgress.id);
      setPollingStatus(inProgress.status);
    }
  }, [audits]);

  // Polling logic
  const poll = useCallback(async () => {
    if (!pollingJobId) return;
    try {
      const res = await fetch(`/api/geo-audit/status/${pollingJobId}`);
      if (!res.ok) return;
      const data = await res.json();
      setPollingStatus(data.status);

      if (data.status === 'complete' && data.geo_audit) {
        setAudits(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(a => a.id === pollingJobId);
          if (idx >= 0) {
            updated[idx] = data.geo_audit;
          } else {
            updated.unshift(data.geo_audit);
          }
          return updated;
        });
        setSelectedAuditIndex(0);
        setPollingJobId(null);
        setPollingStatus(null);
      } else if (data.status === 'failed') {
        setError(data.error ?? 'Audit failed');
        setPollingJobId(null);
        setPollingStatus(null);
      }
    } catch {
      // silently retry next interval
    }
  }, [pollingJobId]);

  useEffect(() => {
    if (pollingJobId) {
      pollingRef.current = setInterval(poll, 5000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [pollingJobId, poll]);

  const handleTrigger = async () => {
    setIsTriggering(true);
    setError(null);
    try {
      const res = await fetch('/api/geo-audit/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setPollingJobId(data.geo_audit_id);
      setPollingStatus('queued');
    } catch {
      setError('Failed to trigger audit');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleStatusChange = async (auditId: string, recIdx: number, newStatus: string) => {
    const res = await fetch('/api/geo-audit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audit_id: auditId, recommendation_index: recIdx, status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAudits(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(a => a.id === auditId);
        if (idx >= 0) copy[idx] = updated;
        return copy;
      });
    }
  };

  const overallScore = audit?.overall_score ?? 0;
  const dimensionScores = audit?.dimension_scores ?? [];

  // Filter recommendations
  const filteredRecs = (audit?.recommendations ?? []).filter(
    r => priorityFilter === 'all' || r.priority === priorityFilter,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">GEO Audit</h1>
              <p className="mt-1 text-sm text-gray-600">{businessName}</p>
              {isComplete && audit.audit_date && (
                <p className="mt-1 text-xs text-gray-500">
                  Last audit: {new Date(audit.audit_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-500">
                {monthlyUsed} of {maxAudits >= 999 ? 'unlimited' : maxAudits} audits used this month
              </div>
              {pollingJobId ? (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  {PROGRESS_LABELS[pollingStatus ?? 'queued'] ?? 'Processing...'}
                </div>
              ) : (
                <button
                  onClick={handleTrigger}
                  disabled={isTriggering || monthlyUsed >= maxAudits}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isTriggering ? 'Starting...' : 'Run New Audit'}
                </button>
              )}
            </div>
          </div>
          {isComplete && audit.report_url && (
            <a
              href={audit.report_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Download PDF Report
            </a>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        </div>
      )}

      {!isComplete && !pollingJobId && audits.length === 0 && (
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <div className="text-gray-500">No GEO audit data available</div>
            <p className="mt-2 text-sm text-gray-400">
              Click &quot;Run New Audit&quot; to analyze your website across 12 dimensions.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      )}

      {isComplete && (
        <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
          {/* Overall Score */}
          <div className={`rounded-xl border-2 ${scoreBorderColor(overallScore)} bg-white p-6`}>
            <div className="flex items-center gap-6">
              <div className={`text-5xl font-bold ${scoreColor(overallScore)}`}>
                {Math.round(overallScore)}
              </div>
              <div>
                <div className="text-xl font-semibold text-gray-900">/100</div>
                <div className={`text-sm font-medium ${scoreColor(overallScore)}`}>
                  {audit.verdict}
                </div>
              </div>
              <div className="ml-auto">
                <div className="h-3 w-64 rounded-full bg-gray-200">
                  <div
                    className={`h-3 rounded-full ${scoreBgColor(overallScore)}`}
                    style={{ width: `${Math.min(overallScore, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 12-Dimension Scorecard */}
          <div className="grid gap-6 lg:grid-cols-3">
            {DIMENSION_GROUPS.map(group => (
              <div key={group.title} className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  {group.title}
                </h3>
                <div className="space-y-4">
                  {group.dimensions.map(dimNum => {
                    const dim = dimensionScores.find(d => d.number === dimNum);
                    if (!dim) return null;
                    const pct = Math.round((dim.score / dim.maxScore) * 100);
                    return (
                      <DimensionCard key={dimNum} dim={dim} pct={pct} />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* AI Content Readiness (Dimension 8 sub-factors) */}
          {(() => {
            const dim8 = dimensionScores.find(d => d.number === 8);
            if (!dim8?.contentSubFactors) return null;
            return (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">AI Content Readiness</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(dim8.contentSubFactors).map(([key, val]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className={`font-semibold ${scoreColor(val.score)}`}>
                          {val.score}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full ${scoreBgColor(val.score)}`}
                          style={{ width: `${val.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* SWOT */}
          {(audit.strengths.length > 0 || audit.weaknesses.length > 0 ||
            audit.opportunities.length > 0 || audit.threats.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SwotCard title="Strengths" items={audit.strengths} variant="green" icon="+" />
              <SwotCard title="Weaknesses" items={audit.weaknesses} variant="red" icon="-" />
              <SwotCard title="Opportunities" items={audit.opportunities} variant="blue" icon=">" />
              <SwotCard title="Threats" items={audit.threats} variant="yellow" icon="!" />
            </div>
          )}

          {/* Action Plan */}
          {audit.action_plan && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Action Plan</h2>
              <div className="grid gap-6 lg:grid-cols-3">
                <ActionColumn title="Critical" items={audit.action_plan.critical ?? []} color="red" />
                <ActionColumn title="Near-term" items={audit.action_plan.nearTerm ?? []} color="orange" />
                <ActionColumn title="Strategic" items={audit.action_plan.strategic ?? []} color="blue" />
              </div>
            </div>
          )}

          {/* Recommendations */}
          {audit.recommendations.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recommendations</h2>
                <div className="flex gap-2">
                  {['all', 'high', 'medium', 'low'].map(f => (
                    <button
                      key={f}
                      onClick={() => setPriorityFilter(f)}
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        priorityFilter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {filteredRecs.map((rec, idx) => {
                  const realIdx = audit.recommendations.indexOf(rec);
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-4 ${
                        rec.priority === 'high'
                          ? 'border-red-200 bg-red-50'
                          : rec.priority === 'medium'
                            ? 'border-yellow-200 bg-yellow-50'
                            : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                          <p className="mt-1 text-sm text-gray-700">{rec.description}</p>
                          {rec.category && (
                            <span className="mt-2 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                              {rec.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              rec.priority === 'high'
                                ? 'bg-red-100 text-red-800'
                                : rec.priority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {rec.priority}
                          </span>
                          <select
                            value={rec.status}
                            onChange={e => handleStatusChange(audit.id, realIdx, e.target.value)}
                            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="dismissed">Dismissed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Page Notes */}
          {audit.page_notes.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Page Notes</h2>
              <div className="space-y-3">
                {audit.page_notes.map((page, idx) => (
                  <details key={idx} className="rounded-lg border border-gray-200 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-blue-700">
                      {page.url} ({page.issues.length} issue{page.issues.length !== 1 ? 's' : ''})
                    </summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {page.issues.map((issue, iIdx) => (
                        <li key={iIdx} className="text-sm text-gray-700">
                          <span
                            className={`mr-1 text-xs font-semibold ${
                              issue.severity === 'Critical' || issue.severity === 'High'
                                ? 'text-red-600'
                                : issue.severity === 'Medium'
                                  ? 'text-orange-600'
                                  : 'text-gray-500'
                            }`}
                          >
                            [{issue.severity}]
                          </span>
                          {issue.description}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Audit History */}
          {audits.length > 1 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Audit History</h2>
              <div className="flex flex-wrap gap-2">
                {audits.map((a, idx) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAuditIndex(idx)}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      idx === selectedAuditIndex
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {a.audit_date ? new Date(a.audit_date).toLocaleDateString() : 'N/A'}
                    {a.overall_score != null && ` · ${Math.round(a.overall_score)}pts`}
                    {a.status === 'failed' && ' · Failed'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function DimensionCard({
  dim,
  pct,
}: {
  dim: GEOAudit['dimension_scores'][0];
  pct: number;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">
            Dim {dim.number}: {dim.name}
          </span>
          <span className={`font-semibold ${scoreColor(pct)}`}>
            {dim.score}/{dim.maxScore}
          </span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-gray-200">
          <div
            className={`h-2 rounded-full ${scoreBgColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>
      {expanded && dim.justification && (
        <p className="mt-2 text-xs text-gray-600 leading-relaxed">
          {dim.justification}
        </p>
      )}
    </div>
  );
}

function SwotCard({
  title,
  items,
  variant,
  icon,
}: {
  title: string;
  items: string[];
  variant: 'green' | 'red' | 'blue' | 'yellow';
  icon: string;
}) {
  if (items.length === 0) return null;
  const colors = {
    green: 'border-green-200 bg-green-50 text-green-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  };
  const textColors = {
    green: 'text-green-700',
    red: 'text-red-700',
    blue: 'text-blue-700',
    yellow: 'text-yellow-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[variant]}`}>
      <h3 className="font-semibold mb-2">{title}</h3>
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className={`text-sm flex gap-2 ${textColors[variant]}`}>
            <span>{icon}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionColumn({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: 'red' | 'orange' | 'blue';
}) {
  const dotColors = { red: 'bg-red-500', orange: 'bg-orange-400', blue: 'bg-blue-500' };
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">None</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColors[color]}`} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
