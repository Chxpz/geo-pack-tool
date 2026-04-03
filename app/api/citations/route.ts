/**
 * GET /api/citations
 * Query citations with filtering: business_id, domain_filter, date range, pagination
 * Returns paginated results with summary statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
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
    const domainFilter = searchParams.get('domain_filter');
    const platformId = searchParams.get('platform_id');
    const source = searchParams.get('source');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // business_id is required
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

    // Build citations query
    let citationsQuery = supabase
      .from('citations')
      .select(
        `
        id,
        ai_mention_id,
        cited_url,
        cited_domain,
        cited_title,
        cited_snippet,
        cited_publish_date,
        platform_id,
        position,
        domain_category,
        is_own_domain,
        is_competitor_domain,
        competitor_id,
        source,
        scan_date,
        created_at
      `,
        { count: 'exact' }
      )
      .eq('business_id', businessId);

    // Apply domain_filter
    if (domainFilter === 'own') {
      citationsQuery = citationsQuery.eq('is_own_domain', true);
    } else if (domainFilter === 'competitor') {
      citationsQuery = citationsQuery.eq('is_competitor_domain', true);
    } else if (domainFilter === 'third_party') {
      citationsQuery = citationsQuery
        .eq('is_own_domain', false)
        .eq('is_competitor_domain', false);
    }
    // 'all' means no filter

    // Apply platform filter
    if (platformId) {
      const platformIdInt = parseInt(platformId, 10);
      citationsQuery = citationsQuery.eq('platform_id', platformIdInt);
    }

    // Apply source filter
    if (source) {
      citationsQuery = citationsQuery.eq('source', source);
    }

    // Apply date range
    if (dateFrom) {
      citationsQuery = citationsQuery.gte('scan_date', dateFrom);
    }
    if (dateTo) {
      citationsQuery = citationsQuery.lte('scan_date', dateTo);
    }

    // Apply pagination and ordering
    citationsQuery = citationsQuery
      .order('scan_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: citations, error: citationError, count } = await citationsQuery;

    if (citationError) {
      console.error('Error fetching citations:', citationError);
      return NextResponse.json(
        { error: 'Failed to fetch citations' },
        { status: 500 },
      );
    }

    // Calculate summary statistics
    const summaryQuery = supabase
      .from('citations')
      .select('is_own_domain, is_competitor_domain')
      .eq('business_id', businessId);

    if (dateFrom) {
      summaryQuery.gte('scan_date', dateFrom);
    }
    if (dateTo) {
      summaryQuery.lte('scan_date', dateTo);
    }

    const { data: allCitations } = await summaryQuery;
    const citationSummaryRows = (allCitations ?? []) as Array<{
      is_own_domain: boolean | null;
      is_competitor_domain: boolean | null;
    }>;

    const summary = {
      total_citations: count || 0,
      own_domain: citationSummaryRows.filter((c) => c.is_own_domain).length,
      competitor_domains: citationSummaryRows.filter((c) => c.is_competitor_domain).length,
      third_party: citationSummaryRows.filter(
        (c) => !c.is_own_domain && !c.is_competitor_domain,
      ).length,
    };

    return NextResponse.json({
      data: citations || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
      summary,
    });
  } catch (error) {
    console.error('GET /api/citations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
