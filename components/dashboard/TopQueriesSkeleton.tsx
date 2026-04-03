'use client';

/**
 * Skeleton loader for Top Queries section
 * Shows animated pulse while query data is loading
 */
export function TopQueriesSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header skeleton */}
      <div className="mb-4 flex justify-between items-center">
        <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
        <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
      </div>

      {/* Rows skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
            {/* Rank & query name */}
            <div className="flex items-center gap-4 flex-1">
              <div className="h-3 w-6 rounded bg-slate-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-3 w-48 rounded bg-slate-200 animate-pulse mb-2" />
                <div className="h-2 w-32 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>

            {/* Metrics */}
            <div className="flex gap-4 ml-4">
              <div className="text-right">
                <div className="h-3 w-12 rounded bg-slate-200 animate-pulse mb-1" />
                <div className="h-2 w-10 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="text-right">
                <div className="h-3 w-12 rounded bg-slate-200 animate-pulse mb-1" />
                <div className="h-2 w-10 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
