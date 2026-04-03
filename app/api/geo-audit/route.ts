import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/geo-audit' });

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
    }

    // Fetch GEO audits for business
    const { data: audits, error } = await supabase
      .from('geo_audits')
      .select('*')
      .eq('business_id', businessId)
      .order('audit_date', { ascending: false })
      .limit(limit);

    if (error) {
      requestLogger.error(
        { error, userId: session.user.id, businessId },
        'Failed to fetch geo audits',
      );
      return NextResponse.json(
        { error: 'Failed to fetch geo audits' },
        { status: 500 }
      );
    }

    return NextResponse.json(audits || []);
  } catch (error) {
    requestLogger.error({ err: error }, 'Geo-audit fetch request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/geo-audit' });

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
    const { audit_id, recommendation_index, status } = body;

    if (!audit_id || recommendation_index === undefined || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: audit_id, recommendation_index, status' },
        { status: 400 }
      );
    }

    // Fetch audit
    const { data: audit } = await supabase
      .from('geo_audits')
      .select('recommendations')
      .eq('id', audit_id)
      .single();

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      );
    }

    // Update recommendation status
    const recommendations = audit.recommendations || [];
    if (recommendations[recommendation_index]) {
      recommendations[recommendation_index].status = status;
    }

    // Update audit
    const { data: updated, error } = await supabase
      .from('geo_audits')
      .update({ recommendations })
      .eq('id', audit_id)
      .select()
      .single();

    if (error) {
      requestLogger.error(
        { error, userId: session.user.id, auditId: audit_id },
        'Failed to update geo audit',
      );
      return NextResponse.json(
        { error: 'Failed to update audit' },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    requestLogger.error({ err: error }, 'Geo-audit update request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
