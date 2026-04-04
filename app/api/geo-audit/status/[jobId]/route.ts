import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuditStatus, getAuditResult, mapAuditResultToGeoAudit } from '@/lib/audit-client';

/** Maps Stack3 Audit statuses to AgenticRevops statuses (collapsing delivering → generating). */
const STATUS_MAP: Record<string, string> = {
  queued: 'queued',
  crawling: 'crawling',
  analyzing: 'analyzing',
  generating: 'generating',
  delivering: 'generating',
  complete: 'complete',
  failed: 'failed',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const requestLogger = createRequestLogger(request, { route: '/api/geo-audit/status' });

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseAdmin;
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const { jobId } = await params;

    // 1. Load geo_audit row (must belong to user)
    const { data: geoAudit } = await supabase
      .from('geo_audits')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', session.user.id)
      .single();

    if (!geoAudit) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 2. Already terminal — return immediately
    if (geoAudit.status === 'complete' || geoAudit.status === 'failed') {
      return NextResponse.json({ status: geoAudit.status, geo_audit: geoAudit });
    }

    // 3. Poll Stack3 Audit
    const remote = await getAuditStatus(geoAudit.stack3_audit_id);
    const mapped = STATUS_MAP[remote.status] ?? 'queued';

    if (remote.status === 'complete') {
      // Fetch full result and persist
      const full = await getAuditResult(geoAudit.stack3_audit_id);
      const fields = mapAuditResultToGeoAudit(full);
      await supabase.from('geo_audits').update(fields).eq('id', jobId);
      return NextResponse.json({ status: 'complete', geo_audit: { ...geoAudit, ...fields } });
    }

    if (remote.status === 'failed') {
      await supabase
        .from('geo_audits')
        .update({ status: 'failed', error_message: remote.error ?? 'Unknown error' })
        .eq('id', jobId);
      return NextResponse.json({ status: 'failed', error: remote.error });
    }

    // Still running — update status
    await supabase.from('geo_audits').update({ status: mapped }).eq('id', jobId);
    return NextResponse.json({ status: mapped });
  } catch (error) {
    requestLogger.error({ err: error }, 'Geo-audit status poll failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
