import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription, isWithinBusinessLimit } from '@/lib/stripe';
import { businessCreateSchema } from '@/lib/schemas/business';

export async function GET(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/businesses' });

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

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', session.user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      requestLogger.error({ error, userId: session.user.id }, 'Failed to fetch businesses');
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    requestLogger.error({ err: error }, 'List-businesses request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/businesses' });

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

    const validationResult = businessCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Get user's subscription to check business limit
    const subscription = await getUserSubscription(session.user.id);

    // Count current businesses
    const { data: existingBusinesses, error: countError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', session.user.id)
      .is('deleted_at', null);

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to check business limit' },
        { status: 500 }
      );
    }

    const currentBusinessCount = existingBusinesses?.length ?? 0;

    if (!isWithinBusinessLimit(subscription, currentBusinessCount)) {
      return NextResponse.json(
        {
          error: 'Business limit exceeded for your plan',
          currentPlan: subscription.plan,
          maxBusinesses: subscription.max_businesses,
          currentCount: currentBusinessCount,
        },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        user_id: session.user.id,
        ...validationResult.data,
      })
      .select()
      .single();

    if (error) {
      requestLogger.error({ error, userId: session.user.id }, 'Failed to create business');
      return NextResponse.json(
        { error: 'Failed to create business' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    requestLogger.error({ err: error }, 'Create-business request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
