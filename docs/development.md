# Development

## Prerequisites

- Node.js 22
- npm

## Install

```bash
npm install
```

## Environment Setup

### Cloud-backed development

1. Copy `.env.example` to `.env.local`.
2. Fill in service credentials (Supabase, AI providers, Stripe, Resend, Stack3 Audit).

### Local Docker-backed development

1. Copy `.env.local.example` to `.env.local`.
2. Start the local stack:

```bash
docker compose up -d
```

The Docker stack provides:
- PostgreSQL 15 on port 5433 (auto-applies all migrations on first boot)
- PostgREST API
- Nginx proxy on port 8000 (mirrors Supabase URL structure)
- Supabase Studio on port 54323

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run lint` | ESLint on `.ts`/`.tsx` (zero warnings enforced) |
| `npm run typecheck` | TypeScript compile check without emit |
| `npm run test` | Run Vitest unit tests |
| `npm run build` | Production Next.js build |
| `npm run ci` | `lint` + `typecheck` + `test` |
| `npm run verify:release` | `ci` + production build + artifact verification |

## Testing

Unit tests run via Vitest and live in `tests/unit/`. Current test coverage:

- `plan-limits.test.ts` — plan limits, feature access, upgrade guidance
- `visibility-score.test.ts` — score computation and edge cases
- `tokens.test.ts` — token generation and verification
- `retry.test.ts` — retry behavior and backoff
- `rate-limit.test.ts` — sliding window enforcement
- Provider payload fixtures in `tests/unit/fixtures/`
- Route-level tests for auth, webhooks, health, and scan trigger

Run tests:

```bash
npm run test
```

## CI Workflows

GitHub Actions in `.github/workflows/`:

- **ci.yml** — runs on PRs and pushes to main. Installs, runs `npm run ci`.
- **release-verification.yml** — runs on main pushes, tags (`v*`), and manual trigger. Runs `npm run verify:release` and uploads build artifacts.

Both use Node.js 22 and placeholder environment values.

## Key Files

| Path | Purpose |
|------|---------|
| `lib/stripe.ts` | Plan config (`PLAN_CONFIG`), Stripe helpers, subscription sync |
| `lib/plan-limits.ts` | Plan limits (`PLAN_LIMITS`), feature gating, limit checks |
| `lib/audit-client.ts` | Stack3 Audit System HTTP client and data mapper |
| `lib/scanner.ts` | AI platform scan engine |
| `lib/geo-agent.ts` | AI concierge RAG context builder and system prompts |
| `lib/types.ts` | Core TypeScript interfaces for all database entities |
| `lib/logger.ts` | Pino structured logger |
| `lib/retry.ts` | Exponential backoff retry for external API calls |
