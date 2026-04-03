import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchDashboardStats } from '@/lib/stats';
import { getUserSubscription } from '@/lib/stripe';
import type { Business } from '@/lib/types';
import MetricCard from '@/components/dashboard/MetricCard';
import PlatformBreakdown from '@/components/dashboard/PlatformBreakdown';
import TopQueries from '@/components/dashboard/TopQueries';
import VisibilityScore from '@/components/dashboard/VisibilityScore';
import VisibilityChart from '@/components/dashboard/VisibilityChart';
import VerifyEmailBanner from '@/components/dashboard/VerifyEmailBanner';

interface DashboardPageProps {
  searchParams: Promise<{
    connected?: string;
    error?: string;
    business_id?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;
  const selectedBusinessId = params.business_id;

  let businesses: Business[] = [];
  let selectedBusiness: Business | null = null;
  let emailVerified = true;

  if (supabaseAdmin) {
    const [businessesResult, userResult] = await Promise.all([
      supabaseAdmin
        .from('businesses')
        .select('*')
        .eq('user_id', session.user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('users')
        .select('email_verified')
        .eq('id', session.user.id)
        .maybeSingle(),
    ]);

    businesses = (businessesResult.data ?? []) as Business[];
    emailVerified = (userResult.data?.email_verified as boolean | null) ?? true;

    if (selectedBusinessId && businesses.length > 0) {
      selectedBusiness = businesses.find((b) => b.id === selectedBusinessId) ?? businesses[0];
    } else if (businesses.length > 0) {
      selectedBusiness = businesses[0];
    }
  }

  let stats = await fetchDashboardStats(session.user.id, selectedBusiness?.id);
  const [sub] = await Promise.all([getUserSubscription(session.user.id)]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <span className="text-lg font-bold text-gray-900">AgenticRev</span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{session.user.email}</span>
              <a href="/billing" className="text-sm text-gray-600 hover:text-gray-900">
                Billing
              </a>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/auth/signout" className="text-sm text-gray-600 hover:text-gray-900">
                Sign out
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {!emailVerified && <VerifyEmailBanner email={session.user.email ?? ''} />}

        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {session.user.name?.split(' ')[0] ?? 'there'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {selectedBusiness ? 'AI visibility dashboard for your selected business' : 'Set up your first business to start tracking visibility'}
            </p>
          </div>

          {businesses.length > 1 && (
            <form action="/dashboard" method="get">
              <select
                name="business_id"
                defaultValue={selectedBusiness?.id ?? ''}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 bg-white hover:bg-gray-50"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.business_name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="ml-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 bg-white hover:bg-gray-50"
              >
                Switch
              </button>
            </form>
          )}
        </div>

        {!selectedBusiness && (
          <section className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-gray-900">No business profile yet</h2>
            <p className="mt-2 text-sm text-gray-600">
              Create your first business profile to unlock AI scans, competitor tracking, reports, and GEO audits.
            </p>
            <a
              href="/onboarding"
              className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Start onboarding
            </a>
          </section>
        )}

        {selectedBusiness && (
          <>
            <div className="mb-8">
              <VisibilityScore
                score={stats.aiVisibilityScore || stats.visibilityScore}
                components={{
                  mention_rate: { value: Math.min((stats.totalMentions || 0) / 10, 1), weight: 0.4, contribution: Math.round((stats.aiVisibilityScore || stats.visibilityScore || 0) * 0.4) },
                  avg_position: { value: Math.min((stats.shareOfVoice || 0) / 100, 1), weight: 0.2, contribution: Math.round((stats.aiVisibilityScore || stats.visibilityScore || 0) * 0.2) },
                  sentiment: { value: Math.min((stats.authorityScore || 0) / 100, 1), weight: 0.2, contribution: Math.round((stats.aiVisibilityScore || stats.visibilityScore || 0) * 0.2) },
                  own_citation_rate: { value: Math.min((stats.citationCount || 0) / 25, 1), weight: 0.2, contribution: Math.round((stats.aiVisibilityScore || stats.visibilityScore || 0) * 0.2) },
                }}
                trend={stats.totalMentions - stats.previousMentions}
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                icon="🔍"
                label="AI Mentions"
                value={stats.totalMentions.toString()}
                sub="Last 7 days"
                trend={{ current: stats.totalMentions, previous: stats.previousMentions }}
              />
              <MetricCard
                icon="📌"
                label="Citations"
                value={stats.citationCount?.toString() ?? '0'}
                sub="Captured sources"
              />
              <MetricCard
                icon="⭐"
                label="Authority Score"
                value={stats.authorityScore ? `${Math.round(stats.authorityScore)}` : '—'}
                sub="Latest SEO snapshot"
              />
              <MetricCard
                icon="📊"
                label="Share of Voice"
                value={stats.shareOfVoice ? `${Math.round(stats.shareOfVoice)}%` : '—'}
                sub="vs competitors"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <PlatformBreakdown data={stats.platformBreakdown} />
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Plan Snapshot</h2>
                <dl className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Current plan</dt>
                    <dd className="font-semibold text-gray-900 capitalize">{sub.plan}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Businesses allowed</dt>
                    <dd className="font-semibold text-gray-900">{sub.max_businesses}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Competitors allowed</dt>
                    <dd className="font-semibold text-gray-900">{sub.max_competitors}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Monthly queries</dt>
                    <dd className="font-semibold text-gray-900">{sub.max_queries}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Scan frequency</dt>
                    <dd className="font-semibold text-gray-900">{sub.scan_frequency}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {stats.topQueries && stats.topQueries.length > 0 && (
              <div className="mb-8">
                <TopQueries queries={stats.topQueries} />
              </div>
            )}

            <div className="mb-8">
              <VisibilityChart data={stats.timelineData} />
            </div>
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Recommended next steps</h2>
              <ol className="space-y-5">
                <Step n={1} done={stats.topQueries && stats.topQueries.length > 0} title="Generate tracked queries" sub="Add the search prompts you want AgenticRev to monitor" />
                <Step n={2} done={(stats.totalMentions || 0) > 0} title="Run your first scan" sub="Capture mentions and citations across AI platforms" />
                <Step n={3} done={(stats.citationCount || 0) > 0} title="Review your citation profile" sub="Verify whether your own domain is earning citations" />
              </ol>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Step({ n, done, title, sub }: { n: number; done?: boolean; title: string; sub: string }) {
  return (
    <li className="flex items-start gap-3">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
          done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {done ? '✓' : n}
      </div>
      <div>
        <p className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </li>
  );
}
