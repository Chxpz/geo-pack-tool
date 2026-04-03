# Architecture

## Application Shape

AgenticRev is a single Next.js App Router application. UI pages live in `app/`, API routes live in `app/api/`, shared logic lives in `lib/`, and reusable UI lives in `components/`.

## Primary User Flows

### Authentication

- Credentials auth is implemented through NextAuth in `lib/auth.ts` and `lib/auth-server.ts`.
- Public auth APIs handle signup, verification, password reset, and session routing under `app/api/auth/`.

### Onboarding

- `app/onboarding/page.tsx` gates onboarding to authenticated users without a business.
- `components/onboarding/` collects:
  - business profile
  - presence details
  - competitors
  - first scan kickoff

### Dashboard and Visibility

- `app/dashboard/page.tsx` is the main authenticated product view.
- `lib/stats.ts` aggregates dashboard data from current business, mention, citation, query, and SEO records.
- Navigation is defined in `components/layout/Sidebar.tsx`.

### Scanning

- Query generation lives in `app/api/queries/generate/route.ts` and `lib/query-generator.ts`.
- Business-specific scans are triggered through `app/api/scan/trigger/route.ts`.
- Persisted scan lifecycle state is stored in `scan_runs` and managed by `lib/scan-runs.ts`.
- The underlying scan engine is `lib/scanner.ts`.
- Scan history is displayed at `app/scans/page.tsx`.
- Bulk scan execution for a user is exposed by `app/api/scanner/trigger/route.ts`.
- Scheduled scanning is run by `app/api/cron/scanner/route.ts`.

### SEO and GEO

- GEO audit records are displayed at `app/geo-audit/page.tsx`.
- GEO audit generation is served by `app/api/geo-audit/route.ts`.
- SEO snapshot collection and listing are served by:
  - `app/api/seo/snapshot/route.ts`
  - `app/api/seo/snapshots/route.ts`
  - `app/api/seo/keywords/route.ts`
- SEMrush integration logic lives in `lib/semrush.ts`.

### Reports

- `app/reports/page.tsx` lists and generates reports.
- `app/api/reports/generate/route.ts` writes HTML-backed report records.
- `app/api/reports/[id]/download/route.ts` downloads report content as HTML.

### Billing

- Billing UI lives at `app/billing/page.tsx`.
- Stripe checkout and portal routes live under `app/api/billing/`.
- Plan definitions and entitlements are centralized in `lib/stripe.ts` and `lib/plan-limits.ts`.

### AI Concierge

- `app/agent/page.tsx` is enterprise-gated.
- APIs under `app/api/agent/` provide chat, conversation history, insights, and deep research.
- Deep research results persist to `deep_research_results`.

### Admin

- Admin UI lives under `app/admin/`.
- Admin APIs live under `app/api/admin/`.

## Database and Migrations

The schema is defined by ordered SQL migrations in `supabase/migrations/`:

- `000_supabase_roles.sql`
- `001_initial_schema.sql`
- `002_auth_tokens.sql`
- `003_pivot_schema.sql`
- `004_reports_table.sql`
- `005_deep_research_results.sql`
- `006_scan_runs.sql`

Important current domains represented in the schema and code:

- `users`
- `subscriptions`
- `businesses`
- `competitors`
- `tracked_queries`
- `ai_mentions`
- `scan_runs`
- `geo_audits`
- `seo_snapshots`
- `reports`
- `deep_research_results`
- `auth_tokens`

## External Dependencies

Current runtime integrations referenced by active code:

- Supabase
- Stripe
- Resend
- OpenAI
- Perplexity
- Anthropic
- Gemini
- SEMrush

## Cron Jobs

Cron definitions are in `vercel.json`:

- `/api/cron/scanner`
- `/api/cron/seo-refresh`
- `/api/cron/weekly-digest`
- `/api/cron/data-retention`

Each protected cron route expects `Authorization: Bearer ${CRON_SECRET}`.

## Legacy and Non-Primary Surfaces

- `deprecated/` contains archived truth-engine-era code.
