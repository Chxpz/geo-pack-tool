import type { ReactNode } from 'react';

interface Props {
  icon: string;
  label: string;
  value: string;
  sub: ReactNode;
  trend?: {
    current: number;
    previous: number;
  };
}

export default function MetricCard({ icon, label, value, sub, trend }: Props) {
  const trendEl = buildTrend(trend);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {trendEl && <div className="mt-0.5">{trendEl}</div>}
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function buildTrend(trend?: { current: number; previous: number }) {
  if (!trend || trend.previous === 0) return null;

  const delta = trend.current - trend.previous;
  const pct = Math.round(Math.abs((delta / trend.previous) * 100));

  if (pct === 0) return null;

  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? 'text-green-600' : 'text-red-500'
      }`}
    >
      {up ? '↑' : '↓'} {pct}% vs prev 7d
    </span>
  );
}
