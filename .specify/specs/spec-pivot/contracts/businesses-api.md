# API Contract: Businesses & Competitors

## POST /api/businesses

Create a new business.

**Auth**: Required.
**Plan gate**: Enforces max businesses per plan.

### Request
```json
{
  "business_name": "Miami Luxury Realty",
  "business_type": "realtor",
  "business_category": "Luxury residential",
  "website_url": "https://miamiluxuryrealty.com",
  "phone": "+1-305-555-0100",
  "address_street": "123 Brickell Ave",
  "address_city": "Miami",
  "address_state": "FL",
  "address_zip": "33131",
  "address_country": "US",
  "google_business_profile_url": "https://g.co/...",
  "social_profiles": { "zillow": "https://...", "instagram": "https://..." },
  "service_areas": ["Miami", "Coral Gables", "Coconut Grove", "Brickell"],
  "description": "Luxury residential real estate in Miami-Dade County"
}
```

### Response (201)
```json
{
  "id": "uuid",
  "business_name": "Miami Luxury Realty",
  "business_type": "realtor",
  // ... all fields
  "created_at": "2026-04-02T00:00:00Z"
}
```

### Error Responses
- `403`: Business limit reached — `{ "error": "business_limit", "current": 1, "max": 1, "upgrade_to": "business" }`
- `422`: Validation error — `{ "errors": [{"field": "business_name", "message": "min 2 characters"}] }`

---

## GET /api/businesses

List all businesses for authenticated user.

### Response (200)
```json
{
  "data": [
    { "id": "uuid", "business_name": "Miami Luxury Realty", "business_type": "realtor", "website_url": "https://...", "created_at": "..." }
  ]
}
```

---

## GET /api/businesses/:id

Get business with latest summary metrics.

### Response (200)
```json
{
  "id": "uuid",
  "business_name": "Miami Luxury Realty",
  // ... all fields
  "summary": {
    "visibility_score": 62,
    "total_mentions": 45,
    "total_citations": 128,
    "authority_score": 45,
    "competitors_count": 3,
    "active_queries_count": 25,
    "last_scan": "2026-04-02T03:00:00Z"
  }
}
```

---

## PATCH /api/businesses/:id

Update business details.

---

## DELETE /api/businesses/:id

Soft delete (sets deleted_at). Cascades: deactivates queries, stops scans.

---

## POST /api/competitors

Add a competitor.

**Auth**: Required.
**Plan gate**: Enforces max competitors per business per plan.

### Request
```json
{
  "business_id": "uuid",
  "competitor_name": "Jane Smith Realty",
  "website_url": "https://janesmithrealty.com",
  "google_business_profile_url": "https://g.co/..."
}
```

### Response (201)
```json
{ "id": "uuid", "competitor_name": "Jane Smith Realty", "website_url": "https://...", "created_at": "..." }
```

---

## POST /api/competitors/suggest

AI-generated competitor suggestions.

### Request
```json
{
  "business_id": "uuid"
}
```

### Response (200)
```json
{
  "suggestions": [
    { "name": "Jane Smith Realty", "reason": "Top-ranked realtor in Coral Gables per ChatGPT" },
    { "name": "Elite Miami Properties", "reason": "Dominates 'luxury homes Miami' queries on Perplexity" }
  ]
}
```

---

## POST /api/queries/generate

Auto-generate tracked queries for a business.

### Request
```json
{
  "business_id": "uuid",
  "count": 20  // optional, default per plan limit
}
```

### Response (200)
```json
{
  "queries": [
    { "id": "uuid", "query_text": "best realtor in Coral Gables", "intent_category": "discovery", "query_type": "system_generated" },
    { "id": "uuid", "query_text": "who should I hire to sell my home in Miami", "intent_category": "service_specific", "query_type": "system_generated" }
  ],
  "total_generated": 20
}
```

---

## GET /api/citations

Retrieve citations for a business.

### Query Parameters
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| business_id | uuid | yes | Target business |
| domain_filter | string | no | own, competitor, third_party, all (default: all) |
| platform_id | uuid | no | Filter by platform |
| source | string | no | llm_scan, perplexity_sonar, otterly_import |
| date_from | ISO date | no | Start date |
| date_to | ISO date | no | End date |
| limit | integer | no | Default 50 |

### Response (200)
```json
{
  "data": [
    {
      "id": "uuid",
      "cited_url": "https://miamiluxuryrealty.com/coral-gables",
      "cited_domain": "miamiluxuryrealty.com",
      "cited_title": "Coral Gables Real Estate Guide",
      "platform": { "name": "Perplexity", "slug": "perplexity" },
      "position": 2,
      "domain_category": "brand",
      "is_own_domain": true,
      "source": "perplexity_sonar",
      "scan_date": "2026-04-02T03:00:00Z"
    }
  ],
  "summary": {
    "total_citations": 128,
    "own_domain": 34,
    "competitor_domains": 52,
    "third_party": 42
  }
}
```

---

## GET /api/visibility/score

Get computed AI Visibility Score.

### Query Parameters
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| business_id | uuid | yes | Target business |

### Response (200)
```json
{
  "score": 62,
  "components": {
    "mention_rate": { "value": 0.45, "weight": 0.4, "contribution": 18 },
    "avg_position": { "value": 2.8, "normalized": 0.72, "weight": 0.2, "contribution": 14.4 },
    "sentiment": { "value": 0.68, "weight": 0.2, "contribution": 13.6 },
    "own_citation_rate": { "value": 0.80, "weight": 0.2, "contribution": 16 }
  },
  "trend": "+5",
  "trend_period": "7d"
}
```
