-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  phone VARCHAR(50),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  timezone VARCHAR(50) DEFAULT 'UTC',
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);

-- Stores table
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  store_url VARCHAR(255) NOT NULL,
  store_name VARCHAR(255),
  store_domain VARCHAR(255),
  access_token TEXT NOT NULL,
  api_secret TEXT,
  shop_id VARCHAR(255),
  last_sync_at TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'pending',
  sync_error TEXT,
  product_count INTEGER DEFAULT 0,
  webhook_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  connected_at TIMESTAMP DEFAULT NOW(),
  disconnected_at TIMESTAMP
);

CREATE INDEX idx_stores_user_id ON stores(user_id);
CREATE INDEX idx_stores_platform ON stores(platform);
CREATE UNIQUE INDEX idx_stores_url ON stores(store_url);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  billing_cycle VARCHAR(50),
  price_per_month DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  max_products INTEGER,
  max_stores INTEGER,
  historical_data_days INTEGER,
  acp_enabled BOOLEAN DEFAULT FALSE,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_end TIMESTAMP,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_id VARCHAR(255) NOT NULL,
  sku VARCHAR(255),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  product_type VARCHAR(255),
  category VARCHAR(255),
  tags TEXT[],
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  inventory_quantity INTEGER DEFAULT 0,
  in_stock BOOLEAN DEFAULT TRUE,
  track_inventory BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  images TEXT[],
  product_url TEXT,
  schema_json JSONB,
  ai_readability_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT uq_product_platform UNIQUE(store_id, platform_id)
);

CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_in_stock ON products(in_stock);
CREATE INDEX idx_products_updated_at ON products(updated_at DESC);

-- AI Platforms reference table
CREATE TABLE ai_platforms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
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

-- AI Mentions table
CREATE TABLE ai_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES ai_platforms(id),
  query TEXT NOT NULL,
  query_type VARCHAR(100),
  mentioned BOOLEAN NOT NULL,
  position INTEGER,
  total_recommendations INTEGER,
  ai_response TEXT,
  snippet TEXT,
  sentiment VARCHAR(50),
  sentiment_score DECIMAL(4,2),
  citations JSONB,
  scanned_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_mentions_product_id ON ai_mentions(product_id);
CREATE INDEX idx_ai_mentions_user_id ON ai_mentions(user_id);
CREATE INDEX idx_ai_mentions_platform_id ON ai_mentions(platform_id);
CREATE INDEX idx_ai_mentions_scanned_at ON ai_mentions(scanned_at DESC);
CREATE INDEX idx_ai_mentions_mentioned ON ai_mentions(mentioned);
CREATE INDEX idx_ai_mentions_user_platform_date ON ai_mentions(user_id, platform_id, scanned_at DESC);

-- Truth Engine Errors table
CREATE TABLE truth_engine_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  error_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  source VARCHAR(100),
  expected_value TEXT,
  actual_value TEXT,
  error_message TEXT,
  fix_suggestion TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  resolution_note TEXT,
  auto_fixable BOOLEAN DEFAULT FALSE,
  auto_fix_attempted BOOLEAN DEFAULT FALSE,
  auto_fix_success BOOLEAN,
  detected_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_truth_errors_product_id ON truth_engine_errors(product_id);
CREATE INDEX idx_truth_errors_user_id ON truth_engine_errors(user_id);
CREATE INDEX idx_truth_errors_severity ON truth_engine_errors(severity);
CREATE INDEX idx_truth_errors_resolved ON truth_engine_errors(resolved, detected_at DESC);
CREATE INDEX idx_truth_errors_user_unresolved ON truth_engine_errors(user_id, resolved, severity);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE truth_engine_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = auth.uid()::uuid);

CREATE POLICY stores_select_own ON stores
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY products_select_own ON products
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY ai_mentions_select_own ON ai_mentions
  FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY truth_errors_select_own ON truth_engine_errors
  FOR SELECT USING (user_id = auth.uid()::uuid);
