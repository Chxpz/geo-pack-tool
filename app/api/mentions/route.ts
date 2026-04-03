import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }

    const searchParams = request.nextUrl.searchParams;
    const business_id = searchParams.get('business_id');
    const platform_id = searchParams.get('platform_id');
    const query_id = searchParams.get('query_id');
    const mentioned = searchParams.get('mentioned');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id query parameter is required' },
        { status: 400 }
      );
    }

    // Verify user owns the business
    const { data: business, error: businessErr } = await supabaseAdmin
      .from('businesses')
      .select('id, user_id')
      .eq('id', business_id)
      .single();

    if (businessErr || !business || business.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this business' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('ai_mentions')
      .select(
        `
        id,
        business_id,
        query_id,
        platform_id,
        mentioned,
        competitors_mentioned,
        source,
        domain_cited,
        query,
        position,
        sentiment,
        scanned_at,
        ai_platforms(id, name, slug)
        `,
        { count: 'exact' }
      )
      .eq('business_id', business_id)
      .order('scanned_at', { ascending: false });

    if (platform_id) {
      query = query.eq('platform_id', parseInt(platform_id, 10));
    }

    if (query_id) {
      query = query.eq('query_id', query_id);
    }

    if (mentioned !== null) {
      const mentioned_bool = mentioned === 'true';
      if (mentioned_bool) {
        // Only return mentions with competitors_mentioned not empty/null
        query = query.not('competitors_mentioned', 'is', null);
      }
    }

    if (date_from) {
      query = query.gte('scanned_at', date_from);
    }

    if (date_to) {
      query = query.lte('scanned_at', date_to);
    }

    const { data: mentions, error: mentionsErr, count } = await query.range(offset, offset + limit - 1);

    if (mentionsErr) {
      console.error('[mentions] Query error:', mentionsErr);
      return NextResponse.json(
        { error: 'Failed to fetch mentions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: mentions ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[mentions] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
