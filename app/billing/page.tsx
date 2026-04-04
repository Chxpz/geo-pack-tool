import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth-server';
import { getUserSubscription, PLAN_CONFIG } from '@/lib/stripe';
import { UpgradeButton, ManageButton } from '@/components/billing/BillingButtons';
import DarkModeToggle from '@/components/ui/DarkModeToggle';

interface PageProps {
  searchParams: Promise<{ upgraded?: string; canceled?: string }>;
}

const PLAN_ORDER = ['free', 'pro', 'business', 'enterprise'] as const;

export default async function BillingPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect('/login');

  const params = await searchParams;
  const sub = await getUserSubscription(session.user.id);
  const currentPlanId = (sub.plan ?? 'free') as typeof PLAN_ORDER[number];

  const plans = PLAN_ORDER.map((id) => PLAN_CONFIG[id]).filter(Boolean);

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
              <span className="text-sm font-medium text-gray-600">Billing</span>
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

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Flash messages */}
        {params.upgraded && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            Your plan has been upgraded! You now have access to all features.
          </div>
        )}
        {params.canceled && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Checkout canceled. Your plan was not changed.
          </div>
        )}

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Plans &amp; Billing</h1>
          <p className="text-gray-500 mt-2 text-sm">
            You are on the{' '}
            <span className="font-semibold text-gray-800">
              {PLAN_CONFIG[currentPlanId]?.name ?? 'Free'}
            </span>{' '}
            plan.
          </p>
          {sub.stripe_customer_id && (
            <div className="mt-3">
              <ManageButton hasStripeCustomer={!!sub.stripe_customer_id} />
            </div>
          )}
        </div>

        {/* Plan cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const planIndex = PLAN_ORDER.indexOf(plan.id);
            const currentIndex = PLAN_ORDER.indexOf(currentPlanId);
            const isDowngrade = planIndex < currentIndex;
            const isHigherPlan = planIndex > currentIndex;

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-6 flex flex-col transition-all ${
                  isCurrent
                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                    : isDowngrade
                      ? 'border-gray-200 bg-gray-100 opacity-60'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Current badge */}
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">
                    Current Plan
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-gray-600 ml-1">/month</span>
                    )}
                  </div>
                </div>

                {/* Key limits */}
                <div className="space-y-2 mb-6 text-sm text-gray-700">
                  <p>
                    <span className="font-semibold">{plan.maxBusinesses}</span> business
                    {plan.maxBusinesses !== 1 ? 'es' : ''}
                  </p>
                  <p>
                    <span className="font-semibold">{plan.maxCompetitors}</span> competitors
                  </p>
                  <p>
                    <span className="font-semibold">{plan.maxQueries}</span> queries/month
                  </p>
                  <p>
                    <span className="font-semibold">{plan.dataRetentionDays}</span> day data
                    retention
                  </p>
                  <p>
                    <span className="font-semibold capitalize">{plan.scanFrequency}</span> scans
                  </p>
                </div>

                {/* Features list */}
                <ul className="space-y-2 mb-8 flex-1 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">+</span>
                      <span className={isCurrent ? 'text-gray-800' : 'text-gray-600'}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg opacity-75 cursor-default"
                  >
                    Current Plan
                  </button>
                ) : isDowngrade ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 bg-gray-300 text-gray-600 font-semibold rounded-lg opacity-50 cursor-default"
                  >
                    Downgrade
                  </button>
                ) : isHigherPlan ? (
                  <UpgradeButton planId={plan.id} label={`Upgrade to ${plan.name}`} />
                ) : (
                  <button
                    disabled
                    className="w-full py-2 px-4 bg-gray-300 text-gray-600 font-semibold rounded-lg opacity-50 cursor-default"
                  >
                    Free Plan
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature matrix comparison table */}
        <div className="mb-10 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Feature</th>
                  {plans.map((plan) => (
                    <th
                      key={plan.id}
                      className={`px-6 py-4 text-center font-semibold ${
                        plan.id === currentPlanId ? 'bg-blue-50' : ''
                      }`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Businesses</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                      {plan.maxBusinesses}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Competitors Tracked</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                      {plan.maxCompetitors}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Queries per Month</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                      {plan.maxQueries}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Scan Frequency</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-6 py-4 text-center text-gray-700 capitalize">
                      {plan.scanFrequency}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Data Retention</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                      {plan.dataRetentionDays} days
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Semrush Depth</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-6 py-4 text-center text-gray-700 capitalize">
                      {plan.semrushDepth}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Perplexity Model</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-6 py-4 text-center text-gray-700 capitalize">
                      {plan.perplexityModel}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">GEO Audits / Month</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-6 py-4 text-center text-gray-700">
                      {plan.maxGeoAuditsPerMonth >= 999 ? 'Unlimited' : plan.maxGeoAuditsPerMonth}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-900">Concierge Service</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-6 py-4 text-center">
                      {plan.conciergeAccess ? (
                        <span className="text-green-600 font-bold">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Trust line */}
        <p className="text-center text-xs text-gray-400">
          Payments processed securely by Stripe. Cancel anytime.
        </p>
      </main>
    </div>
  );
}
