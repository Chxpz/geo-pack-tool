# API Reference

This file documents the live API surface in `app/api/`.

## Public and Session/Auth Routes

| Method/Path | Purpose |
| --- | --- |
| `GET/POST /api/auth/[...nextauth]` | NextAuth session endpoints |
| `POST /api/auth/signup` | Create account and seed free subscription |
| `POST /api/auth/forgot-password` | Start password reset flow |
| `POST /api/auth/reset-password` | Complete password reset |
| `POST /api/auth/send-verification` | Send verification email |
| `GET /api/auth/verify-email` | Verify email token |
| `GET /api/health` | Basic app and Supabase connectivity check |
| `POST /api/webhooks/stripe` | Stripe webhook receiver |

## Authenticated Product Routes

### Business and competitor data

| Method/Path | Purpose |
| --- | --- |
| `GET/POST /api/businesses` | List or create businesses |
| `GET/PATCH/DELETE /api/businesses/[id]` | Manage one business |
| `GET/POST/DELETE /api/competitors` | List, create, or delete competitors |
| `POST /api/competitors/suggest` | AI-assisted competitor suggestions |

### Queries and scanning

| Method/Path | Purpose |
| --- | --- |
| `GET/POST/PATCH /api/queries` | List, create, or update tracked queries |
| `POST /api/queries/generate` | Generate tracked queries for a business |
| `POST /api/scan/trigger` | Start a persisted scan for one business |
| `GET /api/scan/status/[id]` | Poll one persisted `scan_runs` record |
| `POST /api/scanner/trigger` | Trigger scan execution across the user's businesses |

### Dashboard and visibility

| Method/Path | Purpose |
| --- | --- |
| `GET /api/dashboard/stats` | Dashboard aggregate metrics |
| `GET /api/visibility/score` | Visibility score endpoint |
| `GET /api/mentions` | Mention data |
| `GET /api/citations` | Citation list data |

### SEO and GEO

| Method/Path | Purpose |
| --- | --- |
| `GET/PATCH /api/geo-audit` | Read or update GEO audit data |
| `POST /api/seo/snapshot` | Trigger SEMrush snapshot pull |
| `GET /api/seo/snapshots` | List stored SEO snapshots |
| `GET /api/seo/keywords` | Query stored SEO keyword data |

### Reports

| Method/Path | Purpose |
| --- | --- |
| `GET /api/reports/list` | List saved reports |
| `POST /api/reports/generate` | Generate and save report HTML |
| `GET /api/reports/[id]/download` | Download report HTML |

### Billing

| Method/Path | Purpose |
| --- | --- |
| `POST /api/billing/checkout` | Create Stripe checkout session |
| `POST /api/billing/portal` | Open Stripe customer portal |

### AI concierge

| Method/Path | Purpose |
| --- | --- |
| `POST /api/agent/chat` | Concierge chat requests |
| `GET /api/agent/conversations` | List conversation previews |
| `POST /api/agent/insights` | Insight generation |
| `POST /api/agent/deep-research` | Submit deep research job |
| `GET /api/agent/deep-research/[id]` | Poll deep research result |

## Admin Routes

| Method/Path | Purpose |
| --- | --- |
| `POST /api/admin/import` | Upload and process operator imports |
| `GET /api/admin/imports` | List imports |
| `GET /api/admin/tasks` | List operator tasks |
| `GET/PATCH /api/admin/tasks/[id]` | Read or update one operator task |

## Cron Routes

All cron routes expect `Authorization: Bearer ${CRON_SECRET}`.

| Method/Path | Purpose |
| --- | --- |
| `GET /api/cron/scanner` | Scheduled scan execution |
| `GET /api/cron/seo-refresh` | Scheduled SEO refresh |
| `GET /api/cron/weekly-digest` | Weekly email digest |
| `GET /api/cron/data-retention` | Data retention cleanup |
