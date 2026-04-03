/**
 * tokens.ts — Secure token generation and verification for
 * email verification and password reset flows.
 *
 * Tokens are stored in the `auth_tokens` table with an expiry.
 * Each token can only be consumed once (used_at is set on first use).
 */

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export type TokenType = 'email_verification' | 'password_reset';

const TTL: Record<TokenType, number> = {
  email_verification: 24 * 60 * 60 * 1000, // 24 hours
  password_reset: 60 * 60 * 1000,           // 1 hour
};

/**
 * Generates a cryptographically secure token, invalidates any existing tokens
 * of the same type for the user, and stores the new one.
 * Returns the plaintext token (to be included in the email link), or null on error.
 */
export async function generateAndStoreToken(
  userId: string,
  type: TokenType,
): Promise<string | null> {
  if (!supabaseAdmin) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TTL[type]);

  // Invalidate any outstanding tokens of the same type
  await supabaseAdmin
    .from('auth_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('type', type)
    .is('used_at', null);

  const { error } = await supabaseAdmin.from('auth_tokens').insert({
    user_id: userId,
    token,
    type,
    expires_at: expiresAt.toISOString(),
  });

  if (error) return null;
  return token;
}

/**
 * Verifies a token, checks it hasn't expired or been used, marks it consumed.
 * Returns the associated userId on success, or null on any failure.
 */
export async function verifyAndConsumeToken(
  token: string,
  type: TokenType,
): Promise<{ userId: string } | null> {
  if (!supabaseAdmin) return null;

  const { data } = await supabaseAdmin
    .from('auth_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token', token)
    .eq('type', type)
    .maybeSingle();

  if (!data) return null;
  if (data.used_at) return null;
  if (new Date(data.expires_at as string) < new Date()) return null;

  await supabaseAdmin
    .from('auth_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id as string);

  return { userId: data.user_id as string };
}
