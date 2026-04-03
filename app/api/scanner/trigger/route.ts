import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { runScanner } from '@/lib/scanner';
import { getUserSubscription } from '@/lib/stripe';

/**
 * POST /api/scanner/trigger
 *
 * Auth-gated manual scan trigger — scans all products belonging to the
 * authenticated user across all 4 AI platforms.
 * Scan limit is capped at the user's plan max_products (or 50 for free).
 */
export async function POST() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sub = await getUserSubscription(session.user.id);
    const scanLimit = Math.max(sub.max_businesses, 1);

    const result = await runScanner(session.user.id, scanLimit);
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
