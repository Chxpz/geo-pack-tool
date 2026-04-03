# API Contract: SEMrush Integration

## POST /api/seo/snapshot

Trigger a full SEMrush data pull for a business.

**Auth**: Required. Business must belong to authenticated user.
**Plan gate**: Free (domain overview only), Pro+ (full suite).

### Request
```json
{
  "business_id": "uuid",
  "endpoints": ["domain_overview", "domain_organic", "backlinks_overview", "keyword_overview", "position_tracking", "site_audit", "trends", "map_rank", "listing_management"]  // optional — default per plan
}
```

### Response (202 Accepted)
```json
{
  "snapshot_id": "uuid",
  "status": "queued",
  "endpoints_requested": ["domain_overview", "domain_organic", "backlinks_overview"],
  "estimated_units": 150
}
```

---

## GET /api/seo/snapshots

Retrieve SEO snapshots for a business.

**Auth**: Required. RLS-scoped.

### Query Parameters
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| business_id | uuid | yes | Target business |
| date_from | ISO date | no | Start date |
| date_to | ISO date | no | End date |
| limit | integer | no | Default 10 |

### Response (200)
```json
{
  "data": [
    {
      "id": "uuid",
      "business_id": "uuid",
      "authority_score": 45,
      "organic_keywords_count": 1250,
      "organic_traffic": 8500,
      "organic_traffic_cost": 12400.00,
      "ai_overview_keywords_total": 85,
      "ai_overview_keywords_present": 12,
      "ai_traffic_assistants": 340,
      "ai_traffic_search": 890,
      "maps_avg_rank": 4.2,
      "maps_share_of_voice": 0.15,
      "schema_types_found": ["LocalBusiness", "FAQPage", "BreadcrumbList"],
      "schema_markup_score": 78.5,
      "site_health_score": 82.0,
      "top_keywords": [
        { "keyword": "best realtor miami", "position": 5, "volume": 2400, "traffic_pct": 3.2, "ai_overview_present": true }
      ],
      "traffic_sources": {
        "direct": 2100, "referral": 850, "organic": 3400, "paid": 0,
        "social": 650, "email": 200, "display": 0,
        "ai_assistants": 340, "ai_search": 890
      },
      "snapshot_date": "2026-04-02"
    }
  ],
  "total": 12
}
```

---

## GET /api/seo/keywords

Retrieve keyword data for a business.

### Query Parameters
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| business_id | uuid | yes | Target business |
| sort_by | string | no | position, volume, traffic_pct, kd (default: traffic_pct desc) |
| ai_overview_only | boolean | no | Filter to keywords appearing in AI Overviews (FP52) |
| limit | integer | no | Default 50, max 200 |

### Response (200)
```json
{
  "data": [
    {
      "keyword": "best realtor coral gables",
      "position": 3,
      "previous_position": 5,
      "volume": 1800,
      "traffic_pct": 4.1,
      "keyword_difficulty": 42,
      "cpc": 8.50,
      "ai_overview_present": true,
      "serp_features": ["local_pack", "ai_overview", "faq"],
      "ranking_url": "https://example.com/coral-gables"
    }
  ]
}
```

---

## Cron: /api/cron/seo-refresh

Weekly SEMrush data refresh for all active businesses with websites.

**Auth**: CRON_SECRET header.
**Schedule**: Weekly (configurable, default Sunday 2am UTC).

### Behavior
1. Query all businesses where website_url IS NOT NULL and subscription is active
2. For each business, trigger SEMrush data pull based on plan tier
3. Store results in seo_snapshots
4. Log unit consumption
5. Skip businesses that already have a snapshot from the current week
