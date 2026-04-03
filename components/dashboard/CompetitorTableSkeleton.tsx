'use client';

/**
 * Skeleton loader for Competitor Comparison table
 * Shows animated pulse while competitor data is loading
 */
export function CompetitorTableSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="divide-y divide-slate-100">
        {/* Header row */}
        <div className="px-6 py-4 bg-slate-50 flex justify-between items-center">
          <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Data rows */}
        {[...Array(6)].map((_, rowIdx) => (
          <div key={rowIdx} className="px-6 py-4 flex justify-between items-center">
            {/* Company name */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-3 w-32 rounded bg-slate-200 animate-pulse mb-1" />
                <div className="h-2 w-24 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>

            {/* Metrics */}
            <div className="flex gap-4">
              {[...Array(4)].map((_, colIdx) => (
                <div key={colIdx} className="text-right">
                  <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer button */}
      <div className="px-6 py-4 border-t border-slate-100">
        <div className="h-10 w-32 rounded bg-slate-200 animate-pulse" />
      </div>
    </div>
  );
}
