# GitHub Copilot Agent Instructions — AgenticRev

## Project Overview

**AgenticRev** is a SaaS platform that helps e-commerce merchants (Shopify, WooCommerce) get discovered, recommended, and purchased through AI assistants (ChatGPT, Perplexity, Gemini, Claude).

**Launch target:** ASAP. Every decision must bias toward shipping working software, not perfect software.

**Four product modules:**
1. **Visibility** — Track product mentions across AI platforms
2. **Truth Engine** — Detect & fix product data errors before AI agents hallucinate them
3. **Action** — Enable instant checkout via OpenAI ACP (Q2 2026)
4. **Reliability** — Monitor AI agent accuracy drift and uptime

---

## Tech Stack — Know This Cold

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Auth | NextAuth.js v5 (credentials + JWT) |
| Database | Supabase (PostgreSQL) |
| State | Zustand |
| Data fetching | SWR |
| Charts | Recharts |
| Icons | Lucide React |
| Validation | Zod |
| Email | Resend |
| Payments | Stripe |
| Hosting | Vercel |

**Installed but not yet wired:** `recharts`, `swr`, `zustand`, `lucide-react` — use them, don't add alternatives.

---

## Architecture Rules

- **Server Components by default.** Use `'use client'` only when you need browser APIs, event handlers, or hooks.
- **API routes live in** `app/api/`. Group by feature: `app/api/stores/`, `app/api/products/`, etc.
- **Supabase admin client** (`supabaseAdmin` from `lib/supabase.ts`) for server-side writes. Anon client for public reads.
- **Auth** via `auth()` from `lib/auth-server.ts` in server components. Via `useSession()` / `signIn()` from `next-auth/react` in client components.
- **Types** live in `lib/types.ts`. Add to it, never duplicate inline types that belong there.
- **Reusable UI** goes in `components/`. Flat structure for shared primitives (`components/ui/`), domain components in matching folders (`components/dashboard/`, `components/stores/`).
- **No barrel re-exports** unless there are 3+ exports in a folder.
- **Cron jobs** are Vercel functions at `app/api/cron/`. They are already declared in `vercel.json` — implement them there.

---

## Code Quality — Non-Negotiable

### TypeScript
- **Zero `tsc --noEmit` errors.** Run `npm run typecheck` before considering a feature done.
- No `any` unless temporarily unavoidable — add `// TODO: type this` comment.
- No unused variables or imports. ESLint will catch these — fix them, don't disable the rule.

### Style
- No `console.log` in production code. Use structured error handling.
- No commented-out dead code. Delete it.
- No verbose code. If a function is doing one thing, it should read like it's doing one thing.
- Keep components under 150 lines. Extract when you hit that ceiling.
- Extract repeated logic into named utility functions in `lib/`.

### Correctness
- Every API route must handle the `supabaseAdmin === null` case (DB not configured).
- Every API route must return typed `NextResponse.json()` with appropriate status codes.
- Form validation with Zod on API routes. Never trust client input.
- Use `try/catch` in async API routes, always return a fallback error response.

### Performance
- Avoid `fetch` waterfalls in Server Components — parallelize with `Promise.all`.
- SWR for client-side data fetching, not raw `useEffect` + `fetch`.

---

## After You Implement a Feature — REQUIRED

**You must update `docs/PROGRESS.md` after every feature implementation.**

This is the canonical source of truth for what has been built. Other agents read this before starting. Outdated tracking = duplicated work = wasted time.

Rules for updating `docs/PROGRESS.md`:
1. Mark the feature as `✅ Done` with a brief one-line description of what was built
2. List new files/routes created
3. List any env vars required that weren't already in `.env.example`
4. Note any known limitations or deferred work in a `⚠️ Deferred` line
5. **Code is truth.** If it's not in the codebase, it's not done — don't mark it done.

---

## Feature Implementation Order (MVP Critical Path)

Follow this order. Do not jump ahead — later features depend on earlier ones.

1. ✅ **Auth** — signup, login, session, password hashing
2. 🔲 **Shopify OAuth** — install flow, token storage, disconnect
3. 🔲 **Product Sync** — initial fetch, webhook handlers, incremental updates
4. 🔲 **AI Scanner** — cron job scanning 4 platforms, storing `ai_mentions`
5. 🔲 **Visibility Dashboard** — real metrics from DB, charts (Recharts)
6. 🔲 **Truth Engine** — detect price/inventory mismatches, display errors
7. 🔲 **Email Alerts** — Resend integration, critical error + weekly digest templates
8. 🔲 **Billing** — Stripe checkout, subscriptions, plan limits enforcement
9. 🔲 **Onboarding Polish** — email verification, connection wizard, first scan flow

Each step must pass `npm run typecheck` and `npm run lint` before marking done.

---

## File & Naming Conventions

```
app/
  api/
    stores/         → store connection routes
    products/       → product CRUD
    cron/           → scanner, truth-engine, shopify-sync
    webhooks/       → shopify webhook handlers
components/
  ui/               → Button, Input, Card, Badge, Modal (primitives)
  dashboard/        → MetricCard, Chart, EmptyState
  stores/           → StoreCard, ConnectButton
  products/         → ProductTable, ProductRow
lib/
  types.ts          → all shared domain types
  supabase.ts       → DB clients
  auth.ts           → NextAuth config
  auth-server.ts    → server-side auth exports
  shopify.ts        → Shopify API utils (to build)
  scanner.ts        → AI scanning logic (to build)
  stripe.ts         → Stripe utils (to build)
```

- **Files:** `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- **Variables/functions:** `camelCase`
- **DB column refs:** `snake_case` (match Supabase schema exactly)
- **Env vars:** `SCREAMING_SNAKE_CASE`, always nullable-guarded in code

---

## Supabase Schema Reference (deployed tables)

- `users` — id, email, password_hash, full_name, company_name, oauth_provider
- `stores` — id, user_id, platform, store_url, access_token, sync_status
- `subscriptions` — id, user_id, plan, status, max_products, acp_enabled
- `products` — id, store_id, user_id, platform_id, name, price, inventory_quantity, ai_readability_score
- `ai_platforms` — id, name, slug (pre-populated: chatgpt, perplexity, gemini, claude)
- `ai_mentions` — id, product_id, user_id, platform_id, query, mentioned, sentiment
- `truth_engine_errors` — id, product_id, user_id, error_type, severity, resolved

Always query the `supabaseAdmin` client server-side for writes. RLS is enabled on all tables.

---

## What Is NOT Acceptable

- Implementing something already in `docs/PROGRESS.md` as done → check the doc first
- Adding new npm packages without checking if an installed package covers the use case
- Leaving TypeScript errors and shipping anyway
- `any` types on API response shapes — define them in `lib/types.ts`
- Hardcoded user IDs, secrets, or API keys in code
- UI components without mobile-responsive Tailwind classes
- API routes that don't validate input with Zod

---

## Quick Commands

```bash
npm run dev          # local dev
npm run typecheck    # must pass before marking feature done
npm run lint         # must pass before marking feature done
npm run build        # final check before PR
```
