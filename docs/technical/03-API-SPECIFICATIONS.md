# API Specifications
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 🟢 Final - Ready for Development  
**Owner:** Engineering Team  

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Endpoints](#endpoints)
   - [Auth Endpoints](#auth-endpoints)
   - [Store Endpoints](#store-endpoints)
   - [Product Endpoints](#product-endpoints)
   - [Visibility Endpoints](#visibility-endpoints)
   - [Truth Engine Endpoints](#truth-engine-endpoints)
   - [ACP Endpoints](#acp-endpoints)
   - [Subscription Endpoints](#subscription-endpoints)
   - [Alert Endpoints](#alert-endpoints)
   - [Webhook Endpoints](#webhook-endpoints)
6. [WebSocket Events](#websocket-events)

---

## API Overview

### **Base URL**
- **Production:** `https://api.agenticrev.com`
- **Staging:** `https://api-staging.agenticrev.com`
- **Local Dev:** `http://localhost:3000/api`

### **API Architecture**
- **Frontend API:** Next.js API Routes (`/app/api/*`)
- **Backend Services:** Next.js API Route Handlers on Vercel Functions (same repo, TypeScript, auto-deployed)
- **Protocol:** REST + Server-Sent Events (SSE) for real-time updates

### **Request Format**
- **Content-Type:** `application/json`
- **Authentication:** Bearer token in `Authorization` header
- **Timestamps:** ISO 8601 format (UTC)

### **Response Format**
```typescript
// Success Response
{
  "success": true,
  "data": { ...actual response data... },
  "meta": {
    "timestamp": "2026-03-03T10:00:00Z",
    "request_id": "req_123456"
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "received": "not-an-email"
    }
  },
  "meta": {
    "timestamp": "2026-03-03T10:00:00Z",
    "request_id": "req_123456"
  }
}
```

---

## Authentication

### **JWT Token Structure**

```typescript
// Token Payload
{
  "sub": "user-uuid-123", // User ID
  "email": "merchant@example.com",
  "plan": "starter",
  "iat": 1709461200, // Issued at
  "exp": 1709547600  // Expires at (24 hours)
}
```

### **Getting a Token**

**Login Flow:**
1. User posts credentials to `/api/auth/login`
2. API validates credentials
3. API returns JWT token + refresh token
4. Client stores token in memory (not localStorage for security)
5. Client includes token in all subsequent requests

**Token Refresh:**
- Access token expires after 24 hours
- Refresh token valid for 30 days
- Call `/api/auth/refresh` with refresh token to get new access token

---

## Error Handling

### **HTTP Status Codes**

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET/POST/PUT request |
| 201 | Created | Resource successfully created |
| 204 | No Content | Successful DELETE (no response body) |
| 400 | Bad Request | Invalid request data (validation error) |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (duplicate) |
| 422 | Unprocessable Entity | Valid syntax but semantic error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error (bug) |
| 503 | Service Unavailable | Server temporarily down |

### **Error Codes**

```typescript
enum ErrorCode {
  // Auth Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Resource Errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Business Logic Errors
  PLAN_LIMIT_EXCEEDED = 'PLAN_LIMIT_EXCEEDED',
  STORE_NOT_CONNECTED = 'STORE_NOT_CONNECTED',
  SYNC_IN_PROGRESS = 'SYNC_IN_PROGRESS',
  
  // External API Errors
  SHOPIFY_API_ERROR = 'SHOPIFY_API_ERROR',
  OPENAI_API_ERROR = 'OPENAI_API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```

---

## Rate Limiting

### **Limits by Plan**

| Plan | Requests/Minute | Requests/Hour | Requests/Day |
|------|-----------------|---------------|--------------|
| Free | 30 | 500 | 5,000 |
| Starter | 100 | 2,000 | 20,000 |
| Growth | 300 | 10,000 | 100,000 |
| Agency | 1,000 | 50,000 | 500,000 |

### **Rate Limit Headers**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1709461260
```

### **Rate Limit Error Response**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 45 seconds.",
    "details": {
      "limit": 100,
      "reset_at": "2026-03-03T10:01:00Z"
    }
  }
}
```

---

## Endpoints

## Auth Endpoints

### **POST /api/auth/signup**
Create a new user account.

**Request:**
```json
{
  "email": "merchant@example.com",
  "password": "SecurePass123!",
  "full_name": "Jane Merchant",
  "company_name": "Eco Shop"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid-123",
      "email": "merchant@example.com",
      "full_name": "Jane Merchant",
      "email_verified": false
    },
    "message": "Verification email sent to merchant@example.com"
  }
}
```

**Errors:**
- `409`: Email already registered
- `400`: Password doesn't meet requirements (min 8 chars, 1 number, 1 special)

---

### **POST /api/auth/login**
Authenticate user and get tokens.

**Request:**
```json
{
  "email": "merchant@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "user": {
      "id": "user-uuid-123",
      "email": "merchant@example.com",
      "plan": "starter"
    }
  }
}
```

**Errors:**
- `401`: Invalid credentials
- `403`: Email not verified

---

### **POST /api/auth/refresh**
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400
  }
}
```

---

### **GET /api/auth/shopify**
Initiate Shopify OAuth flow (redirects to Shopify).

**Query Parameters:**
- None (user clicks "Sign Up with Shopify" button)

**Response:** `302 Redirect`
- Redirects to: `https://accounts.shopify.com/oauth/authorize?client_id=...&scope=read_products,write_orders,...`

---

### **GET /api/auth/shopify/callback**
Shopify OAuth callback (handled automatically).

**Query Parameters:**
- `code`: Authorization code from Shopify
- `shop`: Shopify store domain
- `hmac`: HMAC signature for verification

**Response:** `302 Redirect`
- Redirects to: `/dashboard` (with auth cookie set)

---

## Store Endpoints

### **POST /api/stores**
Connect a new store (Shopify or WooCommerce).

**Request (Shopify - OAuth already handled):**
```json
{
  "platform": "shopify",
  "store_url": "eco-shop.myshopify.com",
  "access_token": "shpat_xxxxx" // From OAuth flow
}
```

**Request (WooCommerce):**
```json
{
  "platform": "woocommerce",
  "store_url": "https://ecoshop.com",
  "api_key": "ck_xxxxx",
  "api_secret": "cs_xxxxx"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "store": {
      "id": "store-uuid-123",
      "platform": "shopify",
      "store_url": "eco-shop.myshopify.com",
      "store_name": "Eco Shop",
      "sync_status": "pending",
      "product_count": 0,
      "connected_at": "2026-03-03T10:00:00Z"
    },
    "message": "Store connected. Starting initial product sync..."
  }
}
```

**Errors:**
- `409`: Store already connected
- `400`: Invalid API credentials (WooCommerce)
- `403`: Plan limit exceeded (max stores)

---

### **GET /api/stores**
List all connected stores for user.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "id": "store-uuid-123",
        "platform": "shopify",
        "store_url": "eco-shop.myshopify.com",
        "store_name": "Eco Shop",
        "product_count": 47,
        "last_sync_at": "2026-03-03T08:00:00Z",
        "sync_status": "success"
      }
    ],
    "total": 1
  }
}
```

---

### **GET /api/stores/:id**
Get details for a specific store.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "store": {
      "id": "store-uuid-123",
      "platform": "shopify",
      "store_url": "eco-shop.myshopify.com",
      "store_name": "Eco Shop",
      "store_domain": "ecoshop.com",
      "product_count": 47,
      "last_sync_at": "2026-03-03T08:00:00Z",
      "sync_status": "success",
      "sync_error": null,
      "connected_at": "2026-03-01T10:00:00Z"
    }
  }
}
```

---

### **POST /api/stores/:id/sync**
Trigger manual product sync for store.

**Response:** `202 Accepted`
```json
{
  "success": true,
  "data": {
    "message": "Sync initiated",
    "job_id": "job-uuid-456",
    "estimated_duration": "2-5 minutes"
  }
}
```

**Errors:**
- `409`: Sync already in progress

---

### **DELETE /api/stores/:id**
Disconnect store (soft delete).

**Response:** `204 No Content`

---

## Product Endpoints

### **GET /api/products**
List products for user (with filtering and pagination).

**Query Parameters:**
- `store_id` (optional): Filter by store
- `in_stock` (optional): true/false
- `search` (optional): Search by name
- `sort` (optional): `name`, `price`, `updated_at` (default: `name`)
- `order` (optional): `asc`, `desc` (default: `asc`)
- `page` (default: 1)
- `limit` (default: 50, max: 100)

**Example:** `GET /api/products?in_stock=true&sort=price&order=desc&page=1&limit=20`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product-uuid-123",
        "store_id": "store-uuid-123",
        "platform_id": "7891234567890",
        "name": "Organic Fair Trade Coffee Blend",
        "description": "Premium organic coffee...",
        "price": 24.99,
        "currency": "USD",
        "inventory_quantity": 150,
        "in_stock": true,
        "image_url": "https://cdn.shopify.com/...",
        "product_url": "https://ecoshop.com/products/organic-coffee",
        "ai_readability_score": 87,
        "synced_at": "2026-03-03T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "total_pages": 3
    }
  }
}
```

---

### **GET /api/products/:id**
Get details for a specific product.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "product-uuid-123",
      "store_id": "store-uuid-123",
      "platform_id": "7891234567890",
      "sku": "COFFEE-ORG-001",
      "name": "Organic Fair Trade Coffee Blend",
      "description": "Premium organic coffee beans...",
      "product_type": "Physical",
      "category": "Coffee & Tea",
      "tags": ["organic", "fair-trade", "coffee"],
      "price": 24.99,
      "compare_at_price": 29.99,
      "currency": "USD",
      "inventory_quantity": 150,
      "in_stock": true,
      "track_inventory": true,
      "image_url": "https://cdn.shopify.com/...",
      "images": ["https://...", "https://..."],
      "product_url": "https://ecoshop.com/products/organic-coffee",
      "schema_json": { /* JSON-LD structured data */ },
      "ai_readability_score": 87,
      "created_at": "2026-03-01T10:00:00Z",
      "updated_at": "2026-03-03T08:00:00Z",
      "synced_at": "2026-03-03T08:00:00Z"
    }
  }
}
```

---

### **PUT /api/products/:id**
Update product (triggers resync to AI platforms).

**Request:**
```json
{
  "name": "Organic Fair Trade Coffee Blend - New Harvest",
  "price": 26.99,
  "inventory_quantity": 200
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "product": { /* updated product object */ },
    "message": "Product updated. Changes will sync to AI platforms within 24 hours."
  }
}
```

---

## Visibility Endpoints

### **GET /api/visibility/dashboard**
Get dashboard metrics (hero cards, recent mentions).

**Query Parameters:**
- `period` (optional): `7d`, `30d`, `90d` (default: `7d`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "metrics": {
      "total_mentions": 47,
      "mentions_change": 12, // vs. previous period
      "mentions_change_percent": 34.3,
      "products_visible": 23,
      "products_total": 50,
      "visibility_rate": 46,
      "top_platform": {
        "name": "ChatGPT",
        "slug": "chatgpt",
        "mentions": 29
      }
    },
    "timeline": [
      {
        "date": "2026-02-25",
        "chatgpt": 3,
        "perplexity": 1,
        "gemini": 0,
        "claude": 1
      },
      // ... 7 days of data
    ],
    "top_products": [
      {
        "product_id": "product-uuid-123",
        "product_name": "Organic Coffee Blend",
        "mentions": 18,
        "avg_position": 1.8
      }
    ],
    "recent_mentions": [
      {
        "id": "mention-uuid-456",
        "platform": "ChatGPT",
        "product_name": "Organic Coffee Blend",
        "query": "Best organic fair trade coffee",
        "position": 2,
        "sentiment": "positive",
        "scanned_at": "2026-03-03T03:00:00Z"
      }
    ]
  }
}
```

---

### **GET /api/visibility/products/:id**
Get AI visibility details for a specific product.

**Query Parameters:**
- `period` (optional): `7d`, `30d`, `90d` (default: `30d`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "product-uuid-123",
      "name": "Organic Coffee Blend",
      "image_url": "https://..."
    },
    "metrics": {
      "total_mentions": 47,
      "avg_position": 2.3,
      "sentiment_positive": 78,
      "sentiment_neutral": 18,
      "sentiment_negative": 4,
      "platforms": {
        "chatgpt": { "mentions": 32, "avg_position": 1.8 },
        "perplexity": { "mentions": 12, "avg_position": 2.5 },
        "gemini": { "mentions": 3, "avg_position": 4.0 },
        "claude": { "mentions": 0, "avg_position": null }
      }
    },
    "timeline": [
      {
        "date": "2026-03-01",
        "mentions": 7
      }
    ],
    "queries": [
      {
        "query": "Best organic fair trade coffee brands",
        "platforms": ["chatgpt", "perplexity"],
        "position": 2,
        "last_seen": "2026-03-03T03:00:00Z"
      }
    ],
    "missed_opportunities": [
      {
        "query": "Eco-friendly coffee subscription",
        "competitors": ["BrandX", "BrandY"],
        "suggestion": "Add keyword 'subscription' to product description"
      }
    ]
  }
}
```

---

### **POST /api/visibility/scan**
Trigger manual AI visibility scan (all products).

**Response:** `202 Accepted`
```json
{
  "success": true,
  "data": {
    "message": "Scan initiated",
    "job_id": "scan-job-uuid-789",
    "products_count": 47,
    "estimated_duration": "3-5 minutes"
  }
}
```

**Errors:**
- `429`: Scan quota exceeded for plan (Free: 1x/week, Starter: 1x/day)

---

### **GET /api/visibility/scan/:job_id**
Check status of scan job (polling endpoint).

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "job_id": "scan-job-uuid-789",
    "status": "processing", // 'pending', 'processing', 'completed', 'failed'
    "progress": {
      "current": 23,
      "total": 47,
      "percent": 49
    },
    "started_at": "2026-03-03T10:01:00Z",
    "completed_at": null
  }
}
```

---

## Truth Engine Endpoints

### **GET /api/truth-engine/errors**
List data accuracy errors.

**Query Parameters:**
- `severity` (optional): `critical`, `warning`
- `resolved` (optional): `true`, `false`
- `page`, `limit`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "errors": [
      {
        "id": "error-uuid-123",
        "product_id": "product-uuid-123",
        "product_name": "Organic Coffee Blend",
        "error_type": "price_mismatch",
        "severity": "critical",
        "source": "chatgpt",
        "expected_value": "24.99",
        "actual_value": "19.99",
        "error_message": "ChatGPT displaying outdated price",
        "fix_suggestion": "Sync current price to AI feed",
        "resolved": false,
        "detected_at": "2026-03-03T02:00:00Z"
      }
    ],
    "summary": {
      "critical": 2,
      "warning": 5,
      "total_unresolved": 7
    },
    "data_health_score": 87
  }
}
```

---

### **POST /api/truth-engine/errors/:id/fix**
Attempt to auto-fix an error.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "error_id": "error-uuid-123",
    "fix_applied": true,
    "message": "Price updated to $24.99. AI platforms will reflect changes within 24 hours.",
    "resolved_at": "2026-03-03T10:05:00Z"
  }
}
```

**Errors:**
- `422`: Error not auto-fixable (manual intervention required)

---

### **POST /api/truth-engine/errors/:id/ignore**
Mark error as ignored (won't show in dashboard).

**Response:** `200 OK`

---

### **GET /api/truth-engine/health/:product_id**
Get data health score for a product.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "product_id": "product-uuid-123",
    "health_score": 87,
    "checks": {
      "price_accurate": true,
      "inventory_accurate": true,
      "schema_present": true,
      "schema_valid": false,
      "ai_readability": 87
    },
    "recommendations": [
      "Add more detailed product description for better AI understanding",
      "Include material type in structured data"
    ]
  }
}
```

---

## ACP Endpoints

### **POST /api/acp/feeds**
Generate OpenAI ACP product feed.

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "feed": {
      "id": "feed-uuid-123",
      "feed_url": "https://s3.amazonaws.com/.../feed-2026-03-03.json",
      "product_count": 47,
      "status": "generated",
      "schema_valid": true,
      "generated_at": "2026-03-03T10:00:00Z"
    },
    "message": "Feed generated successfully. Ready to submit to OpenAI."
  }
}
```

**Errors:**
- `403`: Feature requires Growth plan

---

### **POST /api/acp/feeds/:id/submit**
Submit feed to OpenAI Commerce API.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "feed_id": "feed-uuid-123",
    "status": "submitted",
    "openai_submission_id": "acp-sub-xxxxx",
    "submitted_at": "2026-03-03T10:01:00Z",
    "message": "Feed submitted for review. Approval typically takes 1-2 business days."
  }
}
```

---

### **GET /api/acp/orders**
List ACP orders (ChatGPT checkout).

**Query Parameters:**
- `status`: `pending`, `fulfilled`, `canceled`
- `date_from`, `date_to`
- `page`, `limit`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order-uuid-123",
        "openai_order_id": "acp-order-xxxxx",
        "shopify_order_id": "4567890123",
        "order_number": "#ACP-1001",
        "customer_email": "customer@example.com",
        "total": 56.82,
        "currency": "USD",
        "line_items": [
          {
            "product_id": "product-uuid-123",
            "product_name": "Organic Coffee Blend",
            "quantity": 2,
            "price": 24.99
          }
        ],
        "fulfillment_status": "fulfilled",
        "placed_at": "2026-03-03T14:30:00Z"
      }
    ],
    "analytics": {
      "total_orders": 12,
      "total_revenue": 682.24,
      "avg_order_value": 56.85
    }
  }
}
```

---

## Subscription Endpoints

### **GET /api/subscription**
Get current subscription details.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub-uuid-123",
      "plan": "starter",
      "status": "active",
      "price_per_month": 79.00,
      "currency": "USD",
      "billing_cycle": "monthly",
      "current_period_start": "2026-03-01T00:00:00Z",
      "current_period_end": "2026-04-01T00:00:00Z",
      "limits": {
        "max_products": 100,
        "max_stores": 1,
        "historical_data_days": 30,
        "acp_enabled": false
      },
      "usage": {
        "products": 47,
        "stores": 1
      }
    }
  }
}
```

---

### **POST /api/subscription/upgrade**
Upgrade to higher plan.

**Request:**
```json
{
  "new_plan": "growth",
  "billing_cycle": "monthly" // or "annual"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "subscription": { /* updated subscription */ },
    "stripe_checkout_url": "https://checkout.stripe.com/pay/cs_xxxxx",
    "message": "Redirecting to Stripe Checkout..."
  }
}
```

---

## Alert Endpoints

### **GET /api/alerts**
Get user's alert preferences.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert-uuid-123",
        "alert_type": "price_mismatch",
        "email_enabled": true,
        "sms_enabled": false,
        "in_app_enabled": true,
        "frequency": "immediate",
        "enabled": true
      }
    ]
  }
}
```

---

### **PUT /api/alerts/:id**
Update alert preferences.

**Request:**
```json
{
  "email_enabled": true,
  "sms_enabled": true,
  "frequency": "daily_digest"
}
```

**Response:** `200 OK`

---

## Webhook Endpoints

### **POST /api/webhooks/shopify**
Receive webhooks from Shopify.

**Headers:**
- `X-Shopify-Topic`: `products/update`
- `X-Shopify-Hmac-SHA256`: HMAC signature
- `X-Shopify-Shop-Domain`: `eco-shop.myshopify.com`

**Request Body:** (Shopify product object)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Webhook received"
}
```

---

### **POST /api/webhooks/acp**
Receive webhooks from OpenAI ACP.

**Headers:**
- `X-OpenAI-Signature`: Webhook signature

**Request Body:**
```json
{
  "event": "order.created",
  "data": {
    "order_id": "acp-order-xxxxx",
    "merchant_id": "user-uuid-123",
    "total": 56.82,
    "line_items": [...]
  }
}
```

**Response:** `200 OK`

---

## WebSocket Events

### **Connection**
```javascript
const ws = new WebSocket('wss://api.agenticrev.com/ws');
ws.send(JSON.stringify({
  action: 'authenticate',
  token: 'your-jwt-token'
}));
```

### **Events**

#### **scan.progress**
Real-time updates during AI visibility scan.

```json
{
  "event": "scan.progress",
  "data": {
    "job_id": "scan-job-uuid-789",
    "progress": {
      "current": 23,
      "total": 47,
      "percent": 49
    },
    "current_product": "Organic Coffee Blend",
    "current_platform": "ChatGPT"
  }
}
```

#### **error.detected**
Real-time alert when Truth Engine finds error.

```json
{
  "event": "error.detected",
  "data": {
    "error_id": "error-uuid-123",
    "product_name": "Organic Coffee Blend",
    "error_type": "price_mismatch",
    "severity": "critical"
  }
}
```

#### **acp.order**
Real-time notification of new ACP order.

```json
{
  "event": "acp.order",
  "data": {
    "order_id": "order-uuid-123",
    "total": 56.82,
    "is_first_order": true
  }
}
```

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** Integration Specifications (Shopify, OpenAI ACP details)  
**Dependencies:** Frontend and backend teams can start API implementation
