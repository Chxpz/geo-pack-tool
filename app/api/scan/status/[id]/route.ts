import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestLogger = createRequestLogger(request, { route: '/api/scan/status/[id]' });

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: scanId } = await params;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }

    const { data: scanRun, error } = await supabaseAdmin
      .from('scan_runs')
      .select(
        `
        id,
        business_id,
        user_id,
        status,
        requested_query_ids,
        requested_query_count,
        scanned_queries,
        mentions_found,
        errors_count,
        error_message,
        started_at,
        completed_at,
        created_at,
        updated_at,
        businesses(business_name)
        `
      )
      .eq('id', scanId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to load scan status' },
        { status: 500 }
      );
    }

    if (!scanRun) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: scanRun.id,
      business_id: scanRun.business_id,
      business_name: Array.isArray(scanRun.businesses)
        ? scanRun.businesses[0]?.business_name ?? null
        : (scanRun.businesses as { business_name?: string } | null)?.business_name ?? null,
      status: scanRun.status,
      requested_query_count: scanRun.requested_query_count,
      scanned_queries: scanRun.scanned_queries,
      mentions_found: scanRun.mentions_found,
      errors_count: scanRun.errors_count,
      error_message: scanRun.error_message,
      started_at: scanRun.started_at,
      completed_at: scanRun.completed_at,
      created_at: scanRun.created_at,
      updated_at: scanRun.updated_at,
    });
  } catch (error) {
    requestLogger.error({ err: error }, 'Scan status request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
