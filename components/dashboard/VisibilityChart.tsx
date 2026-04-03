'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TimelinePoint } from '@/lib/types';

interface VisibilityChartProps {
  data: TimelinePoint[];
}

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: '#10a37f',
  perplexity: '#1fb6ff',
  gemini: '#4285f4',
  claude: '#cc785c',
  google_aio: '#ea4335',
  google_ai_mode: '#fbbc04',
  copilot: '#00a4ef',
};

export default function VisibilityChart({ data }: VisibilityChartProps) {
  const [viewMode, setViewMode] = useState<'mentions' | 'score'>('mentions');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const rangeMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = rangeMap[dateRange];
    return data.slice(-days);
  }, [data, dateRange]);

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Visibility Over Time</h2>
        <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
          No timeline data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">Visibility Over Time</h2>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['mentions', 'score'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode === 'mentions' ? 'Mentions' : 'Score'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`text-xs font-medium px-3 py-1.5 rounded transition-colors ${
                  dateRange === range
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            tickFormatter={(date) => {
              const d = new Date(date);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
          />
          <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number) =>
              viewMode === 'mentions' ? `${value} mentions` : `${value} points`
            }
            labelFormatter={(label) => {
              const d = new Date(label);
              return d.toLocaleDateString();
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {viewMode === 'mentions' && (
            <>
              <Line
                type="monotone"
                dataKey="chatgpt"
                stroke={PLATFORM_COLORS.chatgpt}
                strokeWidth={2}
                dot={false}
                name="ChatGPT"
              />
              <Line
                type="monotone"
                dataKey="perplexity"
                stroke={PLATFORM_COLORS.perplexity}
                strokeWidth={2}
                dot={false}
                name="Perplexity"
              />
              <Line
                type="monotone"
                dataKey="gemini"
                stroke={PLATFORM_COLORS.gemini}
                strokeWidth={2}
                dot={false}
                name="Gemini"
              />
              <Line
                type="monotone"
                dataKey="claude"
                stroke={PLATFORM_COLORS.claude}
                strokeWidth={2}
                dot={false}
                name="Claude"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
