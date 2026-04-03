import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription } from '@/lib/stripe';
import { runBusinessScanner } from '@/lib/scanner';

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
    const business_id = body.business_id ?? body.businessId;
    const query_ids = body.query_ids ?? body.queryIds;

    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
    }

    // Verify business belongs to user
    const { data: business, error: businessErr } = await supabaseAdmin
      .from('businesses')
      .select('id, user_id')
      .eq('id', business_id)
      .single();

    if (businessErr || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Verify user ownership
    if (business.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this business' },
        { status: 403 }
      );
    }

    // Check scan frequency limit per plan
    const subscription = await getUserSubscription(session.user.id);

    // For now, we allow scans for all plans. In production, you might:
    // 1. Enforce minimum time between scans based on scanFrequency
    // 2. Limit daily/weekly scan counts
    // This is a placeholder for future scan rate limiting
    const planScanFrequency = subscription.scan_frequency;

    if (!planScanFrequency) {
      return NextResponse.json(
        { error: 'Unable to determine scan frequency for your plan' },
        { status: 500 }
      );
    }

    // Run scan synchronously for MVP
    const result = await runBusinessScanner(business_id, Array.isArray(query_ids) ? query_ids : undefined);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[scan/trigger] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
