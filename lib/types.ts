// ============================================================================
// Core database types matching schema
// Includes legacy types and new pivot types for AEO/GEO business platform
// ============================================================================

// ─── LEGACY TYPES (E-Commerce) ─────────────────────────────────────────────

/**
 * User account information
 */
export interface User {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  email_verified: boolean;
  oauth_provider?: 'email';
  role?: 'customer' | 'operator' | 'admin';
  created_at: string;
}

/**
 * Legacy e-commerce store connection
 */
export interface Store {
  id: string;
  user_id: string;
  platform: 'woocommerce';
  store_url: string;
  store_name?: string;
  store_domain?: string;
  product_count: number;
  last_sync_at?: string;
  sync_status: 'pending' | 'syncing' | 'success' | 'failed';
  connected_at?: string;
  created_at: string;
}

/**
 * E-commerce product
 */
export interface Product {
  id: string;
  store_id: string;
  user_id: string;
  platform_id: string;
  name: string;
  description?: string;
  product_type?: string;
  category?: string;
  tags?: string[];
  price: number;
  inventory_quantity: number;
  in_stock: boolean;
  image_url?: string;
  product_url?: string;
  ai_readability_score?: number;
  synced_at: string;
}

/**
 * AI model mention of a product across LLM platforms
 */
export interface AIMention {
  id: string;
  product_id?: string;
  business_id?: string;
  query_id?: string;
  user_id: string;
  platform_id: number;
  query: string;
  mentioned: boolean;
  position?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentiment_score?: number;
  sentiment_attributes?: Record<string, unknown>;
  competitors_mentioned?: string[];
  search_results?: Record<string, unknown>[];
  related_questions?: string[];
  search_context_size?: number;
  nss_score?: number;
  domain_cited?: string;
  source?: 'llm_scan' | 'perplexity_sonar' | 'otterly_import';
  token_usage?: number;
  scanned_at: string;
}

/**
 * Data quality issues detected in e-commerce product data
 */
export interface TruthEngineError {
  id: string;
  product_id: string;
  user_id: string;
  error_type: 'price_mismatch' | 'inventory_error' | 'missing_schema' | 'description_mismatch';
  severity: 'critical' | 'warning' | 'info';
  expected_value?: string;
  actual_value?: string;
  resolved: boolean;
  detected_at: string;
}

/**
 * User subscription plan with entitlements
 */
export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'pro' | 'business' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trial';
  price_per_month?: number;
  max_products?: number;
  max_businesses?: number;
  max_competitors?: number;
  max_queries?: number;
  scan_frequency?: 'weekly' | 'biweekly' | 'monthly' | 'daily' | 'realtime';
  semrush_depth?: 'lite' | 'standard' | 'pro';
  perplexity_model?: 'sonar' | 'sonar_pro';
  otterly_access?: boolean;
  concierge_access?: boolean;
  data_retention_days?: number;
  current_period_end?: string;
}

// ─── DASHBOARD / VISIBILITY (LEGACY) ───────────────────────────────────────

/**
 * Timeline data point for visualization (mentions over time by platform)
 */
export interface TimelinePoint {
  date: string; // YYYY-MM-DD
  chatgpt: number;
  perplexity: number;
  gemini: number;
  claude: number;
}

/**
 * Platform-level mention breakdown
 */
export interface PlatformPoint {
  platform: string; // display name
  slug: string;
  mentions: number;
}

/**
 * Top-performing product (legacy e-commerce)
 */
export interface TopProduct {
  id: string;
  name: string;
  image_url?: string;
  mentions: number;
  avg_position: number | null;
}

/**
 * Dashboard statistics aggregation
 */
export interface DashboardStats {
  totalMentions: number;
  previousMentions: number;
  visibilityScore: number;
  openErrors: number;
  platformBreakdown: PlatformPoint[];
  timelineData: TimelinePoint[];
  topProducts: TopProduct[];
  // New AEO/GEO fields
  aiVisibilityScore?: number;
  shareOfVoice?: number;
  citationCount?: number;
  authorityScore?: number;
  competitorData?: CompetitorComparison[];
  topQueries?: TopQuery[];
}

// ─── NEW PIVOT TYPES (AEO/GEO) ────────────────────────────────────────────

/**
 * Business type enumeration for multi-vertical support
 */
export enum BusinessType {
  REALTOR = 'realtor',
  RESTAURANT = 'restaurant',
  LAW_FIRM = 'law_firm',
  DENTAL = 'dental',
  PLUMBER = 'plumber',
  SALON = 'salon',
  ACCOUNTANT = 'accountant',
  SAAS = 'saas',
  ECOMMERCE = 'ecommerce',
  AGENCY = 'agency',
  MEDICAL = 'medical',
  FITNESS = 'fitness',
  HOME_SERVICES = 'home_services',
  CONSULTING = 'consulting',
  OTHER = 'other',
}

/**
 * Core business profile
 */
export interface Business {
  id: string;
  user_id: string;
  business_name: string;
  business_type: BusinessType;
  business_category?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  phone?: string;
  email?: string;
  website_url?: string;
  google_business_profile_url?: string;
  social_profiles?: Record<string, string>; // { 'twitter': 'handle', 'facebook': 'url', ... }
  service_areas?: string[];
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * Competitor tracked for benchmarking
 */
export interface Competitor {
  id: string;
  business_id: string;
  user_id: string;
  competitor_name: string;
  website_url?: string;
  google_business_profile_url?: string;
  notes?: string;
  created_at: string;
}

/**
 * Search query tracked for ranking and visibility
 */
export interface TrackedQuery {
  id: string;
  business_id: string;
  user_id: string;
  query_text: string;
  query_type: 'system_generated' | 'user_custom' | 'otterly_imported' | 'otterly_prompt_research' | 'gsc_imported' | 'sonar_discovered';
  intent_category?: 'discovery' | 'comparison' | 'review' | 'service_specific' | 'location_specific';
  intent_volume?: number;
  growth_3m?: number;
  tags?: string[];
  is_active: boolean;
  created_at: string;
}

/**
 * Citation/mention of business or domain in LLM or search context
 */
export interface Citation {
  id: string;
  ai_mention_id?: string;
  business_id?: string;
  user_id: string;
  cited_url: string;
  cited_domain: string;
  cited_title?: string;
  cited_snippet?: string;
  cited_publish_date?: string;
  platform_id: string;
  position?: number;
  domain_category?: 'brand' | 'news_media' | 'blog' | 'community_forum' | 'social_media' | 'other';
  is_own_domain: boolean;
  is_competitor_domain: boolean;
  competitor_id?: string;
  source: 'llm_scan' | 'perplexity_sonar' | 'otterly_import';
  scan_date: string;
  created_at: string;
}

/**
 * Brand visibility metrics aggregation
 */
export interface BrandVisibility {
  id: string;
  business_id: string;
  user_id: string;
  platform_id?: string;
  coverage_rate?: number;
  share_of_voice?: number;
  mention_count?: number;
  brand_position_avg?: number;
  brand_rank?: number;
  domain_coverage?: number;
  domain_citations_count?: number;
  domain_rank?: number;
  nss_score?: number;
  sentiment_negative_pct?: number;
  sentiment_neutral_pct?: number;
  sentiment_positive_pct?: number;
  sentiment_count?: number;
  bvi_quadrant?: 'leaders' | 'niche' | 'low_conversion' | 'low_performance';
  bvi_coverage_x?: number;
  bvi_likelihood_y?: number;
  competitor_mention_counts?: Record<string, number>;
  source: 'calculated' | 'otterly_import' | 'looker_studio';
  period_start: string;
  period_end: string;
  created_at: string;
}

/**
 * SEO and AI search visibility snapshot for a domain
 */
export interface SEOSnapshot {
  id: string;
  business_id: string;
  user_id: string;
  domain_authority_rank?: number;
  organic_keywords_count?: number;
  organic_traffic?: number;
  organic_traffic_cost?: number;
  backlinks_total?: number;
  referring_domains?: number;
  authority_score?: number;
  ai_overview_keywords_total?: number;
  ai_overview_keywords_present?: number;
  ai_traffic_assistants?: number;
  ai_traffic_search?: number;
  maps_avg_rank?: number;
  maps_share_of_voice?: number;
  maps_rank_good_pct?: number;
  maps_rank_avg_pct?: number;
  maps_rank_poor_pct?: number;
  serp_features?: Record<string, { total_keywords: number; keywords_present: number }>;
  schema_types_found?: string[];
  schema_valid_count?: number;
  schema_invalid_count?: number;
  schema_markup_score?: number;
  site_health_score?: number;
  core_web_vitals?: {
    lcp: number;
    fid: number;
    cls: number;
  };
  top_keywords?: Array<{
    keyword: string;
    position: number;
    volume: number;
    traffic_pct: number;
    ai_overview_present: boolean;
  }>;
  traffic_sources?: Record<string, number>;
  audience_demographics?: Record<string, unknown>;
  snapshot_date: string;
  created_at: string;
}

/**
 * Geolocation and content audit results
 */
export interface GEOAudit {
  id: string;
  business_id: string;
  user_id: string;
  audit_type: 'initial' | 'quarterly' | 'on_demand';
  crawlability_score?: number;
  crawlability_details?: Record<string, unknown>;
  content_score?: number;
  content_details?: Record<string, unknown>;
  structured_data_score?: number;
  structured_data_details?: Record<string, unknown>;
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  threats?: string[];
  recommendations?: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
    status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  }>;
  evaluation_factors?: Record<string, number>;
  overall_score?: number;
  source: 'otterly' | 'internal' | 'agent';
  audit_date: string;
  created_at: string;
}

/**
 * Conversation history with AI agent for a business
 */
export interface AgentConversation {
  id: string;
  business_id: string;
  user_id: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  context_snapshot?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Task assignment for operators to perform scans, imports, and setup
 */
export interface OperatorTask {
  id: string;
  business_id: string;
  user_id: string;
  operator_id?: string;
  task_type: 'otterly_setup' | 'otterly_scan' | 'otterly_export' | 'geo_audit';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  notes?: string;
  data_files?: string[];
  due_date?: string;
  completed_at?: string;
  created_at: string;
}

/**
 * Data import log for tracking external data sources
 */
export interface DataImport {
  id: string;
  business_id: string;
  operator_id: string;
  import_type: 'otterly_prompts' | 'otterly_citations' | 'otterly_citations_summary' | 'otterly_visibility' | 'otterly_geo_audit';
  file_name: string;
  row_count?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_log?: string;
  diff_summary?: Record<string, unknown>;
  created_at: string;
}

// ─── DASHBOARD TYPES (NEW) ────────────────────────────────────────────────

/**
 * Visibility score with component breakdown and trend
 */
export interface VisibilityScoreResult {
  score: number;
  components: {
    mention_rate: {
      value: number;
      weight: number;
      contribution: number;
    };
    avg_position: {
      value: number;
      weight: number;
      contribution: number;
    };
    sentiment: {
      value: number;
      weight: number;
      contribution: number;
    };
    own_citation_rate: {
      value: number;
      weight: number;
      contribution: number;
    };
  };
  trend: number;
  trend_period: string;
}

/**
 * Competitor comparison metrics
 */
export interface CompetitorComparison {
  competitor_id: string;
  name: string;
  visibility_score: number;
  mentions: number;
  top_cited_source?: string;
  trend: number;
}

/**
 * Top performing query with platform and sentiment data
 */
export interface TopQuery {
  id: string;
  query_text: string;
  platforms_mentioned: string[];
  position?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  last_scanned?: string;
}
