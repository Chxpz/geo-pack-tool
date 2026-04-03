'use client';

import { ReactNode } from 'react';

interface Recommendation {
  action: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'quick_win' | 'medium' | 'strategic';
}

interface InsightCardProps {
  type: 'weekly_summary' | 'competitive_alert' | 'recommendation';
  title: string;
  summary: string;
  findings: string[];
  recommendations: Recommendation[];
  dataSourceRefs?: string[];
  generatedAt?: string;
  compact?: boolean;
}

const typeConfig = {
  weekly_summary: {
    label: 'Weekly Summary',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    icon: '📊',
  },
  competitive_alert: {
    label: 'Competitive Alert',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    icon: '⚡',
  },
  recommendation: {
    label: 'Recommendation',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-800',
    icon: '💡',
  },
};

const priorityConfig = {
  high: { badge: 'bg-red-100 text-red-800', label: 'HIGH PRIORITY' },
  medium: { badge: 'bg-yellow-100 text-yellow-800', label: 'MEDIUM' },
  low: { badge: 'bg-gray-100 text-gray-800', label: 'LOW' },
};

const effortConfig = {
  quick_win: { label: 'Quick Win', color: 'text-green-600' },
  medium: { label: 'Medium Effort', color: 'text-blue-600' },
  strategic: { label: 'Strategic Initiative', color: 'text-purple-600' },
};

export function InsightCard({
  type,
  title,
  summary,
  findings,
  recommendations,
  dataSourceRefs,
  generatedAt,
  compact = false,
}: InsightCardProps) {
  const config = typeConfig[type];
  const isPriority = recommendations.some(r => r.priority === 'high');

  if (compact) {
    return (
      <div className={`border ${config.borderColor} ${config.bgColor} rounded-lg p-3`}>
        <div className="flex items-start gap-2 mb-2">
          <span className="text-lg">{config.icon}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-gray-900 truncate">
              {title}
            </h4>
            <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
              {summary}
            </p>
          </div>
        </div>

        {isPriority && (
          <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${priorityConfig.high.badge}`}>
            {priorityConfig.high.label}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`border ${config.borderColor} ${config.bgColor} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2 flex-1">
            <span className="text-2xl">{config.icon}</span>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${config.badgeBg} ${config.badgeText}`}
          >
            {config.label}
          </span>
        </div>
        <p className="text-sm text-gray-700">{summary}</p>
      </div>

      {/* Findings */}
      {findings.length > 0 && (
        <div className="border-b border-gray-200 px-5 py-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Key Findings
          </h4>
          <ul className="space-y-2">
            {findings.map((finding, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-gray-400 flex-shrink-0">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="border-b border-gray-200 px-5 py-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Recommendations
          </h4>
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-sm">
                <div className="flex items-start gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${priorityConfig[rec.priority].badge}`}>
                    {priorityConfig[rec.priority].label}
                  </span>
                  <span className={`text-xs font-medium ${effortConfig[rec.effort].color}`}>
                    {effortConfig[rec.effort].label}
                  </span>
                </div>
                <p className="text-gray-700 pl-0">{rec.action}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
        <div>
          {dataSourceRefs && dataSourceRefs.length > 0 && (
            <span>
              Data sources: {dataSourceRefs.slice(0, 2).join(', ')}
              {dataSourceRefs.length > 2 && ` +${dataSourceRefs.length - 2} more`}
            </span>
          )}
        </div>
        {generatedAt && (
          <span className="text-gray-500">
            {new Date(generatedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
