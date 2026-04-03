'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { PlatformPoint } from '@/lib/types';

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: '#10a37f',
  perplexity: '#1fb6ff',
  gemini: '#4285f4',
  claude: '#cc785c',
};

interface Props {
  data: PlatformPoint[];
}

export default function PlatformBreakdown({ data }: Props) {
  const hasData = data.some((d) => d.mentions > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-36 text-sm text-gray-400">
        Run a scan to see platform breakdown.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
        <Tooltip />
        <Bar dataKey="mentions" name="Mentions" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.slug}
              fill={PLATFORM_COLORS[entry.slug] ?? '#6b7280'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
