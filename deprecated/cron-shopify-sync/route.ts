import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchShopifyProducts, mapShopifyProductToRow } from '@/lib/shopify';

export async function GET(request: Request) {
  // Vercel Cron authenticates with CRON_SECRET
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: stores, error } = await supabaseAdmin
    .from('stores')
    .select('id, user_id, store_url, access_token')
    .is('disconnected_at', null);

  if (error || !stores) {
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }

  const results = await Promise.allSettled(
    stores.map(async store => {
      let pageInfo: string | undefined;
      let totalSynced = 0;

      do {
        const { products, nextPageInfo } = await fetchShopifyProducts(
          store.store_url,
          store.access_token,
          pageInfo,
        );

        if (products.length > 0) {
          const rows = products.map(p =>
            mapShopifyProductToRow(p, store.id, store.user_id, store.store_url),
          );

          await supabaseAdmin!
            .from('products')
            .upsert(rows, { onConflict: 'store_id,platform_id' });

          totalSynced += products.length;
        }

        pageInfo = nextPageInfo;
      } while (pageInfo);

      await supabaseAdmin!
        .from('stores')
        .update({
          sync_status: 'success',
          last_sync_at: new Date().toISOString(),
          product_count: totalSynced,
        })
        .eq('id', store.id);

      return { storeId: store.id, synced: totalSynced };
    }),
  );

  const summary = results.map((result, i) =>
    result.status === 'fulfilled'
      ? result.value
      : { storeId: stores[i].id, error: String(result.reason) },
  );

  return NextResponse.json({ ok: true, stores: summary });
}
