import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription } from '@/lib/stripe';
import { competitorCreateSchema } from '@/lib/schemas/business';

async function verifyBusinessOwnership(
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

export async function GET(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/competitors' });

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

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id query parameter is required' },
        { status: 400 }
      );
    }

    const isOwner = await verifyBusinessOwnership(
      supabase,
      businessId,
      session.user.id
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('competitors')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      requestLogger.error(
        { error, userId: session.user.id, businessId },
        'Failed to fetch competitors',
      );
      return NextResponse.json(
        { error: 'Failed to fetch competitors' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    requestLogger.error({ err: error }, 'List-competitors request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/competitors' });

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

    const body = await request.json();

    const validationResult = competitorCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const isOwner = await verifyBusinessOwnership(
      supabase,
      validationResult.data.business_id,
      session.user.id
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // Get user's subscription to check competitor limit
    const subscription = await getUserSubscription(session.user.id);

    // Count current competitors for this business
    const { data: existingCompetitors, error: countError } = await supabase
      .from('competitors')
      .select('id')
      .eq('business_id', validationResult.data.business_id);

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to check competitor limit' },
        { status: 500 }
      );
    }

    const currentCompetitorCount = existingCompetitors?.length ?? 0;

    if (currentCompetitorCount >= subscription.max_competitors) {
      return NextResponse.json(
        {
          error: 'Competitor limit exceeded for your plan',
          currentPlan: subscription.plan,
          maxCompetitors: subscription.max_competitors,
          currentCount: currentCompetitorCount,
        },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('competitors')
      .insert({
        ...validationResult.data,
        user_id: session.user.id,
      })
      .select()
      .single();

    if (error) {
      requestLogger.error(
        {
          error,
          userId: session.user.id,
          businessId: validationResult.data.business_id,
        },
        'Failed to create competitor',
      );
      return NextResponse.json(
        { error: 'Failed to create competitor' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    requestLogger.error({ err: error }, 'Create-competitor request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/competitors' });

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

    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get('competitor_id');

    if (!competitorId) {
      return NextResponse.json(
        { error: 'competitor_id query parameter is required' },
        { status: 400 }
      );
    }

    const { data: competitor, error: fetchError } = await supabase
      .from('competitors')
      .select('business_id')
      .eq('id', competitorId)
      .single();

    if (fetchError || !competitor) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const isOwner = await verifyBusinessOwnership(
      supabase,
      competitor.business_id,
      session.user.id
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from('competitors')
      .delete()
      .eq('id', competitorId);

    if (deleteError) {
      requestLogger.error(
        { error: deleteError, userId: session.user.id, competitorId },
        'Failed to delete competitor',
      );
      return NextResponse.json(
        { error: 'Failed to delete competitor' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Competitor deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    requestLogger.error({ err: error }, 'Delete-competitor request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
