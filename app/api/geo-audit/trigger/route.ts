import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription, PLAN_CONFIG } from '@/lib/stripe';
import { triggerAudit } from '@/lib/audit-client';

export async function POST(request: Request) {
  const requestLogger = createRequestLogger(request, { route: '/api/geo-audit/trigger' });

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseAdmin;
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { business_id } = await request.json();
    if (!business_id) {
      return NextResponse.json({ error: 'business_id required' }, { status: 400 });
    }

    // 1. Verify business belongs to user
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, business_name, website_url')
      .eq('id', business_id)
      .eq('user_id', session.user.id)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (!business.website_url) {
      return NextResponse.json({ error: 'Business has no website URL' }, { status: 422 });
    }

    // 2. Enforce monthly audit limit
    const subscription = await getUserSubscription(session.user.id);
    const plan = PLAN_CONFIG[subscription.plan ?? 'free'];
    const maxAudits = plan.maxGeoAuditsPerMonth;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('geo_audits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .gte('created_at', monthStart.toISOString());

    if ((count ?? 0) >= maxAudits) {
      return NextResponse.json(
        { error: 'Monthly geo audit limit reached', limit: maxAudits, used: count },
        { status: 429 },
      );
    }

    // 3. Derive domain and start URL
    const parsedUrl = new URL(business.website_url);
    const domain = parsedUrl.hostname;
    const startPages = [business.website_url];

    // 4. Trigger Stack3 Audit
    const { id: stack3AuditId } = await triggerAudit({
      clientName: business.business_name,
      domain,
      pages: startPages,
      config: {
        maxPages: 20,
        reportPreparedBy: 'Stack3 Labs',
      },
    });

    // 5. Insert geo_audit row in queued state
    const { data: geoAudit, error: insertError } = await supabase
      .from('geo_audits')
      .insert({
        business_id,
        user_id: session.user.id,
        audit_type: 'on_demand',
        stack3_audit_id: stack3AuditId,
        status: 'queued',
      })
      .select('id')
      .single();

    if (insertError || !geoAudit) {
      requestLogger.error(
        { error: insertError, userId: session.user.id, businessId: business_id },
        'Failed to create audit record',
      );
      return NextResponse.json({ error: 'Failed to create audit record' }, { status: 500 });
    }

    return NextResponse.json(
      { geo_audit_id: geoAudit.id, stack3_audit_id: stack3AuditId },
      { status: 202 },
    );
  } catch (error) {
    requestLogger.error({ err: error }, 'Geo-audit trigger failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
