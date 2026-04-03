import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { auth } from '@/lib/auth-server';
import { buildInstallUrl, isValidShopDomain, normalizeShopDomain } from '@/lib/shopify';

export async function GET(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const shopInput = searchParams.get('shop');

  if (!shopInput) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  const shop = normalizeShopDomain(shopInput);

  if (!isValidShopDomain(shop)) {
    return NextResponse.json(
      { error: 'Invalid shop domain. Use the format: mystore.myshopify.com' },
      { status: 400 },
    );
  }

  const state = randomBytes(16).toString('hex');
  const installUrl = buildInstallUrl(shop, state);

  const returnTo = searchParams.get('return_to') ?? '';

  const response = NextResponse.redirect(installUrl);

  // Store nonce in cookie — verified in callback to prevent CSRF
  response.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  // Optional return URL after successful connection
  if (returnTo) {
    response.cookies.set('shopify_return_to', returnTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
  }

  return response;
}
