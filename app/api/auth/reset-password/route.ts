import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAndConsumeToken } from '@/lib/tokens';

const schema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { token, password } = validation.data;

    const result = await verifyAndConsumeToken(token, 'password_reset');
    if (!result) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 },
      );
    }

    const passwordHash = await hash(password, 12);

    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', result.userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
