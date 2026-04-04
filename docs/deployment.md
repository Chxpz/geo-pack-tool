# Deployment

## 1. Environment Variables

All required for production:

**Auth**
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

**Supabase**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**AI Providers**
- `OPENAI_API_KEY`
- `PERPLEXITY_API_KEY`
- `PERPLEXITY_SONAR_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `SEMRUSH_API_KEY`

**Stack3 Audit System**
- `STACK3_AUDIT_API_URL` — Stack3 Audit base URL
- `STACK3_AUDIT_API_KEY` — API key (min 32 chars, must match Stack3 Audit's `API_KEY` env)

**Billing**
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PRO`
- `STRIPE_PRICE_ID_BUSINESS`
- `STRIPE_PRICE_ID_ENTERPRISE`

**Email**
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

**Cron**
- `CRON_SECRET`

**Optional**
- `AGENT_MODEL` — override concierge model (default: `gpt-5.4-mini`)

## 2. Database Migrations

Apply all in order against the production Supabase instance:

1. `000_supabase_roles.sql`
2. `001_initial_schema.sql`
3. `002_auth_tokens.sql`
4. `003_pivot_schema.sql`
5. `004_reports_table.sql`
6. `005_deep_research_results.sql`
7. `006_scan_runs.sql`
8. `007_clean_deploy.sql`

Migration 007 is the clean production schema for GEO audits. It drops and recreates `geo_audits` (Stack3 Audit aligned), removes the `otterly_access` column from `subscriptions`, adds `max_geo_audits_per_month`, and updates constraints on `operator_tasks` and `data_imports`.

## 3. Release Verification

```bash
npm install
npm run verify:release
```

Validates: lint, typecheck, tests, production build, and expected build artifacts.

## 4. Deploy

The app deploys to Vercel. Cron schedules are defined in `vercel.json`:

| Schedule | Route | Purpose |
|----------|-------|---------|
| `0 3 * * *` | `/api/cron/scanner` | Daily AI mention scanning |
| `0 2 * * 0` | `/api/cron/seo-refresh` | Weekly SEMrush refresh |
| `0 9 * * 1` | `/api/cron/weekly-digest` | Weekly email digest |
| `0 4 * * *` | `/api/cron/data-retention` | Data retention cleanup |

All cron routes require `Authorization: Bearer ${CRON_SECRET}`.

## 5. Post-Deploy Smoke Test

1. `GET /api/health` — returns ok
2. Signup and login flow
3. Onboard a new business
4. Trigger a scan and verify status polling
5. Dashboard loads with data
6. Trigger a GEO audit and verify 12-dimension results populate
7. Generate and download a report
8. Billing checkout/portal (if Stripe configured)

## 6. Stack3 Audit System Dependency

The GEO audit feature requires the Stack3 Audit System to be deployed and accessible at the configured `STACK3_AUDIT_API_URL`. The audit system is a separate service with its own deployment.

AgenticRevops calls three endpoints on the audit system:
- `POST /api/v1/audits` — trigger async audit
- `GET /api/v1/audits/:id` — poll status
- `GET /api/v1/audits/:id/result` — fetch full result on completion

## CI/CD

GitHub Actions:
- **CI** (`ci.yml`) — runs on PRs and pushes to main
- **Release Verification** (`release-verification.yml`) — runs on main, tags (`v*`), and manual dispatch. Uploads build artifacts (BUILD_ID, manifests).

## Billing Tiers

| Plan | Price | Businesses | Competitors | Queries/mo | GEO Audits/mo | Scan Freq | Concierge |
|------|-------|------------|-------------|------------|---------------|-----------|-----------|
| Free | $0 | 1 | 2 | 10 | 1 | Weekly | No |
| Pro | $149 | 1 | 5 | 50 | 3 | Every 3 days | No |
| Business | $399 | 3 | 10 | 150 | 10 | Daily | No |
| Enterprise | $899 | 10 | 25 | 500 | Unlimited | Realtime | Yes |
