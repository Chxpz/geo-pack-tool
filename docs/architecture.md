# Architecture

## Application Shape

AgenticRev is a single Next.js 16 App Router application. UI pages live in `app/`, API routes in `app/api/`, shared logic in `lib/`, and reusable UI in `components/`.

## User Flows

### Authentication

- Credentials auth via NextAuth (`lib/auth.ts`, `lib/auth-server.ts`).
- Public APIs: signup, verification, password reset under `app/api/auth/`.
- Rate limiting on auth endpoints (`lib/rate-limit.ts`).

### Onboarding

- `app/onboarding/page.tsx` gates to authenticated users without a business.
- Collects business profile, presence details, competitors, and kicks off first scan.

### Dashboard

- `app/dashboard/page.tsx` — main authenticated view.
- `lib/stats.ts` aggregates data from businesses, mentions, citations, queries, and SEO records.
- `lib/visibility-score.ts` computes the composite visibility score.

### AI Mention Scanning

- Query generation: `lib/query-generator.ts`.
- Scan engine: `lib/scanner.ts` queries ChatGPT, Perplexity, Gemini, and Claude with retry logic (`lib/retry.ts`).
- Scan lifecycle: `lib/scan-runs.ts` manages `scan_runs` records.
- Scheduled via `app/api/cron/scanner/route.ts`.

### GEO Audit

The GEO audit feature integrates with the Stack3 Audit System via server-to-server API calls.

**Flow:**
1. User clicks "Run New Audit" on `app/geo-audit/page.tsx`
2. `POST /api/geo-audit/trigger` validates ownership, checks monthly limit, calls Stack3 Audit API (`lib/audit-client.ts :: triggerAudit()`), inserts `geo_audits` row with status `queued`
3. Frontend polls `GET /api/geo-audit/status/[jobId]` every 5 seconds
4. Status route proxies to Stack3 Audit API (`getAuditStatus()`), updates local row
5. On completion, fetches full result (`getAuditResult()`), maps via `mapAuditResultToGeoAudit()`, persists all 12 dimensions, findings, SWOT, action plan, and recommendations
6. Frontend renders 12-dimension scorecard, AI content readiness, SWOT, action plan, recommendations with status management, page notes, and audit history

**Plan limits:**
| Plan | GEO Audits/month |
|------|-------------------|
| Free | 1 |
| Pro | 3 |
| Business | 10 |
| Enterprise | Unlimited |

### SEO Snapshots

- SEMrush integration in `lib/semrush.ts`.
- Snapshot collection: `app/api/seo/snapshot/route.ts`.
- Scheduled refresh: `app/api/cron/seo-refresh/route.ts`.

### Reports

- `app/reports/page.tsx` lists and generates reports.
- `app/api/reports/generate/route.ts` creates HTML-backed report records.
- `app/api/reports/[id]/download/route.ts` serves report HTML.

### Billing

- Plan definitions in `lib/stripe.ts` (`PLAN_CONFIG`) and `lib/plan-limits.ts` (`PLAN_LIMITS`).
- Four tiers: Free ($0), Pro ($149), Business ($399), Enterprise ($899).
- Feature gating via `canAccessFeature()` and `withPlanCheck()` middleware (`lib/middleware/plan-gate.ts`).
- Stripe checkout and portal under `app/api/billing/`.
- Webhook sync via `app/api/webhooks/stripe/route.ts`.

### AI Concierge (Enterprise only)

- `app/agent/page.tsx` gated to Enterprise plan.
- RAG context built by `lib/geo-agent.ts :: buildAgentContext()` from business, mentions, citations, SEO, GEO audit, and competitor data.
- Chat streamed via `app/api/agent/chat/route.ts` using GPT-4o.
- Perplexity web search via `lib/geo-agent.ts :: queryWithWebSearch()`.
- Deep research persists to `deep_research_results`.

### Admin

- `app/admin/page.tsx` — operator dashboard.
- `app/admin/import/page.tsx` — manual data upload.
- `app/admin/tasks/page.tsx` — operator task management.

## Database Schema

Migrations in `supabase/migrations/` (applied in order):

| # | File | Purpose |
|---|------|---------|
| 000 | `supabase_roles.sql` | Supabase auth roles |
| 001 | `initial_schema.sql` | Users, subscriptions, stores, products, mentions, errors |
| 002 | `auth_tokens.sql` | Email verification and password reset tokens |
| 003 | `pivot_schema.sql` | Businesses, competitors, tracked queries, citations, brand visibility, SEO snapshots, geo audits, agent conversations, operator tasks, data imports, AI platforms |
| 004 | `reports_table.sql` | Reports table |
| 005 | `deep_research_results.sql` | Deep research results |
| 006 | `scan_runs.sql` | Scan lifecycle tracking |
| 007 | `clean_deploy.sql` | Stack3 Audit aligned geo_audits, remove otterly references, update constraints |

**Key tables:**
- `users`, `subscriptions` — accounts and billing
- `businesses`, `competitors` — business profiles
- `tracked_queries`, `ai_mentions`, `citations` — scan data
- `brand_visibility` — aggregated metrics
- `scan_runs` — scan lifecycle
- `geo_audits` — 12-dimension audit results (Stack3 Audit aligned)
- `seo_snapshots` — SEMrush data
- `reports`, `deep_research_results` — generated content
- `ai_platforms` — platform registry (4 active `direct_llm`, 3 `coming_soon`)
- `operator_tasks`, `data_imports` — admin operations

## External Integrations

| Service | Purpose | Config |
|---------|---------|--------|
| Supabase | Database + auth | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| OpenAI | ChatGPT scanning, concierge | `OPENAI_API_KEY` |
| Perplexity | Perplexity scanning, Sonar search | `PERPLEXITY_API_KEY`, `PERPLEXITY_SONAR_API_KEY` |
| Anthropic | Claude scanning | `ANTHROPIC_API_KEY` |
| Google | Gemini scanning | `GEMINI_API_KEY` |
| SEMrush | SEO snapshots | `SEMRUSH_API_KEY` |
| Stripe | Billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs |
| Resend | Transactional email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Stack3 Audit | GEO audit engine | `STACK3_AUDIT_API_URL`, `STACK3_AUDIT_API_KEY` |

## Cron Jobs

Defined in `vercel.json`. All require `Authorization: Bearer ${CRON_SECRET}`.

| Schedule | Route | Purpose |
|----------|-------|---------|
| `0 3 * * *` | `/api/cron/scanner` | Daily scan execution |
| `0 2 * * 0` | `/api/cron/seo-refresh` | Weekly SEO refresh |
| `0 9 * * 1` | `/api/cron/weekly-digest` | Weekly email digest |
| `0 4 * * *` | `/api/cron/data-retention` | Data retention cleanup |

## Observability

- Structured logging via Pino (`lib/logger.ts`).
- Per-request context logging (`lib/request-context.ts`).
- Retry with exponential backoff on external API calls (`lib/retry.ts`).
