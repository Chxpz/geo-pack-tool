'use client';

/**
 * Skeleton loader for Visibility Score card
 * Shows animated pulse while score data is loading
 */
export function VisibilityScoreSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header skeleton */}
      <div className="mb-4">
        <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
      </div>

      {/* Large score skeleton */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-slate-200 animate-pulse mb-4" />
          <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>

      {/* Metrics rows skeleton */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
          </div>
        ))}
      </div>

      {/* CTA button skeleton */}
      <div className="mt-6 h-10 rounded bg-slate-200 animate-pulse" />
    </div>
  );
}
