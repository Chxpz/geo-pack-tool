# Implementation Plan: AgenticRev ICP Pivot

**Branch**: `pivot-realtors-smb` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/spec-pivot/spec.md`

## Summary

Pivot AgenticRev from Shopify e-commerce merchants to Realtors and Small Businesses as ICP. Add 3 data providers (SEMrush API, Perplexity Sonar API, Otterly.ai operator workflow) to existing 4-platform LLM scanner. Build new business-centric onboarding, redesigned dashboard with composite AI Visibility Score, competitor tracking, citation mapping, SEO health display, GEO audit system, and AI Concierge agent (Enterprise). Restructure pricing to Free/Pro/Business/Enterprise.

## Technical Context

**Language/Version**: TypeScript 5 (strict: true)
**Framework**: Next.js 16.1.6 (App Router, React 19, Server Components by default)
**Primary Dependencies**: NextAuth 5 (beta.30), Supabase JS 2.x, Stripe, Resend, Recharts, Zod, bcryptjs
**Storage**: Supabase PostgreSQL (with RLS), Vercel KV (for caching)
**Testing**: Vitest (unit) + Playwright (E2E) — to be set up
**Target Platform**: Vercel (serverless functions, edge runtime for dashboard, cron jobs)

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Data Sovereignty — Never a Wrapper | ✅ Compliant | All provider data surfaced under AgenticRev terminology (Digital Authority Profile, AI Visibility Score). Provider names only in fine-print attribution. |
| Additive Evolution | ✅ Compliant | Existing LLM scanner preserved. Shopify code soft-deprecated (deprecated_at column), not deleted. |
| ICP-Agnostic Architecture | ✅ Compliant | `business_type` field drives vertical behavior. No separate code paths per vertical. New verticals = config changes only. |
| Exhaustive Data Capture | ✅ Compliant | All 9 SEMrush endpoints, all Perplexity Sonar response fields, all 6 Otterly platforms with full CSV schemas mapped to DB columns. |
| Cost-Conscious API Consumption | ✅ Compliant | Per-plan unit budgets, 24h caching for SEMrush, unit tracking logged, batch operations preferred. |
| Graceful Degradation | ✅ Compliant | Each data source independent. Dashboard sections show "unavailable" states. Scanner failures per-platform don't block others. |
| RLS-First Data Isolation | ✅ Compliant | All new tables have RLS policies. Operator access scoped via role check. |
| Server Components by Default | ✅ Compliant | Pages/data components are RSC. Client components only for forms, charts, chat. |
| TypeScript Strict — Zero Any | ✅ Compliant | Zod schemas for all external API responses. All DB results typed. |
| Actionable Intelligence | ✅ Compliant | Every metric includes benchmark context and recommendations. GEO audit ranks actions by priority. |

## Architecture

### High-Level Data Flow
```
User → Onboarding Wizard → businesses + competitors + tracked_queries tables
                                ↓
    ┌───────────────────────────┼───────────────────────────┐
    ↓                           ↓                           ↓
[AI Scanner]              [SEMrush Client]          [Operator Import]
(4 LLMs + Sonar)          (9 endpoints)            (Otterly CSVs)
    ↓                           ↓                           ↓
ai_mentions + citations    seo_snapshots            brand_visibility + citations + geo_audits
                                                    + ai_mentions (otterly source)
    └───────────────────────────┼───────────────────────────┘
                                ↓
                    [Visibility Score Calculator]
                                ↓
                    [Dashboard (Server Components)]
                    ├── AI Visibility Score
                    ├── Platform Breakdown
                    ├── Competitor Comparison
                    ├── Top Queries
                    ├── Citation Map
                    ├── SEO Health
                    ├── GEO Audit Summary
                    └── AI Concierge (Enterprise)
                                ↓
                    [AI Concierge Agent] ← RAG Context Builder
                    ├── GPT-4o (conversation)
                    ├── Perplexity Agent API (web research)
                    └── Perplexity Deep Research (async reports)
```

### Key Patterns
- **Parallel data fetching**: Dashboard uses `Promise.all()` across all data sources (existing pattern from `lib/stats.ts`)
- **Server Components for pages**: All dashboard sections are RSC, data fetched via Supabase server client
- **Client Components for interactivity**: Charts (Recharts), chat widget, forms, real-time updates
- **Cron-driven data refresh**: Scanner (3am daily), SEMrush (Sunday 2am weekly), Digest email (Monday 9am)
- **Webhook-driven billing**: Stripe webhooks update subscription status and feature gates immediately
- **Soft deletes**: All entities use `deleted_at` / `deprecated_at` — no hard deletes
- **Zod validation**: All external API responses validated before DB insertion

## File Structure

```text
project-root/
├── app/
│   ├── page.tsx                          # Landing page (rewrite copy)
│   ├── layout.tsx                        # Root layout (update nav)
│   ├── globals.css                       # Styling updates
│   ├── dashboard/
│   │   └── page.tsx                      # REWRITE — new dashboard
│   ├── onboarding/
│   │   └── page.tsx                      # REWRITE — business wizard
│   ├── scans/
│   │   └── page.tsx                      # NEW — scan history & query mgmt
│   ├── citations/
│   │   └── page.tsx                      # NEW — citation tracking
│   ├── competitors/
│   │   └── page.tsx                      # NEW — competitor management
│   ├── geo-audit/
│   │   └── page.tsx                      # NEW — GEO audit results
│   ├── reports/
│   │   └── page.tsx                      # NEW — report export
│   ├── agent/
│   │   └── page.tsx                      # NEW — AI Concierge (Enterprise)
│   ├── billing/
│   │   └── page.tsx                      # UPDATE — new plan cards
│   ├── admin/
│   │   ├── page.tsx                      # NEW — operator overview
│   │   ├── import/
│   │   │   └── page.tsx                  # NEW — CSV import
│   │   └── tasks/
│   │       └── page.tsx                  # NEW — task queue
│   └── api/
│       ├── businesses/
│       │   ├── route.ts                  # NEW — CRUD
│       │   └── [id]/
│       │       └── route.ts             # NEW — individual ops
│       ├── competitors/
│       │   ├── route.ts                  # NEW — CRUD
│       │   └── suggest/
│       │       └── route.ts             # NEW — AI suggestions
│       ├── queries/
│       │   ├── route.ts                  # NEW — CRUD
│       │   └── generate/
│       │       └── route.ts             # NEW — auto-generate
│       ├── scan/
│       │   ├── trigger/
│       │   │   └── route.ts             # NEW — trigger scan
│       │   └── status/
│       │       └── [id]/
│       │           └── route.ts         # NEW — poll progress
│       ├── mentions/
│       │   └── route.ts                  # NEW — query mentions
│       ├── citations/
│       │   └── route.ts                  # NEW — query citations
│       ├── seo/
│       │   ├── snapshot/
│       │   │   └── route.ts             # NEW — trigger SEMrush pull
│       │   ├── snapshots/
│       │   │   └── route.ts             # NEW — list snapshots
│       │   └── keywords/
│       │       └── route.ts             # NEW — keyword data
│       ├── visibility/
│       │   └── score/
│       │       └── route.ts             # NEW — computed score
│       ├── geo-audit/
│       │   └── route.ts                  # NEW — audit data
│       ├── agent/
│       │   ├── chat/
│       │   │   └── route.ts             # NEW — Concierge chat
│       │   ├── conversations/
│       │   │   └── route.ts             # NEW — list conversations
│       │   ├── insights/
│       │   │   └── route.ts             # NEW — generate insights
│       │   └── deep-research/
│       │       ├── route.ts             # NEW — submit research
│       │       └── [id]/
│       │           └── route.ts         # NEW — poll research
│       ├── admin/
│       │   ├── import/
│       │   │   └── route.ts             # NEW — CSV import
│       │   ├── imports/
│       │   │   └── route.ts             # NEW — import history
│       │   └── tasks/
│       │       ├── route.ts             # NEW — task list
│       │       └── [id]/
│       │           └── route.ts         # NEW — task update
│       ├── reports/
│       │   └── generate/
│       │       └── route.ts             # NEW — report gen
│       ├── cron/
│       │   ├── scanner/
│       │   │   └── route.ts             # UPDATE — business scanning
│       │   ├── seo-refresh/
│       │   │   └── route.ts             # NEW — weekly SEMrush
│       │   └── digest/
│       │       └── route.ts             # UPDATE — new metrics
│       └── webhooks/
│           └── stripe/
│               └── route.ts             # UPDATE — new plans
├── components/
│   ├── dashboard/
│   │   ├── VisibilityScore.tsx           # NEW
│   │   ├── PlatformBreakdown.tsx         # NEW (replaces old chart)
│   │   ├── CompetitorTable.tsx           # NEW
│   │   ├── TopQueries.tsx               # NEW
│   │   ├── CitationMap.tsx              # NEW
│   │   ├── SEOHealth.tsx                # NEW
│   │   ├── GEOAuditSummary.tsx          # NEW
│   │   └── VisibilityChart.tsx          # UPDATE
│   ├── onboarding/
│   │   ├── BusinessForm.tsx              # NEW
│   │   ├── PresenceForm.tsx             # NEW
│   │   ├── CompetitorForm.tsx           # NEW
│   │   └── FirstScan.tsx               # NEW
│   ├── agent/
│   │   ├── ChatWidget.tsx               # NEW
│   │   └── InsightCard.tsx              # NEW
│   ├── competitors/
│   │   └── CompetitorCard.tsx           # NEW
│   ├── citations/
│   │   └── CitationTable.tsx            # NEW
│   ├── admin/
│   │   ├── ImportForm.tsx               # NEW
│   │   └── TaskQueue.tsx                # NEW
│   └── shared/
│       ├── BusinessSelector.tsx          # NEW (for multi-business plans)
│       └── PlanGate.tsx                 # NEW (feature gate wrapper)
├── lib/
│   ├── types.ts                          # UPDATE — add all new types
│   ├── scanner.ts                        # REWRITE — business scanning
│   ├── semrush.ts                        # NEW — SEMrush API client
│   ├── perplexity-sonar.ts              # NEW — Perplexity Sonar client
│   ├── query-generator.ts              # NEW — AI query generation
│   ├── visibility-score.ts             # NEW — composite score calc
│   ├── otterly-import.ts               # NEW — CSV parser
│   ├── geo-agent.ts                    # NEW — AI Concierge agent
│   ├── stripe.ts                        # UPDATE — new plans
│   ├── stats.ts                         # REWRITE — new metrics
│   ├── email.ts                         # UPDATE — new templates
│   ├── auth.ts                          # UNCHANGED
│   ├── supabase.ts                      # UNCHANGED
│   └── schemas/
│       ├── semrush.ts                   # NEW — Zod schemas for SEMrush
│       ├── perplexity.ts               # NEW — Zod schemas for Perplexity
│       ├── otterly-csv.ts              # NEW — Zod schemas for Otterly CSVs
│       └── business.ts                 # NEW — Zod schemas for business forms
├── supabase/
│   └── migrations/
│       └── 003_pivot_schema.sql         # NEW — all new tables + modifications
├── vercel.json                           # UPDATE — new crons
└── .specify/                             # THIS SPEC KIT
```

## Phases

### Phase 0: Research
Technical unknowns to resolve → produces research.md:
- SEMrush API authentication flow (API key vs. OAuth for v4 endpoints)
- Perplexity Sonar structured output JSON Schema constraints
- Position Tracking API project setup requirements
- Site Audit API crawl scheduling
- Vercel cron limitations for multiple weekly/daily jobs

### Phase 1: Design
Data model, contracts, quickstart → produces data-model.md, contracts/, quickstart.md:
- All 10 new tables + 4 modified tables fully specified
- 5 API contract documents (scanner, semrush, otterly-import, agent, businesses)
- RLS policy definitions per table
- Zod schema definitions for all external API responses

### Phase 2: Implementation
References tasks.md for execution order:
- Phase 1 (Setup): Project structure, DB migration, type definitions
- Phase 2 (Foundational): Scanner refactor, business onboarding, query generator
- Phase 3 (SEMrush): All 9 endpoint integrations
- Phase 4 (Perplexity Sonar): Enhanced scanning with citations
- Phase 5 (Otterly): Admin panel, CSV import, brand visibility
- Phase 6 (AI Concierge): Agent chat, insights, deep research
- Phase 7 (Dashboard): Full redesign with all sections
- Phase 8 (Billing & Polish): Pricing update, email templates, testing
