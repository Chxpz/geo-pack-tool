# API Contract: Otterly.ai Operator Import

## POST /api/admin/import

Upload and process an Otterly CSV export.

**Auth**: Required. User must have role 'operator' or 'admin'.

### Request (multipart/form-data)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | yes | CSV file |
| business_id | uuid | yes | Target business |
| import_type | string | yes | otterly_prompts, otterly_citations, otterly_citations_summary, otterly_visibility, otterly_geo_audit |

### Response (200)
```json
{
  "import_id": "uuid",
  "status": "completed",
  "rows_processed": 245,
  "rows_inserted": 240,
  "rows_skipped": 5,
  "diff": {
    "new_citations": 18,
    "lost_citations": 3,
    "visibility_change": "+2.5%",
    "sentiment_shift": "+0.8 NSS"
  }
}
```

### Error Responses
- `400`: Invalid CSV schema — `{ "error": "schema_mismatch", "expected_columns": [...], "actual_columns": [...] }`
- `403`: User not operator/admin
- `404`: Business not found
- `422`: Processing error — `{ "error": "processing_failed", "row": 42, "detail": "Invalid date format" }`

---

## Expected CSV Schemas

### otterly_prompts (Search Prompts Export)
Required columns:
```
Search Prompt, Country, Tags, Intent Volume, 3-Month Growth,
Total Citations, Brand Mentioned (ChatGPT), Brand Mentioned (Perplexity),
Brand Mentioned (Copilot), Brand Mentioned (Google AIO),
Brand Mentioned (AI Mode), Brand Mentioned (Gemini),
Brand Mentioned (All Engines), Brand Rank,
Domain Cited (ChatGPT), Domain Cited (Perplexity),
Domain Cited (Copilot), Domain Cited (Google AIO),
Domain Cited (AI Mode), Domain Cited (Gemini),
Competitor Mentioned (ChatGPT), Competitor Mentioned (Perplexity),
Competitor Mentioned (Copilot), Competitor Mentioned (Google AIO),
Competitor Mentioned (AI Mode), Competitor Mentioned (Gemini),
Competitor Cited (ChatGPT), Competitor Cited (Perplexity),
Competitor Cited (Copilot), Competitor Cited (Google AIO),
Competitor Cited (AI Mode), Competitor Cited (Gemini)
```

### otterly_citations (Citation Links Full Export)
Required columns:
```
Prompt, Country, Service, Title, URL, Position, Date,
Domain, Domain Category, My Brand Mentioned, Competitors Mentioned
```

### otterly_citations_summary (Citation Links Summary Export)
Required columns:
```
Title, URL, Domain, Domain Category,
My Brand Mentioned, Competitors Mentioned
```

---

## GET /api/admin/imports

List import history.

**Auth**: Operator/admin only.

### Query Parameters
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| business_id | uuid | no | Filter by business |
| status | string | no | Filter by status |
| limit | integer | no | Default 20 |

### Response (200)
```json
{
  "data": [
    {
      "id": "uuid",
      "business_id": "uuid",
      "business_name": "Miami Luxury Realty",
      "import_type": "otterly_prompts",
      "file_name": "search-prompts-2026-04-01.csv",
      "row_count": 245,
      "status": "completed",
      "diff_summary": { "new_citations": 18, "lost_citations": 3 },
      "created_at": "2026-04-02T10:30:00Z"
    }
  ]
}
```

---

## GET /api/admin/tasks

List operator tasks.

**Auth**: Operator/admin only.

### Query Parameters
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | no | pending, in_progress, completed, failed |
| operator_id | uuid | no | Filter by assigned operator |
| overdue | boolean | no | Filter to overdue tasks only |

### Response (200)
```json
{
  "data": [
    {
      "id": "uuid",
      "business_id": "uuid",
      "business_name": "Miami Luxury Realty",
      "task_type": "otterly_export",
      "status": "pending",
      "operator_id": null,
      "due_date": "2026-04-04T00:00:00Z",
      "sla_status": "on_time",
      "created_at": "2026-04-02T00:00:00Z"
    }
  ]
}
```

## PATCH /api/admin/tasks/:id

Update task status.

### Request
```json
{
  "status": "in_progress",
  "operator_id": "uuid",
  "notes": "Starting Otterly export for this week"
}
```
