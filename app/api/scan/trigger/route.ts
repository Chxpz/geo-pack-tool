import { after, NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription } from '@/lib/stripe';
import { runBusinessScanner } from '@/lib/scanner';
import {
  createScanRun,
  markScanRunCompleted,
  markScanRunFailed,
  updateScanRunProgress,
} from '@/lib/scan-runs';

export const runtime = 'nodejs';

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
    const rawQueryIds = body.query_ids ?? body.queryIds;
    const query_ids = Array.isArray(rawQueryIds)
      ? rawQueryIds.filter((value): value is string => typeof value === 'string')
      : [];

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

    const subscription = await getUserSubscription(session.user.id);
    const planScanFrequency = subscription.scan_frequency;

    if (!planScanFrequency) {
      return NextResponse.json(
        { error: 'Unable to determine scan frequency for your plan' },
        { status: 500 }
      );
    }

    let querySelection = supabaseAdmin
      .from('tracked_queries')
      .select('id')
      .eq('business_id', business_id)
      .eq('is_active', true);

    if (query_ids.length > 0) {
      querySelection = querySelection.in('id', query_ids);
    }

    const { data: requestedQueries, error: requestedQueriesError } = await querySelection;

    if (requestedQueriesError) {
      return NextResponse.json(
        { error: 'Failed to load scan queries' },
        { status: 500 },
      );
    }

    const requestedQueryIds = (requestedQueries ?? [])
      .map((query) => query.id)
      .filter((value): value is string => typeof value === 'string');

    const scanRun = await createScanRun({
      businessId: business_id,
      userId: session.user.id,
      queryIds: requestedQueryIds,
    });

    after(async () => {
      try {
        const result = await runBusinessScanner(
          business_id,
          requestedQueryIds,
          {
            onProgress: async (progress) => {
              await updateScanRunProgress(scanRun.id, progress);
            },
          },
        );

        await markScanRunCompleted(scanRun.id, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Scan failed';
        await markScanRunFailed(scanRun.id, message);
      }
    });

    return NextResponse.json(
      {
        success: true,
        scan: {
          id: scanRun.id,
          status: 'processing',
          requested_query_count: requestedQueryIds.length,
          poll_url: `/api/scan/status/${scanRun.id}`,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    console.error('[scan/trigger] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
