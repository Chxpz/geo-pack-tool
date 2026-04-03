# API Contract: AI Concierge Agent

## POST /api/agent/chat

Send a message to the AI Concierge and receive a streaming response.

**Auth**: Required. User must be on Enterprise plan.
**Rate limit**: 20 messages per hour per user.

### Request
```json
{
  "business_id": "uuid",
  "conversation_id": "uuid",  // optional — null to start new conversation
  "message": "Why did my visibility drop this week?"
}
```

### Response (200 — Server-Sent Events stream)
```
data: {"type": "text_delta", "content": "Looking at your "}
data: {"type": "text_delta", "content": "scan results from this week..."}
data: {"type": "citation", "source": "ai_mentions", "id": "uuid", "summary": "ChatGPT scan on April 1"}
data: {"type": "text_delta", "content": "\n\nYour visibility on ChatGPT dropped..."}
data: {"type": "done", "conversation_id": "uuid", "message_id": "uuid"}
```

### Error Responses
- `403`: Not on Enterprise plan — `{ "error": "plan_required", "required_plan": "enterprise" }`
- `404`: Business not found
- `429`: Rate limited

---

## GET /api/agent/conversations

List conversations for a business.

**Auth**: Required. Enterprise plan.

### Query Parameters
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| business_id | uuid | yes | Target business |
| limit | integer | no | Default 20 |

### Response (200)
```json
{
  "data": [
    {
      "id": "uuid",
      "business_id": "uuid",
      "message_count": 12,
      "last_message_preview": "Your schema markup is missing...",
      "created_at": "2026-04-01T14:30:00Z",
      "updated_at": "2026-04-01T15:45:00Z"
    }
  ]
}
```

---

## POST /api/agent/insights

Generate AI-driven insights for a business (scheduled or on-demand).

**Auth**: Required. Enterprise plan. Also callable from cron.

### Request
```json
{
  "business_id": "uuid",
  "insight_type": "weekly_summary"  // weekly_summary | competitive_alert | recommendation
}
```

### Response (200)
```json
{
  "insight": {
    "type": "weekly_summary",
    "title": "Week of March 25 – April 1",
    "summary": "Your AI visibility improved 8% this week...",
    "key_findings": [
      {
        "finding": "ChatGPT now mentions you for 'best realtor Coral Gables'",
        "impact": "positive",
        "data_source": "ai_mentions"
      }
    ],
    "recommendations": [
      {
        "action": "Add FAQPage schema to your neighborhood guides",
        "priority": "high",
        "expected_impact": "Improve AI Overview presence for FAQ-type queries"
      }
    ]
  }
}
```

---

## POST /api/agent/deep-research

Trigger a Perplexity Deep Research report (async).

**Auth**: Required. Enterprise plan only.

### Request
```json
{
  "business_id": "uuid",
  "research_topic": "competitive analysis of top 5 realtors in Coral Gables"
}
```

### Response (202 Accepted)
```json
{
  "research_id": "uuid",
  "status": "submitted",
  "estimated_wait_seconds": 180
}
```

### GET /api/agent/deep-research/:id (Poll)
```json
{
  "research_id": "uuid",
  "status": "completed",  // submitted | processing | completed | failed
  "result": {
    "content": "## Competitive Analysis: Top Realtors in Coral Gables\n\n...",
    "citations": [...],
    "search_results": [...]
  }
}
```
