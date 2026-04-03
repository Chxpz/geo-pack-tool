import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { fetchDashboardStats } from '@/lib/stats';

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await fetchDashboardStats(session.user.id);
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
