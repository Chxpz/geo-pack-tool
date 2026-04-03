'use client';

import Link from 'next/link';
import { GEOAudit } from '@/lib/types';

interface GEOAuditSummaryProps {
  audit?: GEOAudit;
  businessId?: string;
  isLoading?: boolean;
}

export default function GEOAuditSummary({
  audit,
  businessId,
  isLoading,
}: GEOAuditSummaryProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">GEO Audit</h2>
        <p className="text-sm text-gray-600 mb-4">
          No GEO audit data available. Run an audit to get started.
        </p>
        {businessId && (
          <Link
            href={`/geo-audit?business_id=${businessId}`}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            View Full Audit →
          </Link>
        )}
      </div>
    );
  }

  const overallScore = audit.overall_score || 0;
  const scoreColor =
    overallScore >= 75 ? 'text-green-600' : overallScore >= 50 ? 'text-yellow-600' : 'text-red-600';

  // Get top 3 recommendations
  const topRecommendations = (audit.recommendations || [])
    .filter((r: any) => r.priority === 'high' || r.priority === 'medium')
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">GEO Audit</h2>
          <p className="text-xs text-gray-600 mt-1">
            Last updated: {new Date(audit.audit_date).toLocaleDateString()}
          </p>
        </div>
        <div className={`text-3xl font-bold ${scoreColor}`}>
          {Math.round(overallScore)}
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="mb-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-lg font-semibold text-gray-900">
            {Math.round(audit.crawlability_score || 0)}
          </div>
          <div className="text-xs text-gray-600">Crawlability</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-lg font-semibold text-gray-900">
            {Math.round(audit.content_score || 0)}
          </div>
          <div className="text-xs text-gray-600">Content</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-lg font-semibold text-gray-900">
            {Math.round(audit.structured_data_score || 0)}
          </div>
          <div className="text-xs text-gray-600">Schema</div>
        </div>
      </div>

      {/* Top Recommendations */}
      {topRecommendations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Recommendations</h3>
          <div className="space-y-2">
            {topRecommendations.map((rec: any, idx: number) => (
              <div
                key={idx}
                className={`text-xs rounded px-2 py-1 ${
                  rec.priority === 'high'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-yellow-50 text-yellow-700'
                }`}
              >
                <div className="font-semibold">{rec.title}</div>
                {rec.priority === 'high' && <div className="text-red-900">High Priority</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {businessId && (
        <Link
          href={`/geo-audit?business_id=${businessId}`}
          className="block w-full text-center rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
        >
          View Full Audit
        </Link>
      )}
    </div>
  );
}
