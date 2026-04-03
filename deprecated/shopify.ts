import crypto from 'crypto';

const SHOPIFY_API_VERSION = '2024-10';
const SHOPIFY_SCOPES = 'read_products,read_inventory';

// ─── Domain validation ────────────────────────────────────────────────────────

export function isValidShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}

/** Normalize user input to a full .myshopify.com domain */
export function normalizeShopDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes('.myshopify.com')) {
    // Strip protocol if present
    return trimmed.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
  return `${trimmed}.myshopify.com`;
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

export function buildInstallUrl(shop: string, state: string): string {
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/shopify/callback`;
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_CLIENT_ID!,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

export function verifyCallbackHmac(query: Record<string, string>): boolean {
  const { hmac, signature: _sig, ...rest } = query;
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map(key => `${key}=${rest[key]}`)
    .join('&');

  const computed = crypto
    .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!)
    .update(message)
    .digest('hex');

  if (computed.length !== hmac.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(hmac, 'hex'),
    );
  } catch {
    return false;
  }
}

export async function getAccessToken(shop: string, code: string): Promise<string> {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// ─── Shop info ────────────────────────────────────────────────────────────────

export interface ShopInfo {
  name: string;
  domain: string;
  shopId: string;
}

export async function getShopInfo(shop: string, accessToken: string): Promise<ShopInfo> {
  const response = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
    { headers: { 'X-Shopify-Access-Token': accessToken } },
  );

  if (!response.ok) {
    throw new Error(`Failed to get shop info: ${response.status}`);
  }

  const data = (await response.json()) as {
    shop: { name: string; domain: string; id: number };
  };

  return {
    name: data.shop.name,
    domain: data.shop.domain,
    shopId: String(data.shop.id),
  };
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface ShopifyVariant {
  id: number;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
  inventory_management: string | null;
  sku: string | null;
}

export interface ShopifyImage {
  src: string;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  handle: string;
  product_type: string | null;
  tags: string;
  published_at: string | null;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
}

export interface ProductPage {
  products: ShopifyProduct[];
  nextPageInfo?: string;
}

export async function fetchShopifyProducts(
  shop: string,
  accessToken: string,
  pageInfo?: string,
): Promise<ProductPage> {
  const params = new URLSearchParams({ limit: '250' });
  if (pageInfo) params.set('page_info', pageInfo);

  const response = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/products.json?${params}`,
    { headers: { 'X-Shopify-Access-Token': accessToken } },
  );

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  const linkHeader = response.headers.get('Link');
  let nextPageInfo: string | undefined;

  if (linkHeader) {
    const match = linkHeader.match(/<[^>]+[?&]page_info=([^>&]+)[^>]*>;\s*rel="next"/);
    if (match) nextPageInfo = match[1];
  }

  const data = (await response.json()) as { products: ShopifyProduct[] };
  return { products: data.products, nextPageInfo };
}

/** Map a Shopify product to our DB row shape */
export function mapShopifyProductToRow(
  product: ShopifyProduct,
  storeId: string,
  userId: string,
  storeUrl: string,
) {
  const variant = product.variants[0];
  const price = variant ? parseFloat(variant.price) : 0;
  const compareAtPrice =
    variant?.compare_at_price ? parseFloat(variant.compare_at_price) : null;
  const inventoryQty = variant?.inventory_quantity ?? 0;
  const inStock =
    inventoryQty > 0 || variant?.inventory_management === null;

  return {
    store_id: storeId,
    user_id: userId,
    platform_id: String(product.id),
    name: product.title,
    description: product.body_html
      ? product.body_html.replace(/<[^>]*>/g, '').trim() || null
      : null,
    product_type: product.product_type || null,
    price,
    compare_at_price: compareAtPrice,
    inventory_quantity: inventoryQty,
    in_stock: inStock,
    sku: variant?.sku || null,
    image_url: product.images[0]?.src ?? null,
    product_url: `https://${storeUrl}/products/${product.handle}`,
    synced_at: new Date().toISOString(),
  };
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export async function registerWebhooks(shop: string, accessToken: string): Promise<void> {
  const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/shopify`;
  const topics = ['products/create', 'products/update', 'products/delete'];

  await Promise.all(
    topics.map(topic =>
      fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: { topic, address: webhookUrl, format: 'json' },
        }),
      }),
    ),
  );
}

export function verifyWebhookHmac(rawBody: string, hmacHeader: string): boolean {
  const computed = crypto
    .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!)
    .update(rawBody, 'utf8')
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(hmacHeader),
    );
  } catch {
    return false;
  }
}
