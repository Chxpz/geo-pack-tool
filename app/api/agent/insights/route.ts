/**
 * POST /api/agent/insights
 * Generate AI insights for business
 * Types: weekly_summary, competitive_alert, recommendation
 * Enterprise plan only
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription } from '@/lib/stripe';
import { buildAgentContext } from '@/lib/geo-agent';
import { canAccessFeature } from '@/lib/plan-limits';

const AGENT_MODEL = process.env.AGENT_MODEL || 'gpt-4o';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type InsightType = 'weekly_summary' | 'competitive_alert' | 'recommendation';

interface InsightRequest {
  business_id: string;
  type: InsightType;
}

interface Insight {
  id: string;
  type: InsightType;
  title: string;
  summary: string;
  findings: string[];
  recommendations: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    effort: 'quick_win' | 'medium' | 'strategic';
  }>;
  dataSourceRefs: string[];
  generatedAt: string;
}

const insightPrompts: Record<InsightType, (context: string) => string> = {
  weekly_summary: (context: string) =>
    `Based on this business data, generate a concise weekly summary insight:

${context}

Provide a JSON response with:
{
  "title": "One-line summary",
  "summary": "2-3 sentence executive summary",
  "findings": ["key finding 1", "key finding 2", "key finding 3"],
  "recommendations": [
    {
      "action": "Specific action to take",
      "priority": "high|medium|low",
      "effort": "quick_win|medium|strategic"
    }
  ],
  "dataSourceRefs": ["Reference 1", "Reference 2"]
}`,

  competitive_alert: (context: string) =>
    `Based on competitive and visibility data, identify the top competitive threat and opportunity:

${context}

Provide a JSON response with:
{
  "title": "Competitive Alert",
  "summary": "What's changed or concerning in the competitive landscape",
  "findings": ["competitive finding 1", "competitive finding 2", "market shift"],
  "recommendations": [
    {
      "action": "Defensive or offensive action",
      "priority": "high|medium|low",
      "effort": "quick_win|medium|strategic"
    }
  ],
  "dataSourceRefs": ["Competitor mention", "Visibility metric"]
}`,

  recommendation: (context: string) =>
    `Based on strengths and weaknesses, recommend the single highest-impact improvement:

${context}

Provide a JSON response with:
{
  "title": "Top Improvement Opportunity",
  "summary": "Why this recommendation matters and expected impact",
  "findings": ["supporting evidence 1", "supporting evidence 2", "impact estimate"],
  "recommendations": [
    {
      "action": "Step-by-step action plan",
      "priority": "high",
      "effort": "quick_win|medium|strategic"
    }
  ],
  "dataSourceRefs": ["Data source 1", "Audit finding"]
}`,
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check Enterprise plan
  const subscription = await getUserSubscription(session.user.id);
  if (!canAccessFeature(subscription.plan, 'concierge')) {
    return NextResponse.json(
      { error: 'Insights require Enterprise plan' },
      { status: 403 }
    );
  }

  if (!supabaseAdmin || !OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Service not configured' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as InsightRequest;
    const { business_id, type } = body;

    if (!business_id || !type) {
      return NextResponse.json(
        { error: 'business_id and type are required' },
        { status: 400 }
      );
    }

    if (!insightPrompts[type]) {
      return NextResponse.json(
        { error: `Invalid insight type: ${type}` },
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

    // Build context
    const context = await buildAgentContext(business_id);
    const contextStr = JSON.stringify(context, null, 2);
    const prompt = insightPrompts[type](contextStr);

    // Call LLM
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AGENT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a GEO/AEO expert generating JSON insights. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `LLM error: ${error.slice(0, 100)}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';

    // Parse JSON response
    let insightData;
    try {
      insightData = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse LLM response as JSON' },
        { status: 502 }
      );
    }

    // Build insight object
    const insight: Insight = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: insightData.title || `${type.replace('_', ' ')} Insight`,
      summary: insightData.summary || '',
      findings: insightData.findings || [],
      recommendations: insightData.recommendations || [],
      dataSourceRefs: insightData.dataSourceRefs || [],
      generatedAt: new Date().toISOString(),
    };

    // Optionally persist to database (insights table if it exists)
    // For now, return the insight directly
    return NextResponse.json(insight);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
