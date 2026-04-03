import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/email';
import { createRequestLogger, getClientIp } from '@/lib/request-context';
import { authRateLimiter, buildRateLimitKey, createRateLimitHeaders } from '@/lib/rate-limit';
import { generateAndStoreToken } from '@/lib/tokens';
import { supabaseAdmin } from '@/lib/supabase';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  const requestLogger = createRequestLogger(request, { route: '/api/auth/forgot-password' });

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    authRateLimiter.cleanup();
    const rateLimit = authRateLimiter.check(
      buildRateLimitKey('auth:forgot-password', getClientIp(request) ?? 'unknown'),
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimit),
        },
      );
    }

    const body = await request.json();
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { email } = validation.data;
    const normalizedEmail = email.toLowerCase();

    // Look up user — always return success to avoid user enumeration
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .eq('email', normalizedEmail)
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
  } catch (error) {
    requestLogger.error({ err: error }, 'Forgot-password request failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
