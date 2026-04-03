# API Contract: AI Visibility Scanner

## POST /api/scan/trigger

Triggers an AI scan for a business across all 4 LLM platforms.

**Auth**: Required (JWT). Business must belong to authenticated user.
**Plan gate**: Free (weekly max), Pro+ (daily).

### Request
```json
{
  "business_id": "uuid",
  "query_ids": ["uuid", "uuid"],  // optional — if omitted, scans all active queries
  "platforms": ["chatgpt", "perplexity", "gemini", "claude"]  // optional — default all 4
}
```

### Response (202 Accepted)
```json
{
  "scan_id": "uuid",
  "status": "queued",
  "business_id": "uuid",
  "queries_count": 10,
  "platforms_count": 4,
  "estimated_duration_seconds": 120
}
```

### Error Responses
- `403`: Plan limit reached (weekly/daily cap) — `{ "error": "scan_limit_reached", "upgrade_to": "pro" }`
- `404`: Business not found or not owned by user
- `429`: Rate limited

---

## GET /api/scan/status/:scan_id

Poll scan progress.

### Response (200)
```json
{
  "scan_id": "uuid",
  "status": "in_progress",  // queued | in_progress | completed | partial | failed
  "progress": {
    "total_queries": 10,
    "completed_queries": 6,
    "platforms_completed": ["chatgpt", "gemini"],
    "platforms_in_progress": ["perplexity"],
    "platforms_failed": ["claude"]
  }
}
```

---

## GET /api/mentions

Retrieve AI mentions for a business.

**Auth**: Required. RLS-scoped.

### Query Parameters
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| business_id | uuid | yes | Target business |
| platform_id | uuid | no | Filter by platform |
| query_id | uuid | no | Filter by query |
| mentioned | boolean | no | Filter mentioned/not mentioned |
| date_from | ISO date | no | Start date filter |
| date_to | ISO date | no | End date filter |
| limit | integer | no | Default 50, max 200 |
| offset | integer | no | Pagination offset |

### Response (200)
```json
{
  "data": [
    {
      "id": "uuid",
      "business_id": "uuid",
      "query_text": "best realtor in Miami",
      "platform": { "id": "uuid", "name": "ChatGPT", "slug": "chatgpt" },
      "mentioned": true,
      "position": 2,
      "sentiment": "positive",
      "context": "When looking for a realtor in Miami...",
      "competitors_mentioned": [
        { "competitor_id": "uuid", "name": "Jane Smith Realty", "position": 1, "sentiment": "positive" }
      ],
      "domain_cited": true,
      "source": "llm_scan",
      "scan_date": "2026-04-02T03:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```
