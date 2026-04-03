'use client';

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

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: '#10a37f',
  perplexity: '#1fb6ff',
  gemini: '#4285f4',
  claude: '#cc785c',
};

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  claude: 'Claude',
};

interface Props {
  data: TimelinePoint[];
}

export default function MentionChart({ data }: Props) {
  const hasData = data.some(
    (d) => d.chatgpt > 0 || d.perplexity > 0 || d.gemini > 0 || d.claude > 0,
  );

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No AI mentions yet. Run a scan to populate this chart.
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
        <Tooltip />
        <Legend iconType="circle" iconSize={8} />
        {Object.entries(PLATFORM_LABELS).map(([slug, label]) => (
          <Line
            key={slug}
            type="monotone"
            dataKey={slug}
            name={label}
            stroke={PLATFORM_COLORS[slug]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function formatDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${parseInt(month)}/${parseInt(day)}`;
}
