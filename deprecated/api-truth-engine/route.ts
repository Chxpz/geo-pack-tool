import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { runTruthEngine } from '@/lib/truth-engine';
import { sendNewCriticalAlerts } from '@/lib/email';

/**
 * GET /api/truth-engine
 * Returns paginated errors for the authenticated user.
 * Query params: severity (critical|warning|info), resolved (true|false), page (1-based)
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!supabaseAdmin) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const severity = searchParams.get('severity');
  const resolvedParam = searchParams.get('resolved');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = 20;
  const offset = (page - 1) * perPage;

  let query = supabaseAdmin
    .from('truth_engine_errors')
    .select(
      `id, error_type, severity, source, error_message, expected_value, actual_value,
       fix_suggestion, resolved, resolved_at, detected_at,
       products ( id, name, image_url )`,
      { count: 'exact' },
    )
    .eq('user_id', session.user.id)
    .order('detected_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (severity) query = query.eq('severity', severity);
  if (resolvedParam !== null) query = query.eq('resolved', resolvedParam === 'true');

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ errors: data ?? [], total: count ?? 0, page, perPage });
}

/**
 * POST /api/truth-engine
 * Manually triggers the Truth Engine for the authenticated user.
 */
export async function POST(_request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const since = new Date();
    const result = await runTruthEngine(session.user.id, 50);

    // Alert user of any newly detected critical issues
    const alertResult =
      result.newErrors > 0 ? await sendNewCriticalAlerts(since) : { sent: 0, skipped: 0, errors: 0 };

    return NextResponse.json({ ok: true, ...result, alerts: alertResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
