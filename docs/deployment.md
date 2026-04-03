# Deployment

## Production Checklist

### 1. Configure environment variables

Required by active code:

- Auth
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
- Supabase
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- AI providers
  - `OPENAI_API_KEY`
  - `PERPLEXITY_API_KEY`
  - `PERPLEXITY_SONAR_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `GEMINI_API_KEY`
  - `SEMRUSH_API_KEY`
- Billing
  - `STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID_PRO`
  - `STRIPE_PRICE_ID_BUSINESS`
  - `STRIPE_PRICE_ID_ENTERPRISE`
- Email
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
- Cron protection
  - `CRON_SECRET`
- Optional
  - `AGENT_MODEL`

Some routes degrade gracefully when a service is missing, but a production deployment should treat the full list above as the expected runtime configuration.

### 2. Apply migrations

Apply all migrations in order:

1. `000_supabase_roles.sql`
2. `001_initial_schema.sql`
3. `002_auth_tokens.sql`
4. `003_pivot_schema.sql`
5. `004_reports_table.sql`
6. `005_deep_research_results.sql`
7. `006_scan_runs.sql`

### 3. Run release verification

```bash
npm install
npm run verify:release
```

This validates:

- lint
- typecheck
- production build
- presence of expected Next build artifacts

### 4. Deploy

The repository is set up for Vercel-style cron scheduling through `vercel.json`.

Current schedules:

- `0 3 * * *` → `/api/cron/scanner`
- `0 2 * * 0` → `/api/cron/seo-refresh`
- `0 9 * * 1` → `/api/cron/weekly-digest`
- `0 4 * * *` → `/api/cron/data-retention`

### 5. Smoke check after deploy

- `GET /api/health`
- signup and login
- onboarding for a new account
- first scan trigger and status polling
- dashboard load
- report generation and download
- billing checkout/portal if Stripe is configured

## GitHub Release Gates

The repo currently enforces:

- `CI` workflow for PRs and pushes
- `Release Verification` workflow for main, tags, and manual runs

Both workflows install dependencies and validate the codebase with placeholder environment values.
