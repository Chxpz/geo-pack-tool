import { NextResponse } from 'next/server';
import { runTruthEngine } from '@/lib/truth-engine';
import { sendNewCriticalAlerts } from '@/lib/email';

// Vercel cron: runs daily at 04:00 UTC (declared in vercel.json)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const since = new Date();
    const result = await runTruthEngine(undefined, 100);

    // Send critical error alerts for any new issues found this run
    const alertResult = result.newErrors > 0 ? await sendNewCriticalAlerts(since) : { sent: 0, skipped: 0, errors: 0 };

    return NextResponse.json({ ok: true, ...result, alerts: alertResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
