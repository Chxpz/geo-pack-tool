# AgenticRev — Progress Tracker

> **This is the canonical source of truth for what has been built.**
> Every agent must read this before starting work and update it after completing a feature.
> Code is truth — do not mark something done unless it exists in the codebase.

**Last updated:** March 3, 2026 (post-MVP DX + dark mode + test accounts)
**Overall status:** Auth ✅ + Shopify OAuth ✅ + Product Sync ✅ + AI Scanner ✅ + Visibility Dashboard ✅ + Truth Engine ✅ + Email Alerts ✅ + Billing ✅ + Onboarding Polish ✅. **MVP v1 complete.** Dark mode + dev tooling + test accounts added.

---

## How to Use This Doc

Before starting any feature:
1. Read this entire file to understand what's built
2. Find the feature on the critical path below
3. Check `⚠️ Deferred` notes for known gaps

After completing a feature:
1. Move it from `🔲` to `✅ Done`
2. Add a one-line description of what was built
3. List new files and routes
4. List any new env vars added to `.env.example`
5. Note anything deferred with `⚠️ Deferred:`

---

## MVP Critical Path

### 1. ✅ Foundation & Auth
**Completed:** March 3, 2026

What was built:
- Next.js 16 App Router project, TypeScript strict, Tailwind CSS
- NextAuth.js v5 — email/password credentials provider, JWT sessions, bcrypt hashing
- Signup flow: validates input (Zod), hashes password, creates `users` row, creates free `subscriptions` row
- Login flow: verifies credentials, sets JWT session, redirects to dashboard
- Dashboard (`/dashboard`) — server component, auth-protected via `auth()`, shows hardcoded zero-state metrics
- Session provider wrapper for client components

**Files:**
- `lib/auth.ts` — NextAuth config (credentials provider)
- `lib/auth-server.ts` — server-side `auth()`, `signIn()`, `signOut()` exports
- `lib/supabase.ts` — `supabase` (anon) and `supabaseAdmin` (service role) clients
- `lib/types.ts` — shared TS types: `User`, `Store`, `Product`, `AIMention`, `TruthEngineError`, `Subscription`
- `types/next-auth.d.ts` — session type augmentation
- `app/layout.tsx` — root layout with `SessionProvider`
- `app/page.tsx` — landing page
- `app/login/page.tsx` — login form (client component)
- `app/signup/page.tsx` — signup form (client component)
- `app/dashboard/page.tsx` — dashboard shell (server component, hardcoded metrics)
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `app/api/auth/signup/route.ts` — `POST` user registration
- `app/api/health/route.ts` — `GET` health check (DB ping)
- `components/providers/SessionProvider.tsx` — NextAuth session wrapper
- `supabase/migrations/001_initial_schema.sql` — full DB schema (7 tables + RLS)
- `vercel.json` — Cron jobs pre-configured (scanner, truth-engine, shopify-sync)

**Env vars required:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

⚠️ **Deferred:**
- `/forgot-password` route is linked in login page but doesn't exist — will 404 until built
- AI Mentions, Data Errors, Visibility Score on dashboard are still hardcoded zeros — need AI Scanner + Truth Engine
- Email verification field exists in DB (`email_verified`) but verification logic is not implemented
- `lucide-react`, `recharts`, `swr`, `zustand` are installed but unused

---

### 2. ✅ Shopify OAuth + Product Sync
**Completed:** March 3, 2026

What was built:
- Shopify OAuth install flow with CSRF state nonce (cookie)
- Shopify HMAC signature verification on callback
- Token exchange → stored in `stores` table (upsert on `store_url`)
- Initial product sync (first 250 products) runs synchronously in callback
- Webhook handler for `products/create`, `products/update`, `products/delete` with HMAC verification
- Cron route (`/api/cron/shopify-sync`) for 15-min incremental sync across all stores
- Manual resync endpoint: `POST /api/products/sync`
- Dashboard updated: real store list, real product count, connect/disconnect UI
- `Store` type updated with `store_domain`, `connected_at`

**Files created:**
- `lib/shopify.ts` — all Shopify utilities (OAuth, API calls, HMAC, product mapping)
- `app/api/shopify/install/route.ts` — OAuth start
- `app/api/shopify/callback/route.ts` — OAuth callback + initial sync
- `app/api/stores/route.ts` — `GET` list connected stores
- `app/api/stores/[id]/route.ts` — `DELETE` disconnect store
- `app/api/products/sync/route.ts` — `POST` manual full sync (auth-gated)
- `app/api/webhooks/shopify/route.ts` — Shopify product webhooks
- `app/api/cron/shopify-sync/route.ts` — Cron incremental sync
- `components/stores/ConnectButton.tsx` — modal shop URL input
- `components/stores/StoreCard.tsx` — store card with disconnect
- `components/stores/StoresSection.tsx` — client wrapper for dynamic store list

**Env vars added:** `CRON_SECRET` (added to `.env.example`)

⚠️ **Deferred:**
- Only first 250 products synced on initial connect (stores with >250 products need a manual resync or cron)
- WooCommerce support not started
- Webhook re-registration if token rotates not implemented

---

### 3. ✅ Product Sync
**Completed:** March 3, 2026 (shipped together with step 2)

Full paginated sync, webhooks, and 15-min cron all covered in step 2 above.

⚠️ **Deferred:** `ProductTable` and `ProductRow` UI components not yet built (needed for Visibility Dashboard step).

---

### 4. ✅ AI Scanner
**Completed:** March 3, 2026

What was built:
- `lib/scanner.ts` — generates 3 queries per product, queries all 4 AI platforms via `fetch`, parses mentions, position, and sentiment, stores results in `ai_mentions`
- Platform integrations: OpenAI `gpt-4o-mini`, Perplexity `sonar-small-online`, Google Gemini `gemini-2.5-flash`, Anthropic `claude-3-5-haiku-20241022`
- Position extraction from numbered list responses; keyword-based sentiment analysis (positive / neutral / negative)
- Cron route (`/api/cron/scanner`) — daily sweep, up to 50 products, CRON_SECRET gated
- Manual trigger (`POST /api/scanner/trigger`) — auth-gated, scans for the authenticated user only (first-scan flow)
- `Product` type extended with `product_type`, `category`, `tags` to support query generation

**Files created:**
- `lib/scanner.ts` — scanner logic and `runScanner()` export
- `app/api/cron/scanner/route.ts` — daily cron handler
- `app/api/scanner/trigger/route.ts` — manual trigger (auth-gated)

**Files updated:**
- `lib/types.ts` — added `product_type`, `category`, `tags` to `Product`

**Env vars required:** `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` (already in `.env.example`)

⚠️ **Deferred:**
- Citation storage from Perplexity is inserted as `JSON.stringify` — `citations` column is JSONB; direct object insert could be considered if an issue arises
- No per-user scan rate throttling (plan limits) — will be enforced when Billing (step 8) is complete
- Scanner output not yet surfaced in dashboard UI — requires Visibility Dashboard (step 5)

---

### 5. ✅ Visibility Dashboard
**Completed:** March 3, 2026

What was built:
- `lib/stats.ts` — `fetchDashboardStats(userId)` fetches all metrics in a single `Promise.all` (7 Supabase queries), aggregates timeline and platform breakdown in TypeScript, returns typed `DashboardStats`
- Dashboard hero metrics now live from DB: AI Mentions (with 7-day trend ↑/↓), Products Tracked, Visibility Score (% of products with ≥1 mention)
- **Mentions Over Time** — Recharts `LineChart`, 7-day window, one line per platform (ChatGPT / Perplexity / Gemini / Claude)
- **Platform Breakdown** — Recharts `BarChart`, mentions per platform, colour-coded
- **Top Products table** — top 10 products by mention count with avg position badge
- **Scan Now button** — triggers `POST /api/scanner/trigger`, shows loading state, estimated duration, success/error feedback
- `GET /api/dashboard/stats` route — same `fetchDashboardStats` call, auth-gated, for client-side SWR refresh
- Docker Compose local dev stack — Postgres (supabase/postgres:15.8.1.060) + PostgREST (v12.2.0) + Nginx gateway on :8000 + Supabase Studio on :54323

**Files created:**
- `lib/stats.ts` — dashboard data fetching
- `lib/types.ts` — added `TimelinePoint`, `PlatformPoint`, `TopProduct`, `DashboardStats`
- `app/api/dashboard/stats/route.ts` — `GET` dashboard stats (auth-gated)
- `components/dashboard/MetricCard.tsx` — metric card with optional trend indicator
- `components/dashboard/MentionChart.tsx` — Recharts LineChart (client component)
- `components/dashboard/PlatformBreakdown.tsx` — Recharts BarChart (client component)
- `components/dashboard/TopProductsTable.tsx` — top products server component
- `components/dashboard/ScanButton.tsx` — manual scan trigger (client component)
- `docker-compose.yml` — local Supabase-compatible stack
- `docker/nginx.conf` — minimal nginx config routing `/rest/v1/` to PostgREST
- `.env.local.example` — local dev environment variables with pre-generated JWT tokens
- `scripts/gen-dev-jwt.mjs` — generates matching JWT tokens for any new JWT secret

**Files updated:**
- `app/dashboard/page.tsx` — wired to real data, all hardcoded zeros replaced

⚠️ **Deferred:**
- Data Errors metric still shows 0 — requires Truth Engine (step 6)
- Scan Now button doesn't auto-refresh metrics after scan completes (requires page refresh) — SWR invalidation deferred to polish step
- Chart period selector (7d/30d/90d) not yet implemented — current window is fixed at 7 days

---

### 6. ✅ Truth Engine
**Completed:** March 3, 2026

What was built:
- `lib/truth-engine.ts` — `runTruthEngine(userId?, maxProducts?)` runs three detection passes per product: (1) schema_check_description (missing/short description < 50 chars → `missing_schema` warning), (2) schema_check_image (no image_url → `missing_schema` info), (3) Shopify live comparison — price mismatch > $0.01 → `price_mismatch` critical; in_stock DB vs out-of-stock live → `inventory_error` critical
- Upsert logic: only inserts if no unresolved error with same `product_id + error_type + source` exists; auto-resolves errors that are no longer detected on subsequent runs
- Cron route (`/api/cron/truth-engine`) — daily at 04:00 UTC, CRON_SECRET gated, checks 100 products
- `GET /api/truth-engine` — paginated error list, filterable by severity / resolved, auth-gated
- `POST /api/truth-engine` — manual trigger for authenticated user (checks 50 products)
- `PATCH /api/truth-engine/[id]` — resolve a single error (ownership-checked)
- `app/truth-engine/page.tsx` — full Truth Engine page: summary stat cards (Open/Critical/Warning/Resolved), URL-param filter tabs, paginated error list, manual TriggerButton
- `components/truth-engine/ErrorCard.tsx` — severity badge, expected/actual diff layout, fix suggestion, inline resolve button with optimistic UI
- `components/truth-engine/TriggerButton.tsx` — triggers POST, shows loading/result state with auto-resolve count
- Dashboard `Data Errors` MetricCard now shows live `openErrors` count from `fetchDashboardStats`, links to `/truth-engine` when errors exist
- Dashboard Next Steps step 3 now links to Truth Engine with error count badge when issues are present
- `MetricCard.sub` prop widened from `string` to `ReactNode` to support link element
- `DashboardStats.openErrors` added; `fetchDashboardStats` extended with 8th parallel query for unresolved error count

**Files created:**
- `lib/truth-engine.ts` — detection logic and `runTruthEngine()` export
- `app/api/cron/truth-engine/route.ts` — daily cron handler
- `app/api/truth-engine/route.ts` — `GET` list errors + `POST` manual trigger
- `app/api/truth-engine/[id]/route.ts` — `PATCH` resolve
- `app/truth-engine/page.tsx` — Truth Engine page (server component)
- `components/truth-engine/ErrorCard.tsx` — error card with inline resolve (client)
- `components/truth-engine/TriggerButton.tsx` — manual run button (client)

**Files updated:**
- `lib/types.ts` — added `openErrors` to `DashboardStats`
- `lib/stats.ts` — added 8th query to `Promise.all` for open errors count
- `components/dashboard/MetricCard.tsx` — widened `sub` to `ReactNode`
- `app/dashboard/page.tsx` — wired Data Errors metric + Step 3 link

⚠️ **Deferred:**
- `description_mismatch` error type not yet implemented (would require comparing AI response text to stored description — deferred to scanner enhancement)
- No per-user rate limiting on manual trigger (deferred to Billing step)
- Auto-fix for price/inventory errors (triggers resync) not implemented — user must resync manually

---

### 7. ✅ Email Alerts
**Completed:** March 3, 2026

What was built:
- `lib/email.ts` — Resend client (lazy init, silently no-ops when `RESEND_API_KEY` absent so local dev keeps working); two HTML email templates rendered as inline-styled template literals; two public send functions:
  - `sendNewCriticalAlerts(since: Date)` — queries `truth_engine_errors` for critical rows detected since the given timestamp, groups by `user_id`, sends one alert per affected user. Called automatically by both the daily truth-engine cron and the manual POST trigger.
  - `sendWeeklyDigests()` — iterates all active users, calls `fetchDashboardStats` per user, sends a digest with AI mentions (with trend %), visibility score, open error count, and top product. Called by the Monday 09:00 UTC cron.
- **Critical error alert email**: orange header, per-error product name + error message + fix suggestion, CTA button to `/truth-engine`
- **Weekly digest email**: 2×2 stat grid (Mentions with trend, Visibility Score, Open Errors, Top Product), orange warning block when errors exist, dual CTA to dashboard + truth engine
- Both templates use a shared `baseLayout` (dark header, white card, footer with dashboard link)
- `GET /api/cron/weekly-digest` — CRON_SECRET gated, sends all user digests
- `vercel.json` updated with weekly-digest cron: `0 9 * * 1` (Mondays 09:00 UTC)
- `RESEND_FROM_EMAIL` added to `.env.example` and `.env.local.example`; local dev file pre-set to `AgenticRev <onboarding@resend.dev>` (Resend’s shared test sender, works without domain verification)

**Files created:**
- `lib/email.ts` — Resend client + HTML templates + send functions
- `app/api/cron/weekly-digest/route.ts` — weekly digest cron handler

**Files updated:**
- `app/api/cron/truth-engine/route.ts` — calls `sendNewCriticalAlerts` after run
- `app/api/truth-engine/route.ts` (POST) — calls `sendNewCriticalAlerts` after manual trigger
- `vercel.json` — added `/api/cron/weekly-digest` cron
- `.env.example` — added `RESEND_FROM_EMAIL`
- `.env.local.example` — added `RESEND_FROM_EMAIL=AgenticRev <onboarding@resend.dev>`

**Env vars required:**
- `RESEND_API_KEY` — from resend.com (already in `.env.example`)
- `RESEND_FROM_EMAIL` — sender address on verified Resend domain; use `AgenticRev <onboarding@resend.dev>` for local testing

⚠️ **Deferred:**
- No unsubscribe link / email preference centre (required for CAN-SPAM compliance before scaling — add in Onboarding Polish step)
- Weekly digest only sends to *all* users; per-user send-time preference not implemented
- No bounce / complaint handling webhook from Resend

---

### 8. ✅ Billing (Stripe)
**Completed:** March 3, 2026

What was built:
- `lib/stripe.ts` — Stripe client (lazy init, no-ops if `STRIPE_SECRET_KEY` absent), `PLAN_CONFIG` (free / starter $29 / growth $99 / agency $299) as single source of truth for all plan limits; helpers: `getOrCreateStripeCustomer`, `getUserSubscription`, `syncSubscriptionFromStripe`, `cancelSubscriptionInDb`, `isWithinProductLimit`
- `POST /api/billing/checkout` — Zod-validates `planId`, creates Stripe Checkout session (`mode: subscription`), returns `{ url }` for client redirect
- `POST /api/billing/portal` — creates Stripe Customer Portal session for plan management, cancel, invoices
- `POST /api/webhooks/stripe` — HMAC-verified Stripe webhook handler; handles `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`; upserts `subscriptions` row with plan, status, limits, `billing_cycle_anchor` (Stripe v20 API)
- `app/billing/page.tsx` — pricing page: current plan usage summary (products/stores/ACP/renewal), 4-column plan comparison cards with features list, upgrade CTA buttons (server component; CTA buttons extracted to client component)
- `components/billing/BillingButtons.tsx` — `UpgradeButton` (POST checkout, redirect) + `ManageButton` (POST portal, redirect), both with loading state
- Plan limit enforcement:
  - `POST /api/scanner/trigger` — now reads `sub.max_products` from plan and passes it as scan cap to `runScanner`
  - `POST /api/products/sync` — stops fetching Shopify pages when `max_products` is reached; returns `warning` field in response if limit hit
- Dashboard nav now includes a **Billing** link
- Stripe SDK v20 compatibility: uses API version `2026-02-25.clover`, `billing_cycle_anchor` instead of deprecated `current_period_end`, `invoice.parent.subscription_details.subscription` instead of deprecated `invoice.subscription`

**Files created:**
- `lib/stripe.ts` — plan config + Stripe utilities
- `app/api/billing/checkout/route.ts` — `POST` create checkout session
- `app/api/billing/portal/route.ts` — `POST` create portal session
- `app/api/webhooks/stripe/route.ts` — Stripe webhook handler
- `app/billing/page.tsx` — pricing / billing management page
- `components/billing/BillingButtons.tsx` — UpgradeButton + ManageButton (client)

**Files updated:**
- `app/api/scanner/trigger/route.ts` — plan-limit scan cap
- `app/api/products/sync/route.ts` — plan-limit product sync cap with warning
- `app/dashboard/page.tsx` — added Billing nav link
- `.env.example` — added `STRIPE_PRICE_ID_STARTER/GROWTH/AGENCY`
- `.env.local.example` — added `STRIPE_PRICE_ID_STARTER/GROWTH/AGENCY`

**Env vars required:**
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (already in `.env.example`)
- `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_GROWTH`, `STRIPE_PRICE_ID_AGENCY` — create in Stripe dashboard under Products (recurring monthly USD)

⚠️ **Deferred:**
- `STRIPE_PUBLISHABLE_KEY` is not yet used in the frontend (all redirects are server-side checkout sessions, so no client-side Stripe.js needed for now)
- No upgrade prompts inside scanner / truth engine UI when plan limit is hit (just API warning returned)
- Stripe Customer Portal configuration (cancellation policy, allowed updates) must be configured in the Stripe dashboard before portal link is live

---

### 9. ✅ Onboarding Polish
**Completed:** March 3, 2026

What was built:
- **`/forgot-password` page** — email form with anti-enumeration (always returns 200); sends password reset link via Resend (silently skipped if no API key)
- **`/reset-password` page** — token-gated new-password form; validates token expiry (1h) and single-use constraint
- **`/verify-email` page** — client-side token verification on mount; auto-redirects to `/dashboard` on success
- **Email verification flow** — `lib/tokens.ts` generates/stores/verifies cryptographic tokens in new `auth_tokens` table; signup route now sends verification email (fire-and-forget); `POST /api/auth/send-verification` allows resending from dashboard
- **`/onboarding` wizard** — server component checks current state (store connected, products synced, mentions exist); client `OnboardingWizard` component guides through 3 steps with auto-polling for product sync; redirects fully-onboarded users to `/dashboard`; skip link available
- **Post-signup redirect** — signup page now redirects to `/onboarding` instead of `/dashboard` after successful account creation
- **Shopify OAuth return URL** — `?return_to=` param on install route stores a cookie; callback reads it to redirect back to `/onboarding` (not `/dashboard`) for first-time connections
- **Email verification banner on dashboard** — `VerifyEmailBanner` client component shows when `email_verified = false`; inline "Resend link" button hits `POST /api/auth/send-verification`
- **ScanButton auto-refresh** — calls `router.refresh()` after scan completes so dashboard metrics update without manual page reload; removed stale "refresh the page" message
- **ScanButton upgrade prompt** — shows "Upgrade to scan more →" link (to `/billing`) after a successful scan when user is on the free plan
- **Landing page polish** — full redesign: sticky nav, hero with value prop + dual CTAs, stats strip (4 platforms / real-time checks / 24/7), 4-column feature cards, 3-step how-it-works, CTA section, footer
- **DB migration 002** — `auth_tokens` table for email verification and password reset tokens

**Files created:**
- `supabase/migrations/002_auth_tokens.sql` — `auth_tokens` table
- `lib/tokens.ts` — `generateAndStoreToken`, `verifyAndConsumeToken`
- `app/forgot-password/page.tsx` — forgot password page
- `app/reset-password/page.tsx` — reset password page
- `app/verify-email/page.tsx` — email verification page
- `app/onboarding/page.tsx` — onboarding wizard server page
- `components/onboarding/OnboardingWizard.tsx` — 3-step wizard client component
- `components/dashboard/VerifyEmailBanner.tsx` — unverified email notice (client)
- `app/api/auth/forgot-password/route.ts` — `POST` send reset link
- `app/api/auth/reset-password/route.ts` — `POST` set new password
- `app/api/auth/verify-email/route.ts` — `GET` consume verification token
- `app/api/auth/send-verification/route.ts` — `POST` resend verification email

**Files updated:**
- `lib/email.ts` — added `sendVerificationEmail` + `sendPasswordResetEmail` with HTML templates
- `app/api/auth/signup/route.ts` — sends verification email after signup (fire-and-forget)
- `app/signup/page.tsx` — redirects to `/onboarding` after signup
- `app/page.tsx` — full landing page redesign
- `components/stores/ConnectButton.tsx` — added `returnTo` prop for post-OAuth redirect control
- `components/dashboard/ScanButton.tsx` — auto-refresh via `router.refresh()`; added `isFreePlan` prop + upgrade prompt
- `app/dashboard/page.tsx` — fetches `email_verified` + subscription in parallel; renders `VerifyEmailBanner`; passes `isFreePlan` to `ScanButton`
- `app/api/shopify/install/route.ts` — saves `shopify_return_to` cookie from `?return_to=` param
- `app/api/shopify/callback/route.ts` — reads `shopify_return_to` cookie on success redirect

**Env vars required:** No new env vars — all transactional email reuses `RESEND_API_KEY` + `RESEND_FROM_EMAIL` from Step 7.

⚠️ **Deferred:**
- No unsubscribe token in email links (CAN-SPAM) — must add before sending to real customers
- `auth_tokens` migration must be applied to Supabase before these features work; run `002_auth_tokens.sql` against the DB
- Forgot-password flow requires `RESEND_API_KEY` to deliver the email; without it the API returns `{ ok: true }` but no email is sent (intentional anti-enumeration behavior, safe for development)
- No account lockout / rate limit on forgot-password endpoint (deferred until post-MVP)

---

## 🎉 MVP v1 Complete

All 9 critical path steps are shipped.
**Next actions before launch:**
1. Collect external credentials: Shopify Partner Portal app, Stripe account + Price IDs, Resend account + verified sender domain
2. Add all secrets to `.env` (see `.env.example` for the full list)
3. Apply migration `002_auth_tokens.sql` to Supabase
4. Deploy to Vercel, configure Supabase prod project
5. Test end-to-end: signup → onboarding → Shopify connect → scan → billing

---

## Post-MVP — Developer Tooling & QA

### ✅ Developer Tooling Improvements
**Completed:** March 3, 2026

What was built:
- `dev.sh` — single command startup script: checks `.env.local`, verifies Node.js ≥ 20, installs deps if needed, launches Docker Desktop (macOS `open -a Docker`) if daemon is not running, runs `docker compose up -d`, polls DB health, polls REST API health, then starts `npm run dev`
- Fixed `npm run lint`: `next lint` was removed in Next.js 16 — replaced with `eslint . --ext .ts,.tsx --max-warnings 0` in `package.json`
- Fixed `docker-compose.yml` proxy healthcheck: `wget` → `curl` (nginx:alpine container does not have wget on PATH)
- DB exposed on host port `5433` (not 5432) to avoid conflict with other local Postgres containers

**Files created:**
- `dev.sh` — full-stack startup script (`chmod +x` already applied)

**Files updated:**
- `package.json` — `"lint"` script fixed
- `docker-compose.yml` — proxy healthcheck + port mapping

⚠️ **Deferred:**
- `dev.sh` macOS-only (Docker Desktop detection uses `open -a Docker`); Linux/Windows users must start Docker manually

---

### ✅ Dark Mode Toggle
**Completed:** March 3, 2026

What was built:
- `components/providers/ThemeProvider.tsx` — React context; reads `localStorage.getItem('theme')` on mount, falls back to `prefers-color-scheme`; toggles `dark` class on `<html>`; persists choice to `localStorage`; exports `useTheme()` hook
- `components/ui/DarkModeToggle.tsx` — iOS-style pill toggle with Sun/Moon icons from `lucide-react`; placed in nav bar on authenticated pages
- Flash prevention: inline `<script>` in `<head>` (before First Paint) reads localStorage and adds `dark` class synchronously to prevent white flash on page load
- `tailwind.config.ts` updated: `darkMode: 'class'` added
- `app/globals.css` updated: removed `@media (prefers-color-scheme: dark)` block; added `html.dark` overrides for all background, text, border, input, and hover states
- Toggle added to nav on all three authenticated pages: Dashboard, Billing, Truth Engine

**Files created:**
- `components/providers/ThemeProvider.tsx` — dark mode context + hook
- `components/ui/DarkModeToggle.tsx` — toggle pill component

**Files updated:**
- `tailwind.config.ts` — `darkMode: 'class'`
- `app/globals.css` — `html.dark` CSS class overrides
- `app/layout.tsx` — `ThemeProvider` wrapper, flash-prevention script, `suppressHydrationWarning`
- `app/dashboard/page.tsx` — `DarkModeToggle` in nav
- `app/billing/page.tsx` — `DarkModeToggle` in nav
- `app/truth-engine/page.tsx` — `DarkModeToggle` in nav

⚠️ **Deferred:**
- Dark mode not yet applied to Login, Signup, Onboarding, Forgot/Reset Password pages
- No server-side dark mode preference storage (preference is lost on new devices/browsers)

---

### ✅ Test Accounts & Seed Data
**Completed:** March 3, 2026

What was built:
- 4 test users seeded in local DB, one per billing plan (free / starter / growth / agency)
- Each user has a matching subscription row with correct plan limits
- Fixed UUIDs for predictable reference: `00000000-0000-0000-0000-00000000000{1-4}`
- All accounts share password `Test1234!` (bcrypt cost 12 hash)
- Idempotent SQL seed script (DELETE + INSERT — safe to re-run)
- `docs/TEST-ACCOUNTS.md` — credentials reference with login URL, per-plan feature comparison, DB UUID table, and reseed command

**Test accounts (local dev only):**
| Email | Plan | Max Products |
|---|---|---|
| `free@test.agenticrev.local` | free | 10 |
| `starter@test.agenticrev.local` | starter | 100 |
| `growth@test.agenticrev.local` | growth | 500 |
| `agency@test.agenticrev.local` | agency | unlimited |

Password for all: `Test1234!` — Login at `http://localhost:3000/login`

**Files created:**
- `scripts/seed-test-users.sql` — idempotent seed SQL
- `docs/TEST-ACCOUNTS.md` — credentials and plan reference doc

**Reseed command:**
```bash
PGPASSWORD=postgres psql -h localhost -p 5433 -U supabase_admin -d postgres -f scripts/seed-test-users.sql
```

⚠️ **Deferred:**
- Test accounts have no connected Shopify stores (no external credentials wired yet)
- Seeded only for local Docker DB; must re-run against staging/prod DB when deployed

---

## Infrastructure State

| Service | Status |
|---|---|
| Next.js / Vercel | ✅ Configured |
| Supabase DB schema | ✅ Migration ready; 3 migrations: `000_supabase_roles.sql` + `001_initial_schema.sql` + `002_auth_tokens.sql`; local Docker stack fully operational |
| Docker local stack | ✅ All 5 services running and healthy: db (port 5433), PostgREST API (port 8000), Supabase Studio (port 54323), meta, proxy |
| `dev.sh` script | ✅ Single command to start Docker + Next.js: `./dev.sh` |
| Dark mode | ✅ `ThemeProvider` + `DarkModeToggle` toggle on all authenticated pages; localStorage persistence; flash prevention |
| Test accounts (local) | ✅ 4 accounts seeded (free/starter/growth/agency) — `Test1234!` — see `docs/TEST-ACCOUNTS.md` |
| Cron jobs in vercel.json | ✅ All 4 crons implemented: scanner (03:00), truth-engine (04:00), shopify-sync (every 15 min), weekly-digest (Mon 09:00) |
| TypeScript | ✅ 0 errors (`npm run typecheck`) |
| ESLint | ✅ Passing (`npm run lint` — eslint CLI, not `next lint`) |
| Shopify app in Partner Portal | 🔲 Not created |
| Stripe account | 🔲 Not created — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_*` needed; create 3 monthly recurring products in Stripe dashboard |
| Resend account | 🔲 Not created — `RESEND_API_KEY` + `RESEND_FROM_EMAIL` needed; use `onboarding@resend.dev` sender for initial testing |
| Domain / DNS | 🔲 Not configured |

---

## Local Docker Stack Notes

**Port mapping (avoids conflict with other local Postgres instances):**
- `5433:5432` → Postgres (connects to `localhost:5433`, user `supabase_admin`, password `postgres`)
- `8000:8000` → Supabase REST API / proxy (what `SUPABASE_URL` points to)
- `54323:3000` → Supabase Studio UI

**Migrations applied order** (critical — roles must exist before schema):
1. `000_supabase_roles.sql` — creates `anon`, `authenticated`, `service_role`, `authenticator` roles + `auth.uid()` function
2. `001_initial_schema.sql` — 8 tables with RLS policies
3. `002_auth_tokens.sql` — auth_tokens table for email verification + password reset

**Re-seeded data:** `ai_platforms` pre-populated with all 4 platforms (chatgpt, perplexity, gemini, claude).
