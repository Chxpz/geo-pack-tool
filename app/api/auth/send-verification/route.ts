import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { createRequestLogger, getClientIp } from '@/lib/request-context';
import { authRateLimiter, buildRateLimitKey, createRateLimitHeaders } from '@/lib/rate-limit';
import { sendVerificationEmail } from '@/lib/email';
import { generateAndStoreToken } from '@/lib/tokens';

export async function POST(request: Request) {
  const requestLogger = createRequestLogger(request, { route: '/api/auth/send-verification' });

  try {
    authRateLimiter.cleanup();
    const rateLimit = authRateLimiter.check(
      buildRateLimitKey('auth:send-verification', getClientIp(request) ?? 'unknown'),
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

    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, email_verified')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.email_verified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
    }

    const token = await generateAndStoreToken(user.id as string, 'email_verification');
    if (!token) {
      requestLogger.error({ userId: user.id }, 'Failed to generate verification token');
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }

    const sent = await sendVerificationEmail(
      user.email as string,
      (user.full_name as string | null)?.split(' ')[0] ?? 'there',
      token,
    );

    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    requestLogger.error({ err: error }, 'Send-verification request failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
