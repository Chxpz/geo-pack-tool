import { NextResponse } from 'next/server';
import { sendWeeklyDigests } from '@/lib/email';
/**
 * Weekly digest cron job (Mondays 09:00 UTC)
 * Sends visibility reports with AI mentions, SEO trends, competitor updates
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendWeeklyDigests();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Weekly digest cron error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
