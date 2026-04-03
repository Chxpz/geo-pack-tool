# Development

## Prerequisites

- Node.js 22 recommended
- npm
- Supabase project or the local Docker stack in `docker-compose.yml`

## Install

```bash
npm install
```

## Environment Setup

### Cloud-backed development

1. Copy `.env.example` to `.env.local`.
2. Fill in the required service credentials.

### Local Docker-backed development

1. Copy `.env.local.example` to `.env.local`.
2. Run:

```bash
docker compose up -d
```

The Docker stack mounts all checked-in SQL migrations in `supabase/migrations/` for first boot.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run ci
npm run verify:release
```

## What Each Command Means

- `npm run lint`: ESLint on `.ts` and `.tsx`
- `npm run typecheck`: TypeScript compile check without emit
- `npm run build`: production Next.js build
- `npm run ci`: local equivalent of the main CI validation path
- `npm run verify:release`: `ci` plus production build artifact verification

## Testing Reality

Current checked-in automated validation is limited:

- Static validation: lint, typecheck, build
- One browser test file: `tests/e2e/onboarding.spec.ts`

There is no package script for E2E execution in `package.json` today, and there is no committed Playwright workflow in the app scripts. Treat `npm run ci` and `npm run verify:release` as the enforced baseline.

## CI Workflows

GitHub Actions workflows live in `.github/workflows/`:

- `ci.yml`
- `release-verification.yml`

They use placeholder environment values so repository validation can run without real production credentials.

## Documentation Policy

- Keep root Markdown limited to `README.md`.
- Put project documentation in `docs/`.
- Remove outdated notes rather than preserving conflicting docs.
