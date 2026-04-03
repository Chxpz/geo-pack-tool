import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: stores, error } = await supabaseAdmin
    .from('stores')
    .select(
      'id, platform, store_url, store_name, store_domain, product_count, last_sync_at, sync_status, connected_at',
    )
    .eq('user_id', session.user.id)
    .is('disconnected_at', null)
    .order('connected_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }

  return NextResponse.json({ stores: stores ?? [] });
}
