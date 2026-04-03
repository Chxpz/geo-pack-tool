import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  isValidShopDomain,
  verifyCallbackHmac,
  getAccessToken,
  getShopInfo,
  registerWebhooks,
  fetchShopifyProducts,
  mapShopifyProductToRow,
} from '@/lib/shopify';

export async function GET(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!supabaseAdmin) {
    return NextResponse.redirect(new URL('/dashboard?error=db_error', request.url));
  }

  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!shop || !code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard?error=invalid_callback', request.url),
    );
  }

  if (!isValidShopDomain(shop)) {
    return NextResponse.redirect(
      new URL('/dashboard?error=invalid_shop', request.url),
    );
  }

  // Verify CSRF state nonce
  const cookieStore = await cookies();
  const savedState = cookieStore.get('shopify_oauth_state')?.value;

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL('/dashboard?error=state_mismatch', request.url),
    );
  }

  // Verify Shopify HMAC signature
  const query: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    query[key] = value;
  });

  if (!verifyCallbackHmac(query)) {
    return NextResponse.redirect(
      new URL('/dashboard?error=invalid_hmac', request.url),
    );
  }

  try {
    // Exchange code for access token
    const accessToken = await getAccessToken(shop, code);

    // Get shop metadata
    const shopInfo = await getShopInfo(shop, accessToken);

    // Upsert store record
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .upsert(
        {
          user_id: session.user.id,
          platform: 'shopify',
          store_url: shop,
          store_name: shopInfo.name,
          store_domain: shopInfo.domain,
          shop_id: shopInfo.shopId,
          access_token: accessToken,
          sync_status: 'syncing',
          connected_at: new Date().toISOString(),
          disconnected_at: null,
        },
        { onConflict: 'store_url' },
      )
      .select('id, user_id')
      .single();

    if (storeError || !store) {
      return NextResponse.redirect(
        new URL('/dashboard?error=store_save_failed', request.url),
      );
    }

    // Register webhooks (non-fatal if it fails)
    registerWebhooks(shop, accessToken).catch(() => undefined);

    // Initial product sync — first page only for fast redirect
    try {
      const { products } = await fetchShopifyProducts(shop, accessToken);

      if (products.length > 0) {
        const rows = products.map(p =>
          mapShopifyProductToRow(p, store.id, store.user_id, shop),
        );

        await supabaseAdmin
          .from('products')
          .upsert(rows, { onConflict: 'store_id,platform_id' });
      }

      await supabaseAdmin
        .from('stores')
        .update({
          sync_status: 'success',
          last_sync_at: new Date().toISOString(),
          product_count: products.length,
        })
        .eq('id', store.id);
    } catch {
      await supabaseAdmin
        .from('stores')
        .update({ sync_status: 'failed' })
        .eq('id', store.id);
    }

    const returnTo = cookieStore.get('shopify_return_to')?.value ?? '/dashboard';
    const redirectPath = returnTo.startsWith('/') ? returnTo : '/dashboard';

    const response = NextResponse.redirect(
      new URL(`${redirectPath}?connected=true`, request.url),
    );

    response.cookies.delete('shopify_oauth_state');
    response.cookies.delete('shopify_return_to');

    return response;
  } catch {
    return NextResponse.redirect(
      new URL('/dashboard?error=connection_failed', request.url),
    );
  }
}
