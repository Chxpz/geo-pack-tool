# Database Schema
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 🟢 Final - Ready for Development  
**Owner:** Engineering Team  
**Database:** PostgreSQL 15.x (Supabase)

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Core Tables](#core-tables)
3. [Relationships & ERD](#relationships--erd)
4. [Indexes & Performance](#indexes--performance)
5. [Data Retention & Archival](#data-retention--archival)
6. [Migrations](#migrations)

---

## Schema Overview

### **Database Structure**

```
agenticrev_db
├── users                    # Merchant accounts
├── stores                   # Connected Shopify/WooCommerce stores
├── subscriptions            # Billing & plan data
├── products                 # Synced product catalog
├── ai_mentions              # AI visibility tracking
├── ai_platforms             # Platforms being tracked (ChatGPT, etc.)
├── truth_engine_errors      # Data accuracy errors
├── acp_feeds                # Generated ACP product feeds
├── acp_orders               # Orders from ChatGPT checkout
├── alerts                   # User notification preferences
├── alert_history            # Sent alerts log
├── audit_logs               # System activity audit trail
├── ai_platform_checks       # Reliability: AI platform uptime checks
└── drift_events             # Reliability: LLM visibility drift detection
```

**Total Tables:** 14  
**Estimated Size (1,000 merchants):** ~5GB  
**Estimated Size (10,000 merchants):** ~50GB  

---

## Core Tables

### **1. users**
Primary table for merchant accounts.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- nullable for OAuth-only users
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  phone VARCHAR(50),
  
  -- Authentication
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  oauth_provider VARCHAR(50), -- 'shopify', 'email', or NULL
  oauth_id VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Soft delete
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
```

**Sample Row:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "merchant@example.com",
  "password_hash": "$2b$10$...",
  "full_name": "Jane Merchant",
  "company_name": "Eco Shop",
  "oauth_provider": "shopify",
  "email_verified": true,
  "created_at": "2026-03-01T10:00:00Z"
}
```

---

### **2. stores**
Connected Shopify/WooCommerce stores.

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Store Details
  platform VARCHAR(50) NOT NULL, -- 'shopify' or 'woocommerce'
  store_url VARCHAR(255) NOT NULL, -- 'mystore.myshopify.com' or 'example.com'
  store_name VARCHAR(255),
  store_domain VARCHAR(255), -- Custom domain if configured
  
  -- API Credentials
  access_token TEXT NOT NULL, -- Shopify OAuth token or WooCommerce API key
  api_secret TEXT, -- WooCommerce API secret
  shop_id VARCHAR(255), -- Shopify shop ID
  
  -- Sync Status
  last_sync_at TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'failed'
  sync_error TEXT,
  product_count INTEGER DEFAULT 0,
  
  -- Webhooks
  webhook_secret VARCHAR(255), -- For verifying Shopify webhooks
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  connected_at TIMESTAMP DEFAULT NOW(),
  disconnected_at TIMESTAMP
);

CREATE INDEX idx_stores_user_id ON stores(user_id);
CREATE INDEX idx_stores_platform ON stores(platform);
CREATE UNIQUE INDEX idx_stores_url ON stores(store_url);
```

**Sample Row:**
```json
{
  "id": "store-uuid-123",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "platform": "shopify",
  "store_url": "eco-shop.myshopify.com",
  "store_name": "Eco Shop",
  "access_token": "shpat_xxxxx",
  "product_count": 47,
  "last_sync_at": "2026-03-03T08:00:00Z",
  "sync_status": "success"
}
```

---

### **3. subscriptions**
Billing plans and subscription status.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Subscription Details
  plan VARCHAR(50) NOT NULL, -- 'free', 'starter', 'growth', 'agency'
  status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due', 'trial'
  
  -- Billing
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  billing_cycle VARCHAR(50), -- 'monthly' or 'annual'
  
  -- Pricing
  price_per_month DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Plan Limits
  max_products INTEGER,
  max_stores INTEGER,
  historical_data_days INTEGER,
  acp_enabled BOOLEAN DEFAULT FALSE,
  
  -- Dates
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_end TIMESTAMP,
  canceled_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
```

**Sample Row:**
```json
{
  "id": "sub-uuid-123",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "plan": "starter",
  "status": "active",
  "stripe_customer_id": "cus_xxxxx",
  "stripe_subscription_id": "sub_xxxxx",
  "billing_cycle": "monthly",
  "price_per_month": 79.00,
  "max_products": 100,
  "max_stores": 1,
  "historical_data_days": 30,
  "acp_enabled": false,
  "current_period_end": "2026-04-01T00:00:00Z"
}
```

---

### **4. products**
Synced product catalog from Shopify/WooCommerce.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Product Identifiers
  platform_id VARCHAR(255) NOT NULL, -- Shopify/WooCommerce product ID
  sku VARCHAR(255),
  
  -- Basic Details
  name VARCHAR(500) NOT NULL,
  description TEXT,
  product_type VARCHAR(255), -- 'Physical', 'Digital', etc.
  category VARCHAR(255),
  tags TEXT[], -- Array of tags
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2), -- Original price (for sales)
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Inventory
  inventory_quantity INTEGER DEFAULT 0,
  in_stock BOOLEAN DEFAULT TRUE,
  track_inventory BOOLEAN DEFAULT TRUE,
  
  -- Images
  image_url TEXT,
  images TEXT[], -- Array of image URLs
  
  -- URLs
  product_url TEXT, -- Link to product page on Shopify
  
  -- Structured Data (for AI optimization)
  schema_json JSONB, -- JSON-LD structured data
  ai_readability_score INTEGER, -- 1-100 score
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  
  -- Soft delete
  deleted_at TIMESTAMP,
  
  CONSTRAINT uq_product_platform UNIQUE(store_id, platform_id)
);

CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_in_stock ON products(in_stock);
CREATE INDEX idx_products_updated_at ON products(updated_at DESC);
```

**Sample Row:**
```json
{
  "id": "product-uuid-123",
  "store_id": "store-uuid-123",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "platform_id": "7891234567890",
  "sku": "COFFEE-ORG-001",
  "name": "Organic Fair Trade Coffee Blend",
  "description": "Premium organic coffee beans sourced from...",
  "product_type": "Physical",
  "category": "Coffee & Tea",
  "tags": ["organic", "fair-trade", "coffee"],
  "price": 24.99,
  "inventory_quantity": 150,
  "in_stock": true,
  "image_url": "https://cdn.shopify.com/...",
  "ai_readability_score": 87,
  "synced_at": "2026-03-03T08:00:00Z"
}
```

---

### **5. ai_platforms**
Reference table for AI platforms being tracked.

```sql
CREATE TABLE ai_platforms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL, -- 'ChatGPT', 'Perplexity', 'Gemini', 'Claude'
  slug VARCHAR(50) UNIQUE NOT NULL, -- 'chatgpt', 'perplexity', 'gemini', 'claude'
  api_endpoint TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pre-populate platforms
INSERT INTO ai_platforms (name, slug) VALUES
  ('ChatGPT', 'chatgpt'),
  ('Perplexity', 'perplexity'),
  ('Google Gemini', 'gemini'),
  ('Claude', 'claude');
```

---

### **6. ai_mentions**
Tracks product mentions in AI platforms (core visibility data).

```sql
CREATE TABLE ai_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES ai_platforms(id),
  
  -- Query Details
  query TEXT NOT NULL, -- The prompt/question asked to AI
  query_type VARCHAR(100), -- 'recommendation', 'comparison', 'where_to_buy', etc.
  
  -- Mention Details
  mentioned BOOLEAN NOT NULL, -- Was this product mentioned?
  position INTEGER, -- Position in list (1st, 2nd, 3rd...) NULL if not mentioned
  total_recommendations INTEGER, -- How many products were recommended total
  
  -- Context
  ai_response TEXT, -- Full AI response (truncated to 10,000 chars)
  snippet TEXT, -- Specific text mentioning the product
  
  -- Sentiment Analysis
  sentiment VARCHAR(50), -- 'positive', 'neutral', 'negative'
  sentiment_score DECIMAL(4,2), -- -1.00 to 1.00
  
  -- Citations
  citations JSONB, -- Array of sources AI used: [{"url": "...", "title": "..."}]
  
  -- Metadata
  scanned_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_ai_mentions_product_id ON ai_mentions(product_id);
CREATE INDEX idx_ai_mentions_user_id ON ai_mentions(user_id);
CREATE INDEX idx_ai_mentions_platform_id ON ai_mentions(platform_id);
CREATE INDEX idx_ai_mentions_scanned_at ON ai_mentions(scanned_at DESC);
CREATE INDEX idx_ai_mentions_mentioned ON ai_mentions(mentioned);
CREATE INDEX idx_ai_mentions_user_platform_date ON ai_mentions(user_id, platform_id, scanned_at DESC);
```

**Sample Row:**
```json
{
  "id": "mention-uuid-123",
  "product_id": "product-uuid-123",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "platform_id": 1,
  "query": "Best organic fair trade coffee brands",
  "query_type": "recommendation",
  "mentioned": true,
  "position": 2,
  "total_recommendations": 5,
  "snippet": "I'd recommend the Organic Fair Trade Coffee Blend for its smooth taste and ethical sourcing...",
  "sentiment": "positive",
  "sentiment_score": 0.82,
  "citations": [
    {"url": "https://coffeereview.com/...", "title": "Top Organic Coffees 2026"}
  ],
  "scanned_at": "2026-03-03T03:00:00Z"
}
```

---

### **7. truth_engine_errors**
Data accuracy errors detected by Truth Engine.

```sql
CREATE TABLE truth_engine_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Error Classification
  error_type VARCHAR(100) NOT NULL, -- 'price_mismatch', 'inventory_error', 'missing_schema', 'description_mismatch'
  severity VARCHAR(50) NOT NULL, -- 'critical', 'warning', 'info'
  
  -- Error Details
  source VARCHAR(100), -- Which AI platform or source detected error
  expected_value TEXT, -- Correct value from Shopify/WooCommerce
  actual_value TEXT, -- Incorrect value found in AI
  
  -- Description
  error_message TEXT,
  fix_suggestion TEXT,
  
  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  resolution_note TEXT,
  
  -- Auto-fix
  auto_fixable BOOLEAN DEFAULT FALSE,
  auto_fix_attempted BOOLEAN DEFAULT FALSE,
  auto_fix_success BOOLEAN,
  
  -- Metadata
  detected_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_truth_errors_product_id ON truth_engine_errors(product_id);
CREATE INDEX idx_truth_errors_user_id ON truth_engine_errors(user_id);
CREATE INDEX idx_truth_errors_severity ON truth_engine_errors(severity);
CREATE INDEX idx_truth_errors_resolved ON truth_engine_errors(resolved, detected_at DESC);
CREATE INDEX idx_truth_errors_user_unresolved ON truth_engine_errors(user_id, resolved, severity);
```

**Sample Row:**
```json
{
  "id": "error-uuid-123",
  "product_id": "product-uuid-123",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "error_type": "price_mismatch",
  "severity": "critical",
  "source": "chatgpt",
  "expected_value": "24.99",
  "actual_value": "19.99",
  "error_message": "ChatGPT is displaying outdated price",
  "fix_suggestion": "Sync current price to AI feed",
  "resolved": false,
  "auto_fixable": true,
  "detected_at": "2026-03-03T02:00:00Z"
}
```

---

### **8. acp_feeds**
Generated OpenAI ACP product feeds.

```sql
CREATE TABLE acp_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Feed Details
  feed_url TEXT NOT NULL, -- S3 URL where feed is stored
  product_count INTEGER NOT NULL,
  
  -- Status
  status VARCHAR(50) NOT NULL, -- 'generated', 'submitted', 'approved', 'rejected', 'error'
  openai_status VARCHAR(100), -- Status from OpenAI API
  openai_submission_id VARCHAR(255),
  
  -- Validation
  schema_valid BOOLEAN DEFAULT FALSE,
  validation_errors JSONB,
  
  -- Approval
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Metadata
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_acp_feeds_user_id ON acp_feeds(user_id);
CREATE INDEX idx_acp_feeds_status ON acp_feeds(status);
CREATE INDEX idx_acp_feeds_submitted_at ON acp_feeds(submitted_at DESC);
```

**Sample Row:**
```json
{
  "id": "feed-uuid-123",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "store_id": "store-uuid-123",
  "feed_url": "https://s3.amazonaws.com/agenticrev-acp-feeds/user-123/feed-2026-03-03.json",
  "product_count": 47,
  "status": "approved",
  "schema_valid": true,
  "openai_submission_id": "acp-sub-xxxxx",
  "submitted_at": "2026-03-03T09:00:00Z",
  "approved_at": "2026-03-04T14:00:00Z"
}
```

---

### **9. acp_orders**
Orders placed through ChatGPT ACP checkout.

```sql
CREATE TABLE acp_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Order Identifiers
  openai_order_id VARCHAR(255) UNIQUE NOT NULL, -- Order ID from OpenAI
  shopify_order_id VARCHAR(255), -- Created order ID in Shopify
  order_number VARCHAR(100), -- Human-readable order #
  
  -- Customer
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  
  -- Order Details
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0.00,
  shipping DECIMAL(10,2) DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Line Items (JSON array)
  line_items JSONB NOT NULL, -- [{"product_id": "...", "quantity": 2, "price": 24.99}]
  
  -- Fulfillment
  fulfillment_status VARCHAR(50), -- 'pending', 'fulfilled', 'canceled'
  shipping_address JSONB,
  tracking_number VARCHAR(255),
  
  -- Payment
  payment_status VARCHAR(50), -- 'paid', 'pending', 'refunded'
  payment_method VARCHAR(100),
  
  -- First Order Flag
  is_first_acp_order BOOLEAN DEFAULT FALSE, -- For celebration email
  
  -- Timestamps
  placed_at TIMESTAMP NOT NULL,
  shopify_synced_at TIMESTAMP,
  fulfilled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_acp_orders_user_id ON acp_orders(user_id);
CREATE INDEX idx_acp_orders_store_id ON acp_orders(store_id);
CREATE INDEX idx_acp_orders_openai_id ON acp_orders(openai_order_id);
CREATE INDEX idx_acp_orders_placed_at ON acp_orders(placed_at DESC);
CREATE INDEX idx_acp_orders_first_order ON acp_orders(user_id, is_first_acp_order);
```

**Sample Row:**
```json
{
  "id": "order-uuid-123",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "store_id": "store-uuid-123",
  "openai_order_id": "acp-order-xxxxx",
  "shopify_order_id": "4567890123",
  "order_number": "#ACP-1001",
  "customer_email": "customer@example.com",
  "customer_name": "John Doe",
  "subtotal": 47.98,
  "tax": 3.84,
  "shipping": 5.00,
  "total": 56.82,
  "line_items": [
    {"product_id": "product-uuid-123", "quantity": 2, "price": 24.99}
  ],
  "fulfillment_status": "pending",
  "payment_status": "paid",
  "is_first_acp_order": true,
  "placed_at": "2026-03-03T14:30:00Z"
}
```

---

### **10. alerts**
User alert preferences and configuration.

```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Alert Type
  alert_type VARCHAR(100) NOT NULL, -- 'price_mismatch', 'visibility_drop', 'first_acp_order', etc.
  
  -- Channels
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  
  -- Thresholds (for metric-based alerts)
  threshold_value DECIMAL(10,2), -- e.g., "Alert if visibility drops >30%"
  threshold_operator VARCHAR(10), -- '>', '<', '>=', '<=', '='
  
  -- Frequency
  frequency VARCHAR(50) DEFAULT 'immediate', -- 'immediate', 'daily_digest', 'weekly'
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_type_enabled ON alerts(alert_type, enabled);
```

---

### **11. alert_history**
Log of all alerts sent to users.

```sql
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
  
  -- Alert Details
  alert_type VARCHAR(100) NOT NULL,
  subject VARCHAR(500),
  message TEXT,
  
  -- Channels
  channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'in_app'
  
  -- Delivery Status
  sent BOOLEAN DEFAULT FALSE,
  delivered BOOLEAN DEFAULT FALSE,
  opened BOOLEAN DEFAULT FALSE, -- For email tracking
  clicked BOOLEAN DEFAULT FALSE, -- User clicked CTA
  
  -- Email Specifics
  email_id VARCHAR(255), -- SendGrid message ID
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  
  -- Errors
  error_message TEXT,
  
  -- Timestamps
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alert_history_user_id ON alert_history(user_id);
CREATE INDEX idx_alert_history_sent_at ON alert_history(sent_at DESC);
CREATE INDEX idx_alert_history_channel ON alert_history(channel);
```

---

### **12. audit_logs**
System activity audit trail.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Action Details
  action VARCHAR(255) NOT NULL, -- 'user.signup', 'store.connected', 'product.synced', 'error.fixed', etc.
  resource_type VARCHAR(100), -- 'user', 'store', 'product', 'subscription', etc.
  resource_id UUID,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

---

### **13. ai_platform_checks**
Reliability module: tracks AI platform uptime and response health.

```sql
CREATE TABLE ai_platform_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id VARCHAR(100) NOT NULL,  -- 'chatgpt', 'perplexity', 'gemini', 'claude'
  
  -- Health Check Result
  is_up BOOLEAN NOT NULL,
  response_ms INTEGER,                -- Response time in milliseconds (NULL if down)
  error_message TEXT,                 -- Error detail if is_up = false
  http_status INTEGER,                -- HTTP status code received
  
  -- Check Metadata
  check_type VARCHAR(50) DEFAULT 'ping', -- 'ping', 'sample_query'
  checked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_platform_checks_platform ON ai_platform_checks(platform_id);
CREATE INDEX idx_platform_checks_time ON ai_platform_checks(checked_at DESC);
CREATE INDEX idx_platform_checks_is_up ON ai_platform_checks(platform_id, is_up, checked_at DESC);
```

**Sample Row:**
```json
{
  "id": "check-uuid-001",
  "platform_id": "perplexity",
  "is_up": true,
  "response_ms": 847,
  "error_message": null,
  "http_status": 200,
  "checked_at": "2026-03-13T14:00:00Z"
}
```

---

### **14. drift_events**
Reliability module: detects significant drops in AI visibility for a product.

```sql
CREATE TABLE drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  platform_id VARCHAR(100),           -- NULL = across all platforms
  
  -- Drift Measurement
  baseline_mentions INTEGER NOT NULL, -- 7-day average mentions (before drift)
  current_mentions INTEGER NOT NULL,  -- Current 7-day mentions
  delta_pct DECIMAL(5,2) NOT NULL,    -- Percentage change (negative = drop)
  
  -- Classification
  severity VARCHAR(50) NOT NULL,      -- 'warning' (>30% drop), 'critical' (>60% drop)
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  
  -- Metadata
  detected_at TIMESTAMP DEFAULT NOW(),
  notified_at TIMESTAMP              -- When merchant was alerted
);

CREATE INDEX idx_drift_events_user ON drift_events(user_id, detected_at DESC);
CREATE INDEX idx_drift_events_product ON drift_events(product_id);
CREATE INDEX idx_drift_events_severity ON drift_events(severity, is_resolved);
```

**Sample Row:**
```json
{
  "id": "drift-uuid-001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "product_id": "product-uuid-abc",
  "platform_id": "chatgpt",
  "baseline_mentions": 18,
  "current_mentions": 4,
  "delta_pct": -77.8,
  "severity": "critical",
  "is_resolved": false,
  "detected_at": "2026-03-13T06:00:00Z"
}
```

---

## Relationships & ERD

### **Entity Relationship Diagram**

```
┌──────────┐       1:N        ┌──────────┐
│  users   │─────────────────▶│  stores  │
└──────────┘                  └──────────┘
     │                             │
     │ 1:1                         │ 1:N
     ▼                             ▼
┌──────────────┐           ┌────────────┐
│subscriptions │           │  products  │
└──────────────┘           └────────────┘
                                  │
                                  │ 1:N
                                  ▼
                          ┌──────────────┐
                          │ ai_mentions  │◀────┐
                          └──────────────┘     │
                                               │ N:1
                          ┌──────────────┐     │
                          │ai_platforms  │─────┘
                          └──────────────┘

┌──────────┐       1:N        ┌─────────────────────┐
│  users   │─────────────────▶│truth_engine_errors │
└──────────┘                  └─────────────────────┘

┌──────────┐       1:N        ┌────────────┐
│  users   │─────────────────▶│ acp_feeds  │
└──────────┘                  └────────────┘

┌──────────┐       1:N        ┌────────────┐
│  users   │─────────────────▶│ acp_orders │
└──────────┘                  └────────────┘

┌──────────┐       1:N        ┌───────────┐       1:N        ┌──────────────┐
│  users   │─────────────────▶│  alerts   │─────────────────▶│alert_history │
└──────────┘                  └───────────┘                  └──────────────┘
```

---

## Indexes & Performance

### **Query Patterns & Optimizations**

#### **1. Dashboard Load Query**
**Use Case:** User views dashboard, fetch AI visibility summary

```sql
-- Query: Get recent mentions for all user's products
SELECT 
  p.id,
  p.name,
  COUNT(am.id) as mention_count,
  AVG(am.position) as avg_position,
  array_agg(DISTINCT ap.name) as platforms
FROM products p
LEFT JOIN ai_mentions am ON p.id = am.product_id
LEFT JOIN ai_platforms ap ON am.platform_id = ap.id
WHERE p.user_id = $1
  AND am.scanned_at >= NOW() - INTERVAL '7 days'
GROUP BY p.id, p.name
ORDER BY mention_count DESC
LIMIT 100;
```

**Indexes Used:**
- `idx_products_user_id`
- `idx_ai_mentions_product_id`
- `idx_ai_mentions_scanned_at`

**Performance:** <100ms for 100 products

---

#### **2. Truth Engine Error List**
**Use Case:** Fetch unresolved errors for merchant

```sql
SELECT 
  e.id,
  e.error_type,
  e.severity,
  e.expected_value,
  e.actual_value,
  p.name as product_name,
  e.detected_at
FROM truth_engine_errors e
JOIN products p ON e.product_id = p.id
WHERE e.user_id = $1
  AND e.resolved = FALSE
ORDER BY 
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    ELSE 3
  END,
  e.detected_at DESC;
```

**Indexes Used:**
- `idx_truth_errors_user_unresolved`
- `idx_truth_errors_resolved`

**Performance:** <50ms for 50 errors

---

#### **3. Product Sync Batch Insert**
**Use Case:** Sync 100+ products from Shopify in one batch

```sql
INSERT INTO products (
  store_id, user_id, platform_id, name, description, 
  price, inventory_quantity, in_stock, image_url, synced_at
)
VALUES 
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()),
  ($10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()),
  -- ... up to 100 rows
ON CONFLICT (store_id, platform_id) 
DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  inventory_quantity = EXCLUDED.inventory_quantity,
  in_stock = EXCLUDED.in_stock,
  synced_at = EXCLUDED.synced_at,
  updated_at = NOW();
```

**Performance:** Batch upsert 100 products in <200ms

---

### **Partitioning Strategy (Future Scale)**

When `ai_mentions` table grows >10M rows, partition by `scanned_at`:

```sql
-- Partition by month (for time-series data)
CREATE TABLE ai_mentions (
  -- Same columns as above
) PARTITION BY RANGE (scanned_at);

CREATE TABLE ai_mentions_2026_03 PARTITION OF ai_mentions
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE ai_mentions_2026_04 PARTITION OF ai_mentions
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- Auto-create partitions monthly (use pg_cron or Lambda)
```

**Retention:** Drop old partitions after retention period (Free=7d, Starter=30d, Growth=90d)

---

## Data Retention & Archival

### **Retention Policies**

| Table | Free Tier | Starter | Growth | Agency | Archival Strategy |
|-------|-----------|---------|--------|--------|-------------------|
| ai_mentions | 7 days | 30 days | 90 days | 365 days | Move to S3 Glacier |
| truth_engine_errors | 30 days | 90 days | 365 days | Forever | Keep forever |
| acp_orders | Forever | Forever | Forever | Forever | Keep forever |
| alert_history | 30 days | 90 days | 365 days | Forever | Move to S3 |
| audit_logs | 90 days | 365 days | Forever | Forever | Keep forever |

### **Archival Process (Automated)**

```sql
-- Daily cron job (runs at 4am UTC)
-- Archive old ai_mentions to S3
WITH archived AS (
  DELETE FROM ai_mentions
  WHERE scanned_at < NOW() - INTERVAL '7 days' -- Adjust based on user's plan
  RETURNING *
)
-- Export to S3 via pg_dump or custom Lambda
SELECT pg_dump_to_s3('ai_mentions_archive_2026-03-03.sql');
```

---

## Migrations

### **Migration Strategy**

**Tool:** [Supabase Migrations](https://supabase.com/docs/guides/database/migrations) (built on Flyway)

**Structure:**
```
/supabase/migrations/
  20260301000001_create_users_table.sql
  20260301000002_create_stores_table.sql
  20260301000003_create_products_table.sql
  20260301000004_create_ai_mentions_table.sql
  ...
```

### **Sample Migration File**

```sql
-- File: 20260301000001_create_users_table.sql

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on email
CREATE INDEX idx_users_email ON users(email);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own data
CREATE POLICY user_select_own ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY user_update_own ON users
  FOR UPDATE USING (auth.uid() = id);
```

### **Running Migrations**

```bash
# Apply all pending migrations
supabase db push

# Rollback last migration
supabase db reset --version 20260301000001

# Generate new migration
supabase migration new create_new_table
```

---

## Row-Level Security (RLS)

### **Supabase RLS Policies**

Enforce data isolation per user:

```sql
-- Products table: Users can only see their own products
CREATE POLICY products_select_own ON products
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY products_insert_own ON products
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY products_update_own ON products
  FOR UPDATE USING (user_id = auth.uid());

-- AI Mentions: Users can only see mentions for their products
CREATE POLICY ai_mentions_select_own ON ai_mentions
  FOR SELECT USING (user_id = auth.uid());

-- Truth Engine Errors: Users can only see their errors
CREATE POLICY truth_errors_select_own ON truth_engine_errors
  FOR SELECT USING (user_id = auth.uid());
```

**Security Benefit:** Even if frontend has SQL injection vulnerability, users can't access others' data (enforced at DB level).

---

## Backup & Recovery

### **Automated Backups (Supabase)**
- **Frequency:** Daily at 3am UTC
- **Retention:** 7 days (free tier), 30 days (paid tiers)
- **Location:** Supabase S3 backups (encrypted)

### **Point-in-Time Recovery (PITR)**
- Available on Pro plan ($25/mo)
- Restore to any point in last 7 days
- RTO (Recovery Time Objective): <1 hour
- RPO (Recovery Point Objective): <5 minutes

### **Manual Backup Command**

```bash
# Backup full database to local file
pg_dump $DATABASE_URL > backup_2026-03-03.sql

# Restore from backup
psql $DATABASE_URL < backup_2026-03-03.sql
```

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** API Specifications (endpoints, request/response formats)  
**Dependencies:** This schema must be implemented before any API development
