/**
 * GET /api/agent/deep-research/[id]
 * Poll research status by ID
 * Returns status and result when completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

interface DeepResearchStatusResponse {
  research_id: string;
  status: 'submitted' | 'processing' | 'completed' | 'failed';
  topic?: string;
  result?: Record<string, unknown>;
  error?: string;
  updatedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Service not configured' },
      { status: 503 }
    );
  }

  try {
    const { id: researchId } = await params;

    // Fetch research result
    const { data: research } = await supabaseAdmin
      .from('deep_research_results')
      .select('id, business_id, topic, status, response, error, updated_at')
      .eq('id', researchId)
      .eq('user_id', session.user.id)
      .single();

    if (!research) {
      return NextResponse.json(
        { error: 'Research not found' },
        { status: 404 }
      );
    }

    const response: DeepResearchStatusResponse = {
      research_id: research.id,
      status: research.status,
      topic: research.topic,
      updatedAt: research.updated_at,
    };

    if (research.status === 'completed') {
      response.result = research.response as Record<string, unknown>;
    }

    if (research.status === 'failed') {
      response.error = research.error;
    }

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
