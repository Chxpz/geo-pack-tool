import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchShopifyProducts, mapShopifyProductToRow } from '@/lib/shopify';
import { getUserSubscription } from '@/lib/stripe';

const syncSchema = z.object({
  storeId: z.string().uuid(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await request.json();
  const validation = syncSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { storeId } = validation.data;

  // Verify the store belongs to the requesting user
  const { data: store, error: storeError } = await supabaseAdmin
    .from('stores')
    .select('id, user_id, store_url, access_token')
    .eq('id', storeId)
    .eq('user_id', session.user.id)
    .is('disconnected_at', null)
    .single();

  if (storeError || !store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  await supabaseAdmin
    .from('stores')
    .update({ sync_status: 'syncing' })
    .eq('id', storeId);

  // Fetch plan limit for this user
  const sub = await getUserSubscription(session.user.id);
  const productLimit = sub.max_products; // null = unlimited

  try {
    let pageInfo: string | undefined;
    let totalSynced = 0;
    let limitReached = false;

    do {
      const { products, nextPageInfo } = await fetchShopifyProducts(
        store.store_url,
        store.access_token,
        pageInfo,
      );

      if (products.length > 0) {
        let batch = products;

        // Enforce plan product cap
        if (productLimit !== null) {
          const remaining = productLimit - totalSynced;
          if (remaining <= 0) { limitReached = true; break; }
          if (batch.length > remaining) {
            batch = batch.slice(0, remaining);
            limitReached = true;
          }
        }

        const rows = batch.map(p =>
          mapShopifyProductToRow(p, store.id, store.user_id, store.store_url),
        );

        await supabaseAdmin
          .from('products')
          .upsert(rows, { onConflict: 'store_id,platform_id' });

        totalSynced += batch.length;
      }

      pageInfo = nextPageInfo;
    } while (pageInfo && !limitReached);

    await supabaseAdmin
      .from('stores')
      .update({
        sync_status: 'success',
        last_sync_at: new Date().toISOString(),
        product_count: totalSynced,
        sync_error: null,
      })
      .eq('id', storeId);

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      ...(limitReached && {
        warning: `Plan limit reached — only ${totalSynced} of your products are tracked. Upgrade to sync more.`,
      }),
    });
  } catch (err) {
    await supabaseAdmin
      .from('stores')
      .update({ sync_status: 'failed', sync_error: String(err) })
      .eq('id', storeId);

    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
