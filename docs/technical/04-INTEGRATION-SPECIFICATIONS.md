# Integration Specifications
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 🟢 Final - Ready for Development  
**Owner:** Engineering Team  

---

## Table of Contents

1. [Shopify Integration](#shopify-integration)
2. [WooCommerce Integration](#woocommerce-integration)
3. [OpenAI ChatGPT Integration](#openai-chatgpt-integration)
4. [OpenAI ACP Integration](#openai-acp-integration)
5. [Perplexity AI Integration](#perplexity-ai-integration)
6. [Google Gemini Integration](#google-gemini-integration)
7. [Anthropic Claude Integration](#anthropic-claude-integration)
8. [Stripe Integration](#stripe-integration)
9. [Resend Integration](#resend-integration)

---

## Shopify Integration

### **Overview**

AgenticRev integrates with Shopify to:
- Authenticate merchants via OAuth
- Sync product catalog (inventory, pricing, descriptions)
- Receive real-time updates via webhooks
- Export structured data (JSON-LD schema) for AI optimization

### **1. OAuth Authentication**

**Flow:**
1. User clicks "Connect Shopify Store"
2. Redirect to Shopify OAuth authorization URL:
   ```
   https://accounts.shopify.com/oauth/authorize
     ?client_id={APP_CLIENT_ID}
     &scope={SCOPES}
     &redirect_uri={CALLBACK_URL}
     &state={RANDOM_STATE_TOKEN}
   ```
3. User authorizes app on Shopify
4. Shopify redirects back to callback URL with authorization code
5. Exchange code for access token

**Required Scopes:**
```
read_products
read_inventory
read_orders
write_products (for Truth Engine auto-fixes)
```

**OAuth Implementation:**

```python
# Step 1: Generate authorization URL
import hmac
import hashlib
import secrets

def get_shopify_auth_url(shop_domain: str) -> str:
    state = secrets.token_urlsafe(32)
    # Store state in Redis with 10min TTL for verification
    
    params = {
        'client_id': os.getenv('SHOPIFY_CLIENT_ID'),
        'scope': 'read_products,read_inventory,read_orders,write_products',
        'redirect_uri': f'{os.getenv("BASE_URL")}/api/auth/shopify/callback',
        'state': state
    }
    
    return f"https://accounts.shopify.com/oauth/authorize?{urlencode(params)}"

# Step 2: Handle callback and exchange code for token
async def shopify_callback(code: str, shop: str, hmac_sig: str, state: str):
    # 1. Verify HMAC signature
    verify_shopify_hmac(request.query_params, hmac_sig)
    
    # 2. Verify state token
    if not verify_state(state):
        raise ValueError("Invalid state token")
    
    # 3. Exchange authorization code for access token
    response = requests.post(
        f"https://{shop}/admin/oauth/access_token",
        json={
            'client_id': os.getenv('SHOPIFY_CLIENT_ID'),
            'client_secret': os.getenv('SHOPIFY_CLIENT_SECRET'),
            'code': code
        }
    )
    
    access_token = response.json()['access_token']
    
    # 4. Store access token in database (encrypted)
    await create_store(
        user_id=current_user.id,
        platform='shopify',
        store_url=shop,
        access_token=encrypt(access_token)
    )
    
    return access_token

def verify_shopify_hmac(params: dict, hmac_sig: str) -> bool:
    """Verify Shopify webhook/OAuth HMAC signature."""
    # Remove hmac and signature from params
    params = {k: v for k, v in params.items() if k not in ['hmac', 'signature']}
    
    # Sort and encode
    query_string = '&'.join(f'{k}={v}' for k, v in sorted(params.items()))
    
    # Compute HMAC
    expected_hmac = hmac.new(
        os.getenv('SHOPIFY_CLIENT_SECRET').encode(),
        query_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_hmac, hmac_sig)
```

---

### **2. Product Sync**

**Strategy:** Hybrid (webhooks + polling)

- **Webhooks:** Real-time updates (products/create, products/update, products/delete)
- **Polling:** Daily full sync at 2am UTC (catch missed webhooks)

**Shopify GraphQL Query:**

```graphql
query GetProducts($cursor: String) {
  products(first: 50, after: $cursor) {
    edges {
      node {
        id
        title
        description
        handle
        productType
        tags
        status
        variants(first: 10) {
          edges {
            node {
              id
              sku
              price
              compareAtPrice
              inventoryQuantity
              image {
                url
              }
            }
          }
        }
        images(first: 5) {
          edges {
            node {
              url
              altText
            }
          }
        }
        seo {
          title
          description
        }
        createdAt
        updatedAt
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Implementation:**

```python
import shopify

async def sync_shopify_products(store_id: str):
    """Full product sync from Shopify."""
    store = await get_store(store_id)
    
    # Initialize Shopify API session
    shopify.ShopifyResource.set_site(
        f"https://{store.store_url}",
        headers={'X-Shopify-Access-Token': decrypt(store.access_token)}
    )
    
    cursor = None
    synced_count = 0
    
    while True:
        # GraphQL query
        response = shopify.GraphQL().execute(GET_PRODUCTS_QUERY, {'cursor': cursor})
        data = json.loads(response)
        
        for edge in data['data']['products']['edges']:
            product = edge['node']
            
            # Transform Shopify data to our schema
            await upsert_product({
                'store_id': store_id,
                'platform_id': product['id'],
                'name': product['title'],
                'description': product['description'],
                'product_type': product['productType'],
                'tags': product['tags'],
                'price': float(product['variants']['edges'][0]['node']['price']),
                'inventory_quantity': product['variants']['edges'][0]['node']['inventoryQuantity'],
                'image_url': product['images']['edges'][0]['node']['url'] if product['images']['edges'] else None,
                'product_url': f"https://{store.store_domain}/products/{product['handle']}",
                'synced_at': datetime.utcnow()
            })
            
            synced_count += 1
        
        # Pagination
        page_info = data['data']['products']['pageInfo']
        if not page_info['hasNextPage']:
            break
        cursor = page_info['endCursor']
    
    # Update store sync status
    await update_store(store_id, {
        'last_sync_at': datetime.utcnow(),
        'sync_status': 'success',
        'product_count': synced_count
    })
    
    return synced_count
```

---

### **3. Webhook Setup**

**Required Webhooks:**

| Topic | Purpose |
|-------|---------|
| `products/create` | New product added in Shopify |
| `products/update` | Product modified (price, inventory, description) |
| `products/delete` | Product deleted (soft delete in our DB) |
| `inventory_levels/update` | Inventory quantity changed |

**Webhook Registration:**

```python
async def register_shopify_webhooks(store_id: str):
    """Register webhooks after OAuth."""
    store = await get_store(store_id)
    
    shopify.ShopifyResource.set_site(
        f"https://{store.store_url}",
        headers={'X-Shopify-Access-Token': decrypt(store.access_token)}
    )
    
    topics = [
        'products/create',
        'products/update',
        'products/delete',
        'inventory_levels/update'
    ]
    
    for topic in topics:
        webhook = shopify.Webhook()
        webhook.topic = topic
        webhook.address = f"{os.getenv('BASE_URL')}/api/webhooks/shopify"
        webhook.format = 'json'
        webhook.save()
```

**Webhook Handler:**

```python
@app.post("/api/webhooks/shopify")
async def shopify_webhook_handler(request: Request):
    # 1. Verify HMAC signature
    hmac_header = request.headers.get('X-Shopify-Hmac-SHA256')
    body = await request.body()
    
    expected_hmac = base64.b64encode(
        hmac.new(
            os.getenv('SHOPIFY_WEBHOOK_SECRET').encode(),
            body,
            hashlib.sha256
        ).digest()
    ).decode()
    
    if not hmac.compare_digest(expected_hmac, hmac_header):
        raise HTTPException(status_code=401, detail="Invalid HMAC")
    
    # 2. Parse webhook
    topic = request.headers.get('X-Shopify-Topic')
    shop_domain = request.headers.get('X-Shopify-Shop-Domain')
    data = json.loads(body)
    
    # 3. Find store by shop domain
    store = await get_store_by_domain(shop_domain)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # 4. Process webhook
    if topic == 'products/create' or topic == 'products/update':
        await sync_single_product(store.id, data['id'])
    elif topic == 'products/delete':
        await soft_delete_product(store.id, data['id'])
    elif topic == 'inventory_levels/update':
        await update_inventory(store.id, data['inventory_item_id'], data['available'])
    
    return {"success": True}
```

**Webhook Payload Examples:**

```json
// products/update webhook payload example
{
  "id": 7891234567890,
  "title": "Organic Coffee Blend",
  "body_html": "<p>Premium organic coffee...</p>",
  "vendor": "Eco Shop",
  "product_type": "Coffee",
  "created_at": "2026-03-01T10:00:00Z",
  "handle": "organic-coffee-blend",
  "updated_at": "2026-03-03T08:00:00Z",
  "published_at": "2026-03-01T10:00:00Z",
  "template_suffix": null,
  "status": "active",
  "published_scope": "web",
  "tags": "organic, fair-trade, coffee",
  "admin_graphql_api_id": "gid://shopify/Product/7891234567890",
  "variants": [
    {
      "id": 43210987654321,
      "product_id": 7891234567890,
      "title": "Default Title",
      "price": "24.99",
      "sku": "COFFEE-ORG-001",
      "position": 1,
      "inventory_policy": "deny",
      "compare_at_price": "29.99",
      "fulfillment_service": "manual",
      "inventory_management": "shopify",
      "option1": "Default Title",
      "option2": null,
      "option3": null,
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-03T08:00:00Z",
      "taxable": true,
      "barcode": null,
      "grams": 454,
      "image_id": null,
      "weight": 1.0,
      "weight_unit": "lb",
      "inventory_item_id": 45678901234567,
      "inventory_quantity": 150,
      "old_inventory_quantity": 150,
      "requires_shipping": true,
      "admin_graphql_api_id": "gid://shopify/ProductVariant/43210987654321"
    }
  ],
  "options": [
    {
      "id": 9876543210987,
      "product_id": 7891234567890,
      "name": "Title",
      "position": 1,
      "values": ["Default Title"]
    }
  ],
  "images": [
    {
      "id": 29012345678901,
      "product_id": 7891234567890,
      "position": 1,
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-01T10:00:00Z",
      "alt": null,
      "width": 1200,
      "height": 1200,
      "src": "https://cdn.shopify.com/s/files/1/0123/4567/8901/products/coffee.jpg",
      "variant_ids": [],
      "admin_graphql_api_id": "gid://shopify/ProductImage/29012345678901"
    }
  ],
  "image": {
    "id": 29012345678901,
    "product_id": 7891234567890,
    "position": 1,
    "created_at": "2026-03-01T10:00:00Z",
    "updated_at": "2026-03-01T10:00:00Z",
    "alt": null,
    "width": 1200,
    "height": 1200,
    "src": "https://cdn.shopify.com/s/files/1/0123/4567/8901/products/coffee.jpg",
    "variant_ids": [],
    "admin_graphql_api_id": "gid://shopify/ProductImage/29012345678901"
  }
}
```

**GraphQL Error Handling:**

```graphql
# GraphQL error response format
{
  "errors": [
    {
      "message": "Throttled",
      "extensions": {
        "code": "THROTTLED",
        "cost": 1002,
        "maximumAvailable": 1000,
        "requestedQueryCost": 1002,
        "restoreRate": 50
      }
    }
  ]
}
```

```python
# Handle GraphQL throttling
def handle_graphql_response(response):
    data = response.json()
    
    if 'errors' in data:
        for error in data['errors']:
            if error.get('extensions', {}).get('code') == 'THROTTLED':
                # Wait for restore rate
                restore_rate = error['extensions']['restoreRate']
                wait_time = 60 / restore_rate  # seconds to wait
                logger.warning(f"GraphQL throttled, waiting {wait_time}s")
                time.sleep(wait_time)
                # Retry request
                return retry_graphql_request()
    
    return data
```

---

### **4. Structured Data Export (JSON-LD)**

**Generate Product Schema for AI:**

```python
def generate_product_schema(product: Product) -> dict:
    """Generate JSON-LD Product schema for AI readability."""
    return {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "description": product.description,
        "sku": product.sku,
        "brand": {
            "@type": "Brand",
            "name": product.store.store_name
        },
        "offers": {
            "@type": "Offer",
            "price": str(product.price),
            "priceCurrency": product.currency,
            "availability": "https://schema.org/InStock" if product.in_stock else "https://schema.org/OutOfStock",
            "url": product.product_url
        },
        "image": product.image_url,
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "127"
        } if product.has_reviews else None
    }

# Store in products.schema_json column
```

---

## WooCommerce Integration

### **Overview**

WooCommerce integration uses REST API with API keys (no OAuth required).

### **1. Authentication**

**User provides:**
- Store URL (e.g., `https://ecoshop.com`)
- Consumer Key (`ck_xxxxx`)
- Consumer Secret (`cs_xxxxx`)

**Validation:**

```python
import requests
from requests.auth import HTTPBasicAuth

async def validate_woocommerce_credentials(
    store_url: str,
    consumer_key: str,
    consumer_secret: str
) -> bool:
    """Test WooCommerce API credentials."""
    try:
        response = requests.get(
            f"{store_url}/wp-json/wc/v3/system_status",
            auth=HTTPBasicAuth(consumer_key, consumer_secret),
            timeout=10
        )
        return response.status_code == 200
    except Exception:
        return False
```

---

### **2. Product Sync**

**WooCommerce REST API (v3):**

```python
async def sync_woocommerce_products(store_id: str):
    """Sync products from WooCommerce."""
    store = await get_store(store_id)
    
    page = 1
    per_page = 100
    synced_count = 0
    
    while True:
        response = requests.get(
            f"{store.store_url}/wp-json/wc/v3/products",
            auth=HTTPBasicAuth(
                decrypt(store.api_key),
                decrypt(store.api_secret)
            ),
            params={
                'page': page,
                'per_page': per_page,
                'orderby': 'id',
                'order': 'asc'
            }
        )
        
        if response.status_code != 200:
            break
        
        products = response.json()
        if not products:
            break
        
        for product in products:
            await upsert_product({
                'store_id': store_id,
                'platform_id': str(product['id']),
                'name': product['name'],
                'description': product['description'],
                'sku': product['sku'],
                'price': float(product['price']),
                'inventory_quantity': product['stock_quantity'] or 0,
                'in_stock': product['stock_status'] == 'instock',
                'image_url': product['images'][0]['src'] if product['images'] else None,
                'product_url': product['permalink'],
                'synced_at': datetime.utcnow()
            })
            synced_count += 1
        
        # Check for more pages
        if len(products) < per_page:
            break
        page += 1
    
    return synced_count
```

**Webhooks:** WooCommerce supports webhooks (configuration varies by hosting setup).

**Webhook Configuration (for Phase 2):**

```php
// In WooCommerce admin: Settings → Advanced → Webhooks → Add webhook

Webhook Configuration:
- Name: "AgenticRev Product Update"
- Status: Active
- Topic: Product updated
- Delivery URL: https://api.agenticrev.com/api/webhooks/woocommerce
- Secret: [generate random string]
- API Version: WP REST API Integration v3
```

**Webhook Payload Format:**

```json
{
  "id": 123,
  "name": "Organic Coffee Blend",
  "slug": "organic-coffee-blend",
  "permalink": "https://ecoshop.com/product/organic-coffee-blend/",
  "date_created": "2026-03-01T10:00:00",
  "date_modified": "2026-03-03T08:00:00",
  "type": "simple",
  "status": "publish",
  "featured": false,
  "catalog_visibility": "visible",
  "description": "<p>Premium organic coffee...</p>",
  "short_description": "<p>Fair trade organic coffee</p>",
  "sku": "COFFEE-ORG-001",
  "price": "24.99",
  "regular_price": "24.99",
  "sale_price": "",
  "on_sale": false,
  "purchasable": true,
  "total_sales": 127,
  "virtual": false,
  "downloadable": false,
  "downloads": [],
  "download_limit": -1,
  "download_expiry": -1,
  "external_url": "",
  "button_text": "",
  "tax_status": "taxable",
  "tax_class": "",
  "manage_stock": true,
  "stock_quantity": 150,
  "stock_status": "instock",
  "backorders": "no",
  "backorders_allowed": false,
  "backordered": false,
  "sold_individually": false,
  "weight": "1",
  "dimensions": {
    "length": "",
    "width": "",
    "height": ""
  },
  "shipping_required": true,
  "shipping_taxable": true,
  "shipping_class": "",
  "shipping_class_id": 0,
  "reviews_allowed": true,
  "average_rating": "4.8",
  "rating_count": 127,
  "related_ids": [124, 125, 126],
  "upsell_ids": [],
  "cross_sell_ids": [],
  "parent_id": 0,
  "purchase_note": "",
  "categories": [
    {
      "id": 15,
      "name": "Coffee",
      "slug": "coffee"
    }
  ],
  "tags": [
    {
      "id": 45,
      "name": "organic",
      "slug": "organic"
    },
    {
      "id": 46,
      "name": "fair-trade",
      "slug": "fair-trade"
    }
  ],
  "images": [
    {
      "id": 789,
      "date_created": "2026-03-01T10:00:00",
      "date_modified": "2026-03-01T10:00:00",
      "src": "https://ecoshop.com/wp-content/uploads/2026/03/coffee.jpg",
      "name": "coffee.jpg",
      "alt": "Organic Coffee Blend"
    }
  ],
  "attributes": [],
  "default_attributes": [],
  "variations": [],
  "grouped_products": [],
  "menu_order": 0,
  "meta_data": []
}
```

---

## OpenAI ChatGPT Integration

### **Overview**

Scan ChatGPT for product mentions using prompt-based queries.

### **1. Authentication**

```python
import openai

openai.api_key = os.getenv('OPENAI_API_KEY')
```

---

### **2. AI Visibility Scanning**

**Strategy:**
- Generate queries based on product name, category, and tags
- Send queries to ChatGPT API (GPT-4 Turbo)
- Parse response for product mentions and position

**Query Generation:**

```python
def generate_search_queries(product: Product) -> list[str]:
    """Generate ChatGPT queries likely to mention product."""
    queries = [
        f"Best {product.product_type} for {product.category}",
        f"Top {product.category} brands",
        f"{product.tags[0]} {product.tags[1]} recommendations" if len(product.tags) >= 2 else None,
        f"Where to buy {product.name}",
        f"Alternative to [competitor brand] in {product.category}"
    ]
    return [q for q in queries if q]
```

**Complete API Request/Response Format:**

```python
# Full request payload example
request_payload = {
    "model": "gpt-4o-mini",
    "messages": [
        {
            "role": "system",
            "content": "You are a helpful shopping assistant. Provide product recommendations with specific brand names."
        },
        {
            "role": "user",
            "content": "Best organic fair trade coffee brands"
        }
    ],
    "temperature": 0.7,
    "max_tokens": 500,
    "top_p": 1.0,
    "frequency_penalty": 0.0,
    "presence_penalty": 0.0
}

# Full response payload example
response_payload = {
    "id": "chatcmpl-123",
    "object": "chat.completion",
    "created": 1677652288,
    "model": "gpt-4o-mini",
    "choices": [{
        "index": 0,
        "message": {
            "role": "assistant",
            "content": "Here are the top organic coffee brands:\n1. Brand A - Known for..."
        },
        "finish_reason": "stop"
    }],
    "usage": {
        "prompt_tokens": 56,
        "completion_tokens": 150,
        "total_tokens": 206
    }
}
```

**Error Response Handling:**

```python
# OpenAI error response examples
error_responses = {
    "rate_limit": {
        "error": {
            "message": "Rate limit exceeded",
            "type": "rate_limit_error",
            "param": None,
            "code": "rate_limit_exceeded"
        }
    },
    "invalid_request": {
        "error": {
            "message": "Invalid model specified",
            "type": "invalid_request_error",
            "param": "model",
            "code": "model_not_found"
        }
    }
}

# Error handling strategy
try:
    response = openai.ChatCompletion.create(...)
except openai.error.RateLimitError as e:
    # Exponential backoff
    retry_count = 0
    time.sleep(2 ** retry_count)
    logger.warning(f"Rate limit hit, retrying in {2 ** retry_count}s")
except openai.error.APIError as e:
    # Log and alert
    logger.error(f"OpenAI API error: {e}")
    await send_alert_email(user, f"OpenAI API error: {e}")
except openai.error.Timeout:
    # Retry with longer timeout
    logger.warning("OpenAI timeout, retrying with extended timeout")
except openai.error.InvalidRequestError as e:
    # Invalid parameters
    logger.error(f"Invalid request: {e}")
```

**Rate Limit Details:**

```
OpenAI Rate Limits (Tier 1 - $5+ spend):
- RPM: 500 requests/minute
- TPM: 200,000 tokens/minute
- Daily: 10,000 requests/day

Tier 2 ($50+ spend):
- RPM: 5,000 requests/minute
- TPM: 2,000,000 tokens/minute
- Daily: Unlimited

Tier 3 ($100+ spend):
- RPM: 10,000 requests/minute
- TPM: 5,000,000 tokens/minute
- Daily: Unlimited
```

**Scan Implementation:**

```python
async def scan_chatgpt_for_product(product: Product) -> list[dict]:
    """Scan ChatGPT for product mentions."""
    queries = generate_search_queries(product)
    mentions = []
    
    for query in queries:
        # Send query to ChatGPT
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful shopping assistant. Provide product recommendations with specific brand names."
                },
                {
                    "role": "user",
                    "content": query
                }
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        answer = response['choices'][0]['message']['content']
        
        # Parse response for product mentions
        mentioned = product.name.lower() in answer.lower()
        position = None
        
        if mentioned:
            # Extract position (1st, 2nd, 3rd recommendation)
            position = extract_position(answer, product.name)
        
        # Analyze sentiment
        sentiment = analyze_sentiment(answer, product.name) if mentioned else None
        
        # Save mention
        await create_ai_mention({
            'product_id': product.id,
            'platform_id': 'chatgpt',
            'query': query,
            'mentioned': mentioned,
            'position': position,
            'sentiment': sentiment,
            'response_full': answer,
            'scanned_at': datetime.utcnow()
        })
        
        if mentioned:
            mentions.append({
                'query': query,
                'position': position,
                'sentiment': sentiment
            })
    
    return mentions

def extract_position(answer: str, product_name: str) -> int:
    """Extract product position in recommendation list."""
    # Look for numbered lists (1., 2., 3.)
    lines = answer.split('\n')
    for i, line in enumerate(lines):
        if product_name.lower() in line.lower():
            # Check if line starts with number
            match = re.match(r'^(\d+)\.', line.strip())
            if match:
                return int(match.group(1))
            # Heuristic: assume position based on line order
            return min(i + 1, 10)
    return None

def analyze_sentiment(answer: str, product_name: str) -> str:
    """Analyze sentiment of product mention."""
    # Extract sentences mentioning product
    sentences = [s for s in answer.split('.') if product_name.lower() in s.lower()]
    
    # Look for positive/negative keywords
    positive_words = ['best', 'top', 'excellent', 'highly recommended', 'great', 'premium']
    negative_words = ['avoid', 'worst', 'poor', 'disappointing', 'overpriced']
    
    text = ' '.join(sentences).lower()
    
    pos_count = sum(1 for word in positive_words if word in text)
    neg_count = sum(1 for word in negative_words if word in text)
    
    if pos_count > neg_count:
        return 'positive'
    elif neg_count > pos_count:
        return 'negative'
    else:
        return 'neutral'
```

---

### **3. Rate Limiting**

OpenAI API Limits:
- **GPT-4o Mini (Tier 1 - $5+ spend):** 
  - RPM: 500 requests/minute
  - TPM: 200,000 tokens/minute
  - Daily: 10,000 requests/day
- **Cost:** $0.15 per 1M input tokens, $0.60 per 1M output tokens

**Budget Management:**

```python
# Estimate: 5 queries per product, ~200 tokens per query
# 100 products = 500 queries = ~100K tokens = $0.015-$0.06 per scan
# Limit scans based on plan:
#   Free: 1x/week (100 products max = $0.24/month)
#   Starter: 1x/day = $7.20/month
#   Growth: 2x/day = $14.40/month
```

---

## OpenAI ACP Integration

### **Overview**

OpenAI Agentic Commerce Protocol (ACP) enables instant checkout in ChatGPT.

**Official Docs:** https://agentic-commerce-protocol.com/docs/commerce/specs/feed  
**Spec Repository:** https://www.agenticcommerce.dev/docs/reference/webhooks

---

### **1. Feed Generation**

**Required Format:** JSON feed with complete Product schema

```python
def generate_acp_feed(store_id: str) -> dict:
    """Generate OpenAI ACP product feed (complete 2026 spec)."""
    products = await get_products(store_id, in_stock=True)
    
    feed = {
        "schema_version": "1.0",
        "merchant": {
            "id": str(store_id),
            "name": products[0].store.store_name,
            "url": products[0].store.store_domain,
            "logo": f"https://{products[0].store.store_domain}/logo.png",
            "support_email": "support@ecoshop.com",
            "support_phone": "+1-555-0123",
            "return_policy_url": f"https://{products[0].store.store_domain}/returns",
            "shipping_policy_url": f"https://{products[0].store.store_domain}/shipping"
        },
        "products": []
    }
    
    for product in products:
        feed['products'].append({
            "id": str(product.id),
            "title": product.name,
            "description": product.description,
            "price": {
                "value": str(product.price),
                "currency": product.currency
            },
            "availability": "in_stock" if product.in_stock else "out_of_stock",
            "inventory_quantity": product.inventory_quantity,
            "image_url": product.image_url,
            "additional_images": product.images if hasattr(product, 'images') else [],
            "product_url": product.product_url,
            "brand": product.store.store_name,
            "categories": [product.category] if product.category else [],
            "sku": product.sku,
            "gtin": product.gtin if hasattr(product, 'gtin') else None,  # Global Trade Item Number
            "mpn": product.mpn if hasattr(product, 'mpn') else None,  # Manufacturer Part Number
            "condition": "new",
            "shipping": {
                "weight": {
                    "value": product.weight if hasattr(product, 'weight') else 1.0,
                    "unit": "lb"
                },
                "dimensions": {
                    "length": 6.0,
                    "width": 4.0,
                    "height": 8.0,
                    "unit": "in"
                },
                "free_shipping": False,
                "shipping_cost": {
                    "value": "5.99",
                    "currency": "USD"
                }
            },
            "variants": [  # Product variants
                {
                    "id": f"variant-{product.id}-1",
                    "title": "Default",
                    "price": {"value": str(product.price), "currency": product.currency},
                    "sku": product.sku,
                    "inventory_quantity": product.inventory_quantity
                }
            ],
            "schema_markup": {
                "@context": "https://schema.org/",
                "@type": "Product",
                "name": product.name,
                "description": product.description,
                "sku": product.sku,
                "brand": {"@type": "Brand", "name": product.store.store_name},
                "offers": {
                    "@type": "Offer",
                    "price": str(product.price),
                    "priceCurrency": product.currency,
                    "availability": "https://schema.org/InStock" if product.in_stock else "https://schema.org/OutOfStock",
                    "url": product.product_url
                },
                "image": product.image_url,
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": "4.8",
                    "reviewCount": "127"
                } if hasattr(product, 'rating') else None
            }
        })
    
    # Upload to S3
    feed_url = await upload_to_s3(
        bucket='agenticrev-acp-feeds',
        key=f'feeds/{store_id}/feed-{datetime.utcnow().isoformat()}.json',
        data=json.dumps(feed)
    )
    
    # Save feed record
    await create_acp_feed({
        'store_id': store_id,
        'feed_url': feed_url,
        'product_count': len(products),
        'status': 'generated',
        'generated_at': datetime.utcnow()
    })
    
    return feed
```

---

### **2. Feed Submission**

```python
async def submit_acp_feed(feed_id: str):
    """Submit feed to OpenAI ACP API."""
    feed = await get_acp_feed(feed_id)
    
    # Submit to OpenAI Commerce API
    response = requests.post(
        'https://api.openai.com/v1/commerce/feeds',
        headers={
            'Authorization': f'Bearer {os.getenv("OPENAI_API_KEY")}',
            'Content-Type': 'application/json'
        },
        json={
            'merchant_id': str(feed.store_id),
            'feed_url': feed.feed_url
        }
    )
    
    submission_data = response.json()
    
    # Update feed record
    await update_acp_feed(feed_id, {
        'status': 'submitted',
        'openai_feed_id': submission_data['feed_id'],
        'submitted_at': datetime.utcnow()
    })
    
    return submission_data
```

**Feed Validation Error Response:**

```json
{
  "error": {
    "code": "INVALID_FEED",
    "message": "Feed validation failed",
    "details": [
      {
        "field": "products[0].price.value",
        "error": "Must be a positive number"
      },
      {
        "field": "products[2].image_url",
        "error": "Must be a valid HTTPS URL"
      }
    ]
  }
}
```

**Feed Submission Error Response:**

```json
{
  "error": {
    "code": "MERCHANT_NOT_APPROVED",
    "message": "Merchant account not approved for ACP",
    "details": "Please complete merchant verification at https://developers.openai.com/commerce/verify"
  }
}
```

---

### **3. Order Webhooks**

**OpenAI sends webhook when user completes checkout:**

```python
@app.post("/api/webhooks/acp")
async def acp_webhook_handler(request: Request):
    # 1. Verify signature
    signature = request.headers.get('X-OpenAI-Signature')
    body = await request.body()
    
    expected_sig = hmac.new(
        os.getenv('OPENAI_WEBHOOK_SECRET').encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(expected_sig, signature):
        raise HTTPException(401, "Invalid signature")
    
    # 2. Parse event
    event = json.loads(body)
    
    if event['type'] == 'order.created':
        order_data = event['data']
        
        # 3. Create order in our DB
        order = await create_acp_order({
            'openai_order_id': order_data['id'],
            'store_id': order_data['merchant_id'],
            'customer_email': order_data['customer']['email'],
            'customer_name': order_data['customer']['name'],
            'total': order_data['total']['value'],
            'currency': order_data['total']['currency'],
            'line_items': order_data['line_items'],
            'shipping_address': order_data['shipping_address'],
            'fulfillment_status': 'pending',
            'placed_at': datetime.fromisoformat(order_data['created_at'])
        })
        
        # 4. Sync to Shopify
        await sync_order_to_shopify(order.id)
        
        # 5. Send celebration email
        await send_acp_order_email(order.id)
    
    return {"success": True}
```

**ACP Webhook Payload Examples:**

```json
// order.created webhook payload
{
  "event": "order.created",
  "timestamp": "2026-03-03T14:30:00Z",
  "data": {
    "order_id": "acp-order-abc123",
    "merchant_id": "merchant-uuid-123",
    "status": "pending",
    "customer": {
      "id": "customer-xyz789",
      "email": "customer@example.com",
      "name": "Jane Doe",
      "phone": "+1-555-0199"
    },
    "shipping_address": {
      "name": "Jane Doe",
      "address_line1": "123 Main St",
      "address_line2": "Apt 4B",
      "city": "San Francisco",
      "state": "CA",
      "postal_code": "94102",
      "country": "US"
    },
    "billing_address": {
      "name": "Jane Doe",
      "address_line1": "123 Main St",
      "address_line2": "Apt 4B",
      "city": "San Francisco",
      "state": "CA",
      "postal_code": "94102",
      "country": "US"
    },
    "line_items": [
      {
        "product_id": "product-uuid-123",
        "variant_id": "variant-uuid-456",
        "quantity": 2,
        "price": {
          "value": "24.99",
          "currency": "USD"
        },
        "total": {
          "value": "49.98",
          "currency": "USD"
        }
      }
    ],
    "subtotal": {
      "value": "49.98",
      "currency": "USD"
    },
    "shipping": {
      "value": "5.99",
      "currency": "USD"
    },
    "tax": {
      "value": "4.83",
      "currency": "USD"
    },
    "total": {
      "value": "60.80",
      "currency": "USD"
    },
    "payment_method": "card",
    "payment_status": "paid",
    "fulfillment_status": "pending",
    "created_at": "2026-03-03T14:30:00Z"
  }
}

// order.updated webhook payload
{
  "event": "order.updated",
  "timestamp": "2026-03-03T15:00:00Z",
  "data": {
    "order_id": "acp-order-abc123",
    "merchant_id": "merchant-uuid-123",
    "status": "fulfilled",
    "fulfillment_status": "fulfilled",
    "tracking_number": "1Z999AA10123456784",
    "tracking_url": "https://www.ups.com/track?tracknum=1Z999AA10123456784",
    "updated_at": "2026-03-03T15:00:00Z"
  }
}

// order.cancelled webhook payload
{
  "event": "order.cancelled",
  "timestamp": "2026-03-03T16:00:00Z",
  "data": {
    "order_id": "acp-order-abc123",
    "merchant_id": "merchant-uuid-123",
    "status": "cancelled",
    "cancellation_reason": "customer_request",
    "refund_status": "refunded",
    "refund_amount": {
      "value": "60.80",
      "currency": "USD"
    },
    "cancelled_at": "2026-03-03T16:00:00Z"
  }
}
```

---

## Perplexity AI Integration

**API:** Perplexity Sonar API (OpenAI-compatible)

**Official Docs:** https://docs.perplexity.ai/

**Pricing (2026):**
- **Sonar Small:** $0.20 per 1M tokens
- **Sonar Large:** $5 per 1M tokens
- **Sonar Pro:** $1 per 1M tokens (2x more search results)

**Complete API Request/Response Format:**

```python
# Full request payload
request = {
    "model": "sonar-small-online",  # or "sonar-pro", "sonar-large-online"
    "messages": [
        {
            "role": "system",
            "content": "Be precise and concise."
        },
        {
            "role": "user",
            "content": "Best organic fair trade coffee brands"
        }
    ],
    "max_tokens": 500,
    "temperature": 0.2,
    "top_p": 0.9,
    "return_citations": True,  # CRITICAL: Get source URLs
    "search_domain_filter": ["amazon.com", "shopify.com"],  # Optional
    "return_images": False,
    "return_related_questions": False
}

# Full response payload
response = {
    "id": "...",
    "model": "sonar-small-online",
    "object": "chat.completion",
    "created": 1234567890,
    "choices": [{
        "index": 0,
        "finish_reason": "stop",
        "message": {
            "role": "assistant",
            "content": "Top organic coffee brands include..."
        },
        "delta": {"role": "assistant", "content": ""}
    }],
    "usage": {
        "prompt_tokens": 50,
        "completion_tokens": 120,
        "total_tokens": 170
    },
    "citations": [  # CRITICAL: Citations array
        "https://example.com/coffee-review",
        "https://coffeebrand.com/about"
    ]
}
```

**Citation Extraction Logic:**

```python
def extract_citations(response: dict) -> list[str]:
    """Extract and store citations from Perplexity response."""
    citations = response.get('citations', [])
    # Store in ai_mentions.citations column (JSONB array)
    return citations

async def scan_perplexity_for_product(product: Product):
    """Scan Perplexity for product mentions with citation tracking."""
    queries = generate_search_queries(product)
    
    for query in queries:
        response = requests.post(
            'https://api.perplexity.ai/chat/completions',
            headers={
                'Authorization': f'Bearer {os.getenv("PERPLEXITY_API_KEY")}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'sonar-small-online',
                'messages': [
                    {'role': 'system', 'content': 'Be precise and concise.'},
                    {'role': 'user', 'content': query}
                ],
                'return_citations': True,  # Always request citations
                'max_tokens': 500
            }
        )
        
        data = response.json()
        answer = data['choices'][0]['message']['content']
        citations = data.get('citations', [])
        
        # Process similar to ChatGPT
        mentioned = product.name.lower() in answer.lower()
        position = extract_position(answer, product.name) if mentioned else None
        
        await create_ai_mention({
            'product_id': product.id,
            'platform_id': 'perplexity',
            'query': query,
            'mentioned': mentioned,
            'position': position,
            'response_full': answer,
            'citations': citations,  # Store citations
            'scanned_at': datetime.utcnow()
        })
```

**Rate Limits:**
```
Perplexity API Rate Limits (Default):
- RPM: 50 requests/minute
- TPM: 1,000,000 tokens/minute
- Daily: Unlimited (pay-per-use)
```

---

## Google Gemini Integration

**API:** Google AI Studio / Gemini API

**Official Docs:** https://ai.google.dev/docs

**Pricing (2026):**
- **Gemini 2.5 Flash (Paid):** $0.50 per 1M input tokens, $3 per 1M output tokens
- **Gemini 2.5 Flash-Lite:** $0.10 per 1M input tokens, $0.40 per 1M output tokens
- **Gemini 2.5 Pro:** $2 per 1M input tokens (≤200K context), $12 per 1M output tokens
- **Free Tier:** 15 RPM, 1M TPM, 1,500 RPD (Flash model) - $0 cost

**Complete API Request/Response Format:**

```python
import google.generativeai as genai

genai.configure(api_key=os.getenv('GOOGLE_AI_API_KEY'))

# Full request format
model = genai.GenerativeModel('gemini-2.5-flash')

response = model.generate_content(
    "Best organic fair trade coffee brands",
    generation_config=genai.types.GenerationConfig(
        temperature=0.7,
        top_p=0.95,
        top_k=40,
        max_output_tokens=500,
    ),
    safety_settings={
        genai.types.HarmCategory.HARM_CATEGORY_HATE_SPEECH: genai.types.HarmBlockThreshold.BLOCK_NONE,
        genai.types.HarmCategory.HARM_CATEGORY_HARASSMENT: genai.types.HarmBlockThreshold.BLOCK_NONE,
    }
)

# Full response format
response_format = {
    "candidates": [{
        "content": {
            "parts": [{"text": "Here are the top organic coffee brands..."}],
            "role": "model"
        },
        "finish_reason": "STOP",
        "safety_ratings": [
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "probability": "NEGLIGIBLE"
            },
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "probability": "NEGLIGIBLE"
            }
        ]
    }],
    "usage_metadata": {
        "prompt_token_count": 45,
        "candidates_token_count": 120,
        "total_token_count": 165
    }
}
```

**Implementation:**

```python
async def scan_gemini_for_product(product: Product):
    """Scan Google Gemini for product mentions."""
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    queries = generate_search_queries(product)
    
    for query in queries:
        try:
            response = model.generate_content(
                query,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=500,
                )
            )
            answer = response.text
            
            mentioned = product.name.lower() in answer.lower()
            position = extract_position(answer, product.name) if mentioned else None
            
            await create_ai_mention({
                'product_id': product.id,
                'platform_id': 'gemini',
                'query': query,
                'mentioned': mentioned,
                'position': position,
                'response_full': answer,
                'scanned_at': datetime.utcnow()
            })
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
```

**Free Tier Limits:**
```
Gemini Free Tier (no credit card required):
- Models: Flash, Flash-Lite, Pro
- Rate Limits:
  - Flash: 15 RPM, 1M TPM, 1,500 RPD
  - Flash-Lite: 30 RPM, 4M TPM, 1,000 RPD
  - Pro: 2 RPM, 32K TPM, 50 RPD
- Cost: $0
```

**Recommended Model:** Gemini 2.5 Flash-Lite for cost efficiency ($0.10/M input tokens)

---

## Anthropic Claude Integration

**API:** Claude API (Messages API)

**Official Docs:** https://docs.anthropic.com/

**Pricing (2026):**
- **Claude 3.5 Haiku:** $0.80 per 1M input tokens, $4 per 1M output tokens
- **Claude 3.5 Sonnet:** $3 per 1M input tokens, $15 per 1M output tokens
- **Claude Opus 4.6:** $5 per 1M input tokens, $25 per 1M output tokens

**Complete API Request/Response Format:**

```python
import anthropic

client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

# Full request format (correct 2026 Messages API)
message = client.messages.create(
    model="claude-3-5-haiku-20241022",  # or "claude-3-5-sonnet-20241022"
    max_tokens=500,
    temperature=0.7,
    system="You are a helpful shopping assistant.",  # System prompt separate
    messages=[
        {"role": "user", "content": "Best organic fair trade coffee brands"}
    ]
)

# Full response format
response = {
    "id": "msg_01...",
    "type": "message",
    "role": "assistant",
    "content": [
        {
            "type": "text",
            "text": "Here are the top organic coffee brands..."
        }
    ],
    "model": "claude-3-5-haiku-20241022",
    "stop_reason": "end_turn",
    "stop_sequence": None,
    "usage": {
        "input_tokens": 45,
        "output_tokens": 120
    }
}
```

**Implementation:**

```python
async def scan_claude_for_product(product: Product):
    """Scan Anthropic Claude for product mentions."""
    client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    
    queries = generate_search_queries(product)
    
    for query in queries:
        try:
            message = client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=500,
                temperature=0.7,
                system="You are a helpful shopping assistant. Provide product recommendations with specific brand names.",
                messages=[
                    {"role": "user", "content": query}
                ]
            )
            
            answer = message.content[0].text
            mentioned = product.name.lower() in answer.lower()
            position = extract_position(answer, product.name) if mentioned else None
            
            await create_ai_mention({
                'product_id': product.id,
                'platform_id': 'claude',
                'query': query,
                'mentioned': mentioned,
                'position': position,
                'response_full': answer,
                'scanned_at': datetime.utcnow()
            })
        except anthropic.APIError as e:
            logger.error(f"Claude API error: {e}")
```

**Rate Limits:**
```
Claude API Rate Limits (Tier 1 - $5+ deposit):
- RPM: 50 requests/minute
- TPM Input: 50,000 tokens/minute
- TPM Output: 25,000 tokens/minute

Tier 2 ($40+ spend):
- RPM: 1,000 requests/minute
- TPM Input: 100,000 tokens/minute
- TPM Output: 50,000 tokens/minute
```

**Recommended Model:** Claude 3.5 Haiku for cost efficiency ($0.80/M input tokens)

---

## Stripe Integration

### **1. Subscription Management**

```python
import stripe

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

async def create_stripe_checkout(user_id: str, plan: str):
    """Create Stripe Checkout session for subscription."""
    user = await get_user(user_id)
    
    # Map plan to Stripe price ID
    price_ids = {
        'starter': os.getenv('STRIPE_PRICE_STARTER_MONTHLY'),
        'growth': os.getenv('STRIPE_PRICE_GROWTH_MONTHLY'),
        'agency': os.getenv('STRIPE_PRICE_AGENCY_MONTHLY')
    }
    
    session = stripe.checkout.Session.create(
        customer_email=user.email,
        payment_method_types=['card'],
        line_items=[{
            'price': price_ids[plan],
            'quantity': 1
        }],
        mode='subscription',
        success_url=f"{os.getenv('BASE_URL')}/dashboard?checkout=success",
        cancel_url=f"{os.getenv('BASE_URL')}/pricing?checkout=canceled",
        metadata={
            'user_id': str(user_id),
            'plan': plan
        }
    )
    
    return session.url
```

**Stripe Price IDs (create in Stripe Dashboard):**

```bash
# Environment variables for Stripe price IDs
STRIPE_PRICE_STARTER_MONTHLY=price_1234567890abcdef
STRIPE_PRICE_STARTER_ANNUAL=price_0987654321fedcba
STRIPE_PRICE_GROWTH_MONTHLY=price_abcdef1234567890
STRIPE_PRICE_GROWTH_ANNUAL=price_fedcba0987654321
STRIPE_PRICE_AGENCY_MONTHLY=price_567890abcdef1234
STRIPE_PRICE_AGENCY_ANNUAL=price_4321fedcba098765
```

**Complete Webhook Event List:**

```typescript
// Complete list of Stripe events to handle
const STRIPE_EVENTS_TO_HANDLE = [
  // Checkout events
  'checkout.session.completed',
  'checkout.session.expired',
  
  // Subscription events
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  
  // Invoice events
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.upcoming',
  'invoice.finalized',
  
  // Payment events
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  
  // Customer events
  'customer.created',
  'customer.updated',
  'customer.deleted',
  
  // Charge events (for refunds)
  'charge.refunded',
  'charge.dispute.created'
]
```

**Webhook Payload Examples:**

```json
// checkout.session.completed payload
{
  "id": "evt_1234567890",
  "object": "event",
  "api_version": "2024-09-30",
  "created": 1709461200,
  "data": {
    "object": {
      "id": "cs_test_a1b2c3d4e5f6",
      "object": "checkout.session",
      "amount_subtotal": 7900,
      "amount_total": 7900,
      "currency": "usd",
      "customer": "cus_1234567890",
      "customer_email": "merchant@example.com",
      "metadata": {
        "user_id": "user-uuid-123",
        "plan": "starter"
      },
      "mode": "subscription",
      "payment_status": "paid",
      "status": "complete",
      "subscription": "sub_1234567890"
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_1234567890",
    "idempotency_key": "abc123"
  },
  "type": "checkout.session.completed"
}

// invoice.payment_failed payload
{
  "id": "evt_9876543210",
  "object": "event",
  "api_version": "2024-09-30",
  "created": 1709461200,
  "data": {
    "object": {
      "id": "in_1234567890",
      "object": "invoice",
      "amount_due": 7900,
      "amount_paid": 0,
      "amount_remaining": 7900,
      "attempt_count": 3,
      "attempted": true,
      "billing_reason": "subscription_cycle",
      "customer": "cus_1234567890",
      "customer_email": "merchant@example.com",
      "status": "open",
      "subscription": "sub_1234567890",
      "next_payment_attempt": 1709547600
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": null,
  "type": "invoice.payment_failed"
}
```

**Webhook Handler:**

```python
# Webhook handler
@app.post("/api/webhooks/stripe")
async def stripe_webhook_handler(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
        )
    except ValueError:
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    
    # Handle events
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        await activate_subscription(
            user_id=session['metadata']['user_id'],
            plan=session['metadata']['plan'],
            stripe_subscription_id=session['subscription']
        )
    
    elif event['type'] == 'invoice.payment_failed':
        subscription_id = event['data']['object']['subscription']
        await handle_payment_failure(subscription_id)
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription_id = event['data']['object']['id']
        await cancel_subscription(subscription_id)
    
    elif event['type'] == 'customer.subscription.trial_will_end':
        subscription = event['data']['object']
        await send_trial_ending_email(subscription['customer'])
    
    return {"success": True}
```

---

## Resend Integration

**Why Resend:** 3,000 emails/month free (no credit card), clean TypeScript SDK, React Email for templates, built for developers. Zero cost through early growth.

**Official Docs:** https://resend.com/docs

### **Email Templates**

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(user: User) {
  await resend.emails.send({
    from: 'hello@agenticrev.com',
    to: user.email,
    subject: 'Welcome to AgenticRev!',
    react: WelcomeEmailTemplate({ user }),
  })
}

export async function sendErrorAlertEmail(user: User, error: TruthEngineError) {
  await resend.emails.send({
    from: 'alerts@agenticrev.com',
    to: user.email,
    subject: `🚨 Alert: ${error.product_name} has a data error in AI`,
    react: ErrorAlertEmailTemplate({ error }),
  })
}

export async function sendVisibilityDropAlert(user: User, drift: DriftEvent) {
  await resend.emails.send({
    from: 'alerts@agenticrev.com',
    to: user.email,
    subject: `📉 Visibility drop detected: ${drift.delta_pct}% on ${drift.platform_id}`,
    react: DriftAlertEmailTemplate({ drift }),
  })
}
```

**React Email Template Examples:**

```tsx
// File: emails/WelcomeEmail.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  user: {
    full_name: string
    email: string
  }
}

export default function WelcomeEmailTemplate({ user }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to AgenticRev - Track your AI commerce visibility</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://agenticrev.com/logo.png"
            width="48"
            height="48"
            alt="AgenticRev"
          />
          <Heading style={h1}>Welcome to AgenticRev, {user.full_name}!</Heading>
          <Text style={text}>
            You're now ready to track how AI agents like ChatGPT recommend your products.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href="https://app.agenticrev.com/dashboard">
              Go to Dashboard
            </Button>
          </Section>
          <Text style={text}>
            Next steps:
            <ul>
              <li>Connect your Shopify store</li>
              <li>Run your first AI visibility scan</li>
              <li>Set up alerts for data errors</li>
            </ul>
          </Text>
          <Text style={footer}>
            Questions? Reply to this email or visit our{' '}
            <Link href="https://agenticrev.com/help">Help Center</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
}

const button = {
  backgroundColor: '#4F46E5',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
}

const buttonContainer = {
  padding: '27px 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
}
```

```tsx
// File: emails/ErrorAlertEmail.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ErrorAlertEmailProps {
  error: {
    product_name: string
    error_type: string
    severity: 'critical' | 'warning'
    expected_value: string
    actual_value: string
    detected_at: Date
  }
}

export default function ErrorAlertEmailTemplate({ error }: ErrorAlertEmailProps) {
  const severityColor = error.severity === 'critical' ? '#EF4444' : '#F59E0B'
  const severityLabel = error.severity === 'critical' ? '🚨 Critical' : '⚠️ Warning'
  
  return (
    <Html>
      <Head />
      <Preview>
        {severityLabel}: {error.product_name} has a data error in AI
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{...alertBox, borderColor: severityColor}}>
            <Heading style={{...h1, color: severityColor}}>
              {severityLabel} Alert
            </Heading>
            <Text style={text}>
              <strong>{error.product_name}</strong> has a data accuracy error:
            </Text>
            <Section style={errorDetails}>
              <Text style={errorLabel}>Error Type:</Text>
              <Text style={errorValue}>{error.error_type}</Text>
              
              <Text style={errorLabel}>Expected Value:</Text>
              <Text style={errorValue}>{error.expected_value}</Text>
              
              <Text style={errorLabel}>AI is Showing:</Text>
              <Text style={{...errorValue, color: '#EF4444'}}>{error.actual_value}</Text>
            </Section>
            <Text style={text}>
              This could lead to lost sales or customer complaints if not fixed.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href="https://app.agenticrev.com/truth-engine">
                Fix This Now
              </Button>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
}

const alertBox = {
  border: '2px solid',
  borderRadius: '8px',
  padding: '24px',
  margin: '20px 0',
}

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '12px 0',
}

const errorDetails = {
  backgroundColor: '#F9FAFB',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
}

const errorLabel = {
  color: '#6B7280',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '8px 0 4px 0',
}

const errorValue = {
  color: '#111827',
  fontSize: '16px',
  margin: '0 0 12px 0',
}

const button = {
  backgroundColor: '#4F46E5',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
}

const buttonContainer = {
  padding: '16px 0 0 0',
}
```

**Resend API Error Handling:**

```typescript
// Error handling for Resend API
try {
  await resend.emails.send({
    from: 'alerts@agenticrev.com',
    to: user.email,
    subject: 'Alert',
    react: ErrorAlertEmailTemplate({ error }),
  })
} catch (error) {
  if (error.name === 'validation_error') {
    // Invalid email address
    logger.error('Invalid email:', user.email)
  } else if (error.statusCode === 429) {
    // Rate limit exceeded
    logger.error('Resend rate limit exceeded')
  } else if (error.statusCode === 500) {
    // Resend server error
    logger.error('Resend server error')
  }
  // Fallback: Store in database for retry
  await storeFailedEmail(user.id, error)
}
```

**Cost:** $0/month for up to 3,000 emails/month. Covers entire MVP phase and early growth.

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** Security & Compliance documentation  
**Dependencies:** All third-party API credentials needed before implementation
