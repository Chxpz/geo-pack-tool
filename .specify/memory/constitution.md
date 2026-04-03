# AgenticRev Constitution

## Core Principles

### Data Sovereignty — Never a Wrapper
AgenticRev MUST never be presented, positioned, or perceived as a wrapper around SEMrush, Perplexity, or Otterly.ai. All external data MUST be transformed, aggregated, and surfaced under AgenticRev's own metrics and terminology (e.g., "Digital Authority Profile" not "SEMrush data", "AI Visibility Score" not "Otterly BVI"). Raw provider data MUST NOT be exposed directly to users. Provider names MAY appear in fine-print attribution but MUST NOT appear in feature names, dashboard headers, or marketing copy.

### Additive Evolution — Never Remove, Only Expand
The existing LLM analysis capabilities (ChatGPT, Perplexity, Gemini, Claude direct scanning) MUST be preserved. New data providers (SEMrush, Perplexity Sonar, Otterly) are additive. Deprecated Shopify-specific code (stores, products, ACP, Truth Engine) MUST be soft-deprecated (not deleted) to allow migration paths. No user-facing feature removal without explicit product decision documented in this constitution.

### ICP-Agnostic Architecture with Vertical Specialization
The data model and core platform MUST be business-type agnostic — any small business can onboard and get value. Vertical-specific behavior (e.g., realtor-specific query generation, realtor-specific schema recommendations) MUST be driven by the `business_type` field, not by separate code paths. Adding a new business vertical MUST NOT require schema changes — only configuration/content changes (query templates, schema recommendations, onboarding copy).

### Exhaustive Data Capture — Use Every Available Signal
Every GEO-relevant data point available from our providers MUST be captured and stored, even if not surfaced in the UI at launch. This includes all 9 SEMrush endpoints (with FK52/FP52 AI Overview columns, Position Tracking Code 52, Site Audit schema detection, Trends API AI traffic channels, Map Rank Tracker), all Perplexity Sonar response fields (citations, search_results, related_questions), and all 6 Otterly platforms with full CSV schemas (including BVI, NSS, domain categories, intent volume, citation position changes). Data stored but not yet displayed is acceptable. Data available but not captured is NOT acceptable.

### Cost-Conscious API Consumption
External API calls (SEMrush, Perplexity, LLMs) MUST respect defined per-user unit budgets tied to plan tiers. All API responses MUST be cached with appropriate TTLs (SEMrush: 24h minimum, Perplexity: per-scan, LLMs: per-scan). Batch operations MUST be preferred over individual calls where the API supports it. Unit consumption MUST be logged and monitored. Exceeding budget ceilings MUST trigger alerts, not silent failures.

### Graceful Degradation — No Single Point of Failure
If any external provider (SEMrush, Perplexity Sonar, Otterly import, any LLM) is unavailable or returns errors, the platform MUST continue functioning with reduced data. Dashboard sections MUST show "data unavailable" states rather than crashing. Scanner failures for one platform MUST NOT block scanning on other platforms. Otterly data import failures MUST NOT affect real-time LLM scan results. The AI Concierge MUST function (with reduced context) even if some data sources are stale.

### RLS-First Data Isolation
All database tables MUST enforce Row-Level Security (RLS) policies in Supabase. Customer data MUST be isolated by `user_id`. Operator access MUST be scoped through explicit role checks (`users.role = 'operator'` or `'admin'`). The AI Concierge MUST only access data belonging to the authenticated customer's businesses. Cross-customer data queries are PROHIBITED except for anonymized aggregate analytics.

### Server Components by Default — Client Components by Exception
Following Next.js 16 App Router conventions: pages and data-fetching components MUST be React Server Components. Client components (`'use client'`) MUST only be used for interactivity (forms, charts, chat widgets, real-time updates). Data fetching MUST happen server-side using Supabase server client. Client components MUST NOT make direct Supabase queries.

### TypeScript Strict — Zero Any
All code MUST use TypeScript 5 with `strict: true`. The `any` type is PROHIBITED. All API responses from external providers MUST have Zod schemas for runtime validation. All database query results MUST be typed. New types MUST be added to `lib/types.ts` (or domain-specific type files that re-export through `lib/types.ts`).

### Actionable Intelligence — Not Raw Data
Every piece of data surfaced to users MUST be accompanied by context or actionable guidance. Raw numbers without interpretation are NOT acceptable. Examples: "Authority Score: 45" MUST include benchmark context ("average for your market: 52") and a recommendation. The AI Visibility Score MUST explain what factors are dragging it down and what the user can do. The GEO Audit MUST rank recommendations by priority and estimated impact.

## Operator Workflow Integrity

The Otterly.ai data pipeline operates through human operators, not automation. Operator workflows MUST be documented with step-by-step SOPs. The admin import system MUST validate CSV schema before processing. Failed imports MUST be logged with specific error details. Operator task assignments MUST respect SLA timelines defined per plan tier (Business: 48h, Enterprise: 24h). The system MUST track operator task completion rates for capacity planning.

## AI Concierge Boundaries

The AI Concierge MUST only reference data that has been collected and stored in AgenticRev's database for the authenticated customer. It MUST NOT make claims about data it doesn't have. It MUST NOT make changes to the customer's website, profiles, or external accounts — it provides recommendations and instructions only. Conversation history MUST be persisted. The agent's system prompt MUST include the customer's latest data snapshot. It MUST use structured output (via Perplexity `response_format` or equivalent) for consistent report generation.

## Governance

Amendments to this constitution require explicit product decision documented with rationale. Version follows semantic versioning: MAJOR (breaking principle change), MINOR (new principle added), PATCH (clarification of existing principle). All implementation PRs MUST reference which constitution principles they comply with. Constitution violations discovered during code review MUST be resolved before merge.

**Version**: 1.0.0 | **Ratified**: 2026-04-02 | **Last Amended**: 2026-04-02
