import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAndConsumeToken } from '@/lib/tokens';

export async function GET(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const result = await verifyAndConsumeToken(token, 'email_verification');
    if (!result) {
      return NextResponse.json(
        { error: 'Invalid or expired verification link. Please request a new one.' },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', result.userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
