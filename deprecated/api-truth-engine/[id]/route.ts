import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * PATCH /api/truth-engine/[id]
 * Marks a Truth Engine error as resolved.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!supabaseAdmin) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('truth_engine_errors')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: session.user.id,
    })
    .eq('id', id)
    .eq('user_id', session.user.id) // ownership check — can only resolve own errors
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Error not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
