# Feature Specification: AgenticRev ICP Pivot — AI Visibility Platform

**Feature Branch**: `pivot-realtors-smb`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "Pivot AgenticRev from Shopify merchants to Realtors and Small Businesses. Add SEMrush API, Perplexity Sonar API, Otterly.ai operator workflow. Keep existing LLM scanning. Add AI Concierge agent on Enterprise plan. Never present as a wrapper of any provider."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Business Onboarding & First AI Scan (Priority: P1)

A new user (realtor or small business owner) signs up, provides their business details, and within 5 minutes sees their first AI visibility results — which AI engines mention them, their position, sentiment, and competitors appearing in the same queries.

**Why this priority**: This is the core activation loop. Without fast time-to-value, users churn before seeing the platform's power. Replaces the Shopify-centric onboarding entirely.

**Independent Test**: A new user can sign up, complete the 4-step onboarding wizard (business profile → online presence → competitors → first scan), and view initial scan results on the dashboard — with zero SEMrush data, zero Otterly data, and zero AI Concierge access. The LLM scanner alone provides value.

**Acceptance Criteria**:
- [ ] Onboarding wizard collects: business name, type (dropdown with 15+ categories), website URL (optional), phone, address, service areas, Google Business Profile URL, social profiles (dynamic by business type), competitor names + URLs (min 1, max per plan limit)
- [ ] System generates discovery-intent queries based on business type + location (e.g., "best realtor in [city]", "top [business type] near [zip]")
- [ ] First AI scan runs across ChatGPT (GPT-4o-mini), Perplexity (sonar), Gemini (gemini-2.5-flash), Claude (claude-3.5-haiku) within 2 minutes
- [ ] Scan results capture: mentioned yes/no, position, sentiment (positive/neutral/negative), competitors mentioned, full AI response text, platform + model version, timestamp
- [ ] Dashboard displays initial results: AI Visibility Score (composite 0-100), platform breakdown chart, mention count per platform
- [ ] `businesses` table created with all fields per data model; `stores` table soft-deprecated
- [ ] `tracked_queries` table created with system-generated queries linked to business
- [ ] `ai_mentions` table extended with `business_id`, `query_id`, `competitors_mentioned`, `source` columns
- [ ] Plan limits enforced: Free (1 business, 2 competitors, 10 queries), Pro (1/5/50), Business (3/10/150), Enterprise (10/25/500)

### User Story 2 — SEMrush SEO & Authority Intelligence (Priority: P1)

After onboarding (if website URL provided), the platform automatically pulls SEMrush data and displays the business's Digital Authority Profile — organic keywords, authority score, AI Overview visibility (FK52/FP52), backlink profile, and AI traffic metrics.

**Why this priority**: SEMrush data is the second-most important data layer after LLM scanning. FK52/FP52 (AI Overview visibility) and Trends API (AI traffic) are direct GEO measurements that no competitor offers in a self-serve tool. This data differentiates us from basic chatbot-mention checkers.

**Independent Test**: A user with a website URL sees their SEO Health section on the dashboard populated with SEMrush data, including AI Overview keyword counts, authority score, and organic keywords — without any Otterly data or AI Concierge access. Weekly refresh cron updates the data automatically.

**Acceptance Criteria**:
- [ ] SEMrush API client (`lib/semrush.ts`) implements all 9 endpoints: Domain Overview, Domain Organic (with FK52/FP52), Backlinks Overview, Keyword Overview, Position Tracking (SERP Code 52), Site Audit (schema detection), Trends API (AI traffic), Map Rank Tracker, Listing Management
- [ ] Domain Overview pulled automatically on onboarding (triggered async post-onboarding)
- [ ] `seo_snapshots` table stores all fields: domain_authority_rank, organic_keywords_count, organic_traffic, organic_traffic_cost, backlinks_total, referring_domains, authority_score, ai_overview_keywords_total (FK52), ai_overview_keywords_present (FP52), ai_traffic_assistants, ai_traffic_search, maps_avg_rank, maps_share_of_voice, maps_rank distribution, serp_features (JSONB), schema_types_found (JSONB), schema_valid/invalid counts, schema_markup_score, site_health_score, core_web_vitals (JSONB), top_keywords (JSONB), traffic_sources (JSONB), audience_demographics (JSONB)
- [ ] Weekly SEMrush refresh cron job (`/api/cron/seo-refresh`) runs for all active businesses with websites
- [ ] Dashboard "SEO Health" section shows: Authority Score with trend arrow, organic keywords count, organic traffic estimate, AI Overview keywords (FK52 total + FP52 present — headline KPI), AI traffic from assistants + AI search (headline KPI), top 10 keywords, backlinks summary, schema health (types found vs. missing for business type)
- [ ] API unit consumption tracked per request; per-user monthly budget ceiling enforced per plan tier
- [ ] All SEMrush API responses validated with Zod schemas; errors logged, dashboard shows "data unavailable" on failure

### User Story 3 — Perplexity Sonar Enhanced Scanning (Priority: P1)

The AI scanner uses the Perplexity Sonar API (instead of basic Perplexity query) to extract rich citation data — which URLs Perplexity cites, search results it used, related questions users might ask — all with domain filtering and structured output for consistent data extraction.

**Why this priority**: Perplexity Sonar provides the richest citation data of any AI platform. Citation tokens are no longer billed, making this cost-effective. The `search_results` array and `return_related_questions` are unique data points that feed prompt discovery and competitive intelligence.

**Independent Test**: A scan for a business using Perplexity Sonar returns structured citation objects (url, title, snippet, domain, publish_date), search results array, and related questions — all stored in the database and visible on the Citations page.

**Acceptance Criteria**:
- [ ] Perplexity Sonar API client (`lib/perplexity-sonar.ts`) implements: model selection (sonar/sonar-pro based on plan), `search_domain_filter` (up to 20 domains), `return_citations`, `return_related_questions`, `search_recency_filter`, `web_search_options.search_context_size`, `response_format` with JSON Schema for structured extraction
- [ ] Scanner refactored to use Sonar API for Perplexity platform (replaces direct perplexity query)
- [ ] `citations` table stores: cited_url, cited_domain, cited_title, cited_snippet, cited_publish_date, platform_id, position, domain_category, is_own_domain, is_competitor_domain, competitor_id, source (llm_scan/perplexity_sonar/otterly_import)
- [ ] `ai_mentions` extended with: search_results (JSONB), related_questions (JSONB), search_context_size, token_usage (JSONB), domain_cited (boolean)
- [ ] Structured output schema enforces consistent response parsing: {business_mentioned, position, sentiment, competitors: [{name, position, sentiment}]}
- [ ] Citation tracking page shows: all cited URLs grouped by domain, domain category, frequency, own vs. competitor vs. third-party filter
- [ ] Related questions from Sonar feed into `tracked_queries` as `query_type: 'sonar_discovered'` for prompt expansion
- [ ] Free/Pro use `sonar` model; Business uses `sonar-pro`; Enterprise uses `sonar-pro` + `sonar-deep-research` (async)

### User Story 4 — Otterly.ai Operator Data Import (Priority: P2)

An internal operator manually exports data from Otterly.ai (CSV files covering 6 AI platforms) and imports it into AgenticRev through an admin panel, enriching customer dashboards with brand visibility metrics, citation maps, sentiment scores, and cross-platform coverage data.

**Why this priority**: Otterly provides the broadest platform coverage (6 AI engines including Google AI Overviews, AI Mode, and Copilot which we can't scan directly) and unique metrics (BVI, NSS, domain categories, intent volume). However, it requires manual operator workflow — making it dependent on operator hiring and SOP documentation. It is a P2 because the platform delivers value without Otterly (P1 stories provide LLM scanning + SEMrush + Sonar).

**Independent Test**: An operator uploads 3 Otterly CSV files (search prompts, citation links full, citation links summary) for a customer. The system parses them, maps data to internal tables, and the customer's dashboard shows updated Brand Coverage %, Share of Voice, Net Sentiment Score, Citation Map with domain categories, and per-platform breakdown across all 6 Otterly-tracked engines.

**Acceptance Criteria**:
- [ ] Admin panel accessible only to users with `role: 'operator'` or `'admin'`
- [ ] CSV import form accepts 3 Otterly export types: Search Prompts CSV, Citation Links Full CSV, Citation Links Summary CSV
- [ ] CSV parser validates schema before processing; rejects malformed files with specific error messages
- [ ] `brand_visibility` table stores: coverage_rate, share_of_voice, mention_count, brand_position_avg, brand_rank, domain_coverage, domain_citations_count, domain_rank, nss_score, sentiment_negative/neutral/positive_pct, sentiment_count, bvi_quadrant, bvi_coverage_x, bvi_likelihood_y, competitor_mention_counts (JSONB), per platform and per period
- [ ] `citations` table enriched with Otterly data: domain_category (brand/news_media/blog/community_forum/social_media/other), position from Otterly's citation ranking
- [ ] `ai_mentions` extended with Otterly source data: nss_score, sentiment_attributes, domain_cited
- [ ] `data_imports` table logs: import_type, file_name, row_count, status, error_log
- [ ] `operator_tasks` table tracks: task_type (otterly_setup/otterly_scan/otterly_export/geo_audit), status, operator_id, due_date, completed_at
- [ ] Dashboard brand visibility section shows: Brand Coverage %, Share of Voice %, NSS (-100 to +100), BVI quadrant position, platform breakdown across all 6 engines, trend lines over time
- [ ] System generates diff on each import: new citations, lost citations, visibility changes, sentiment shifts
- [ ] `ai_platforms` table has 7 rows: chatgpt, perplexity, gemini, claude (direct scan), google_aio, google_ai_mode, copilot (Otterly-only)

### User Story 5 — GEO Audit Import & Display (Priority: P2)

An operator runs an Otterly GEO Audit for a customer's website and imports the results — crawlability scores, content quality scores, structured data evaluation, 25+ evaluation factors, and prioritized recommendations — into AgenticRev where they appear as the GEO Audit section.

**Why this priority**: The GEO Audit is the single most actionable deliverable for customers — it tells them exactly what's wrong and how to fix it. But it depends on the operator workflow (P2 dependency on US4).

**Independent Test**: An operator imports a GEO audit. The customer sees their GEO Audit page with overall score (1-100), crawlability/content/structured data sub-scores, SWOT analysis, 25+ factor scores, and prioritized recommendations with status tracking.

**Acceptance Criteria**:
- [ ] `geo_audits` table stores: crawlability_score + details (JSONB), content_score + details (JSONB), structured_data_score + details (JSONB), strengths/weaknesses/opportunities/threats (JSONB arrays), recommendations (JSONB array with title/description/priority/category/status), evaluation_factors (JSONB — 25+ factors), overall_score, source, audit_date
- [ ] GEO Audit page displays: overall score gauge (1-100), three sub-score cards (crawlability, content, structured data), SWOT quadrant, top 5 recommendations with priority badges, full factor breakdown expandable
- [ ] Recommendations have status tracking: pending, in_progress, completed, dismissed
- [ ] Dashboard GEO Audit Summary card shows: overall score, top 3 recommendations, link to full audit page
- [ ] Audit types: initial (onboarding), quarterly (scheduled), on_demand

### User Story 6 — AI Concierge Agent (Priority: P2)

Enterprise customers access a dedicated AI agent through an in-app chat that has full context of their data (scan results, SEMrush metrics, Otterly data, historical trends) and provides personalized GEO insights, content briefs, schema markup code, competitive intelligence, progress tracking, and report generation.

**Why this priority**: The AI Concierge is the flagship Enterprise differentiator. But it requires all other data sources to be flowing (LLM scans, SEMrush, Sonar, Otterly) to provide maximum value. It can launch with partial data (LLM + SEMrush) and improve as Otterly data becomes available.

**Independent Test**: An Enterprise user opens the AI Concierge, asks "Why did my visibility drop this week?", and the agent responds with specific data from their latest scan results and SEMrush snapshot — citing exact numbers, comparing to previous periods, and recommending specific actions.

**Acceptance Criteria**:
- [ ] AI Concierge accessible only on Enterprise plan; gated by subscription check
- [ ] Chat API route (`/api/agent/chat`) accepts messages, returns agent responses with streaming
- [ ] Agent system prompt includes: customer's latest data snapshot (ai_mentions, seo_snapshots, brand_visibility, citations, geo_audits, tracked_queries), business profile, competitor data
- [ ] RAG context builder assembles relevant data based on user's question (not full data dump)
- [ ] `agent_conversations` table stores: messages (JSONB array [{role, content, timestamp}]), context_snapshot
- [ ] Chat UI: in-app chat widget (Enterprise dashboard) + dedicated full-page view at `/agent`
- [ ] Agent capabilities: personalized insights (data-driven), content briefs (with H2 suggestions + target queries), schema markup generation (JSON-LD code blocks for LocalBusiness, RealEstateAgent, FAQPage, etc.), competitive intelligence (data comparison), progress tracking (recommendation completion correlation), report generation (PDF/DOCX via structured output)
- [ ] Perplexity Agent API integration for autonomous web research: `web_search` and `fetch_url` tools
- [ ] Perplexity Deep Research mode for comprehensive competitive reports (async: submit → poll → return)
- [ ] Agent MUST only reference verified data from AgenticRev database; MUST include disclaimers; MUST NOT claim access to data it doesn't have

### User Story 7 — Competitor Tracking & Comparison (Priority: P1)

Users add competitors during onboarding or from the Competitors page. The system tracks competitor mentions across all AI scan queries, compares visibility metrics, and shows side-by-side comparison on the dashboard.

**Why this priority**: Competitor benchmarking is a core value driver. "You appear in 3 of 10 queries; your competitor appears in 7" is the most compelling activation metric.

**Independent Test**: A user adds 3 competitors. After a scan, the Competitor Comparison table shows each competitor's visibility score, mention count, top cited source, and trend — alongside the user's own metrics.

**Acceptance Criteria**:
- [ ] `competitors` table stores: competitor_name, website_url, google_business_profile_url, notes, linked to business_id
- [ ] AI scanner extracts competitor mentions from every scan response: competitor name, position, sentiment
- [ ] `ai_mentions.competitors_mentioned` (JSONB) stores: [{competitor_id, name, position, sentiment}]
- [ ] AI-powered competitor suggestion: user clicks "Let AI suggest" → LLM query generates top competitors for business type + city → user selects from results
- [ ] Dashboard Competitor Comparison table: Business name | Visibility Score | Mentions | Top Cited Source | Trend — user highlighted at top, sorted by visibility descending
- [ ] Click on competitor → expanded view showing their mentions + citations across platforms
- [ ] Competitor limit enforced per plan: Free (2), Pro (5), Business (10), Enterprise (25)

### User Story 8 — Dashboard Redesign with New Metrics (Priority: P1)

The existing dashboard is redesigned to show the new composite AI Visibility Score, Share of Voice, Citation Count, Authority Score, platform breakdown, competitor comparison, top performing queries, citation map, SEO health, and GEO audit summary — replacing the old product-centric views.

**Why this priority**: The dashboard is the primary interface. Users must see unified, actionable intelligence from all data sources in a single view.

**Independent Test**: A user on the Business plan sees all dashboard sections populated: AI Visibility Score (from LLM scans), SEO Health (from SEMrush), platform breakdown (from scans + Otterly), competitor comparison, top queries, citation map. Each section gracefully degrades if its data source is unavailable.

**Acceptance Criteria**:
- [ ] AI Visibility Score: composite 0-100 calculated from % tracked queries with mentions (weighted by platform), average position, sentiment balance, citation count to own domain
- [ ] Share of Voice: % of total mentions that reference user vs. competitors; available when Otterly data or competitor scan data exists
- [ ] Citation Count: unique URLs cited by AI, broken down: own domain, competitor domains, third-party
- [ ] Authority Score: from SEMrush domain overview, with trend arrow
- [ ] AI Visibility Over Time: line chart, X=dates (7/30/90/180/365 days by plan), Y=visibility score, lines per platform + aggregate, toggle: mentions/score/SoV
- [ ] Platform Breakdown: bar chart per platform (ChatGPT, Perplexity, Gemini, Claude, Google AIO, AI Mode, Copilot), mentions found / total queries, color-coded
- [ ] Competitor Comparison: table (see US7)
- [ ] Top Performing Queries: table with query text, platforms mentioned, position, sentiment, last scanned — click to expand full AI responses
- [ ] Citation Map: cited URL / cited by (platforms) / frequency / own-competitor-third-party filter / export CSV
- [ ] SEO Health: authority score, organic keywords, organic traffic, top 10 keywords, backlinks summary (see US2)
- [ ] GEO Audit Summary: overall score, top 5 recs, link to full audit (see US5)
- [ ] AI Concierge widget: Enterprise only — chat widget + recent insights (see US6)
- [ ] Navigation sidebar: Dashboard, AI Scans, Citations, Competitors, GEO Audit, Reports, AI Concierge (Enterprise), Settings, Billing
- [ ] Every section shows appropriate empty/loading/error states; graceful degradation per constitution

### User Story 9 — Pricing & Billing Update (Priority: P1)

The Stripe billing integration is updated with new plan definitions (Free/Pro/Business/Enterprise), new limits, and new feature gates.

**Why this priority**: Revenue infrastructure must be correct from day one. Plan limits gate access to features (Otterly, Concierge) and control API costs.

**Independent Test**: A user on the Free plan sees correct limits (1 business, 2 competitors, 10 queries, weekly scanning). Upgrading to Pro via Stripe unlocks daily scanning, 5 competitors, 50 queries, full SEMrush data. Enterprise unlocks AI Concierge.

**Acceptance Criteria**:
- [ ] `lib/stripe.ts` PLAN_CONFIG updated: Free ($0/1 biz/2 comp/10 queries/weekly scan), Pro ($149/1/5/50/daily), Business ($399/3/10/150/daily), Enterprise ($899/10/25/500/real-time)
- [ ] Stripe Price IDs created for Pro/Business/Enterprise; Free requires no Stripe subscription
- [ ] Plan feature gates enforced in middleware/API: SEMrush depth (Free: overview only, Pro+: full), Perplexity model (Free/Pro: sonar, Business: sonar-pro, Enterprise: sonar-pro + deep-research), Otterly data (Free: none, Pro: none, Business: weekly, Enterprise: weekly + quarterly GEO audit), AI Concierge (Enterprise only)
- [ ] Data retention enforced: Free (30d), Pro (90d), Business (180d), Enterprise (365d)
- [ ] Billing page displays new plan cards with correct features and pricing
- [ ] Stripe webhook handles plan changes; subscription sync updates feature access immediately
- [ ] Existing Stripe Price ID env vars renamed: STARTER→PRO, GROWTH→BUSINESS, AGENCY→ENTERPRISE

### User Story 10 — Operator Admin Panel (Priority: P2)

Internal operators have a dedicated admin interface to manage Otterly data imports, track task assignments, monitor data import health, and manage customer Otterly workspace configurations.

**Why this priority**: Operators need tooling to efficiently manage 30-50 accounts. Without proper tooling, the operator workflow becomes a bottleneck. Depends on US4 (import pipeline).

**Independent Test**: An operator logs in, sees their task queue (sorted by due date), uploads a CSV for a customer, sees it processed successfully in the import log, and marks the task as completed.

**Acceptance Criteria**:
- [ ] Admin routes protected by `users.role IN ('operator', 'admin')` check
- [ ] Admin panel pages: `/admin` (overview), `/admin/import` (CSV upload), `/admin/tasks` (task queue)
- [ ] Task queue shows: customer name, task type, status, due date, assigned operator, SLA indicator (on-time/at-risk/overdue)
- [ ] CSV upload accepts file, validates schema, shows preview of first 5 rows, confirms import
- [ ] Import log shows: all imports with timestamp, type, row count, status, error details
- [ ] Operator can assign tasks to themselves, mark in-progress, mark completed
- [ ] SLA tracking: Business accounts 48h turnaround, Enterprise 24h

---

## Functional Requirements

- **FR-001**: System MUST generate discovery-intent queries based on business_type and service_areas (e.g., "best [type] in [city]", "who should I hire for [service] near [area]") using LLM-powered query generation
- **FR-002**: Scanner MUST execute parallel queries across 4 LLM platforms (ChatGPT, Perplexity/Sonar, Gemini, Claude) with 300ms rate limiting between platforms
- **FR-003**: Scanner MUST extract competitor mentions from each AI response, mapping to known competitors in the `competitors` table
- **FR-004**: Perplexity Sonar client MUST use `response_format` with JSON Schema to enforce structured output: `{business_mentioned: boolean, position: number|null, sentiment: string, competitors: [{name, position, sentiment}]}`
- **FR-005**: SEMrush client MUST implement rate limiting (10 req/sec, 10 simultaneous) and unit tracking per API call
- **FR-006**: SEMrush data MUST be cached with 24h minimum TTL; weekly cron refreshes all active businesses
- **FR-007**: Otterly CSV parser MUST handle 3 export formats (Search Prompts, Citation Links Full, Citation Links Summary) with strict column validation
- **FR-008**: AI Visibility Score calculation: `(mention_rate × 0.4) + (avg_position_normalized × 0.2) + (sentiment_score × 0.2) + (own_domain_citation_rate × 0.2)` — formula configurable via constants
- **FR-009**: AI Concierge MUST use RAG to assemble context from: latest ai_mentions (last 30 days), latest seo_snapshot, latest brand_visibility, all citations (last 90 days), latest geo_audit, business profile + competitors
- **FR-010**: AI Concierge MUST use Perplexity Agent API (`web_search` + `fetch_url` tools) for autonomous competitor research when user asks competitive questions
- **FR-011**: All new database tables MUST have RLS policies; customer queries scoped by user_id via Supabase auth
- **FR-012**: All external API responses (SEMrush, Perplexity, LLMs) MUST be validated with Zod schemas before database insertion
- **FR-013**: Dashboard MUST load in < 3 seconds using parallel data fetching (Promise.all) across all data sources
- **FR-014**: Plan limit enforcement MUST happen at API route level before executing operations; return 403 with clear upgrade message
- **FR-015**: Email system MUST send: welcome email post-onboarding, weekly digest (scan results + visibility changes), GEO audit completion notification, critical alert (visibility drops > 20% week-over-week)
- **FR-016**: Scanner cron MUST run daily at 3am UTC for Pro+ plans, weekly for Free plans
- **FR-017**: Operator task creation MUST be triggered automatically when a Business/Enterprise user completes onboarding (Otterly setup task)
- **FR-018**: CSV import MUST generate a diff report: new citations added, citations lost, visibility score changes, sentiment shifts since last import
- **FR-019**: All deprecated Shopify-specific tables (stores, products, truth_engine_errors, acp_feeds, acp_orders) MUST be soft-deprecated with migration that adds `deprecated_at` timestamp, NOT deleted
- **FR-020**: Landing page MUST be rewritten for new ICP positioning: realtors and small businesses, GEO/AEO focus, no Shopify references
- **FR-021**: Perplexity Deep Research (sonar-deep-research) MUST use async mode: submit query → poll for completion → return results; available only on Enterprise plan
- **FR-022**: Map Rank Tracker data (FREE endpoint) MUST be pulled for all businesses with a physical address on onboarding + weekly refresh
- **FR-023**: Site Audit schema detection MUST check for business-type-appropriate schemas: RealEstateAgent for realtors, LocalBusiness for all local businesses, FAQPage/HowTo/QAPage for all
- **FR-024**: Listing Management API MUST support NAP consistency checks for businesses with physical addresses; voice search distribution status tracked

---

## Success Criteria

- **SC-001**: New user completes onboarding and sees first scan results in < 5 minutes
- **SC-002**: Dashboard loads with all available data sections in < 3 seconds (p95)
- **SC-003**: SEMrush data available within 60 seconds of onboarding completion (async)
- **SC-004**: AI Concierge responds within 5 seconds for standard queries, < 30 seconds for queries requiring web research
- **SC-005**: Otterly CSV import processes 1000-row file in < 10 seconds with zero data loss
- **SC-006**: AI Visibility Score computed within 500ms using cached data
- **SC-007**: Scanner completes full 4-platform scan for one business in < 2 minutes
- **SC-008**: API unit consumption stays within budget: Free <$1/mo, Pro <$10/mo, Business <$45/mo, Enterprise <$90/mo
- **SC-009**: Zero cross-customer data leakage (RLS enforced on all tables)
- **SC-010**: Graceful degradation: if SEMrush is down, dashboard shows SEO section as "temporarily unavailable" — all other sections unaffected

---

## Edge Cases & Error Handling

- **Business without website URL**: Skip SEMrush data pull entirely; show "Add your website to unlock SEO intelligence" prompt in SEO Health section; all other features (LLM scanning, competitor tracking) work normally
- **Business without physical address**: Skip Map Rank Tracker and Listing Management; service_areas still used for query generation
- **LLM platform rate limited or down**: Skip that platform for current scan; record failure in scan log; dashboard shows last successful scan data with "last updated X ago" indicator; do NOT block other platforms
- **SEMrush returns 429 (rate limit)**: Queue request with exponential backoff (max 3 retries); if still failing, skip and mark seo_snapshot as partial
- **Perplexity Sonar returns malformed JSON despite structured output**: Fall back to text parsing with regex extraction; log incident for monitoring
- **Otterly CSV has unexpected columns or format changes**: Reject import with specific error message showing expected vs. actual columns; log in data_imports with status 'failed'
- **AI Concierge asked about data that hasn't been collected yet**: Agent responds with "I don't have [data type] for your business yet. This data will be available after [condition]." — NEVER hallucinate data
- **User on Free plan tries to access gated feature**: Return 403 with plan comparison showing what they'd unlock by upgrading; UI shows upgrade CTA
- **Competitor mentioned in scan but not in user's competitor list**: Store in competitors_mentioned JSONB with name only (no competitor_id); suggest user add them as tracked competitor
- **Multiple businesses on same plan (Business/Enterprise)**: Each business has independent data; dashboard has business selector; scans and crons run per-business
- **Operator imports data for wrong customer**: Import validation checks business_id against operator's assigned accounts; import can be rolled back within 24h via admin panel
- **Deep Research (async) times out**: Poll for up to 5 minutes; if not complete, store partial results and mark as 'incomplete'; notify user result may be partial

---

## Out of Scope

- Shopify integration for new users (existing code soft-deprecated)
- WooCommerce or any e-commerce platform
- ACP (Agentic Commerce Protocol) — Shopify-specific
- Automated Otterly.ai scraping or browser automation
- White-label reporting
- Mobile app (native)
- Multi-language support
- Self-serve Otterly access for customers
- SEMrush accounts for end users
- Direct website editing by AI Concierge
- Zillow/Realtor.com/MLS data integration
- Custom domain/branding per customer
- Team/organization features (single user per account at launch)
- Automated competitor discovery without user confirmation

---

## Clarifications

### Session 2026-04-02
- Q: Should the platform support team accounts with multiple users per business? → A: Not at launch. Single user per account. Team features are future scope.
- Q: Should the AI Concierge be able to trigger scans or data refreshes? → A: No. It is read-only over existing data. It recommends, it does not execute actions.
- Q: Should we use Perplexity Sonar for ALL Perplexity scanning, or keep the legacy direct query as fallback? → A: Use Sonar as primary. Keep legacy direct query as fallback if Sonar is unavailable (graceful degradation per constitution).
- Q: How do we handle the transition for any existing Shopify users? → A: Soft-deprecate. Existing data preserved. No new features for Shopify flow. Migration path TBD as open question.
- Q: Which LLM powers the AI Concierge? → A: Configurable via AGENT_MODEL env var (default: gpt-4o). Can use any model. Perplexity Agent API used for web research capability, not as the primary conversation model.
