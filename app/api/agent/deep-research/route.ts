/**
 * POST /api/agent/deep-research
 * Submit deep research topic to Perplexity sonar-deep-research (async)
 * Returns research_id and status (202 Accepted for async processing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription } from '@/lib/stripe';
import { canAccessFeature } from '@/lib/plan-limits';
import { querySonar } from '@/lib/perplexity-sonar';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_SONAR_API_KEY;

interface DeepResearchRequest {
  business_id: string;
  topic: string;
  context?: string;
}

interface DeepResearchResponse {
  research_id: string;
  status: 'submitted' | 'processing' | 'completed' | 'failed';
  topic: string;
  submittedAt: string;
  pollUrl: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check Enterprise plan
  const subscription = await getUserSubscription(session.user.id);
  if (!canAccessFeature(subscription.plan, 'concierge')) {
    return NextResponse.json(
      { error: 'Deep research requires Enterprise plan' },
      { status: 403 }
    );
  }

  if (!supabaseAdmin || !PERPLEXITY_API_KEY) {
    return NextResponse.json(
      { error: 'Service not configured' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as DeepResearchRequest;
    const { business_id, topic, context } = body;

    if (!business_id || !topic) {
      return NextResponse.json(
        { error: 'business_id and topic are required' },
        { status: 400 }
      );
    }

    // Verify business ownership
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', business_id)
      .eq('user_id', session.user.id)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or not owned by user' },
        { status: 404 }
      );
    }

    // Generate research ID
    const researchId = `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Build prompt
    const systemPrompt = context
      ? `You are conducting deep research for a business.\n\nBusiness Context:\n${context}\n\nConduct thorough research on the topic.`
      : 'You are a research assistant. Conduct thorough research on the given topic.';

    // Submit to Perplexity asynchronously
    (async () => {
      try {
        const result = await querySonar(systemPrompt, topic, {
          model: 'sonar-deep-research',
          returnCitations: true,
          returnRelatedQuestions: true,
        });

        // Store result in a research_results table (or similar)
        // For now, we'll just store the status
        await supabaseAdmin
          .from('deep_research_results')
          .upsert({
            id: researchId,
            business_id,
            user_id: session.user.id,
            topic,
            status: 'completed',
            response: result,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      } catch (error) {
        // Store error status
        await supabaseAdmin
          .from('deep_research_results')
          .upsert({
            id: researchId,
            business_id,
            user_id: session.user.id,
            topic,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }
    })();

    const response: DeepResearchResponse = {
      research_id: researchId,
      status: 'submitted',
      topic,
      submittedAt: new Date().toISOString(),
      pollUrl: `/api/agent/deep-research/${researchId}`,
    };

    return NextResponse.json(response, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
