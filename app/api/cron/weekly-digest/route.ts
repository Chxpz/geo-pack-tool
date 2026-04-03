import { NextResponse } from 'next/server';
import { sendWeeklyDigests } from '@/lib/email';
import { createRequestLogger } from '@/lib/request-context';
/**
 * Weekly digest cron job (Mondays 09:00 UTC)
 * Sends visibility reports with AI mentions, SEO trends, competitor updates
 */
export async function GET(request: Request) {
  const requestLogger = createRequestLogger(request, { route: '/api/cron/weekly-digest' });
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendWeeklyDigests();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    requestLogger.error({ err, message }, 'Weekly digest cron failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
