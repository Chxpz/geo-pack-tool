import { VisibilityScoreSkeleton } from '@/components/dashboard/VisibilityScoreSkeleton';
import { PlatformBreakdownSkeleton } from '@/components/dashboard/PlatformBreakdownSkeleton';
import { TopQueriesSkeleton } from '@/components/dashboard/TopQueriesSkeleton';
import { CompetitorTableSkeleton } from '@/components/dashboard/CompetitorTableSkeleton';

/**
 * Next.js loading state for dashboard page
 * Displays skeleton loaders while dashboard data is being fetched
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header skeleton */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-2">
            <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="h-4 w-96 rounded bg-slate-100 animate-pulse" />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top section: Visibility Score and Platform Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <VisibilityScoreSkeleton />
          </div>
          <div className="lg:col-span-2">
            <PlatformBreakdownSkeleton />
          </div>
        </div>

        {/* Middle section: Top Queries */}
        <div className="mb-8">
          <TopQueriesSkeleton />
        </div>

        {/* Bottom section: Competitor Comparison */}
        <div>
          <CompetitorTableSkeleton />
        </div>
      </div>
    </div>
  );
}
