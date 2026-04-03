'use client';

import { BrandVisibility as BrandVisibilityType } from '@/lib/types';

interface BrandVisibilityProps {
  data?: BrandVisibilityType;
  isLoading?: boolean;
}

export default function BrandVisibility({ data, isLoading }: BrandVisibilityProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
        No brand visibility data available
      </div>
    );
  }

  const coveragePercent = Math.round((data.coverage_rate || 0) * 100);
  const sovPercent = Math.round((data.share_of_voice || 0) * 100);
  const nssScore = data.nss_score || 0;

  // BVI Quadrant determination
  const bviQuadrant = data.bvi_quadrant || 'leaders';
  const quadrantColor = {
    leaders: 'bg-green-50 border-green-200',
    niche: 'bg-blue-50 border-blue-200',
    low_conversion: 'bg-yellow-50 border-yellow-200',
    low_performance: 'bg-red-50 border-red-200',
  }[bviQuadrant];

  const quadrantLabel = {
    leaders: 'Leaders',
    niche: 'Niche Leaders',
    low_conversion: 'Low Conversion Potential',
    low_performance: 'Low Performance',
  }[bviQuadrant];

  return (
    <div className="space-y-6">
      {/* Coverage and SOV Metrics */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Coverage */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Coverage %</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 45 * (coveragePercent / 100)} ${2 * Math.PI * 45}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{coveragePercent}%</div>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Brand mentions across AI search platforms</div>
              {data.mention_count && (
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {data.mention_count} mentions
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Share of Voice */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Share of Voice %</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 45 * (sovPercent / 100)} ${2 * Math.PI * 45}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{sovPercent}%</div>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Relative visibility vs competitors</div>
              {data.domain_citations_count && (
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {data.domain_citations_count} citations
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NSS Score and BVI Quadrant */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* NSS Score Gauge */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">NSS Score</h3>
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold text-gray-900">{nssScore.toFixed(1)}</div>
              <div className="text-xs text-gray-600">Range: -100 to +100</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  nssScore > 0 ? 'bg-green-500' : nssScore < 0 ? 'bg-red-500' : 'bg-gray-400'
                }`}
                style={{ width: `${((nssScore + 100) / 200) * 100}%` }}
              ></div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {nssScore > 0
                ? 'Positive sentiment trend'
                : nssScore < 0
                  ? 'Negative sentiment trend'
                  : 'Neutral sentiment'}
            </div>
          </div>
        </div>

        {/* BVI Quadrant */}
        <div className={`rounded-xl border-2 p-6 ${quadrantColor}`}>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Market Position (BVI)</h3>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900 mb-2">{quadrantLabel}</div>
            {data.bvi_coverage_x !== undefined && data.bvi_likelihood_y !== undefined && (
              <div className="text-xs text-gray-600">
                Coverage: {data.bvi_coverage_x.toFixed(1)} | Likelihood: {data.bvi_likelihood_y.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      {data.competitor_mention_counts && Object.keys(data.competitor_mention_counts).length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Sentiment Breakdown</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {data.sentiment_positive_pct || 0}%
              </div>
              <div className="text-xs text-gray-600">Positive</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {data.sentiment_neutral_pct || 0}%
              </div>
              <div className="text-xs text-gray-600">Neutral</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {data.sentiment_negative_pct || 0}%
              </div>
              <div className="text-xs text-gray-600">Negative</div>
            </div>
          </div>
        </div>
      )}

      {/* Competitor Mentions */}
      {data.competitor_mention_counts && Object.keys(data.competitor_mention_counts).length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Competitor Mentions</h3>
          <div className="space-y-3">
            {Object.entries(data.competitor_mention_counts).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{name}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-gray-500 text-center">
        <div>Data from: {data.source}</div>
        <div>Period: {data.period_start} to {data.period_end}</div>
      </div>
    </div>
  );
}
