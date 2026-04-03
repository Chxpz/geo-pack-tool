# AgenticRev Codebase Audit

Version: v1.0.0
Date: 2026-04-03
Auditor: Codex
Basis: Code and executable configuration only. Markdown product and process docs were intentionally ignored as requested.

## Executive Verdict

AgenticRev is not packaged or deployment-ready.

Current state: pivot-in-progress / internal alpha
Release recommendation: no-go

High-level readiness assessment:

| Gate | Status | Evidence |
| --- | --- | --- |
| Production build | Fail | `npm run build` failed with 26 build errors |
| Type safety | Fail | `npm run typecheck` failed with broad framework, route, and schema errors |
| Lint hygiene | Fail | `npm run lint` failed |
| Runtime consistency | Fail | broken imports, removed APIs still referenced, missing pages linked from UI |
| Test coverage | Fail | only 1 executable test file, and it cannot typecheck because `@playwright/test` is missing |
| Deployment automation | Fail | no CI workflows; Vercel cron config does not match implemented routes |

## How Far From Deployable

Short answer: not close enough for packaging.

Based on the current code, there are three layers of distance:

1. Buildable internal preview
   This requires framework/auth migration cleanup, import/export repair, schema-field reconciliation, and route fixes.
   Estimated effort: about 5-10 focused engineering days.

2. Deployable internal beta
   This additionally requires removing or completing broken product surfaces, stabilizing cron/reporting/billing flows, and adding a minimal verification pipeline.
   Estimated effort: about 1-2 weeks after the code compiles.

3. Customer-ready packaged product
   This requires trustworthy reports, complete navigation, real scan state tracking, working billing upgrades, and meaningful automated test coverage.
   Estimated effort: about 2-4 weeks total if keeping the current feature surface.

That estimate is an inference from the current code, not a promise.

## Verification Performed

Commands run:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

Observed results:

- `typecheck`: failed
- `lint`: failed
- `build`: failed
- Executable test files present: 1
- `.github` workflow files present: 0

## Critical Findings

### 1. The application does not build

This alone blocks packaging and deployment.

Primary evidence:

- `app/onboarding/page.tsx:2` imports non-existent `@/auth`
- `app/dashboard/page.tsx:7` imports non-existent `@/components/stores/StoresSection`
- `app/api/cron/scanner/route.ts:2` imports non-existent `runScanner`
- `app/api/scanner/trigger/route.ts:3` imports non-existent `runScanner`
- many API routes still import `getServerSession` from `next-auth` or `next-auth/next`, which is incompatible with the installed `next-auth` v5 beta

Relevant files:

- `package.json:18-19`
- `app/onboarding/page.tsx:1-4`
- `app/dashboard/page.tsx:1-8`
- `app/api/cron/scanner/route.ts:1-13`
- `app/api/scanner/trigger/route.ts:1-25`

### 2. Auth migration is incomplete and inconsistent

The repo has partially migrated to NextAuth v5:

- `lib/auth-server.ts` uses `NextAuth(authOptions)` and exports `auth`
- many routes still call removed `getServerSession`
- onboarding imports `@/auth`, but the actual server auth helper lives in `@/lib/auth-server`

This is not a minor warning. It breaks build and route execution.

Evidence:

- `lib/auth-server.ts:1-4`
- `app/onboarding/page.tsx:2`
- `app/api/reports/list/route.ts:2,11`
- `app/api/reports/[id]/download/route.ts:2,16`
- `app/api/reports/generate/route.ts:2,13`
- `rg -l "getServerSession" app lib | wc -l` returned `22`

### 3. Supabase client usage is internally inconsistent

`lib/supabase.ts` exports `supabaseAdmin` as a client object or `null`, but multiple routes call it like a function.

This causes both type failures and runtime failure paths.

Evidence:

- `lib/supabase.ts:11-12`
- `app/api/businesses/route.ts:20,64`
- `app/api/businesses/[id]/route.ts:43,147,220`
- `app/api/competitors/route.ts`
- `app/api/citations/route.ts`
- `app/api/seo/*`
- `rg -l "supabaseAdmin\\(" app lib | wc -l` returned `9`

### 4. The business/GEO pivot is incomplete and collides with legacy e-commerce code

The schema clearly pivots to `businesses`, `tracked_queries`, `citations`, `seo_snapshots`, etc., but large parts of the app still assume old store/product flows or wrong business column names.

Schema source of truth:

- `supabase/migrations/003_pivot_schema.sql:46-220`

Code drift examples:

- `app/api/reports/generate/route.ts:47-49` selects `id, name` from `businesses`, but the schema defines `business_name`
- `app/api/reports/generate/route.ts:67-83` uses `business.name`
- `app/api/cron/weekly-digest/route.ts:43-45` also selects `id, name`
- `app/api/businesses/[id]/route.ts:73-76` queries non-existent table `mentions`; the schema extends `ai_mentions`
- `app/api/businesses/[id]/route.ts:165-172` updates wrong field names: `name`, `website`, `city`, `state` instead of schema fields such as `business_name`, `website_url`, `address_city`, `address_state`
- `app/dashboard/page.tsx:53-90` still loads legacy `stores` and `products` alongside businesses

This means the product model is not yet coherent enough for release.

### 5. Billing is not trustworthy

Billing plan identifiers disagree across API code, plan configuration, and environment examples.

Evidence:

- `app/api/billing/checkout/route.ts:7-8` accepts `starter`, `growth`, `agency`
- `lib/stripe.ts:31-131` defines plans as `free`, `pro`, `business`, `enterprise`
- `app/api/billing/checkout/route.ts:30-31` indexes `PLAN_CONFIG` using unsupported keys
- `.env.example:33-35` uses `STRIPE_PRICE_ID_STARTER/GROWTH/AGENCY`
- `.env.local.example:39-41` uses `STRIPE_PRICE_ID_STARTER/GROWTH/AGENCY`
- `lib/stripe.ts:77,103,130` expects `STRIPE_PRICE_ID_PRO/BUSINESS/ENTERPRISE`

Signup also still seeds legacy subscription columns:

- `app/api/auth/signup/route.ts:76-87` inserts `max_products`, `max_stores`, `historical_data_days`, `acp_enabled`

But the pivoted billing helper reads:

- `lib/stripe.ts:145-198` expects `max_businesses`, `max_competitors`, `max_queries`, `scan_frequency`, `semrush_depth`, `perplexity_model`, `data_retention_days`

Result: billing and plan enforcement are not internally aligned.

### 6. Reporting is not release-grade

The reports feature has multiple problems:

- build-breaking auth usage
- wrong business column names
- download endpoint is not PDF generation despite the UI promising PDF
- report content includes fabricated values using `Math.random`

Evidence:

- `app/api/reports/generate/route.ts:2,13`
- `app/api/reports/generate/route.ts:47-49`
- `app/api/reports/generate/route.ts:67-83`
- `app/api/reports/generate/route.ts:247-248`
- `app/api/reports/generate/route.ts:469`
- `app/api/reports/generate/route.ts:502-504`
- `app/api/reports/[id]/download/route.ts:7-9`
- `app/reports/page.tsx:88-105`

This means the generated reports are not reliable customer artifacts.

### 7. Scan orchestration is incomplete

The user-facing scan status API is explicitly placeholder-only, and the cron/manual scanner routes point to missing exports.

Evidence:

- `app/api/scan/status/[id]/route.ts:21-28`
- `app/api/cron/scanner/route.ts:2-13`
- `app/api/scanner/trigger/route.ts:3-25`

A product that sells visibility scanning cannot ship with placeholder scan-state behavior.

### 8. Cron wiring is broken

`vercel.json` schedules `/api/cron/digest`, but the implemented route is `/api/cron/weekly-digest`.

Evidence:

- `vercel.json:11-14`
- `app/api/cron/weekly-digest/route.ts:10`

The weekly digest implementation is also suspect:

- selects `id, name` from `businesses` though schema uses `business_name`
- fetches stats per user, then discards them
- calls `sendWeeklyDigests()` in a loop without passing those user-specific stats

Evidence:

- `app/api/cron/weekly-digest/route.ts:43-45`
- `app/api/cron/weekly-digest/route.ts:54-60`

### 9. Navigation exposes routes that do not exist

The sidebar links to pages that are not implemented:

- `/citations`
- `/concierge`
- `/settings`

Evidence:

- `components/layout/Sidebar.tsx:8-17`
- repo page inventory contains 15 page files and none for those routes

Shell check:

- `/citations no`
- `/concierge no`
- `/settings no`

This is a user-facing broken navigation problem.

### 10. Deep research backend depends on a table that is never migrated

Code writes to and reads from `deep_research_results`, but no migration creates that table.

Evidence:

- `app/api/agent/deep-research/route.ts:99,113`
- `app/api/agent/deep-research/[id]/route.ts:42`
- searching migrations found no `deep_research_results` table

That feature cannot be production-ready in its current form.

## Major Product Completeness Gaps

These are not just bugs; they show the product is still unfinished.

### Shopify OAuth is still a TODO in the login UX

- `app/login/page.tsx:128-130`

### Landing page still exposes placeholder marketing content

- `app/page.tsx` contains `(Testimonials and logos coming soon)`

### SEMrush integration is only partially real

Placeholders remain for position tracking, site audit, and listing management:

- `lib/semrush.ts:351-363`
- `lib/semrush.ts:365-375`
- `lib/semrush.ts:497-501`

### Dashboard mixes live data with hardcoded/fake values

Examples:

- `app/dashboard/page.tsx:168-176` hardcoded visibility-score components
- `app/dashboard/page.tsx:217-219` hardcoded 85%
- citation map uses hardcoded domains later in the file

This reduces trust in the core product experience.

## Quality and Operations Findings

### Tooling/version skew

- `package.json:18` uses `next` `^16.1.6`
- `package.json:36` uses `eslint-config-next` `15.1.6`

This is not guaranteed to be the direct cause of build failure here, but it is unnecessary risk.

### No CI pipeline found

`.github` contains only:

- `.github/copilot-instructions.md`

No build, lint, test, or deploy workflow was present.

### Test coverage is effectively absent

There is only one executable test file:

- `tests/e2e/onboarding.spec.ts`

But it cannot typecheck because `@playwright/test` is not installed, and the app currently does not build.

### Build portability risk from remote Google font fetch

`app/layout.tsx` uses `next/font/google`:

- `app/layout.tsx:2,8`

This is fine in networked builds, but it failed in the current restricted environment and adds another moving part to deployment portability.

## Command Results Summary

### `npm run typecheck`

Result: failed

Observed categories of failure:

- NextAuth v5 migration breakage
- App Router route signature mismatch for dynamic route params
- missing modules and missing exports
- `supabaseAdmin` called as a function
- schema/type drift across business, report, and scanner code
- missing Playwright dependency for the lone test

### `npm run lint`

Result: failed

Observed issues:

- unescaped apostrophes in UI copy
- hook dependency warning in `components/agent/ChatWidget.tsx`

### `npm run build`

Result: failed

Observed build blockers:

- missing `@/auth`
- missing `@/components/stores/StoresSection`
- `getServerSession` imports invalid for installed auth stack
- `runScanner` export missing
- deprecated route `config` export in Stripe webhook route

## Readiness Score

Pragmatic score for "packaged and ready to deploy": 20/100

Breakdown:

- Buildable: 0/20
- Runtime coherence: 4/20
- Product completeness: 5/20
- Billing/report trustworthiness: 3/20
- Test/CI/deploy safety: 2/20
- Environment/config consistency: 6/20

This is a heuristic score, but the no-go conclusion does not depend on the score.

## Recommended Recovery Sequence

### Phase 1: Make the app build

1. Finish the auth migration to one model only.
2. Replace all invalid `getServerSession` usage.
3. Fix missing imports and dead legacy references.
4. Stop calling `supabaseAdmin` as a function.
5. Align dynamic route handler signatures with Next 16 expectations.

### Phase 2: Reconcile the pivot

1. Decide whether legacy store/product features still ship.
2. Remove dead store/shopify code from active surfaces or restore it properly.
3. Normalize all business field names to the actual schema.
4. Fix billing models and environment variable naming.

### Phase 3: Make the product trustworthy

1. Remove all placeholder and synthetic report values.
2. Implement real scan status tracking.
3. Repair cron paths and verify each scheduled job end-to-end.
4. Remove broken sidebar routes or implement those pages.
5. Add the missing `deep_research_results` migration or remove the feature.

### Phase 4: Add release discipline

1. Add CI for typecheck, lint, build.
2. Install and run the actual test framework you claim to use.
3. Add at least smoke tests for signup, onboarding, dashboard, report generation, and billing upgrade flow.

## Bottom Line

This repository is not one cleanup away from packaging. It is still carrying an unfinished platform pivot, a half-completed auth migration, broken route wiring, and untrustworthy customer-facing reporting.

If you want the fastest path to a deployable product, the right move is not to polish around the edges. It is to cut scope, unify the architecture, and stabilize one coherent product slice end-to-end before trying to package the whole current surface.
