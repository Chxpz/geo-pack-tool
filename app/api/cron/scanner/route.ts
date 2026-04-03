import { NextResponse } from 'next/server';
import { runScanner } from '@/lib/scanner';

// Vercel cron: runs daily at 03:00 UTC (declared in vercel.json)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runScanner(undefined, 50);
    return NextResponse.json({
      ok: true,
      scanned: result.scanned,
      mentions: result.mentions,
      errors: result.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
