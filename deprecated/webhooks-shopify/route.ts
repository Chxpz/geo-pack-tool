import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyWebhookHmac, mapShopifyProductToRow, ShopifyProduct } from '@/lib/shopify';

export async function POST(request: Request) {
  const topic = request.headers.get('X-Shopify-Topic');
  const shop = request.headers.get('X-Shopify-Shop-Domain');
  const hmac = request.headers.get('X-Shopify-Hmac-Sha256');

  if (!topic || !shop || !hmac) {
    return NextResponse.json({ error: 'Missing required headers' }, { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('id, user_id, store_url')
    .eq('store_url', shop)
    .is('disconnected_at', null)
    .single();

  if (!store) {
    // Store was disconnected — acknowledge silently so Shopify stops retrying
    return NextResponse.json({ received: true });
  }

  const payload = JSON.parse(rawBody) as ShopifyProduct & { id: number };

  if (topic === 'products/delete') {
    await supabaseAdmin
      .from('products')
      .delete()
      .eq('store_id', store.id)
      .eq('platform_id', String(payload.id));

    return NextResponse.json({ received: true });
  }

  // products/create or products/update
  const row = mapShopifyProductToRow(payload, store.id, store.user_id, store.store_url);

  await supabaseAdmin
    .from('products')
    .upsert(row, { onConflict: 'store_id,platform_id' });

  return NextResponse.json({ received: true });
}
