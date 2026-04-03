'use client';

/**
 * Skeleton loader for Platform Breakdown chart
 * Shows animated pulse while chart data is loading
 */
export function PlatformBreakdownSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
      </div>

      {/* Chart area skeleton */}
      <div className="flex items-center justify-center h-64 mb-6">
        <div className="w-full max-w-sm">
          {/* Placeholder for chart */}
          <div className="w-full h-48 rounded bg-slate-100 animate-pulse" />
        </div>
      </div>

      {/* Legend skeleton */}
      <div className="space-y-2 border-t border-slate-100 pt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
            </div>
            <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
