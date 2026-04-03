import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';
import { businessUpdateSchema } from '@/lib/schemas/business';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

async function verifyOwnership(
  supabase: NonNullable<typeof supabaseAdmin>,
  businessId: string,
  userId: string
): Promise<boolean> {
  if (!supabase) return false;

  const { data } = await supabase
    .from('businesses')
    .select('user_id')
    .eq('id', businessId)
    .is('deleted_at', null)
    .single();

  return data?.user_id === userId;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestLogger = createRequestLogger(request, { route: '/api/businesses/[id]' });

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = supabaseAdmin;
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { id } = await params;

    const isOwner = await verifyOwnership(supabase, id, session.user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { count: mentionCount } = await supabase
      .from('ai_mentions')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', id);

    const { count: citationCount } = await supabase
      .from('citations')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', id);

    const { data: latestSnapshot } = await supabase
      .from('seo_snapshots')
      .select('authority_score')
      .eq('business_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { count: competitorCount } = await supabase
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', id);

    const { count: activeQueryCount } = await supabase
      .from('tracked_queries')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', id)
      .eq('is_active', true);

    const { data: lastScanData } = await supabase
      .from('seo_snapshots')
      .select('created_at')
      .eq('business_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const response = {
      ...business,
      metrics: {
        mentions: mentionCount || 0,
        citations: citationCount || 0,
        authorityScore: latestSnapshot?.authority_score || null,
        competitorCount: competitorCount || 0,
        activeQueryCount: activeQueryCount || 0,
        lastScanDate: lastScanData?.created_at || null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    requestLogger.error({ err: error }, 'Get-business request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestLogger = createRequestLogger(request, { route: '/api/businesses/[id]' });

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = supabaseAdmin;
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { id } = await params;

    const isOwner = await verifyOwnership(supabase, id, session.user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const body = await request.json() as unknown;
    const validationResult = businessUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('businesses')
      .update(validationResult.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      requestLogger.error({ error, userId: session.user.id, businessId: id }, 'Failed to update business');
      return NextResponse.json(
        { error: 'Failed to update business' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    requestLogger.error({ err: error }, 'Update-business request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestLogger = createRequestLogger(request, { route: '/api/businesses/[id]' });

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = supabaseAdmin;
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { id } = await params;

    const isOwner = await verifyOwnership(supabase, id, session.user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { error: softDeleteError } = await supabase
      .from('businesses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (softDeleteError) {
      requestLogger.error(
        { error: softDeleteError, userId: session.user.id, businessId: id },
        'Failed to soft-delete business',
      );
      return NextResponse.json(
        { error: 'Failed to delete business' },
        { status: 500 }
      );
    }

    const { error: deactivateError } = await supabase
      .from('tracked_queries')
      .update({ is_active: false })
      .eq('business_id', id);

    if (deactivateError) {
      requestLogger.error(
        { error: deactivateError, userId: session.user.id, businessId: id },
        'Failed to deactivate business queries after delete',
      );
    }

    return NextResponse.json(
      { message: 'Business deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    requestLogger.error({ err: error }, 'Delete-business request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
