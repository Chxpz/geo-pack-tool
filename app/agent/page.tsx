import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription } from '@/lib/stripe';
import { canAccessFeature } from '@/lib/plan-limits';
import { ChatWidget } from '@/components/agent/ChatWidget';
import { InsightCard } from '@/components/agent/InsightCard';
import Link from 'next/link';

export const metadata = {
  title: 'AI Concierge | AgenticRev',
  description: 'Expert GEO/AEO guidance from your AI concierge',
};

export default async function AgentPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sign in required
          </h1>
          <p className="text-gray-600 mb-4">
            Please sign in to access the AI Concierge
          </p>
          <Link href="/login" className="text-blue-600 hover:underline">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  // Check Enterprise plan
  const subscription = await getUserSubscription(session.user.id);
  const hasAccess = canAccessFeature(subscription.plan, 'concierge');

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl border-2 border-purple-200 p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Enterprise Feature
          </h1>
          <p className="text-gray-600 mb-6">
            The AI Concierge is available on the Enterprise plan. Upgrade to unlock expert GEO/AEO guidance powered by AI.
          </p>
          <Link
            href="/billing"
            className="inline-block px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition"
          >
            Upgrade to Enterprise
          </Link>
        </div>
      </div>
    );
  }

  // Get businesses
  if (!supabaseAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Database unavailable</h1>
          <p className="text-gray-600">Configure Supabase to use the AI Concierge.</p>
        </div>
      </div>
    );
  }

  const { data: businesses } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const defaultBusinessId = businesses?.[0]?.id;

  if (!defaultBusinessId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            No businesses found
          </h1>
          <p className="text-gray-600 mb-4">
            Please create a business first
          </p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Concierge
              </h1>
              <p className="text-gray-600 mt-1">
                Expert GEO/AEO guidance for your business
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
              <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
              Enterprise
            </div>
          </div>

          {/* Business selector */}
          {businesses && businesses.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Business:
              </label>
              <div className="flex gap-2">
                {businesses.map(b => (
                  <Link
                    key={b.id}
                    href={`/agent?business=${b.id}`}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 transition"
                  >
                    {b.business_name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Conversation history sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Conversations
              </h2>
              <p className="text-sm text-gray-500 text-center py-8">
                Start a new conversation or select from recent chats
              </p>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                New Chat
              </button>
            </div>
          </div>

          {/* Center: Chat widget */}
          <div className="lg:col-span-1">
            <ChatWidget businessId={defaultBusinessId} mode="full" />
          </div>

          {/* Right: Recent insights panel */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Latest Insights
              </h2>

              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500 mb-3">
                  Generate insights to get AI-powered recommendations
                </p>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
                    📊 Weekly Summary
                  </button>
                  <button className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition">
                    ⚡ Competitive Alert
                  </button>
                  <button className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition">
                    💡 Recommendation
                  </button>
                </div>
              </div>

              {/* Sample insight card */}
              <InsightCard
                type="weekly_summary"
                title="Weekly Summary"
                summary="Your AI visibility improved 5% this week due to new content ranking."
                findings={[
                  'ChatGPT mentions up 3 positions on average',
                  'Perplexity coverage rate increased to 67%',
                  'Competitor mentions stabilized',
                ]}
                recommendations={[
                  {
                    action: 'Update schema markup on top 5 performing pages',
                    priority: 'high',
                    effort: 'quick_win',
                  },
                  {
                    action: 'Create new content targeting AI-friendly keywords',
                    priority: 'medium',
                    effort: 'medium',
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Deep Research Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Deep Research
            </h2>
            <p className="text-gray-700 mb-6">
              Submit a research topic for deep investigation. Our AI will conduct comprehensive research and provide detailed findings with citations.
            </p>
            <form className="flex gap-3">
              <input
                type="text"
                placeholder="What would you like to research? (e.g., 'Latest AI search trends in real estate')"
                className="flex-1 px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Research
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
