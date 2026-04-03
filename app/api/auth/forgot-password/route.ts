import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAndStoreToken } from '@/lib/tokens';
import { sendPasswordResetEmail } from '@/lib/email';

const schema = z.object({
  email: z.string().email('Invalid email address'),
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

    const { email } = validation.data;

    // Look up user — always return success to avoid user enumeration
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .maybeSingle();

    if (user) {
      const token = await generateAndStoreToken(user.id as string, 'password_reset');
      if (token) {
        await sendPasswordResetEmail(
          user.email as string,
          (user.full_name as string | null)?.split(' ')[0] ?? 'there',
          token,
        );
      }
    }

    // Always return 200 to prevent email enumeration
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
