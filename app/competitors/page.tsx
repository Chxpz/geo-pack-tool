import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Business, Competitor, AIMention } from '@/lib/types';
import CompetitorCard from '@/components/competitors/CompetitorCard';
import CompetitorForm from '@/components/competitors/CompetitorForm';

export const metadata = {
  title: 'Competitors | AgenticRev',
  description: 'Manage and track competitors for your business',
};

interface CompetitorWithMentions extends Competitor {
  mention_count: number;
  last_mentioned?: string;
}

export default async function CompetitorsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if (!supabaseAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">Database connection failed. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch user's businesses
  const { data: businesses, error: businessesError } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, user_id')
    .eq('user_id', session.user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (businessesError || !businesses || businesses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Competitors</h1>
          <p className="text-gray-600 mb-8">
            No businesses found. Please create a business first.
          </p>
        </div>
      </div>
    );
  }

  // Use first business (can be extended to support business selector)
  const business = businesses[0] as Business;

  // Fetch competitors for this business
  const { data: competitors, error: competitorsError } = await supabaseAdmin
    .from('competitors')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  if (competitorsError) {
    console.error('Error fetching competitors:', competitorsError);
  }

  // Fetch AI mentions with competitor_mentioned data
  const { data: mentions, error: mentionsError } = await supabaseAdmin
    .from('ai_mentions')
    .select(
      `
      id,
      competitors_mentioned,
      scanned_at,
      query_id,
      platform_id,
      ai_platforms(id, name, slug),
      tracked_queries(id, query_text)
      `
    )
    .eq('business_id', business.id)
    .not('competitors_mentioned', 'is', null)
    .order('scanned_at', { ascending: false })
    .limit(100);

  if (mentionsError) {
    console.error('Error fetching mentions:', mentionsError);
  }

  // Build competitor mention counts
  const competitorMentions = new Map<string, { count: number; lastMentioned: string }>();

  if (mentions && Array.isArray(mentions)) {
    for (const mention of mentions) {
      const mentionData = mention as unknown as { competitors_mentioned?: Array<{ name: string }> | null; scanned_at: string };
      if (mentionData.competitors_mentioned && Array.isArray(mentionData.competitors_mentioned)) {
        for (const comp of mentionData.competitors_mentioned) {
          const compName = (comp as unknown as { name?: string }).name || '';
          const current = competitorMentions.get(compName) || { count: 0, lastMentioned: mentionData.scanned_at };
          competitorMentions.set(compName, {
            count: current.count + 1,
            lastMentioned: mentionData.scanned_at,
          });
        }
      }
    }
  }

  const competitorsWithMentions: CompetitorWithMentions[] = (competitors || []).map((comp) => {
    const compData = comp as Competitor;
    const mention = competitorMentions.get(compData.competitor_name);
    return {
      ...compData,
      mention_count: mention?.count || 0,
      last_mentioned: mention?.lastMentioned,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Competitors</h1>
          <p className="text-gray-600">
            Track and compare competitors mentioned in AI responses for <strong>{business.business_name}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Competitors list */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {competitorsWithMentions.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                  <p className="text-gray-600 mb-4">No competitors added yet</p>
                  <p className="text-sm text-gray-500">
                    Add your first competitor below to start tracking mentions
                  </p>
                </div>
              ) : (
                competitorsWithMentions.map((competitor) => (
                  <CompetitorCard
                    key={competitor.id}
                    competitor={competitor}
                    mentions={mentions?.filter(
                      (m) =>
                        (m as unknown as { competitors_mentioned?: Array<{ name: string }> | null }).competitors_mentioned?.some(
                          (c) => (c as unknown as { name?: string }).name === competitor.competitor_name,
                        ),
                    ) as any}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: Add competitor form */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <CompetitorForm businessId={business.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
