import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await params;

  // Scoped to the session user — prevents disconnecting another user's store
  const { error } = await supabaseAdmin
    .from('stores')
    .update({
      disconnected_at: new Date().toISOString(),
      access_token: '',
      sync_status: 'pending',
    })
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect store' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
