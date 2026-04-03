# Quickstart: AgenticRev ICP Pivot

## Prerequisites

- Node.js 20+ (LTS)
- npm 10+
- Supabase CLI (`npx supabase`) or Supabase cloud project
- PostgreSQL 15+ (via Supabase)
- Stripe account with test mode API keys
- API keys: OpenAI, Anthropic, Google Gemini, Perplexity Sonar
- SEMrush API key (Business plan — for development, use sandbox/test mode if available)
- Vercel account (for deployment + cron jobs)

## Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd agenticrevops
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Fill in `.env.local` with all required keys:
   ```
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
   NEXTAUTH_URL=http://localhost:3000
   OPENAI_API_KEY=<your-key>
   ANTHROPIC_API_KEY=<your-key>
   GEMINI_API_KEY=<your-key>
   PERPLEXITY_SONAR_API_KEY=<your-key>
   SEMRUSH_API_KEY=<your-key>
   STRIPE_SECRET_KEY=<your-test-key>
   STRIPE_PUBLISHABLE_KEY=<your-test-key>
   STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
   RESEND_API_KEY=<your-key>
   AGENT_MODEL=gpt-4o
   AGENT_MAX_TOKENS=4096
   CRON_SECRET=<generate-random-string>
   ```

4. Run database migration:
   ```bash
   npx supabase db push
   # or apply migration manually:
   # npx supabase migration up
   ```

5. Create Stripe products and price IDs for Pro/Business/Enterprise plans, then add to `.env.local`:
   ```
   STRIPE_PRICE_ID_PRO=price_xxx
   STRIPE_PRICE_ID_BUSINESS=price_xxx
   STRIPE_PRICE_ID_ENTERPRISE=price_xxx
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

## Running

```bash
npm run dev          # Development server at http://localhost:3000
npm run build        # Production build
npm run start        # Production server
npm run lint         # Run linter
npm run test         # Run unit tests (vitest)
npm run test:e2e     # Run E2E tests (playwright)
```

## Validation Scenarios

### Scenario 1: User Story 1 — New User Onboarding (Happy Path)
1. Navigate to `http://localhost:3000`, click "Start Free"
2. Sign up with email + password
3. Verify email (check Resend logs or MailHog if configured)
4. Onboarding Step 1: Enter business name "Test Realty", type "Real Estate Agent", website "https://testrealty.com", city "Miami", state "FL", service areas ["Miami", "Coral Gables"]
5. Onboarding Step 2: Enter Google Business Profile URL, Zillow URL (dynamic field for realtor type)
6. Onboarding Step 3: Add competitor "Jane Smith Realty" with website. Or click "Let AI suggest" and verify suggestions appear.
7. Onboarding Step 4: Watch scan progress. Verify all 4 platforms show progress (ChatGPT ✓, Perplexity ✓, Gemini ✓, Claude ✓)
8. **Expected**: Dashboard shows initial AI Visibility Score, platform breakdown chart, at least some mentions/non-mentions per platform, competitor mentioned in results
9. **Verify in DB**: `businesses` table has new row, `tracked_queries` has ~10 system-generated queries, `ai_mentions` has 40 rows (10 queries × 4 platforms), `competitors` has 1 row

### Scenario 2: User Story 1 — Business Without Website (Edge Case)
1. Complete onboarding but leave website URL blank
2. **Expected**: Onboarding succeeds, scan runs normally, SEO Health section shows "Add your website to unlock SEO intelligence" prompt, all other sections work

### Scenario 3: User Story 2 — SEMrush Data Pull (Happy Path)
1. Onboard a business with a real website URL (e.g., a known domain)
2. Wait for async SEMrush pull (or manually trigger via `/api/seo/snapshot`)
3. **Expected**: Dashboard SEO Health section shows authority score, organic keywords count, AI Overview keywords (FK52/FP52), organic traffic estimate. `seo_snapshots` table has new row.

### Scenario 4: User Story 3 — Perplexity Sonar Citations (Happy Path)
1. After onboarding scan completes, navigate to Citations page
2. **Expected**: Citations table shows URLs cited by Perplexity with domain, title, position, domain_category. Filter by "Own domain" shows if user's site was cited. `citations` table has rows with source='perplexity_sonar'.

### Scenario 5: User Story 4 — Otterly CSV Import (Happy Path)
1. Log in as operator (user with role='operator')
2. Navigate to `/admin/import`
3. Upload a test Search Prompts CSV (create test file matching schema in contracts/otterly-import-api.md)
4. Select business, select import type "otterly_prompts", preview rows, confirm
5. **Expected**: Import succeeds, shows diff (new citations, visibility changes). Customer's dashboard now shows brand visibility section with data from 6 platforms.

### Scenario 6: User Story 6 — AI Concierge Chat (Happy Path)
1. Log in as Enterprise plan user
2. Navigate to `/agent`
3. Type: "Why did my visibility drop this week?"
4. **Expected**: Agent responds with specific data from scan results and SEMrush snapshot, citing exact numbers, comparing to previous period, recommending specific actions. Response streams in real-time.

### Scenario 7: User Story 6 — AI Concierge Plan Gate (Error Case)
1. Log in as Pro plan user
2. Navigate to `/agent`
3. **Expected**: Page shows upgrade CTA for Enterprise plan. Chat is not accessible.

### Scenario 8: User Story 9 — Plan Limits (Error Case)
1. Log in as Free plan user (1 business, 2 competitors, 10 queries)
2. Try to add a second business via API
3. **Expected**: 403 response with `{ "error": "business_limit", "current": 1, "max": 1, "upgrade_to": "pro" }`
4. Try to add a third competitor
5. **Expected**: 403 response with competitor limit error

### Scenario 9: Graceful Degradation — SEMrush Down
1. Set SEMRUSH_API_KEY to an invalid value
2. Trigger a SEMrush snapshot pull
3. **Expected**: SEO Health dashboard section shows "SEO data temporarily unavailable" with timestamp of last successful pull. All other dashboard sections load normally. Error logged in application logs.

### Scenario 10: Operator Task SLA Tracking
1. Create an Enterprise customer via onboarding
2. **Expected**: `operator_tasks` table has a new row with task_type='otterly_setup', due_date = now + 24h (Enterprise SLA)
3. Log in as operator, navigate to `/admin/tasks`
4. **Expected**: Task appears in queue with "on_time" SLA indicator
5. Wait past due_date (or manually adjust)
6. **Expected**: SLA indicator changes to "overdue"
