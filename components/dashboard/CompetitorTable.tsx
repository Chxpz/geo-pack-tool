'use client';

import { useMemo } from 'react';
import type { CompetitorComparison, Business } from '@/lib/types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CompetitorTableProps {
  business: Business;
  competitors: CompetitorComparison[];
  businessVisibilityScore?: number;
}

interface CompetitorTableRow extends CompetitorComparison {
  isOwnBusiness?: boolean;
}

export default function CompetitorTable({
  business,
  competitors,
  businessVisibilityScore = 0,
}: CompetitorTableProps) {
  // Sort competitors by visibility score (descending) and add business row at top
  const tableData = useMemo(() => {
    const rows: CompetitorTableRow[] = [
      {
        competitor_id: business.id,
        name: business.business_name,
        visibility_score: businessVisibilityScore,
        mentions: 0,
        trend: 0,
        isOwnBusiness: true,
      },
      ...competitors.sort((a, b) => b.visibility_score - a.visibility_score),
    ];
    return rows;
  }, [business, competitors, businessVisibilityScore]);

  const getTrendColor = (trend: number): string => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  const getScoreBadgeColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-blue-100 text-blue-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Competitor Comparison</h3>
        <p className="text-sm text-gray-600 mt-1">
          Visibility metrics across all tracked competitors
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Business / Competitor
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Visibility Score
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Mentions
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Top Cited Source
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Trend
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr
                key={row.competitor_id}
                className={`border-b border-gray-200 transition-colors ${
                  row.isOwnBusiness
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : idx % 2 === 0
                      ? 'bg-white hover:bg-gray-50'
                      : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {/* Name Column */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {row.isOwnBusiness && (
                      <span className="inline-block px-2 py-1 bg-blue-200 text-blue-700 text-xs font-semibold rounded">
                        YOUR BUSINESS
                      </span>
                    )}
                    <span className="font-medium text-gray-900">{row.name}</span>
                  </div>
                </td>

                {/* Visibility Score Column */}
                <td className="px-6 py-4 text-right">
                  <div className="inline-block">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getScoreBadgeColor(
                        row.visibility_score,
                      )}`}
                    >
                      {row.visibility_score.toFixed(1)}
                    </span>
                  </div>
                </td>

                {/* Mentions Column */}
                <td className="px-6 py-4 text-right text-gray-900 font-medium">
                  {row.mentions > 0 ? (
                    <span className="inline-block bg-gray-100 px-3 py-1 rounded-full text-sm">
                      {row.mentions}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                {/* Top Cited Source Column */}
                <td className="px-6 py-4 text-left">
                  {row.top_cited_source ? (
                    <a
                      href={row.top_cited_source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm truncate max-w-xs inline-block"
                      title={row.top_cited_source}
                    >
                      {new URL(row.top_cited_source).hostname}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                {/* Trend Column */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`font-medium ${getTrendColor(row.trend)}`}>
                      {row.trend > 0 ? '+' : ''}
                      {row.trend}%
                    </span>
                    <div className={getTrendColor(row.trend)}>
                      {getTrendIcon(row.trend)}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with legend */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 rounded border border-green-300" />
            <span>Score 80+</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 rounded border border-blue-300" />
            <span>Score 60-79</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-100 rounded border border-yellow-300" />
            <span>Score 40-59</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 rounded border border-red-300" />
            <span>Score &lt;40</span>
          </div>
        </div>
      </div>
    </div>
  );
}
