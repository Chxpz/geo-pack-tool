# Tasks: AgenticRev ICP Pivot

**Input**: Design documents from `specs/spec-pivot/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3...)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, database migration, type definitions, and Zod schemas

- [ ] T001 Create database migration file `supabase/migrations/003_pivot_schema.sql` with all 10 new tables (businesses, competitors, tracked_queries, citations, brand_visibility, seo_snapshots, geo_audits, agent_conversations, operator_tasks, data_imports) per data-model.md
- [ ] T002 Add new columns to existing `ai_mentions` table in migration: business_id, query_id, competitors_mentioned, search_results, related_questions, search_context_size, nss_score, sentiment_attributes, domain_cited, source, token_usage
- [ ] T003 Add new rows to `ai_platforms` table in migration: google_aio, google_ai_mode, copilot (with scan_method: otterly_only)
- [ ] T004 Add `role` column to `users` table in migration (default 'customer', enum: customer/operator/admin)
- [ ] T005 Add `deprecated_at` column to stores, products, truth_engine_errors, acp_feeds, acp_orders tables in migration
- [ ] T006 Create RLS policies for all 10 new tables in migration (user_id scoping, operator role check for admin tables)
- [ ] T007 Create database indexes for all new tables per data-model.md index specifications
- [ ] T008 [P] Define all new TypeScript types in `lib/types.ts`: Business, Competitor, TrackedQuery, Citation, BrandVisibility, SEOSnapshot, GEOAudit, AgentConversation, OperatorTask, DataImport, VisibilityScore, ScanResult
- [ ] T009 [P] Create Zod validation schemas in `lib/schemas/business.ts` for business creation/update, competitor creation, query creation forms
- [ ] T010 [P] Create Zod validation schemas in `lib/schemas/semrush.ts` for all 9 SEMrush API response types (DomainOverview, DomainOrganic, BacklinksOverview, KeywordOverview, PositionTracking, SiteAudit, TrafficAnalytics, MapRank, ListingManagement)
- [ ] T011 [P] Create Zod validation schemas in `lib/schemas/perplexity.ts` for Sonar API response (citations array, search_results array, related_questions, usage object, structured output schema)
- [ ] T012 [P] Create Zod validation schemas in `lib/schemas/otterly-csv.ts` for 3 CSV formats: SearchPrompts, CitationLinksFull, CitationLinksSummary — with column name mapping
- [ ] T013 [P] Update `.env.example` with new environment variables: SEMRUSH_API_KEY, PERPLEXITY_SONAR_API_KEY, AGENT_MODEL, AGENT_MAX_TOKENS

**Checkpoint**: Database migrated, types defined, schemas ready — all subsequent phases can reference these

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core business entity, query generation, and scanner refactor that ALL user stories depend on
**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T014 Create business CRUD API route `app/api/businesses/route.ts` (POST: create with plan limit check, GET: list for user) per contracts/businesses-api.md
- [ ] T015 Create business detail API route `app/api/businesses/[id]/route.ts` (GET with summary metrics, PATCH, DELETE soft-delete) per contracts/businesses-api.md
- [ ] T016 Create competitor CRUD API route `app/api/competitors/route.ts` (POST with plan limit check, GET, DELETE) per contracts/businesses-api.md
- [ ] T017 Create competitor suggestion API route `app/api/competitors/suggest/route.ts` — LLM query: "Top [business_type] in [city]" → parse response → return suggestions
- [ ] T018 Create query generator `lib/query-generator.ts` — input: business_type + city + service_areas + description → output: array of discovery-intent queries using LLM. Templates per business_type (realtor: "best realtor in X", "who should I hire to sell my home in X"; restaurant: "best restaurant in X for Y"; generic: "best [type] in [city]", "recommend a [type] near [area]")
- [ ] T019 Create tracked queries CRUD API route `app/api/queries/route.ts` (POST: create with plan limit, GET: list for business, PATCH: toggle is_active)
- [ ] T020 Create query auto-generation API route `app/api/queries/generate/route.ts` — calls query-generator, inserts into tracked_queries with query_type 'system_generated'
- [ ] T021 Refactor `lib/scanner.ts` — change from product-based to business-based scanning: accept business_id + query_ids, generate prompts using tracked_queries, extract competitor mentions from each AI response, store results in ai_mentions with business_id + query_id + competitors_mentioned
- [ ] T022 Update scanner to use structured output prompts for consistent extraction: instruct each LLM to return JSON with {business_mentioned, position, sentiment, competitors: [{name, position, sentiment}], citations_mentioned: [url]}
- [ ] T023 Update `lib/stripe.ts` PLAN_CONFIG: rename plans (Free/Pro/Business/Enterprise), update limits (maxBusinesses, maxCompetitors, maxQueries, scanFrequency, semrushDepth, perplexityModel, otterlyAccess, conciergeAccess, dataRetentionDays)
- [ ] T024 [P] Create plan gate utility `components/shared/PlanGate.tsx` — wrapper component that checks subscription tier and renders upgrade CTA or children
- [ ] T025 [P] Create business selector `components/shared/BusinessSelector.tsx` — dropdown for multi-business plans (Business/Enterprise)

**Checkpoint**: Foundation ready — business entity CRUD works, scanner scans businesses, queries auto-generated, plan limits enforced

---

## Phase 3: User Story 1 — Business Onboarding & First Scan (Priority: P1) MVP

**Goal**: New user signs up, completes business onboarding, sees first AI scan results
**Independent Test**: User completes 4-step wizard, gets scan results on dashboard within 5 minutes

### Implementation for User Story 1
- [ ] T026 [US1] Create onboarding business form component `components/onboarding/BusinessForm.tsx` — Step 1: business name (pre-filled), type (dropdown 15+ categories), website URL (optional), phone, address fields, service_areas (multi-input)
- [ ] T027 [US1] Create onboarding presence form component `components/onboarding/PresenceForm.tsx` — Step 2: Google Business Profile URL, dynamic social profile fields based on business_type (realtor: Zillow/Realtor.com, restaurant: Yelp/TripAdvisor, professional: LinkedIn), Facebook/Instagram/Twitter
- [ ] T028 [US1] Create onboarding competitor form component `components/onboarding/CompetitorForm.tsx` — Step 3: manual entry (name + website) OR "Let AI suggest" button → calls /api/competitors/suggest → user selects. Min 1, max per plan.
- [ ] T029 [US1] Create onboarding first scan component `components/onboarding/FirstScan.tsx` — Step 4: triggers query generation + first scan, shows progress bar per platform (Querying ChatGPT... ✓), displays summary results, CTA to dashboard
- [ ] T030 [US1] Rewrite `app/onboarding/page.tsx` — 4-step wizard using new components. Calls: POST /api/businesses → POST /api/queries/generate → POST /api/scan/trigger. Server component with client form steps.
- [ ] T031 [US1] Create scan trigger API route `app/api/scan/trigger/route.ts` per contracts/scanner-api.md — validates plan limits, queues scan across 4 platforms for all active queries
- [ ] T032 [US1] Create scan status API route `app/api/scan/status/[id]/route.ts` per contracts/scanner-api.md — returns progress (queries completed, platforms status)
- [ ] T033 [US1] Create mentions query API route `app/api/mentions/route.ts` per contracts/scanner-api.md — GET with filters (business_id, platform_id, query_id, date range, mentioned filter), pagination
- [ ] T034 [US1] Update scanner cron `app/api/cron/scanner/route.ts` — iterate all active businesses (not products), daily for Pro+, weekly for Free; call scanner.ts per business
- [ ] T035 [US1] Trigger async post-onboarding tasks: on business creation, if website_url present → queue SEMrush pull; if Business/Enterprise plan → create operator_task for Otterly setup

**Checkpoint**: User Story 1 fully functional — signup → onboard → scan → results

---

## Phase 4: User Story 2 — SEMrush Integration (Priority: P1)

**Goal**: SEO & authority intelligence data flowing from SEMrush into dashboard
**Independent Test**: User with website sees SEO Health section populated after onboarding

### Implementation for User Story 2
- [ ] T036 [US2] Create SEMrush API client `lib/semrush.ts` — implement rate limiter (10 req/sec, 10 concurrent), API key auth, unit tracking logger, error handling with Zod validation
- [ ] T037 [US2] Implement Domain Overview endpoint in `lib/semrush.ts` — GET /domain_overview, parse response, return typed DomainOverview object
- [ ] T038 [US2] Implement Domain Organic endpoint in `lib/semrush.ts` — GET /domain_organic with FK52/FP52 columns, pagination support (display_limit/display_offset), return typed array
- [ ] T039 [US2] Implement Backlinks Overview endpoint in `lib/semrush.ts` — GET /backlinks_overview, return typed BacklinksOverview
- [ ] T040 [US2] Implement Keyword Overview endpoint in `lib/semrush.ts` — GET /keyword_overview with batch support, return typed array with intent signals + question variants
- [ ] T041 [US2] Implement Position Tracking integration in `lib/semrush.ts` — Projects API (JSON), SERP Code 52 for AI Overview detection, device/location targeting, competitor comparison per keyword
- [ ] T042 [US2] Implement Site Audit integration in `lib/semrush.ts` — Projects API, schema markup detection (30+ types), structured data validation, technical SEO issues, Rich Results eligibility
- [ ] T043 [US2] Implement Trends API Traffic Analytics in `lib/semrush.ts` — traffic summary with AI Assistant + AI Search channels, audience demographics, engagement metrics, competitor traffic comparison
- [ ] T044 [US2] Implement Map Rank Tracker in `lib/semrush.ts` — v4 API, Google Maps rankings, avg rank, SoV, rank distribution, competitor map rankings. Note: FREE (no units)
- [ ] T045 [US2] Implement Listing Management in `lib/semrush.ts` — v4 API with OAuth, GetLocations + UpdateLocations, NAP data push to 70+ directories, voice search distribution
- [ ] T046 [US2] Create SEMrush snapshot API route `app/api/seo/snapshot/route.ts` per contracts/semrush-api.md — triggers full pull based on plan tier, stores in seo_snapshots table
- [ ] T047 [US2] Create SEMrush snapshots list API route `app/api/seo/snapshots/route.ts` — GET with business_id + date filters
- [ ] T048 [US2] Create SEMrush keywords API route `app/api/seo/keywords/route.ts` per contracts/semrush-api.md — GET with filters (ai_overview_only, sort_by), pagination
- [ ] T049 [US2] Create weekly SEMrush refresh cron `app/api/cron/seo-refresh/route.ts` per contracts/semrush-api.md — iterates businesses with websites, pulls data per plan tier, stores snapshots, logs unit consumption
- [ ] T050 [US2] Create SEO Health dashboard component `components/dashboard/SEOHealth.tsx` — authority score with trend, organic keywords, organic traffic, AI Overview keywords (FK52 total + FP52 present as headline KPI), AI traffic (assistants + search as headline KPI), top 10 keywords, backlinks summary, schema health

**Checkpoint**: User Story 2 fully functional — SEMrush data flows in, displays on dashboard

---

## Phase 5: User Story 3 — Perplexity Sonar Enhanced Scanning (Priority: P1)

**Goal**: Rich citation data from Perplexity Sonar API replaces basic Perplexity query
**Independent Test**: Scan returns citation objects, search results, related questions from Sonar

### Implementation for User Story 3
- [ ] T051 [US3] Create Perplexity Sonar API client `lib/perplexity-sonar.ts` — OpenAI-compatible client, model selection (sonar/sonar-pro based on plan), streaming support, Zod response validation
- [ ] T052 [US3] Implement domain filtering in `lib/perplexity-sonar.ts` — search_domain_filter (max 20 domains), allowlist/denylist mode, build filter from business website + competitor websites
- [ ] T053 [US3] Implement structured output in `lib/perplexity-sonar.ts` — response_format with JSON Schema: {business_mentioned: boolean, position: number|null, sentiment: "positive"|"neutral"|"negative", competitors: [{name, position, sentiment}]}
- [ ] T054 [US3] Implement citation extraction in `lib/perplexity-sonar.ts` — parse citations array (url, title, snippet, domain, publish_date), parse search_results array (rank, url, title, snippet, domain, timestamp), parse related_questions array
- [ ] T055 [US3] Implement Deep Research mode in `lib/perplexity-sonar.ts` — async submit (sonar-deep-research model) → poll for completion → return results. Enterprise plan only.
- [ ] T056 [US3] Refactor scanner to use Sonar client for Perplexity platform in `lib/scanner.ts` — replace direct Perplexity call with perplexity-sonar.ts client. Store citations in `citations` table. Store search_results and related_questions in ai_mentions JSONB columns. Fall back to legacy direct query if Sonar unavailable.
- [ ] T057 [US3] Create citations query API route `app/api/citations/route.ts` per contracts/businesses-api.md — GET with filters (business_id, domain_filter, platform_id, source, date range), aggregation summary
- [ ] T058 [US3] Implement related questions → tracked_queries pipeline: after Sonar scan, insert new related_questions as tracked_queries with query_type 'sonar_discovered' (deduplicate against existing)
- [ ] T059 [US3] Create Citation tracking page `app/citations/page.tsx` — server component, table of all citations grouped by domain, domain category, frequency, own/competitor/third-party filter, export CSV button
- [ ] T060 [US3] Create Citation table component `components/citations/CitationTable.tsx` — client component for sorting/filtering/pagination

**Checkpoint**: User Story 3 fully functional — Sonar citations flowing, displayed on Citations page

---

## Phase 6: User Story 7 — Competitor Tracking (Priority: P1)

**Goal**: Competitor mentions tracked across all scans, comparison visible on dashboard
**Independent Test**: After scan, competitor table shows each competitor's visibility vs. user

### Implementation for User Story 7
- [ ] T061 [US7] Create Competitors management page `app/competitors/page.tsx` — server component, list competitors per business, add/remove, AI suggest button, click-to-expand mention details
- [ ] T062 [US7] Create Competitor card component `components/competitors/CompetitorCard.tsx` — name, website, mention count, latest visibility metrics, trend
- [ ] T063 [US7] Create Competitor Comparison dashboard component `components/dashboard/CompetitorTable.tsx` — table: Business name | Visibility Score | Mentions | Top Cited Source | Trend — user highlighted at top, sorted by visibility desc
- [ ] T064 [US7] Implement competitor mention matching in `lib/scanner.ts` — after extracting competitors_mentioned from AI response, match names to competitors table entries (fuzzy match), populate competitor_id in JSONB

**Checkpoint**: User Story 7 fully functional — competitors tracked, compared on dashboard

---

## Phase 7: User Story 8 — Dashboard Redesign (Priority: P1)

**Goal**: Full dashboard with all metric sections, graceful degradation
**Independent Test**: Business plan user sees all sections; Free plan user sees gated sections with upgrade CTAs

### Implementation for User Story 8
- [ ] T065 [US8] Create visibility score calculator `lib/visibility-score.ts` — input: ai_mentions for business (last 30 days) → output: composite 0-100 score with component breakdown per FR-008 formula
- [ ] T066 [US8] Create visibility score API route `app/api/visibility/score/route.ts` per contracts/businesses-api.md — GET with business_id, returns score + components + trend
- [ ] T067 [US8] Create Visibility Score dashboard component `components/dashboard/VisibilityScore.tsx` — large number display (0-100), color-coded (red/yellow/green), trend arrow, component breakdown tooltip
- [ ] T068 [US8] Create Platform Breakdown dashboard component `components/dashboard/PlatformBreakdown.tsx` — bar chart (Recharts) per platform (7 total), mentions/total per platform, color-coded
- [ ] T069 [US8] Create Top Queries dashboard component `components/dashboard/TopQueries.tsx` — table: query text | platforms mentioned | position | sentiment | last scanned — click to expand full AI responses per platform
- [ ] T070 [US8] Create Citation Map dashboard component `components/dashboard/CitationMap.tsx` — table: cited URL | platforms | frequency | own/competitor/third-party — with domain grouping and CSV export
- [ ] T071 [US8] Update Visibility Over Time chart `components/dashboard/VisibilityChart.tsx` — Recharts line chart, lines per platform + aggregate, toggle: mentions/score/SoV, date range per plan (7/30/90/180/365d)
- [ ] T072 [US8] Rewrite `lib/stats.ts` — new fetchDashboardStats function: parallel fetch (Promise.all) of visibility score, latest ai_mentions summary, latest seo_snapshot, latest brand_visibility, citation counts, competitor metrics, latest geo_audit summary
- [ ] T073 [US8] Rewrite `app/dashboard/page.tsx` — server component, auth guard, business selector (if multi-business), all dashboard sections using new components, graceful degradation per section (show "unavailable" if data source missing)
- [ ] T074 [US8] Update `app/layout.tsx` navigation — sidebar: Dashboard, AI Scans, Citations, Competitors, GEO Audit, Reports, AI Concierge (Enterprise badge), Settings, Billing
- [ ] T075 [US8] Create Scans page `app/scans/page.tsx` — query management (list/add/remove/toggle tracked queries) + scan history (list past scans with results summary)

**Checkpoint**: User Story 8 fully functional — complete dashboard with all sections

---

## Phase 8: User Story 9 — Pricing & Billing (Priority: P1)

**Goal**: Correct plan definitions, feature gates, billing page
**Independent Test**: Free user sees correct limits; upgrading to Pro unlocks correct features

### Implementation for User Story 9
- [ ] T076 [US9] Update `app/billing/page.tsx` — new plan cards (Free/Pro/Business/Enterprise) with feature matrix matching spec Section 5
- [ ] T077 [US9] Update Stripe webhook handler `app/api/webhooks/stripe/route.ts` — handle new plan IDs, sync subscription data with updated feature flags
- [ ] T078 [US9] Implement plan limit middleware — create `lib/plan-limits.ts` with functions: checkBusinessLimit, checkCompetitorLimit, checkQueryLimit, checkScanFrequency, getSemrushDepth, getPerplexityModel, hasOtterlyAccess, hasConciergeAccess, getDataRetentionDays
- [ ] T079 [US9] Apply plan limit checks in all API routes: businesses (T014), competitors (T016), queries (T019), scan trigger (T031), SEMrush snapshot (T046), agent chat (per Phase 9)
- [ ] T080 [US9] Update `vercel.json` cron configuration — scanner daily 3am, seo-refresh Sunday 2am, digest Monday 9am
- [ ] T081 [US9] Implement data retention enforcement — cron job or migration to delete ai_mentions, citations older than plan's retention period

**Checkpoint**: User Story 9 fully functional — billing works, limits enforced

---

## Phase 9: User Story 4 & 5 — Otterly Operator Workflow + GEO Audit (Priority: P2)

**Goal**: Operator admin panel, CSV import, brand visibility, GEO audit
**Independent Test**: Operator uploads CSVs, customer sees brand visibility + GEO audit data

### Implementation for User Story 4
- [ ] T082 [US4] Create admin layout and overview page `app/admin/page.tsx` — server component, operator/admin role check, overview dashboard (pending tasks, recent imports, account count)
- [ ] T083 [US4] Create CSV import form component `components/admin/ImportForm.tsx` — file upload, business_id selector (dropdown of all businesses), import_type selector, preview first 5 rows before confirm, submit button
- [ ] T084 [US4] Create CSV import page `app/admin/import/page.tsx` — uses ImportForm, shows recent import history below
- [ ] T085 [US4] Create Otterly CSV parser `lib/otterly-import.ts` — parse SearchPrompts CSV: validate columns per otterly-csv.ts Zod schema, map "Brand Mentioned (ChatGPT)" columns to per-platform booleans, extract intent_volume and growth_3m, map to ai_mentions + brand_visibility tables
- [ ] T086 [US4] Extend `lib/otterly-import.ts` — parse CitationLinksFull CSV: validate columns, map Prompt/Country/Service/Title/URL/Position/Date/Domain/DomainCategory to citations table, set source='otterly_import'
- [ ] T087 [US4] Extend `lib/otterly-import.ts` — parse CitationLinksSummary CSV: validate columns, map to citations table (summary aggregation)
- [ ] T088 [US4] Implement diff generation in `lib/otterly-import.ts` — compare new import to previous import for same business: count new citations, lost citations, coverage_rate change, nss_score change. Store diff in data_imports.diff_summary
- [ ] T089 [US4] Create admin import API route `app/api/admin/import/route.ts` per contracts/otterly-import-api.md — multipart upload, role check, call otterly-import parser, store results, return diff
- [ ] T090 [US4] Create admin imports list API route `app/api/admin/imports/route.ts` per contracts/otterly-import-api.md — GET with filters
- [ ] T091 [US4] Create task queue component `components/admin/TaskQueue.tsx` — table: customer | task type | status | operator | due date | SLA indicator (on-time/at-risk/overdue) — with assign/status-change actions
- [ ] T092 [US4] Create admin tasks page `app/admin/tasks/page.tsx` — uses TaskQueue, filters by status/operator/overdue
- [ ] T093 [US4] Create admin tasks API routes `app/api/admin/tasks/route.ts` and `app/api/admin/tasks/[id]/route.ts` per contracts/otterly-import-api.md — GET list, PATCH status/operator/notes
- [ ] T094 [US4] Implement auto-task creation: when Business/Enterprise user completes onboarding → insert operator_task with task_type 'otterly_setup', due_date per SLA (48h Business, 24h Enterprise)
- [ ] T095 [US4] Create brand visibility dashboard section — component that queries brand_visibility for business, displays: Coverage %, SoV %, NSS (-100 to +100 gauge), BVI quadrant (scatter plot), per-platform breakdown, trend lines

### Implementation for User Story 5
- [ ] T096 [US5] Extend `lib/otterly-import.ts` — parse GEO Audit data: crawlability score/details, content score/details, structured_data score/details, SWOT arrays, recommendations with priority/category, evaluation_factors (25+), overall_score. Store in geo_audits table.
- [ ] T097 [US5] Create GEO Audit API route `app/api/geo-audit/route.ts` — GET audits for business_id, PATCH recommendation status (pending→in_progress→completed→dismissed)
- [ ] T098 [US5] Create GEO Audit page `app/geo-audit/page.tsx` — server component: overall score gauge (1-100), three sub-score cards, SWOT quadrant visualization, recommendation list with status toggles, factor breakdown (expandable)
- [ ] T099 [US5] Create GEO Audit Summary dashboard component `components/dashboard/GEOAuditSummary.tsx` — compact card: overall score, top 3 recommendations, link to full audit page

**Checkpoint**: User Stories 4 & 5 fully functional — operator imports data, customers see visibility + audit

---

## Phase 10: User Story 6 — AI Concierge Agent (Priority: P2)

**Goal**: Enterprise AI agent with full data context, chat interface, insights, deep research
**Independent Test**: Enterprise user chats with agent, gets data-driven insights citing specific metrics

### Implementation for User Story 6
- [ ] T100 [US6] Create RAG context builder `lib/geo-agent.ts` — function buildAgentContext(business_id): queries latest ai_mentions (30d), latest seo_snapshot, latest brand_visibility, all citations (90d), latest geo_audit, business profile + competitors → assembles structured context document for system prompt
- [ ] T101 [US6] Create agent system prompt in `lib/geo-agent.ts` — role: GEO specialist with customer data, instructions: cite specific data points, never hallucinate, include disclaimers, format recommendations with priority. Include customer's context snapshot.
- [ ] T102 [US6] Create agent chat API route `app/api/agent/chat/route.ts` per contracts/agent-api.md — Enterprise plan check, create/resume conversation, build context, call AGENT_MODEL with streaming, persist messages to agent_conversations
- [ ] T103 [US6] Implement Perplexity Agent API integration in `lib/geo-agent.ts` — when user asks competitive question, use Perplexity Agent API with web_search + fetch_url tools for autonomous research. Pass results back to primary model.
- [ ] T104 [US6] Create agent conversations list API route `app/api/agent/conversations/route.ts` — GET with business_id filter, pagination
- [ ] T105 [US6] Create agent insights API route `app/api/agent/insights/route.ts` per contracts/agent-api.md — generate weekly_summary, competitive_alert, or recommendation insight. Store in separate insights table or JSONB.
- [ ] T106 [US6] Create Deep Research API routes `app/api/agent/deep-research/route.ts` and `app/api/agent/deep-research/[id]/route.ts` per contracts/agent-api.md — POST submits research to sonar-deep-research (async), GET polls status
- [ ] T107 [US6] Create Chat Widget component `components/agent/ChatWidget.tsx` — client component: message list (scrollable), input field, streaming response display, conversation selector, citation links within responses
- [ ] T108 [US6] Create Insight Card component `components/agent/InsightCard.tsx` — displays agent-generated insight: title, summary, key findings with data source links, recommendations
- [ ] T109 [US6] Create AI Concierge full page `app/agent/page.tsx` — Enterprise plan gate, full-page chat with ChatWidget, conversation history sidebar, recent insights panel, deep research trigger button
- [ ] T110 [US6] Add Concierge widget to dashboard — on Enterprise plan, show ChatWidget in bottom-right + recent insights section using InsightCard components

**Checkpoint**: User Story 6 fully functional — Enterprise users have full AI Concierge

---

## Phase 11: User Story 10 — Landing Page, Emails, Reports (Priority: P2)

**Goal**: New ICP positioning, updated emails, report generation

### Implementation for User Story 10 & cross-cutting
- [ ] T111 Rewrite `app/page.tsx` landing page — new hero (AI Visibility Platform for Realtors & Small Businesses), feature sections for 4 pillars, plan comparison, testimonials placeholder, CTAs. No Shopify references.
- [ ] T112 [P] Update `lib/email.ts` — new email templates: welcome email (new ICP language), weekly digest (visibility score + changes + top recommendations), GEO audit completion notification, critical alert (>20% visibility drop), operator task assignment notification
- [ ] T113 [P] Update weekly digest cron `app/api/cron/digest/route.ts` — iterate active businesses, compute weekly visibility changes, include SEMrush trends, competitor changes, top recommendations
- [ ] T114 Create reports page `app/reports/page.tsx` — list generated reports, trigger new report generation, download PDF
- [ ] T115 Create report generation API `app/api/reports/generate/route.ts` — compile dashboard data into PDF format (or structured HTML for PDF conversion): visibility score, platform breakdown, competitor comparison, citation summary, SEO health, recommendations

**Checkpoint**: Public-facing content updated, emails working, reports exportable

---

## Phase 12: Polish & Cross-Cutting Concerns

- [ ] T116 [P] Remove deprecated Shopify routes and components: `lib/shopify.ts`, `app/api/shopify/*`, `app/api/webhooks/shopify/route.ts`, `app/api/products/sync/route.ts`, `app/api/cron/shopify-sync/route.ts`, `lib/truth-engine.ts`, `app/api/truth-engine/*`, `app/truth-engine/page.tsx`, `components/truth-engine/*`, `components/stores/*`. Move to `/deprecated/` directory rather than deleting.
- [ ] T117 [P] Update `tsconfig.json` paths if new directories added
- [ ] T118 [P] Add loading states for all dashboard sections — Skeleton components matching each section's layout
- [ ] T119 [P] Add error boundary components for each dashboard section — catch errors per-section, show "temporarily unavailable" with retry button
- [ ] T120 [P] Implement data retention cron — delete ai_mentions, citations, seo_snapshots older than plan's retention limit (30/90/180/365 days)
- [ ] T121 End-to-end testing — Playwright tests: signup → onboarding → first scan → dashboard view → add competitor → view citations → billing upgrade
- [ ] T122 Performance testing — verify dashboard loads < 3s with Promise.all parallel fetching, optimize slow queries with EXPLAIN ANALYZE
- [ ] T123 Security review — verify all new API routes have auth checks, verify RLS policies on all tables, verify operator routes check role, verify no cross-customer data leakage
- [ ] T124 [P] Update `README.md` and `docs/` with new architecture, env var requirements, operator SOPs
- [ ] T125 [P] Create operator onboarding documentation — step-by-step Otterly workflow SOP, CSV export instructions, import procedure, task queue usage, SLA expectations

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (DB migration + types) — BLOCKS all user stories
- **US1 Onboarding (Phase 3)**: Depends on Phase 2 — first user-facing deliverable
- **US2 SEMrush (Phase 4)**: Depends on Phase 2 — can run in parallel with Phase 3
- **US3 Sonar (Phase 5)**: Depends on Phase 2 — can run in parallel with Phases 3-4
- **US7 Competitors (Phase 6)**: Depends on Phase 2 + scanner from Phase 3
- **US8 Dashboard (Phase 7)**: Depends on Phases 3-6 (needs data from all sources)
- **US9 Billing (Phase 8)**: Depends on Phase 2 — can run in parallel with Phases 3-7
- **US4+5 Otterly (Phase 9)**: Depends on Phase 2 — can start in parallel with later P1 phases
- **US6 Concierge (Phase 10)**: Depends on Phases 3-5, 7 (needs data + dashboard context)
- **Landing/Email (Phase 11)**: Depends on Phase 7 (dashboard design finalized)
- **Polish (Phase 12)**: Depends on all previous phases

### Parallel Opportunities
```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
    ├── Phase 3 (US1 Onboarding) ─────────────┐
    ├── Phase 4 (US2 SEMrush) ──── parallel ───┤
    ├── Phase 5 (US3 Sonar) ────── parallel ───┤
    ├── Phase 6 (US7 Competitors) ─────────────┤
    ├── Phase 8 (US9 Billing) ──── parallel ───┤
    └── Phase 9 (US4+5 Otterly) ── parallel ───┤
                                                ↓
                                    Phase 7 (US8 Dashboard)
                                                ↓
                                    Phase 10 (US6 Concierge)
                                                ↓
                                    Phase 11 (Landing/Email)
                                                ↓
                                    Phase 12 (Polish)
```

### Within Each Phase
- Types/schemas before API routes
- API routes before UI components
- Server components before client components
- Core implementation before integration tests

## Implementation Strategy

### MVP First (User Stories 1 + 2 + 3 + 7 + 8 + 9)
1. Complete Setup (Phase 1) + Foundational (Phase 2)
2. Complete US1 (Onboarding) — user can sign up and scan
3. Complete US2 (SEMrush) + US3 (Sonar) in parallel — data richness
4. Complete US7 (Competitors) — key differentiator
5. Complete US8 (Dashboard) — unified view
6. Complete US9 (Billing) — monetization
7. **STOP and VALIDATE** — soft launch to 10 beta users
8. Deploy if ready

### Incremental Delivery
- After MVP: add Otterly (US4+5) and AI Concierge (US6)
- Each addition enriches existing dashboard without breaking prior functionality
- Otterly adds 3 new platform columns + BVI + NSS to dashboard
- Concierge adds chat widget + insights to Enterprise dashboard
