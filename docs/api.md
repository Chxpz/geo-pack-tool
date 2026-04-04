# API Reference

All routes live under `app/api/`.

## Public Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth session endpoints |
| POST | `/api/auth/signup` | Create account, seed free subscription |
| POST | `/api/auth/forgot-password` | Start password reset flow |
| POST | `/api/auth/reset-password` | Complete password reset |
| POST | `/api/auth/send-verification` | Resend verification email |
| GET | `/api/auth/verify-email` | Verify email token |
| GET | `/api/health` | App and Supabase connectivity check |
| POST | `/api/webhooks/stripe` | Stripe webhook receiver |

## Business and Competitors

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/businesses` | List or create businesses |
| GET/PATCH/DELETE | `/api/businesses/[id]` | Manage one business |
| GET/POST/DELETE | `/api/competitors` | List, create, or delete competitors |
| POST | `/api/competitors/suggest` | AI-assisted competitor suggestions |

## Queries and Scanning

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PATCH | `/api/queries` | List, create, or update tracked queries |
| POST | `/api/queries/generate` | Generate tracked queries for a business |
| POST | `/api/scan/trigger` | Start a persisted scan for one business |
| GET | `/api/scan/status/[id]` | Poll one `scan_runs` record |
| POST | `/api/scanner/trigger` | Trigger scan across user's businesses |

## Dashboard and Visibility

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/dashboard/stats` | Dashboard aggregate metrics |
| GET | `/api/visibility/score` | Visibility score breakdown |
| GET | `/api/mentions` | Mention data |
| GET | `/api/citations` | Citation list |

## GEO Audit

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/geo-audit/trigger` | Trigger Stack3 Audit for a business (enforces monthly limit) |
| GET | `/api/geo-audit/status/[jobId]` | Poll audit progress, hydrate result on completion |
| GET | `/api/geo-audit` | List geo audits for a business |
| PATCH | `/api/geo-audit` | Update recommendation status on a geo audit |

**Trigger request:**
```json
{ "business_id": "uuid" }
```

**Trigger response (202):**
```json
{ "geo_audit_id": "uuid", "stack3_audit_id": "abc123" }
```

**Status response:**
```json
{ "status": "crawling" }
```

**Status response (complete):**
```json
{
  "status": "complete",
  "geo_audit": {
    "overall_score": 74,
    "verdict": "Strong",
    "dimension_scores": [...],
    "findings": [...],
    "action_plan": { "critical": [], "nearTerm": [], "strategic": [] },
    "recommendations": [...],
    "report_url": "https://..."
  }
}
```

## SEO

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/seo/snapshot` | Trigger SEMrush snapshot pull |
| GET | `/api/seo/snapshots` | List stored SEO snapshots |
| GET | `/api/seo/keywords` | Query stored keyword data |

## Reports

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/reports/list` | List saved reports |
| POST | `/api/reports/generate` | Generate and save report HTML |
| GET | `/api/reports/[id]/download` | Download report HTML |

## Billing

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/billing/checkout` | Create Stripe checkout session |
| POST | `/api/billing/portal` | Open Stripe customer portal |

## AI Concierge (Enterprise only)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/agent/chat` | Concierge chat with streaming |
| GET | `/api/agent/conversations` | List conversation previews |
| POST | `/api/agent/insights` | Generate insights |
| POST | `/api/agent/deep-research` | Submit deep research job |
| GET | `/api/agent/deep-research/[id]` | Poll deep research result |

## Admin (operator/admin role required)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/import` | Upload manual data import |
| GET | `/api/admin/imports` | List imports |
| GET | `/api/admin/tasks` | List operator tasks |
| GET/PATCH | `/api/admin/tasks/[id]` | Read or update one operator task |

## Cron (Bearer CRON_SECRET required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cron/scanner` | Scheduled scan execution |
| GET | `/api/cron/seo-refresh` | Scheduled SEO refresh |
| GET | `/api/cron/weekly-digest` | Weekly email digest |
| GET | `/api/cron/data-retention` | Data retention cleanup |
