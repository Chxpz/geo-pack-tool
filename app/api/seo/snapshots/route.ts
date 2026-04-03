/**
 * GET /api/seo/snapshots
 * List seo_snapshots for a business with optional date filters
 * Paginated results
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/seo/snapshots' });

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
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
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

    // Build snapshots query
    let snapshotsQuery = supabase
      .from('seo_snapshots')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId);

    // Apply date range
    if (dateFrom) {
      snapshotsQuery = snapshotsQuery.gte('snapshot_date', dateFrom);
    }
    if (dateTo) {
      snapshotsQuery = snapshotsQuery.lte('snapshot_date', dateTo);
    }

    // Apply pagination and ordering
    snapshotsQuery = snapshotsQuery
      .order('snapshot_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: snapshots, error: snapshotError, count } = await snapshotsQuery;

    if (snapshotError) {
      requestLogger.error(
        { error: snapshotError, userId: session.user.id, businessId },
        'Failed to fetch SEO snapshots',
      );
      return NextResponse.json(
        { error: 'Failed to fetch snapshots' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: snapshots || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    requestLogger.error({ err: error }, 'SEO snapshots request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
