# Technical Architecture Document
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 🟢 Final - Ready for Development  
**Owner:** Engineering Team  

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Component Specifications](#component-specifications)
5. [Data Flow](#data-flow)
6. [Infrastructure & Deployment](#infrastructure--deployment)
7. [Security Architecture](#security-architecture)
8. [Scalability & Performance](#scalability--performance)
9. [Third-Party Integrations](#third-party-integrations)
10. [Development Environment](#development-environment)

---

## System Overview

### **Architecture Pattern**
**Single-Platform Serverless** — Vercel + Supabase, zero AWS

**Why This Approach:**
- ✅ Zero AWS overhead — no IAM roles, no VPC, no Docker, no ECR, no EventBridge to configure
- ✅ One deployment pipeline — `git push` and Vercel deploys frontend + backend simultaneously
- ✅ TypeScript end-to-end — shared types between frontend and API routes, no language context-switch
- ✅ $45/month total infra at launch (Vercel Pro $20 + Supabase Pro $25)
- ✅ Built-in Cron Jobs on Vercel — replaces EventBridge, zero config, zero cost
- ✅ Migrate individual services to AWS Lambda in Phase 3+ only if Vercel function limits are reached

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  Next.js Frontend (React) - Vercel Edge Network             │
│  - Dashboard UI                                              │
│  - Truth Engine Interface                                    │
│  - ACP Setup Wizard                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                       │
│  Next.js API Routes (Serverless Functions)                  │
│  - Authentication (NextAuth.js)                              │
│  - REST API Endpoints                                        │
│  - Rate Limiting & Validation                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                     │
│  Next.js API Route Handlers (TypeScript) — Vercel           │
│  - AI Visibility Scanner (Vercel Cron + Function)           │
│  - Truth Engine Processor (Cron + Webhook Function)         │
│  - ACP Feed Generator (On-demand Function)                  │
│  - Shopify Sync (Webhook Handler Function)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATA STORAGE LAYER                      │
│  PostgreSQL (Supabase) - Primary Database + Job Queue       │
│  Supabase Storage - ACP Feeds, Exports (S3-compatible API)  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                      │
│  Shopify API | WooCommerce API | OpenAI API |               │
│  Perplexity API | Anthropic API | Google Gemini API         │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### **Frontend**

#### **Framework: Next.js 14 (App Router)**
- **Why:** Server-side rendering for SEO, serverless deployment, React ecosystem
- **Version:** 14.x (stable)
- **Deployment:** Vercel (auto-scaling, edge network, zero config)

#### **UI Library: React 18**
- **Why:** Industry standard, massive ecosystem, excellent developer experience
- **State Management:** Zustand (lightweight vs. Redux)
- **Data Fetching:** SWR (Vercel's data fetching library, built for Next.js)

#### **Component Library: shadcn/ui + Tailwind CSS**
- **Why:** Modern, accessible, customizable, no runtime overhead
- **Tailwind CSS:** Utility-first, fast development, small bundle
- **Icons:** Lucide React (tree-shakeable, consistent design)

#### **Charts/Visualization: Recharts**
- **Why:** React-native, composable, good documentation
- **Use Cases:** Timeline graphs, visibility trends, conversion funnels

#### **Forms: React Hook Form + Zod**
- **Why:** Performant (uncontrolled components), type-safe validation
- **Zod:** Schema validation matching backend API contracts

---

### **Backend**

#### **API Layer: Next.js API Routes**
- **Language:** TypeScript
- **Location:** `/app/api/*` routes in Next.js
- **Purpose:** Thin API layer, authentication, request validation
- **Deployment:** Vercel Serverless Functions (auto-scale, 10s timeout default)

#### **Business Logic: Next.js API Route Handlers (Vercel Functions)**
- **Why:** Same codebase, same deployment, same language as frontend — zero Docker/AWS overhead
- **Deployment:** Vercel (auto-deployed with every `git push`, no separate config)
- **Runtime:** Node.js 18 (TypeScript)
- **Async:** Uses native `fetch` + `Promise.all` for concurrent AI platform calls
- **Cron:** Vercel Cron Jobs (`vercel.json`) — replaces AWS EventBridge, zero config, zero cost
- **Phase 3 note:** AWS Lambda added only if Vercel function limits (60s timeout, 1GB memory) are hit at scale

**Service Breakdown:**

1. **AI Scanner Service** (`/app/api/scanner/route.ts`)
   - Queries ChatGPT, Perplexity, Gemini, Claude via `Promise.all`
   - Parses AI responses, detects product mentions
   - Stores results in PostgreSQL
   - Triggered: Vercel Cron (daily 3am UTC) + on-demand via API

2. **Truth Engine Service** (`/app/api/truth-engine/route.ts`)
   - Compares Shopify data vs. AI-displayed data
   - Detects errors (price, inventory, descriptions)
   - Sends alerts via Resend
   - Triggered: Vercel Cron (daily) + real-time Shopify webhooks

3. **ACP Feed Generator** (`/app/api/acp/generate/route.ts`)
   - Fetches products from PostgreSQL
   - Generates OpenAI ACP JSON format
   - Validates against ACP schema
   - Uploads to Supabase Storage, submits to OpenAI API
   - Triggered: On-demand + Vercel Cron (daily sync)

4. **Shopify Sync Service** (`/app/api/webhooks/shopify/route.ts`)
   - Handles Shopify webhooks (product update, delete)
   - Syncs product catalog to PostgreSQL inline (no queue needed at MVP scale)
   - Triggered: Real-time webhooks + Vercel Cron (15-min polling fallback)

---

### **Database**

#### **Primary Database: PostgreSQL (Supabase)**
- **Why:** Relational data (products, users, mentions), excellent Next.js integration
- **Hosting:** Supabase (managed Postgres, generous free tier)
- **Features:** Row-level security, real-time subscriptions, automatic backups
- **Size Estimate:** 10GB for 10,000 merchants (manageable on free/hobby tier)

**Schema Overview:**
- `users` - Merchant accounts
- `stores` - Connected Shopify/WooCommerce stores
- `products` - Synced product catalog
- `ai_mentions` - AI visibility tracking data
- `truth_engine_errors` - Data accuracy errors
- `acp_orders` - Orders from ChatGPT checkout
- `subscriptions` - Billing data

(Full schema in separate doc: `02-DATABASE-SCHEMA.md`)

#### **Object Storage: Supabase Storage**
- **Why:** Already in the stack — no second cloud account, 1 GB free, $0.021/GB thereafter, S3-compatible API (zero migration effort later)
- **Buckets:**
  - `acp-feeds` - Generated ACP JSON files per merchant
  - `exports` - CSV/PDF exports for users
- **Note:** Product images stay on Shopify CDN — referenced by URL, never re-hosted

#### **Job Queue: PostgreSQL (SKIP LOCKED pattern)**
- **Why:** Eliminates Redis/SQS entirely — Postgres handles job queuing well at MVP scale
- **Pattern:** Workers poll a `jobs` table with `SELECT FOR UPDATE SKIP LOCKED` — concurrent-safe, zero additional service
- **Upgrade path:** Add BullMQ + Upstash Redis only if job volume exceeds ~50K tasks/day (Phase 3+)

---

### **Hosting & Infrastructure**

#### **Frontend + Backend: Vercel**
- **Plan:** Pro ($20/mo) — required for 60s function timeout (AI API fan-out calls), Cron Jobs, and team features
- **Functions:** API routes run as Vercel Serverless Functions — same deploy, same repo, no Docker
- **Cron Jobs:** Defined in `vercel.json`, replaces AWS EventBridge — zero cost, zero config
- **Timeout:** 60s on Pro (sufficient for 4-platform parallel AI calls)
- **Performance:** <100ms TTFB globally via edge network

#### **Database + Storage: Supabase**
- **Plan:** Free tier (500MB DB + 1GB Storage) for MVP sprint; Pro at $25/mo (8GB) for production
- **Backups:** Daily automatic backups included
- **Connection Pooling:** PgBouncer built-in (handles Vercel Function connection surge)
- **Storage:** Supabase Storage included — replaces AWS S3 for ACP feeds and exports

> **Total infra cost: Vercel Pro $20 + Supabase Pro $25 = $45/month.** Zero AWS services required through Phase 2.

---

## Architecture Diagram

### **Request Flow: User Viewing Dashboard**

```
User Browser
    ↓
[Next.js Frontend on Vercel]
    ↓ (Fetch visibility data)
[Next.js API Route: /api/visibility/dashboard]
    ↓ (Authenticate with NextAuth)
[PostgreSQL (Supabase)]
    ← (Query recent AI mentions)
[Return JSON to frontend]
    ↓
[Recharts renders graphs]
```

---

### **Request Flow: AI Visibility Scan**

```
Cron Trigger (daily 3am UTC)
    ↓
[Vercel Cron Job → /api/cron/scanner]
    ↓
[AI Scanner Route Handler (TypeScript)]
    ↓
Promise.all — parallel fetch:
    → OpenAI API (ChatGPT)
    → Perplexity API
    → Anthropic API (Claude)
    → Google Gemini API
    ↓
[Parse Responses]
    ↓
[PostgreSQL: Insert to ai_mentions table]
    ↓
[Check for position/sentiment changes]
    ↓ (If significant change)
[Send Alert via Resend Email API]
```

---

### **Request Flow: Shopify Product Update**

```
Merchant updates product in Shopify
    ↓
[Shopify Webhook: products/update]
    ↓ (POST to)
[Next.js API Route: /api/webhooks/shopify]
    ↓ (Verify HMAC signature)
[Process inline — update PostgreSQL products table]
    ↓
[Trigger Truth Engine check]
    ↓ (If data mismatch found)
[Create error in truth_engine_errors table]
    ↓
[Send alert email to merchant]
```

---

### **Request Flow: ACP Order (ChatGPT Checkout)**

```
Customer completes purchase in ChatGPT
    ↓
[OpenAI ACP Webhook: order.created]
    ↓ (POST to)
[Next.js API Route: /api/webhooks/acp]
    ↓ (Verify OpenAI signature)
[PostgreSQL: Insert to acp_orders table]
    ↓
[Shopify API: Create Order]
    ↓ (Order synced to merchant's Shopify)
[Send confirmation email to merchant + customer]
    ↓
[In-app notification: "First ACP order!"]
```

---

## Component Specifications

### **Frontend Components**

#### **1. Dashboard Layout**
**Path:** `/app/dashboard/page.tsx`

```typescript
// Simplified component structure
export default function DashboardPage() {
  const { data: metrics } = useSWR('/api/visibility/metrics')
  const { data: alerts } = useSWR('/api/alerts/recent')
  
  return (
    <DashboardLayout>
      <MetricsHeader metrics={metrics} />
      <AlertsPanel alerts={alerts} />
      <VisibilityChart data={metrics.timeline} />
      <ProductTable products={metrics.products} />
    </DashboardLayout>
  )
}
```

**Dependencies:**
- SWR for data fetching (auto-refresh every 30s)
- Recharts for `<VisibilityChart>`
- shadcn/ui for `<Table>`, `<Card>`, `<Alert>`

---

#### **2. AI Visibility Chart**
**Path:** `/components/dashboard/VisibilityChart.tsx`

**Features:**
- Line chart showing mentions over time (7/30/90 days)
- Multi-series (ChatGPT, Perplexity, Gemini, Claude)
- Hover tooltip with query examples
- Responsive (mobile: stacked, desktop: side-by-side)

**Data Format:**
```typescript
interface VisibilityData {
  date: string // "2026-03-01"
  chatgpt: number
  perplexity: number
  gemini: number
  claude: number
}
```

---

#### **3. Truth Engine Error Card**
**Path:** `/components/truth-engine/ErrorCard.tsx`

```typescript
interface ErrorCardProps {
  error: {
    id: string
    product_name: string
    error_type: 'price_mismatch' | 'inventory_error' | 'missing_schema'
    severity: 'critical' | 'warning'
    shopify_value: string
    ai_value: string
    detected_at: Date
  }
  onFix: (errorId: string) => void
}
```

**Behavior:**
- Red border for critical, yellow for warning
- "Fix Now" button triggers modal with side-by-side comparison
- Optimistic UI update (mark resolved immediately, rollback if API fails)

---

### **Backend Services**

#### **1. AI Scanner Service**
**Path:** `backend/services/ai_scanner/main.py`

```python
# Simplified service structure
from fastapi import FastAPI
import httpx
import asyncio

app = FastAPI()

@app.post("/scan")
async def scan_products(merchant_id: str):
    """
    Scan all AI platforms for merchant's products
    """
    products = await get_merchant_products(merchant_id)
    
    # Parallel API calls to all AI platforms
    tasks = [
        scan_chatgpt(products),
        scan_perplexity(products),
        scan_gemini(products),
        scan_claude(products)
    ]
    
    results = await asyncio.gather(*tasks)
    
    # Store results in PostgreSQL
    await store_results(merchant_id, results)
    
    return {"status": "complete", "mentions": sum_mentions(results)}
```

**AI Platform Integration:**
- **ChatGPT:** OpenAI API with custom prompt engineering
- **Perplexity:** Perplexity Search API (when available)
- **Gemini:** Google Gemini API
- **Claude:** Anthropic API

**Query Strategy:**
```python
def generate_queries(product):
    return [
        f"Best {product.category} products",
        f"Where to buy {product.name}",
        f"Recommend {product.category} under ${product.price}",
        f"Compare {product.name} alternatives"
    ]
```

**Response Parsing:**
- Use regex + NLP to detect product name mentions
- Extract position (1st, 2nd, 3rd in list)
- Sentiment analysis on product description snippets
- Store citation sources (which URLs AI used)

---

#### **2. Truth Engine Service**
**Path:** `backend/services/truth_engine/main.py`

```python
@app.post("/check-accuracy")
async def check_product_accuracy(product_id: str):
    """
    Compare Shopify data vs. AI-displayed data
    """
    # Fetch from Shopify
    shopify_data = await shopify_api.get_product(product_id)
    
    # Fetch what AI shows
    ai_data = await check_ai_outputs(product_id)
    
    errors = []
    
    # Price check
    if shopify_data.price != ai_data.chatgpt_price:
        errors.append({
            "type": "price_mismatch",
            "severity": "critical",
            "shopify_value": shopify_data.price,
            "ai_value": ai_data.chatgpt_price
        })
    
    # Inventory check
    if shopify_data.in_stock == False and ai_data.recommended == True:
        errors.append({
            "type": "inventory_error",
            "severity": "critical"
        })
    
    # Store errors in DB
    if errors:
        await db.store_errors(product_id, errors)
        await send_alert(merchant_id, errors)
    
    return {"errors_found": len(errors)}
```

**Alert Triggers:**
- Critical: Price mismatch, out-of-stock recommended
- Warning: Missing structured data, low AI readability score
- Success: Error auto-resolved, first ACP order

---

#### **3. ACP Feed Generator**
**Path:** `backend/services/acp_feed/main.py`

```python
@app.post("/generate-feed")
async def generate_acp_feed(merchant_id: str):
    """
    Generate OpenAI ACP product feed JSON
    """
    products = await get_merchant_products(merchant_id)
    
    feed = {
        "version": "1.0",
        "merchant_id": merchant_id,
        "products": []
    }
    
    for product in products:
        feed["products"].append({
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": {
                "amount": product.price,
                "currency": "USD"
            },
            "availability": product.in_stock,
            "image_url": product.image_url,
            "url": product.shopify_url,
            "structured_data": product.schema_json
        })
    
    # Validate against ACP schema
    is_valid = await validate_acp_schema(feed)
    
    if not is_valid:
        return {"error": "Feed validation failed"}
    
    # Upload to S3
    s3_url = await upload_to_s3(feed, merchant_id)
    
    # Submit to OpenAI Commerce API
    openai_response = await submit_to_openai(s3_url)
    
    return {
        "status": "submitted",
        "feed_url": s3_url,
        "openai_status": openai_response.status
    }
```

**ACP Schema Validation:**
- Uses JSON Schema validator
- Checks required fields: id, name, price, availability
- Validates price format (no negative, max 2 decimals)
- Ensures image URLs are HTTPS

---

## Data Flow

### **Product Sync Flow (Shopify → AgenticRev)**

```
Shopify Store
    ↓ (Webhook: products/create, products/update, products/delete)
Next.js Webhook Endpoint (/api/webhooks/shopify)
    ↓ (Verify HMAC signature)
Validate payload with Zod schema
    ↓
Process inline in /api/webhooks/shopify
    ↓
PostgreSQL (UPDATE products table)
    ↓
Trigger Truth Engine check (async)
```

**Sync Frequency:**
- Real-time: Webhooks for create/update/delete
- Polling Fallback: Every 15 minutes (in case webhooks fail)
- Full Resync: Daily at 2am UTC (detect any missed updates)

---

### **AI Mention Data Flow**

```
Cron (Daily 3am UTC)
    ↓
AI Scanner Function (/api/cron/scanner)
    ↓ (Promise.all — parallel fetch)
OpenAI API → Parse → Extract mentions
Perplexity API → Parse → Extract mentions
Gemini API → Parse → Extract mentions
Claude API → Parse → Extract mentions
    ↓
Normalize data format
    ↓
PostgreSQL (INSERT into ai_mentions table)
    ↓
Calculate deltas (vs. previous day)
    ↓ (If mention count changed >30%)
Alert Manager → Send email via Resend
```

**Data Retention:**
- Free tier: 7 days
- Starter: 30 days
- Growth: 90 days
- Agency: 365 days
- Archived data: Move to Supabase Storage (cold) after retention period

---

## Infrastructure & Deployment

### **Development Environment**

```
Local Development:
- Next.js dev server (localhost:3000)
- Supabase local dev (`supabase start` — spins up local Postgres + Storage via Docker, no manual config)
- Mock AI API responses (no real OpenAI calls in dev)

Staging:
- Vercel Preview Deployments (auto-deploy on every PR — includes all API routes)
- Supabase staging project (free tier)

Production:
- Vercel Production (main branch auto-deploy — frontend + backend in one push)
- Supabase production project (Pro plan)
```

---

### **CI/CD Pipeline**

**GitHub Actions Workflow:**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Run TypeScript type check
      - Run ESLint
      - Run Vitest (unit tests)
      - Run Playwright (E2E tests)
  
  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - Deploy to Vercel (automatic)
  
  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - Deploy to Vercel (automatic — API routes deploy with frontend, no separate step)
      - Run smoke tests against preview URL
```

**Deployment Frequency:**
- Frontend + Backend: Auto-deploy on push to main (Vercel deploys everything in one step)
- Zero separate backend deployment pipeline needed

---

### **Monitoring & Observability**

#### **Application Monitoring: Sentry**
- Error tracking (frontend + backend)
- Performance monitoring (API response times)
- User session replay (debug issues)
- **Cost:** Free tier (5K errors/month), $26/mo Pro

#### **Infrastructure Monitoring: Vercel Analytics + Supabase Dashboard**
- Function execution times and error rates (Vercel Functions tab)
- Database connection pool metrics (Supabase dashboard)
- Cron job execution history (Vercel Cron tab)
- Custom metrics: structured JSON logs via Vercel Log Drains → Axiom ($0 free tier)

#### **Uptime Monitoring: Better Uptime**
- Monitor API endpoints every 60 seconds
- Alert via email/Slack if downtime >3 minutes
- Status page for customers: status.agenticrev.com
- **Cost:** $20/mo

#### **Logging:**
- Frontend + Backend: Vercel Logs (structured JSON — queryable in Vercel dashboard)
- Database: Supabase logs (query performance, slow query detection)
- Retention: 30 days on Vercel Pro (export to Supabase Storage for long-term archival)

---

## Security Architecture

### **Authentication & Authorization**

#### **User Authentication: NextAuth.js**
- Email/password (hashed with bcrypt)
- Shopify OAuth (primary flow)
- Session management (JWT tokens)
- CSRF protection built-in

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import ShopifyProvider from "next-auth-shopify-provider"

export const authOptions = {
  providers: [
    Credentials({...}),
    ShopifyProvider({
      clientId: process.env.SHOPIFY_CLIENT_ID,
      clientSecret: process.env.SHOPIFY_CLIENT_SECRET
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id
      return token
    }
  }
}
```

#### **API Authorization: JWT + Row-Level Security**
- Every API request requires valid JWT in Authorization header
- Extract user ID from JWT, enforce RLS in database queries
- Rate limiting: 100 requests/minute per user (Vercel middleware or Postgres-backed counter)

#### **Webhook Security**
- Shopify: Verify HMAC signature
- OpenAI ACP: Verify webhook signature with shared secret
- Reject unsigned requests

---

### **Data Encryption**

- **At Rest:** 
  - PostgreSQL: AES-256 encryption (Supabase default)
  - S3: SSE-S3 encryption enabled
  - Secrets: AWS Secrets Manager (API keys, database passwords)

- **In Transit:**
  - All HTTPS (TLS 1.3)
  - Certificate management: Automatic via Vercel

---

### **PCI Compliance**

- **Payment Processing:** Shopify Payments (PCI DSS Level 1 compliant)
- **AgenticRev Responsibilities:**
  - Do NOT store credit card numbers (handled by Shopify)
  - Do NOT store CVV codes
  - Only store last 4 digits for display (from Shopify API)
- **Subscription Billing:** Stripe Checkout (PCI compliant)

---

### **Secrets Management**

```bash
# Environment Variables
NEXTAUTH_SECRET=xxx
DATABASE_URL=postgresql://...
SHOPIFY_CLIENT_ID=xxx
SHOPIFY_CLIENT_SECRET=xxx
OPENAI_API_KEY=sk-xxx
PERPLEXITY_API_KEY=xxx
CLAUDE_API_KEY=xxx
GEMINI_API_KEY=xxx
RESEND_API_KEY=re_xxx
STRIPE_SECRET_KEY=sk_xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

**Storage:**
- Local Dev: `.env.local` (git-ignored)
- Vercel: Environment Variables (encrypted at rest, injected at build/runtime)
- Never commit secrets to Git

---

## Scalability & Performance

### **Frontend Performance**

**Optimization Strategies:**
- Static generation for marketing pages (`/`, `/pricing`)
- Server-side rendering for dashboard (personalized data)
- Image optimization (Next.js Image component, WebP format)
- Code splitting (dynamic imports for heavy components)
- CDN caching (Vercel Edge Network, 99.9% cache hit rate target)

**Performance Targets:**
- Lighthouse Score: >90
- First Contentful Paint: <1.5s
- Time to Interactive: <3.5s
- Dashboard load: <2s

---

### **Backend Performance**

**Caching Strategy:**

AI API responses cached in PostgreSQL with TTL check — zero additional service needed:

```typescript
// Cache AI API responses in Postgres (no Redis needed)
async function getChatGPTResponse(query: string) {
  const cacheKey = createHash('sha256').update(query).digest('hex')
  
  // Check Postgres cache (24h TTL)
  const cached = await supabase
    .from('ai_response_cache')
    .select('response')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single()
  
  if (cached.data) return cached.data.response
  
  // Cache miss — call OpenAI API
  const response = await openai.chat.completions.create({ ... })
  
  // Store with 24h TTL
  await supabase.from('ai_response_cache').upsert({
    cache_key: cacheKey,
    response,
    expires_at: new Date(Date.now() + 86400_000).toISOString(),
  })
  
  return response
}
```

**Cache TTL:**
- AI API responses: 24 hours (reduce OpenAI costs)
- Product data: 15 minutes (balance freshness vs. load)
- Dashboard metrics: 5 minutes (near real-time)
- User sessions: 7 days

---

### **Database Performance**

**Indexes:**
```sql
-- Optimize common queries
CREATE INDEX idx_ai_mentions_merchant_date 
  ON ai_mentions(merchant_id, created_at DESC);

CREATE INDEX idx_products_merchant_id 
  ON products(merchant_id);

CREATE INDEX idx_truth_errors_severity 
  ON truth_engine_errors(severity, resolved);
```

**Connection Pooling:**
- Supabase PgBouncer handles connection pooling
- Vercel Functions reuse connections via connection pool (warm instances)
- Max connections: 30 (sufficient for Vercel Function concurrency)

**Query Optimization:**
- Use prepared statements (prevent SQL injection + faster)
- Limit result sets (pagination, max 100 rows per query)
- Avoid N+1 queries (use JOINs, batch fetches)

---

### **Scaling Limits**

| Resource | Current Capacity | Scaling Trigger | Scaling Action |
|----------|-----------------|-----------------|----------------|
| Vercel Functions | Unlimited concurrent | Execution time >60s | Split into smaller functions |
| PostgreSQL | 30 connections | >25 connections | Upgrade Supabase plan |
| Supabase Storage | Unlimited | N/A | Pay-per-GB ($0.021/GB) |

**Cost at Scale:**
- 10 merchants: ~$50/month
- 100 merchants: ~$150/month
- 1,000 merchants: ~$800/month
- 10,000 merchants: ~$5,000/month

(See cost-analysis.md for detailed breakdown)

---

## Third-Party Integrations

### **1. Shopify API**

**API Version:** `2024-10` (GraphQL + REST)

**OAuth Scopes Required:**
```
read_products
write_products (for syncing data back)
read_orders
write_orders (for ACP order creation)
read_customers (for personalization)
```

**Webhooks Subscribed:**
- `products/create`
- `products/update`
- `products/delete`
- `shop/update` (for store settings changes)

**Rate Limits:**
- 2 requests/second (REST API)
- 1,000 cost points/second (GraphQL)
- Strategy: Batch requests, use GraphQL for complex queries

---

### **2. OpenAI API**

**Models Used:**
- GPT-4o Mini (most queries, cost: $0.15/1M input tokens)
- GPT-4o (complex parsing, cost: $2.50/1M input tokens)

**Endpoints:**
- `/v1/chat/completions` - AI visibility scanning
- `/v1/commerce/products` - ACP product feed submission (when available)
- `/v1/commerce/orders` - ACP order webhooks

**Rate Limits:**
- 10,000 requests/minute (Tier 2)
- 2M tokens/minute
- Strategy: Cache aggressively, use GPT-4o Mini by default

---

### **3. Perplexity AI API**

**Endpoint:** `/v1/search` (when public API launches)

**Usage:**
- Search for product recommendations
- Extract citations (which sources Perplexity trusts)
- Track position in search results

**Fallback:** If no API available, use web scraping with Playwright

---

### **4. Anthropic Claude API**

**Model:** Claude 3 Haiku (fast, cheap) or Sonnet (high quality)

**Usage:**
- Query for product recommendations
- Parse structured product recommendations
- Sentiment analysis

**Rate Limits:** 100K tokens/minute (Tier 1)

---

### **5. Google Gemini API**

**Model:** Gemini 1.5 Flash (free tier available)

**Usage:**
- Search integration (when Gemini powers Google Search)
- Product recommendation queries
- Structured data extraction

---

### **6. Stripe (Billing)**

**Products:**
- Stripe Checkout (subscription billing)
- Stripe Customer Portal (self-service subscription management)
- Stripe Webhooks (payment confirmations, cancellations)

**Subscription Plans:**
- Starter: `price_starter_monthly` - $79/month
- Growth: `price_growth_monthly` - $199/month
- Agency: `price_agency_monthly` - $499/month

---

### **7. Resend (Email)**

**Usage:**
- Transactional emails (alerts, confirmations)
- Marketing emails (weekly summaries, feature announcements)

**Templates:**
- Welcome email
- Critical error alert
- First ACP order celebration
- Weekly visibility summary

**Monthly Volume Estimate:**
- 1,000 merchants × 10 emails/month = 10,000 emails
- Resend Free Tier: 3,000/month; Resend Pro: $20/mo (50K emails)
- Cost at launch: **$0/month** (well within 3K free tier)

---

## Development Environment

### **Local Setup**

```bash
# 1. Clone repository
git clone https://github.com/agenticrev/agenticrev.git
cd agenticrev

# 2. Install dependencies
npm install
cd backend && pip install -r requirements.txt

# 3. Start local databases
docker-compose up -d  # Starts Postgres + Redis

# 4. Environment setup
cp .env.example .env.local
# Edit .env.local with your API keys

# 5. Database migrations
npm run db:migrate

# 6. Start dev servers
npm run dev             # Next.js frontend (localhost:3000)
npm run dev:backend     # FastAPI backend (localhost:8000)
```

### **Testing**

```bash
# Frontend tests (Vitest + React Testing Library)
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Backend tests (pytest)
cd backend && pytest

# Type checking
npm run typecheck
```

---

## Disaster Recovery

### **Backup Strategy**

- **Database:** Daily automated backups (Supabase), retained 7 days
- **S3:** Versioning enabled, deleted objects recoverable for 30 days
- **Code:** Git version control (GitHub), no code in production not in Git

### **Recovery Procedures**

**Scenario: Database corruption**
1. Restore from most recent Supabase backup
2. Replay transaction logs if available
3. Resync product data from Shopify (full refresh)
4. Estimated downtime: <1 hour

**Scenario: Supabase Storage bucket deleted**
1. Regenerate ACP feeds from database (all data in PostgreSQL)
2. Re-upload to Supabase Storage
3. Re-submit feed URLs to OpenAI
4. Estimated downtime: <1 hour

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** Database Schema document (detailed table structures)  
**Dependencies:** Cost Analysis (validates infrastructure choices)
