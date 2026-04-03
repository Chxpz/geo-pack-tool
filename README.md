# AgenticRev

AgenticRev is a Next.js 16 application for monitoring business visibility across AI assistants and related search surfaces. The active product is centered on business onboarding, tracked queries, competitor monitoring, scan history, GEO audits, SEO snapshots, report generation, billing, and an enterprise-only AI concierge.

## Current Product Surface

- Email/password signup and login with verification, password reset, and NextAuth sessions
- Business-first onboarding with competitor setup and first-scan kickoff
- Dashboard metrics for AI visibility, citations, authority, share of voice, and tracked queries
- Query management and persisted scan history through `scan_runs`
- Competitor management and suggestion endpoints
- GEO audit display and SEO snapshot collection
- HTML report generation and download
- Stripe checkout, customer portal access, and plan gating
- Enterprise AI concierge chat, insights, and deep research endpoints
- Admin pages and task/import APIs

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- NextAuth v5
- Supabase/Postgres
- Stripe
- Resend

## Repo Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run ci
npm run verify:release
```

## Documentation

- [Docs Index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Deployment](docs/deployment.md)
- [API Reference](docs/api.md)

## Notes

- `deprecated/` contains archived legacy truth-engine code and is not part of the supported product flow.
- `/api/stores` and `/api/stores/[id]` remain in the codebase as legacy store-management endpoints. They are not part of the primary onboarding or navigation flow.
