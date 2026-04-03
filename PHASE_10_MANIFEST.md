# Phase 10: AI Concierge Agent Implementation

## Overview
Complete implementation of AI Concierge Agent (T100-T110) for AgenticRev ICP Pivot. Enterprise-only feature providing expert GEO/AEO guidance through streaming chat, insights generation, and deep research.

## Files Created (11 total)

### 1. Backend Library: `lib/geo-agent.ts`
**Purpose**: RAG context builder and system prompt generation

**Exports**:
- `buildAgentContext(businessId: string): Promise<AgentContext>`
  - Queries 30-day mentions, latest SEO snapshot, brand visibility, citations (90d), geo audit, competitors
  - Returns structured context object ready for system prompt

- `buildSystemPrompt(context: AgentContext): string`
  - Creates comprehensive system prompt with role, guidelines, data snapshot
  - Includes disclaimers, citation requirements, response format expectations

- `queryWithWebSearch(question: string, businessContext: string): Promise<...>`
  - Calls Perplexity Sonar for competitive/market research
  - Returns answer with citations and related questions

**Data Flow**: Database → Aggregated Context → System Prompt → LLM

---

### 2-6. API Routes: `app/api/agent/*`

#### 2. `chat/route.ts` - POST /api/agent/chat (T102)
**Authentication**: Auth required, Enterprise plan only
**Streaming**: SSE (text_delta, citation, done events)

**Request Body**:
```json
{
  "business_id": "string",
  "conversation_id": "string?",
  "message": "string"
}
```

**Response**: NextResponse with ReadableStream (SSE)
- Creates new conversation if conversation_id not provided
- Builds RAG context for business
- Streams OpenAI (gpt-4o default) response character-by-character
- Persists messages to agent_conversations table

**Events**:
- `event: text_delta` - streaming content chunks
- `event: citation` - source citations
- `event: done` - completion signal

---

#### 3. `conversations/route.ts` - GET /api/agent/conversations (T104)
**Parameters**: `business_id`, `page` (default 1), `per_page` (default 10)
**Returns**: Paginated conversation previews

**Response**:
```json
{
  "conversations": [
    {
      "id": "conv_xxx",
      "title": "First user message (60 chars)...",
      "lastMessage": {
        "role": "user|assistant",
        "content": "Last message (100 chars)",
        "timestamp": "ISO8601"
      },
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

#### 4. `insights/route.ts` - POST /api/agent/insights (T105)
**Authentication**: Enterprise plan only
**Types**: `weekly_summary` | `competitive_alert` | `recommendation`

**Request**:
```json
{
  "business_id": "string",
  "type": "weekly_summary|competitive_alert|recommendation"
}
```

**Response**:
```json
{
  "id": "insight_xxx",
  "type": "weekly_summary",
  "title": "string",
  "summary": "string",
  "findings": ["string"],
  "recommendations": [
    {
      "action": "string",
      "priority": "high|medium|low",
      "effort": "quick_win|medium|strategic"
    }
  ],
  "dataSourceRefs": ["string"],
  "generatedAt": "ISO8601"
}
```

---

#### 5. `deep-research/route.ts` - POST /api/agent/deep-research (T106)
**Status**: Returns 202 Accepted (async)

**Request**:
```json
{
  "business_id": "string",
  "topic": "string",
  "context": "string?"
}
```

**Response** (202):
```json
{
  "research_id": "research_xxx",
  "status": "submitted",
  "topic": "string",
  "submittedAt": "ISO8601",
  "pollUrl": "/api/agent/deep-research/research_xxx"
}
```

**Processing**: Non-blocking. Calls Perplexity sonar-deep-research async, stores result in deep_research_results table.

---

#### 6. `deep-research/[id]/route.ts` - GET /api/agent/deep-research/[id] (T106)
**Purpose**: Poll research status by ID

**Response**:
```json
{
  "research_id": "research_xxx",
  "status": "submitted|processing|completed|failed",
  "topic": "string",
  "result": { ... },  // when status === 'completed'
  "error": "string",  // when status === 'failed'
  "updatedAt": "ISO8601"
}
```

---

### 7-8. React Components: `components/agent/*`

#### 7. `ChatWidget.tsx` (T107)
**Props**:
```tsx
interface ChatWidgetProps {
  businessId: string;
  conversationId?: string;
  mode?: 'compact' | 'full';
  onConversationChange?: (id: string) => void;
}
```

**Features**:
- Scrollable message list (user left, assistant right)
- Real-time streaming display with character-by-character animation
- Citation links clickable in responses
- Typing indicator (bouncing dots)
- Conversation selector (5 most recent)
- Auto-scroll to latest message
- Full mode (600px tall, full UI) vs compact mode (384px, mini footer)
- SSE stream handling with event parsing

**Styling**:
- User messages: gray-200 background
- Assistant messages: blue-50 with blue-100 border
- Responsive to container width

---

#### 8. `InsightCard.tsx` (T108)
**Props**:
```tsx
interface InsightCardProps {
  type: 'weekly_summary' | 'competitive_alert' | 'recommendation';
  title: string;
  summary: string;
  findings: string[];
  recommendations: Recommendation[];
  dataSourceRefs?: string[];
  generatedAt?: string;
  compact?: boolean;
}
```

**Modes**:
- **Full**: Header with icon + badge, findings section, recommendations with priority/effort badges, footer with sources and date
- **Compact**: Inline card with icon, title, summary, and priority badge

**Type Styling**:
- weekly_summary: 📊 blue (blue-50, blue-100)
- competitive_alert: ⚡ orange (orange-50, orange-100)
- recommendation: 💡 green (green-50, green-100)

**Priority Badges**:
- HIGH: red-100 text-red-800
- MEDIUM: yellow-100 text-yellow-800
- LOW: gray-100 text-gray-800

**Effort Tags**:
- Quick Win: green-600
- Medium Effort: blue-600
- Strategic: purple-600

---

### 9. Page: `app/agent/page.tsx` (T109)
**Title**: AI Concierge | AgenticRev

**Layout** (3-column on large screens):

1. **Left Sidebar** (lg:col-span-1)
   - Conversation history
   - New Chat button
   - List of 5 recent conversations

2. **Center** (lg:col-span-1)
   - Full ChatWidget in full mode
   - Title: "AI Concierge"
   - Subtitle: "Expert GEO/AEO guidance for your business"
   - Enterprise badge

3. **Right Panel** (lg:col-span-1)
   - Latest Insights section
   - Generate buttons: Weekly Summary, Competitive Alert, Recommendation
   - Sample InsightCard
   - "View all" link to insights page

**Features**:
- Enterprise plan gate with upgrade CTA
- Business selector (shows all user's businesses if >1)
- Deep Research form at bottom (responsive)
- Grid layout responsive to mobile (stacks to 1 column)

---

### 10. Dashboard Widget: `components/dashboard/ConciergeWidget.tsx` (T110)
**Purpose**: Embedded on dashboard for quick access

**Sections**:
1. **Quick Questions**
   - ChatWidget in compact mode (no footer link)
   
2. **Recent Insights**
   - 3 quick-generate buttons: Summary, Competitive, Action
   - Shows 2 most recent insights as InsightCards (compact mode)
   - "View all" link to /agent

3. **Footer CTA**
   - "Open Full Concierge →" link to /agent page

**Responsive**: Stacks nicely on mobile, grid layout on desktop.

---

## Database Schema Requirements

### Tables Used/Required:

**Existing Tables** (read-only in agent):
- `businesses` (id, business_name, business_type, address_*, website_url)
- `ai_mentions` (business_id, query, platform_id, mentioned, sentiment, position, scanned_at)
- `seo_snapshots` (business_id, domain_authority_rank, organic_traffic, ai_overview_keywords_present, maps_avg_rank, top_keywords)
- `brand_visibility` (business_id, share_of_voice, coverage_rate, mention_count, sentiment_*)
- `citations` (business_id, cited_url, cited_domain, cited_title, is_own_domain, is_competitor_domain, created_at)
- `geo_audits` (business_id, overall_score, strengths, weaknesses, opportunities)
- `competitors` (business_id, competitor_name)
- `subscriptions` (user_id, plan, concierge_access)

**New Tables to Create**:
```sql
-- Agent conversations
CREATE TABLE agent_conversations (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES businesses(id),
  user_id text NOT NULL REFERENCES users(id),
  messages jsonb NOT NULL DEFAULT '[]',
  context_snapshot jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  INDEX (business_id),
  INDEX (user_id),
  INDEX (created_at)
);

-- Deep research results
CREATE TABLE deep_research_results (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES businesses(id),
  user_id text NOT NULL REFERENCES users(id),
  topic text NOT NULL,
  status text NOT NULL, -- submitted|processing|completed|failed
  response jsonb,
  error text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  INDEX (business_id),
  INDEX (user_id),
  INDEX (status)
);
```

---

## Authentication & Authorization

**All endpoints require**:
1. `auth()` session check (401 if missing)
2. Business ownership verification (404 if not owned by user)
3. Plan feature gate: Enterprise plan required for all agent features

**Plan Gating**:
- Concierge access: Enterprise plan only (checked via `canAccessFeature()`)
- Other plans: Show upgrade CTA

---

## Environment Variables

```bash
# OpenAI API (for agent chat)
OPENAI_API_KEY=sk-...
AGENT_MODEL=gpt-4o  # default

# Perplexity (for web search in deep research)
PERPLEXITY_SONAR_API_KEY=pplx-...

# Supabase (existing)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Rate Limiting

- Agent chat: 20 requests/hour per user (enforced via subscription plan)
- Deep research: No explicit limit in code (use Perplexity rate limits)
- Insights generation: No explicit limit (use OpenAI rate limits)

---

## Key Design Decisions

1. **Streaming SSE**: Character-by-character streaming for responsive UX
2. **Async Deep Research**: Returns 202 with polling endpoint to avoid timeout
3. **RAG Context**: Multi-table query assembled at request time for freshness
4. **Plan Gating**: All agent features Enterprise-only
5. **Component Modes**: Single components with compact/full modes for reusability
6. **Message Persistence**: Full conversation history in JSON array
7. **Error Handling**: Graceful fallbacks with user-friendly error messages

---

## Testing Checklist

- [ ] Create agent_conversations and deep_research_results tables
- [ ] Test chat endpoint with streaming
- [ ] Test conversations list pagination
- [ ] Test insights generation (3 types)
- [ ] Test deep research submission and polling
- [ ] Test plan gating (non-Enterprise gets 403)
- [ ] Test ChatWidget SSE parsing
- [ ] Test InsightCard rendering (compact/full)
- [ ] Test /agent page with multiple businesses
- [ ] Test ConciergeWidget on dashboard
- [ ] Verify conversation history persists
- [ ] Verify citations display correctly
- [ ] Test responsive layouts on mobile

---

## Next Steps (Future Phases)

- Insights persistence table + historical insights view
- Conversation sharing/export
- Custom system prompt templates
- Agent performance analytics
- Batch insight generation (daily/weekly schedule)
- Mobile app native integration
- Slack/Teams integration for agent
