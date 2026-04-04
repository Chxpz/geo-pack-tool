import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import type { TrackedQuery } from '@/lib/types';

interface ScanRunRow {
  id: string;
  business_id: string;
  status: 'processing' | 'completed' | 'failed';
  requested_query_count: number;
  scanned_queries: number;
  mentions_found: number;
  errors_count: number;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
  businesses?: { business_name: string } | { business_name: string }[] | null;
}

export default async function ScansPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  let queries: TrackedQuery[] = [];
  let scanRuns: ScanRunRow[] = [];

  if (supabaseAdmin) {
    const [queriesResult, scanRunsResult] = await Promise.all([
      supabaseAdmin
        .from('tracked_queries')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('scan_runs')
        .select(
          `
          id,
          business_id,
          status,
          requested_query_count,
          scanned_queries,
          mentions_found,
          errors_count,
          error_message,
          started_at,
          completed_at,
          businesses(business_name)
          `
        )
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    queries = (queriesResult.data ?? []) as TrackedQuery[];
    scanRuns = (scanRunsResult.data ?? []) as ScanRunRow[];
  }

  const groupedScans = scanRuns.reduce(
    (acc, scanRun) => {
      if (typeof scanRun.started_at !== 'string') {
        return acc;
      }

      const date = new Date(scanRun.started_at).toLocaleDateString();
      const bucket = acc[date] ?? [];
      bucket.push(scanRun);
      acc[date] = bucket;
      return acc;
    },
    {} as Record<string, ScanRunRow[]>
  );

  const queryTypeLabels: Record<string, string> = {
    system_generated: 'System',
    user_custom: 'Custom',
    gsc_imported: 'GSC Import',
    sonar_discovered: 'Sonar',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-gray-900">AI Scans</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Query Management Section */}
        <div className="mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-gray-900">Tracked Queries</h2>
              <a
                href="/dashboard"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Manage Queries
              </a>
            </div>

            {queries.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No queries tracked yet. Add a query to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Query</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Intent</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queries.map((query) => (
                      <tr key={query.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{query.query_text}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {queryTypeLabels[query.query_type] || query.query_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded ${
                              query.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {query.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {query.intent_category
                            ? query.intent_category.charAt(0).toUpperCase() +
                              query.intent_category.slice(1).replace(/_/g, ' ')
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {new Date(query.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="text-red-600 hover:text-red-700 font-medium text-xs">
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Scan History Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-6">Recent Scans</h2>

          {Object.keys(groupedScans).length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No scans yet. Run your first scan to see results here.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedScans).map(([date, dayScan]) => (
                <div key={date}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">{date}</h3>
                  <div className="space-y-3">
                    {dayScan.map((scan) => {
                      const businessName = Array.isArray(scan.businesses)
                        ? scan.businesses[0]?.business_name ?? 'Business'
                        : scan.businesses?.business_name ?? 'Business';

                      return (
                      <div
                        key={scan.id}
                        className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {businessName}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  scan.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : scan.status === 'failed'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {scan.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                              <div>
                                <span className="text-gray-500">Requested:</span>
                                <span className="font-medium ml-1">
                                  {scan.requested_query_count} queries
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Processed:</span>
                                <span className="font-medium ml-1">{scan.scanned_queries}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Mentions:</span>
                                <span className="font-medium ml-1">{scan.mentions_found}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Errors:</span>
                                <span className="font-medium ml-1">{scan.errors_count}</span>
                              </div>
                            </div>
                            {scan.error_message && (
                              <p className="mt-2 text-xs text-red-600">{scan.error_message}</p>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                              Started{' '}
                              {new Date(scan.started_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {scan.completed_at && (
                                <>
                                  {' '}· Completed{' '}
                                  {new Date(scan.completed_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
