'use client';

import { useMemo } from 'react';
import type { VisibilityScoreResult } from '@/lib/types';

interface VisibilityScoreProps {
  score: number;
  components: VisibilityScoreResult['components'];
  trend: number;
}

export default function VisibilityScore({
  score,
  components,
  trend,
}: VisibilityScoreProps) {
  const scoreColor = useMemo(() => {
    if (score >= 60) return 'text-green-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-red-600';
  }, [score]);

  const scoreBgColor = useMemo(() => {
    if (score >= 60) return 'from-green-50 to-green-100';
    if (score >= 30) return 'from-yellow-50 to-yellow-100';
    return 'from-red-50 to-red-100';
  }, [score]);

  const trendIcon = trend >= 0 ? '↑' : '↓';
  const trendColor = trend >= 0 ? 'text-green-600' : 'text-red-600';

  const componentEntries = [
    { label: 'Mention Rate', key: 'mention_rate' as const },
    { label: 'Position', key: 'avg_position' as const },
    { label: 'Sentiment', key: 'sentiment' as const },
    { label: 'Own Citations', key: 'own_citation_rate' as const },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-8">
      <h2 className="text-base font-semibold text-gray-900 mb-6">AI Visibility Score</h2>

      <div className={`bg-gradient-to-br ${scoreBgColor} rounded-2xl p-8 mb-8 flex items-center justify-between`}>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <div className={`text-6xl font-bold ${scoreColor}`}>
              {Math.round(score)}
            </div>
            <div className="text-sm text-gray-600 mt-2">out of 100</div>
          </div>

          <div className="h-20 w-px bg-gray-300" />

          <div className="flex flex-col gap-2">
            <div className="text-xs uppercase font-semibold text-gray-500">30-day trend</div>
            <div className={`text-2xl font-bold ${trendColor}`}>
              {trendIcon} {Math.abs(trend)}
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {score >= 60 && 'Excellent visibility'}
          {score >= 30 && score < 60 && 'Good opportunity'}
          {score < 30 && 'Needs attention'}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {componentEntries.map(({ label, key }) => {
          const component = components[key];
          const percent = (component.contribution / 100) * 100;

          return (
            <div key={key}>
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">{label}</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {(component.value * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">
                {component.weight * 100}% weight
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
