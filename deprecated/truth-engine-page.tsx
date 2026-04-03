import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import ErrorCard from '@/components/truth-engine/ErrorCard';
import TriggerButton from '@/components/truth-engine/TriggerButton';
import DarkModeToggle from '@/components/ui/DarkModeToggle';

interface PageProps {
  searchParams: Promise<{
    severity?: string;
    resolved?: string;
    page?: string;
  }>;
}

interface ErrorRow {
  id: string;
  error_type: string;
  severity: 'critical' | 'warning' | 'info';
  error_message: string;
  expected_value: string | null;
  actual_value: string | null;
  fix_suggestion: string | null;
  resolved: boolean;
  detected_at: string;
  products: { id: string; name: string; image_url: string | null } | null;
}

interface CountRow {
  severity: string;
  resolved: boolean;
}

const TABS = [
  { label: 'All open', href: '/truth-engine', active: (s?: string, r?: string) => !s && r !== 'true' },
  { label: 'Critical', href: '/truth-engine?severity=critical', active: (s?: string) => s === 'critical' },
  { label: 'Warnings', href: '/truth-engine?severity=warning', active: (s?: string) => s === 'warning' },
  { label: 'Info', href: '/truth-engine?severity=info', active: (s?: string) => s === 'info' },
  { label: 'Resolved', href: '/truth-engine?resolved=true', active: (_s?: string, r?: string) => r === 'true' },
];

export default async function TruthEnginePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect('/login');

  const params = await searchParams;
  const severity = params.severity;
  const resolvedFilter = params.resolved;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const perPage = 20;

  let errors: ErrorRow[] = [];
  let totalFiltered = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  let resolvedCount = 0;
  let openCount = 0;
  let totalProducts = 0;

  if (supabaseAdmin) {
    // Fetch counts + paginated errors in parallel
    const [countResult, listResult, productResult] = await Promise.all([
      supabaseAdmin
        .from('truth_engine_errors')
        .select('severity, resolved')
        .eq('user_id', session.user.id),

      (() => {
        let q = supabaseAdmin!
          .from('truth_engine_errors')
          .select(
            `id, error_type, severity, error_message, expected_value, actual_value,
             fix_suggestion, resolved, detected_at,
             products ( id, name, image_url )`,
            { count: 'exact' },
          )
          .eq('user_id', session.user.id)
          .order('detected_at', { ascending: false })
          .range((page - 1) * perPage, page * perPage - 1);

        if (severity) q = q.eq('severity', severity);
        if (resolvedFilter !== undefined) q = q.eq('resolved', resolvedFilter === 'true');
        else q = q.eq('resolved', false);

        return q;
      })(),

      supabaseAdmin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .is('deleted_at', null),
    ]);

    const countRows = (countResult.data ?? []) as CountRow[];
    for (const row of countRows) {
      if (row.resolved) {
        resolvedCount++;
      } else {
        openCount++;
        if (row.severity === 'critical') criticalCount++;
        else if (row.severity === 'warning') warningCount++;
        else if (row.severity === 'info') infoCount++;
      }
    }

    errors = (listResult.data ?? []) as unknown as ErrorRow[];
    totalFiltered = listResult.count ?? 0;
    totalProducts = productResult.count ?? 0;
  }

  const totalPages = Math.ceil(totalFiltered / perPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-lg font-bold text-gray-900">
                AgenticRev
              </Link>
              <span className="text-gray-300">›</span>
              <span className="text-sm font-medium text-gray-600">Truth Engine</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{session.user.email}</span>
              <DarkModeToggle />
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/auth/signout" className="text-sm text-gray-600 hover:text-gray-900">
                Sign out
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Truth Engine</h1>
            <p className="text-sm text-gray-500 mt-1">
              Detect and fix product data errors before AI agents get them wrong
            </p>
          </div>
          <TriggerButton productCount={totalProducts} />
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Open Issues" value={openCount} color="gray" />
          <StatCard label="Critical" value={criticalCount} color="red" />
          <StatCard label="Warnings" value={warningCount} color="yellow" />
          <StatCard label="Resolved" value={resolvedCount} color="green" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {TABS.map((tab) => {
            const isActive = tab.active(severity, resolvedFilter);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  isActive
                    ? 'bg-white border border-b-white border-gray-200 text-gray-900 -mb-px'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Error list */}
        {errors.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm font-medium text-gray-700">
              {resolvedFilter === 'true'
                ? 'No resolved errors yet'
                : 'No issues found — your product data looks clean'}
            </p>
            {resolvedFilter !== 'true' && totalProducts === 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Connect a Shopify store and run a sync to start checking your products.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map((error) => (
              <ErrorCard key={error.id} error={error} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {page > 1 && (
              <Link
                href={`/truth-engine?${new URLSearchParams({ ...(severity ? { severity } : {}), ...(resolvedFilter ? { resolved: resolvedFilter } : {}), page: String(page - 1) })}`}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                ← Previous
              </Link>
            )}
            <span className="px-4 py-2 text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/truth-engine?${new URLSearchParams({ ...(severity ? { severity } : {}), ...(resolvedFilter ? { resolved: resolvedFilter } : {}), page: String(page + 1) })}`}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'gray' | 'red' | 'yellow' | 'green';
}) {
  const colorMap = {
    gray: 'text-gray-900',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
    </div>
  );
}
