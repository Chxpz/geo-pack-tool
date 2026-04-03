import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription } from '@/lib/stripe';
import { z } from 'zod';

const queryCreateSchema = z.object({
  business_id: z.string().uuid(),
  query_text: z.string().min(1).max(500),
  query_type: z.enum(['user_custom', 'system_generated']).optional().default('user_custom'),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate request
    let validatedData;
    try {
      validatedData = queryCreateSchema.parse(body);
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid request body', details: err instanceof z.ZodError ? err.errors : null },
        { status: 400 }
      );
    }

    // Verify user owns the business
    const { data: business, error: businessErr } = await supabaseAdmin
      .from('businesses')
      .select('id, user_id')
      .eq('id', validatedData.business_id)
      .single();

    if (businessErr || !business || business.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this business' },
        { status: 403 }
      );
    }

    // Check query limit per plan
    const subscription = await getUserSubscription(session.user.id);

    // Count current queries for this business in the current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: monthlyQueries, error: countError } = await supabaseAdmin
      .from('tracked_queries')
      .select('id')
      .eq('business_id', validatedData.business_id)
      .gte('created_at', monthStart);

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to check query limit' },
        { status: 500 }
      );
    }

    const currentQueryCount = monthlyQueries?.length ?? 0;

    if (currentQueryCount >= subscription.max_queries) {
      return NextResponse.json(
        {
          error: 'Monthly query limit exceeded for your plan',
          currentPlan: subscription.plan,
          maxQueries: subscription.max_queries,
          currentCount: currentQueryCount,
        },
        { status: 403 }
      );
    }

    // Insert query
    const { data: newQuery, error: insertErr } = await supabaseAdmin
      .from('tracked_queries')
      .insert({
        business_id: validatedData.business_id,
        user_id: session.user.id,
        query_text: validatedData.query_text,
        query_type: validatedData.query_type,
        is_active: true,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[queries] Insert error:', insertErr);
      return NextResponse.json(
        { error: 'Failed to create query' },
        { status: 500 }
      );
    }

    return NextResponse.json(newQuery, { status: 201 });
  } catch (error) {
    console.error('[queries POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const is_active = searchParams.get('is_active');

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
      .from('tracked_queries')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (is_active !== null) {
      const activeFilter = is_active === 'true';
      query = query.eq('is_active', activeFilter);
    }

    const { data: queries, error: queriesErr } = await query;

    if (queriesErr) {
      console.error('[queries GET] Query error:', queriesErr);
      return NextResponse.json(
        { error: 'Failed to fetch queries' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: queries ?? [] });
  } catch (error) {
    console.error('[queries GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { query_id, is_active } = body;

    if (!query_id || is_active === undefined) {
      return NextResponse.json(
        { error: 'query_id and is_active are required' },
        { status: 400 }
      );
    }

    // Verify user owns the query's business
    const { data: query, error: queryErr } = await supabaseAdmin
      .from('tracked_queries')
      .select('id, business_id, businesses(user_id)')
      .eq('id', query_id)
      .single();

    if (queryErr || !query) {
      return NextResponse.json(
        { error: 'Query not found' },
        { status: 404 }
      );
    }

    const businessUserId = (query as any).businesses?.user_id;
    if (businessUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this query' },
        { status: 403 }
      );
    }

    // Update query
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('tracked_queries')
      .update({ is_active })
      .eq('id', query_id)
      .select()
      .single();

    if (updateErr) {
      console.error('[queries PATCH] Update error:', updateErr);
      return NextResponse.json(
        { error: 'Failed to update query' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[queries PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
