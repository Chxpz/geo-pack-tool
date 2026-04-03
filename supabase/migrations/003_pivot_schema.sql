-- ============================================================================
-- Migration 003: AgenticRev ICP Pivot
-- Adds all new tables for business-centric GEO/AEO platform
-- Modifies existing tables for backward compatibility
-- ============================================================================

-- ─── 1. Modify existing tables ──────────────────────────────────────────────

-- Add role column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'customer'
  CHECK (role IN ('customer', 'operator', 'admin'));

-- Soft-deprecate legacy tables
ALTER TABLE stores ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMP;
ALTER TABLE truth_engine_errors ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMP;

-- Deprecate ACP tables if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acp_feeds') THEN
    ALTER TABLE acp_feeds ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMP;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'acp_orders') THEN
    ALTER TABLE acp_orders ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMP;
  END IF;
END $$;

-- Add new platform rows to ai_platforms
INSERT INTO ai_platforms (name, slug, enabled)
VALUES
  ('Google AI Overviews', 'google_aio', true),
  ('Google AI Mode', 'google_ai_mode', true),
  ('Microsoft Copilot', 'copilot', true)
ON CONFLICT (slug) DO NOTHING;

-- Add scan_method column to ai_platforms
ALTER TABLE ai_platforms ADD COLUMN IF NOT EXISTS scan_method VARCHAR(50) DEFAULT 'direct_llm'
  CHECK (scan_method IN ('direct_llm', 'otterly_only', 'both'));

-- Update scan_method for new platforms
UPDATE ai_platforms SET scan_method = 'otterly_only' WHERE slug IN ('google_aio', 'google_ai_mode', 'copilot');
UPDATE ai_platforms SET scan_method = 'direct_llm' WHERE slug IN ('chatgpt', 'perplexity', 'gemini', 'claude');

-- ─── 2. New tables ──────────────────────────────────────────────────────────

-- Businesses (replaces stores as primary entity)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(200) NOT NULL,
  business_type VARCHAR(50) NOT NULL CHECK (business_type IN (
    'realtor', 'restaurant', 'law_firm', 'dental', 'plumber', 'salon',
    'accountant', 'saas', 'ecommerce', 'agency', 'medical', 'fitness',
    'home_services', 'consulting', 'other'
  )),
  business_category TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country VARCHAR(5) DEFAULT 'US',
  phone VARCHAR(50),
  email VARCHAR(255),
  website_url TEXT,
  google_business_profile_url TEXT,
  social_profiles JSONB DEFAULT '{}',
  service_areas JSONB DEFAULT '[]',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_businesses_type_city ON businesses(business_type, address_city);

-- Competitors
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competitor_name VARCHAR(200) NOT NULL,
  website_url TEXT,
  google_business_profile_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, competitor_name)
);

CREATE INDEX idx_competitors_business_id ON competitors(business_id);
CREATE INDEX idx_competitors_user_id ON competitors(user_id);

-- Tracked Queries
CREATE TABLE tracked_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  query_type VARCHAR(50) NOT NULL CHECK (query_type IN (
    'system_generated', 'user_custom', 'otterly_imported',
    'otterly_prompt_research', 'gsc_imported', 'sonar_discovered'
  )),
  intent_category VARCHAR(50) CHECK (intent_category IN (
    'discovery', 'comparison', 'review', 'service_specific', 'location_specific'
  )),
  intent_volume INTEGER,
  growth_3m DECIMAL(8,2),
  tags JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, query_text)
);

CREATE INDEX idx_tracked_queries_business_id ON tracked_queries(business_id);
CREATE INDEX idx_tracked_queries_user_id ON tracked_queries(user_id);
CREATE INDEX idx_tracked_queries_business_active ON tracked_queries(business_id, is_active);

-- Extend ai_mentions with new columns
ALTER TABLE ai_mentions ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE ai_mentions ADD COLUMN IF NOT EXISTS query_id UUID REFERENCES tracked_queries(id) ON DELETE SET NULL;
ALTER TABLE ai_mentions ADD COLUMN IF NOT EXISTS competitors_mentioned JSONB DEFAULT '[]';
ALTER TABLE ai_mentions ADD COLUMN IF NOT EXISTS search_results JSONB;
ALTER TABLE ai_mentions ADD COLUMN IF NOT EXISTS related_questions JSONB;
ALTER TABLE ai_mentions ADD COLUMN IF NOT EXISTS search_context_size VARCHAR(10) CHECK (search_context_size IN ('low', 'medium', 'high'));
ALTER TABLE ai_mentions ADD COLUMN IF NOT EXISTS nss_score DECIMAL(6,2);
ALTER TABLE ai_mentions ADD COLUMN IF NOT EXISTS sentiment_attributes JSONB;
ALTER TABLE ai_mentions ADD COLUMN IF NOT EXISTS domain_cited BOOLEAN;
ALTER TABLE ai_mentions ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'llm_scan' CHECK (source IN ('llm_scan', 'perplexity_sonar', 'otterly_import'));
ALTER TABLE ai_mentions ADD COLUMN IF NOT EXISTS token_usage JSONB;

-- Make product_id nullable for new business-centric mentions
ALTER TABLE ai_mentions ALTER COLUMN product_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_mentions_business_id ON ai_mentions(business_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_mentions_query_id ON ai_mentions(query_id);

-- Citations
CREATE TABLE citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_mention_id UUID REFERENCES ai_mentions(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cited_url TEXT NOT NULL,
  cited_domain TEXT NOT NULL,
  cited_title TEXT,
  cited_snippet TEXT,
  cited_publish_date TIMESTAMPTZ,
  platform_id INTEGER NOT NULL REFERENCES ai_platforms(id),
  position INTEGER,
  domain_category VARCHAR(30) CHECK (domain_category IN (
    'brand', 'news_media', 'blog', 'community_forum', 'social_media', 'other'
  )),
  is_own_domain BOOLEAN DEFAULT false,
  is_competitor_domain BOOLEAN DEFAULT false,
  competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
  source VARCHAR(30) NOT NULL CHECK (source IN ('llm_scan', 'perplexity_sonar', 'otterly_import')),
  scan_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_citations_business_id ON citations(business_id, scan_date DESC);
CREATE INDEX idx_citations_cited_domain ON citations(cited_domain);
CREATE INDEX idx_citations_platform_id ON citations(platform_id);
CREATE INDEX idx_citations_user_id ON citations(user_id);

-- Brand Visibility
CREATE TABLE brand_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_id INTEGER REFERENCES ai_platforms(id),
  coverage_rate DECIMAL(6,2),
  share_of_voice DECIMAL(6,2),
  mention_count INTEGER,
  brand_position_avg DECIMAL(6,2),
  brand_rank INTEGER,
  domain_coverage DECIMAL(6,2),
  domain_citations_count INTEGER,
  domain_rank INTEGER,
  nss_score DECIMAL(6,2),
  sentiment_negative_pct DECIMAL(6,2),
  sentiment_neutral_pct DECIMAL(6,2),
  sentiment_positive_pct DECIMAL(6,2),
  sentiment_count INTEGER,
  bvi_quadrant VARCHAR(30) CHECK (bvi_quadrant IN (
    'leaders', 'niche', 'low_conversion', 'low_performance'
  )),
  bvi_coverage_x DECIMAL(8,4),
  bvi_likelihood_y DECIMAL(8,4),
  competitor_mention_counts JSONB DEFAULT '{}',
  source VARCHAR(30) NOT NULL CHECK (source IN ('calculated', 'otterly_import', 'looker_studio')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_brand_visibility_business_id ON brand_visibility(business_id, period_start DESC);
CREATE INDEX idx_brand_visibility_user_id ON brand_visibility(user_id);

-- SEO Snapshots
CREATE TABLE seo_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_authority_rank INTEGER,
  organic_keywords_count INTEGER,
  organic_traffic INTEGER,
  organic_traffic_cost DECIMAL(12,2),
  backlinks_total INTEGER,
  referring_domains INTEGER,
  authority_score INTEGER,
  ai_overview_keywords_total INTEGER,
  ai_overview_keywords_present INTEGER,
  ai_traffic_assistants INTEGER,
  ai_traffic_search INTEGER,
  maps_avg_rank DECIMAL(6,2),
  maps_share_of_voice DECIMAL(6,4),
  maps_rank_good_pct DECIMAL(6,2),
  maps_rank_avg_pct DECIMAL(6,2),
  maps_rank_poor_pct DECIMAL(6,2),
  serp_features JSONB DEFAULT '{}',
  schema_types_found JSONB DEFAULT '[]',
  schema_valid_count INTEGER,
  schema_invalid_count INTEGER,
  schema_markup_score DECIMAL(6,2),
  site_health_score DECIMAL(6,2),
  core_web_vitals JSONB,
  top_keywords JSONB DEFAULT '[]',
  traffic_sources JSONB DEFAULT '{}',
  audience_demographics JSONB,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_snapshots_business_id ON seo_snapshots(business_id, snapshot_date DESC);
CREATE INDEX idx_seo_snapshots_user_id ON seo_snapshots(user_id);

-- GEO Audits
CREATE TABLE geo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audit_type VARCHAR(20) NOT NULL CHECK (audit_type IN ('initial', 'quarterly', 'on_demand')),
  crawlability_score DECIMAL(6,2),
  crawlability_details JSONB,
  content_score DECIMAL(6,2),
  content_details JSONB,
  structured_data_score DECIMAL(6,2),
  structured_data_details JSONB,
  strengths JSONB DEFAULT '[]',
  weaknesses JSONB DEFAULT '[]',
  opportunities JSONB DEFAULT '[]',
  threats JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  evaluation_factors JSONB DEFAULT '{}',
  overall_score INTEGER,
  source VARCHAR(20) NOT NULL CHECK (source IN ('otterly', 'internal', 'agent')),
  audit_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geo_audits_business_id ON geo_audits(business_id, audit_date DESC);
CREATE INDEX idx_geo_audits_user_id ON geo_audits(user_id);

-- Agent Conversations
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  context_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_conversations_business_id ON agent_conversations(business_id);
CREATE INDEX idx_agent_conversations_user_id ON agent_conversations(user_id);

-- Operator Tasks
CREATE TABLE operator_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES users(id),
  task_type VARCHAR(30) NOT NULL CHECK (task_type IN (
    'otterly_setup', 'otterly_scan', 'otterly_export', 'geo_audit'
  )),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'failed'
  )),
  notes TEXT,
  data_files JSONB DEFAULT '[]',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_operator_tasks_operator_status ON operator_tasks(operator_id, status);
CREATE INDEX idx_operator_tasks_business_id ON operator_tasks(business_id);
CREATE INDEX idx_operator_tasks_due_date ON operator_tasks(due_date, status);

-- Data Imports
CREATE TABLE data_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES users(id),
  import_type VARCHAR(40) NOT NULL CHECK (import_type IN (
    'otterly_prompts', 'otterly_citations', 'otterly_citations_summary',
    'otterly_visibility', 'otterly_geo_audit'
  )),
  file_name TEXT NOT NULL,
  row_count INTEGER,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed'
  )),
  error_log TEXT,
  diff_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_imports_business_id ON data_imports(business_id);
CREATE INDEX idx_data_imports_operator_status ON data_imports(operator_id, status);

-- ─── 3. RLS Policies for new tables ────────────────────────────────────────

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;

-- Customer policies: users see their own data
CREATE POLICY businesses_select_own ON businesses FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY businesses_insert_own ON businesses FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY businesses_update_own ON businesses FOR UPDATE USING (user_id = auth.uid()::uuid);
CREATE POLICY businesses_delete_own ON businesses FOR DELETE USING (user_id = auth.uid()::uuid);

CREATE POLICY competitors_select_own ON competitors FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY competitors_insert_own ON competitors FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY competitors_update_own ON competitors FOR UPDATE USING (user_id = auth.uid()::uuid);
CREATE POLICY competitors_delete_own ON competitors FOR DELETE USING (user_id = auth.uid()::uuid);

CREATE POLICY tracked_queries_select_own ON tracked_queries FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY tracked_queries_insert_own ON tracked_queries FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY tracked_queries_update_own ON tracked_queries FOR UPDATE USING (user_id = auth.uid()::uuid);

CREATE POLICY citations_select_own ON citations FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY brand_visibility_select_own ON brand_visibility FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY seo_snapshots_select_own ON seo_snapshots FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY geo_audits_select_own ON geo_audits FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY agent_conversations_select_own ON agent_conversations FOR SELECT USING (user_id = auth.uid()::uuid);

-- Operator policies: operators can see all data for their tasks
CREATE POLICY operator_tasks_select_operator ON operator_tasks FOR SELECT
  USING (user_id = auth.uid()::uuid OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role IN ('operator', 'admin')
  ));
CREATE POLICY operator_tasks_update_operator ON operator_tasks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role IN ('operator', 'admin')));

CREATE POLICY data_imports_select_operator ON data_imports FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role IN ('operator', 'admin')));
CREATE POLICY data_imports_insert_operator ON data_imports FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role IN ('operator', 'admin')));

-- Admin insert policies for service-role operations (scanner, cron, imports)
CREATE POLICY citations_insert_service ON citations FOR INSERT WITH CHECK (true);
CREATE POLICY brand_visibility_insert_service ON brand_visibility FOR INSERT WITH CHECK (true);
CREATE POLICY seo_snapshots_insert_service ON seo_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY geo_audits_insert_service ON geo_audits FOR INSERT WITH CHECK (true);
CREATE POLICY agent_conversations_insert_own ON agent_conversations FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY agent_conversations_update_own ON agent_conversations FOR UPDATE USING (user_id = auth.uid()::uuid);

-- ─── 4. Update subscriptions for new plan structure ─────────────────────────

-- Add new columns to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS max_businesses INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS max_competitors INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS max_queries INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS scan_frequency VARCHAR(20) DEFAULT 'weekly';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS semrush_depth VARCHAR(30) DEFAULT 'overview_only';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS perplexity_model VARCHAR(30) DEFAULT 'sonar';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS otterly_access BOOLEAN DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS concierge_access BOOLEAN DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 30;
