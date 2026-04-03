import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createRequestLogger, getClientIp } from '@/lib/request-context';
import { authRateLimiter, buildRateLimitKey, createRateLimitHeaders } from '@/lib/rate-limit';
import { verifyAndConsumeToken } from '@/lib/tokens';

export async function GET(request: Request) {
  const requestLogger = createRequestLogger(request, { route: '/api/auth/verify-email' });

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    authRateLimiter.cleanup();
    const rateLimit = authRateLimiter.check(
      buildRateLimitKey('auth:verify-email', getClientIp(request) ?? 'unknown'),
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
      requestLogger.error(
        { error, userId: result.userId },
        'Failed to update verified email state',
      );
      return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    requestLogger.error({ err: error }, 'Verify-email request failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
