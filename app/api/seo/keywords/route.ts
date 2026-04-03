/**
 * GET /api/seo/keywords
 * Get keyword data for a business from latest SEO snapshot
 * Query params: business_id (required), sort_by, ai_overview_only, limit, offset
 * Returns paginated keyword list with metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';

type SortBy = 'position' | 'volume' | 'traffic_pct' | 'kd';

export async function GET(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/seo/keywords' });

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const supabase = supabaseAdmin;
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 },
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('business_id');
    const sortBy = (searchParams.get('sort_by') || 'position') as SortBy;
    const aiOverviewOnly = searchParams.get('ai_overview_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id query parameter is required' },
        { status: 400 },
      );
    }

    // Verify business belongs to user
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', session.user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or unauthorized' },
        { status: 404 },
      );
    }

    // Get the latest SEO snapshot
    const { data: latestSnapshot, error: snapshotError } = await supabase
      .from('seo_snapshots')
      .select('id, top_keywords, snapshot_date')
      .eq('business_id', businessId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshotError) {
      requestLogger.error(
        { error: snapshotError, userId: session.user.id, businessId },
        'Failed to fetch latest SEO snapshot',
      );
      return NextResponse.json(
        { error: 'Failed to fetch snapshot' },
        { status: 500 },
      );
    }

    if (!latestSnapshot || !latestSnapshot.top_keywords) {
      return NextResponse.json(
        {
          data: [],
          pagination: {
            limit,
            offset,
            total: 0,
            hasMore: false,
          },
          snapshot: null,
        },
        { status: 200 },
      );
    }

    // Extract keywords from JSONB field
    let keywords = (latestSnapshot.top_keywords as Array<unknown>) || [];

    // Filter for AI overview keywords if requested
    if (aiOverviewOnly) {
      keywords = keywords.filter((kw) => {
        const kwObj = kw as Record<string, unknown>;
        return kwObj.ai_overview_present === true;
      });
    }

    // Sort keywords
    const sortedKeywords = [...keywords].sort((a, b) => {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;

      switch (sortBy) {
        case 'position':
          return (aObj.position as number) - (bObj.position as number);
        case 'volume':
          return (bObj.search_volume as number) - (aObj.search_volume as number);
        case 'traffic_pct': {
          const aTraffic = aObj.traffic_value as number;
          const bTraffic = bObj.traffic_value as number;
          return bTraffic - aTraffic;
        }
        case 'kd':
          return (bObj.keyword_difficulty as number) - (aObj.keyword_difficulty as number);
        default:
          return 0;
      }
    });

    // Apply pagination
    const total = sortedKeywords.length;
    const paginatedKeywords = sortedKeywords.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedKeywords,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
      snapshot: {
        id: latestSnapshot.id,
        snapshot_date: latestSnapshot.snapshot_date,
        total_keywords: (latestSnapshot.top_keywords as Array<unknown>).length,
        ai_overview_keywords: keywords.length,
      },
      sort_by: sortBy,
      ai_overview_only: aiOverviewOnly,
    });
  } catch (error) {
    requestLogger.error({ err: error }, 'SEO keywords request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
