# AgenticRev — Provider Data Appendix (Exhaustive)

> **Date:** April 2, 2026
> **Purpose:** Complete catalog of every data point, endpoint, and feature available from our three external providers. This is the reference for what we can pull into the platform.
> **Companion to:** `docs/PIVOT-PLAN.md`

---

## PROVIDER 1: SEMrush API — Complete Endpoint Catalog

### API Access Requirements

- **Plan required:** Business plan ($499.95/month) OR Semrush One Advanced ($549/month)
- **API units:** Purchased separately (~$50 per million units)
- **Authentication:** API Key (query parameter) or OAuth 2.0 (v4)
- **Rate limit:** 10 requests/second, 10 simultaneous requests
- **Caching policy:** Data cannot be cached >1 month without consent

---

### 1.1 — SEO API: Domain Reports

**Endpoint:** `https://api.semrush.com/?type=domain_organic&domain={domain}&database={db}`

**Response fields (all available via `export_columns`):**

| Column | Code | Description |
|---|---|---|
| Keyword/Phrase | Ph | The keyword the domain ranks for |
| Position | Po | Current organic position |
| Previous Position | Pp | Position in previous period |
| Position Date | Pd | Date of position measurement |
| Search Volume | Nq | Monthly search volume |
| CPC | Cp | Cost per click |
| Traffic % | Tr | Estimated traffic from this keyword |
| Traffic Cost | Tc | Dollar value of organic traffic |
| Competition | Co | Keyword competition level (0-1) |
| Number of Results | Nr | Total SERP results |
| Trends | Td | 12-month search volume trend |
| Page Title | Tt | Title of ranking page |
| SERP Features | Fl | SERP features present |
| Keyword Difficulty | Kd | Difficulty score (0-100) |
| URL | Ur | Specific URL ranking |
| **AI Overview - Total** | **FK52** | **Keywords triggering AI Overview for domain** |
| **AI Overview - Present** | **FP52** | **Keywords where domain appears IN the AI Overview** |

**Cost:** 10 units/line (live), 50 units/line (historical)
**Pagination:** `display_limit` (max 100,000), `display_offset`
**Sort options:** po, tg, tr, tc, nq, co, kd, cp (asc/desc)

**GEO relevance:** FK52 and FP52 are CRITICAL — they directly measure Google AI Overview visibility. This was MISSING from our original plan.

---

### 1.2 — SEO API: Overview Reports

**Endpoint:** `https://api.semrush.com/?type=domain_rank&domain={domain}&database={db}`

**Response fields:**

| Field | Description |
|---|---|
| Domain | Target domain |
| Rank | SEMrush domain rank |
| Organic Keywords | Total organic keyword count |
| Organic Traffic | Estimated monthly organic traffic |
| Organic Cost | Dollar value of organic traffic |
| Adwords Keywords | Paid keyword count |
| Adwords Traffic | Paid traffic estimate |
| Adwords Cost | Estimated ad spend |
| PLA Keywords | Product listing ad keywords |
| PLA Uniques | Unique PLA listings |

**Cost:** 1 unit per line

---

### 1.3 — SEO API: Keyword Reports

**Endpoint:** `https://api.semrush.com/?type=phrase_all&phrase={keyword}&database={db}`

**Response fields:**

| Field | Code | Description |
|---|---|---|
| Keyword | Ph | The keyword phrase |
| Search Volume | Nq | Monthly searches |
| CPC | Cp | Cost per click |
| Competition | Co | Competition level |
| Number of Results | Nr | SERP result count |
| Trends | Td | 12-month trend data |
| Keyword Difficulty | Kd | Difficulty score |
| Intent Signals | — | Search intent classification |
| Question Variants | — | FAQ/question form phrases |
| Related Keywords | — | Semantically related terms |

**Batch keyword overview available** — historical data for multiple keywords in a single call.

**GEO relevance:** Question variants feed directly into AI prompt optimization. Intent signals predict what AI search will surface.

---

### 1.4 — SEO API: URL Reports

**Endpoint:** `https://api.semrush.com/?type=url_organic&url={url}&database={db}`

**Response fields:**

| Field | Code | Description |
|---|---|---|
| Organic Keywords | Or | Keywords this URL ranks for |
| Organic Traffic | Ot | Traffic to this specific URL |
| Organic Cost | Oc | Traffic value for this URL |
| Ranking Keywords | — | Full keyword list per URL |
| Position per keyword | — | Position breakdown |
| SERP Features | — | Features this URL triggers |
| Device breakdown | — | Mobile vs. desktop |

**GEO relevance:** Track specific landing pages (e.g., neighborhood guides, service pages) for AI citation potential.

---

### 1.5 — SEO API: Backlinks

**Endpoints:**
- `/backlinks_overview` — Top-level metrics
- `/backlinks` — Full backlink list
- `/backlinks_refdomains` — Referring domains report

**Response fields:**

| Field | Description |
|---|---|
| Referring Domain | Source domain |
| Backlink URL | Source page URL |
| Target URL | Page being linked to |
| Anchor Text | Link text |
| Link Type | Dofollow / Nofollow |
| Authority Score | Source domain authority (0-100) |
| Domain Authority Rank | Overall domain ranking |
| Link Date | When link was created |
| Domain Category | Category of linking domain |
| IP Address | Referring IP |
| Authority Score Distribution | Breakdown by score range |

**GEO relevance:** Backlink authority directly influences whether AI platforms cite a source. Gap analysis vs. competitors reveals citation opportunities.

---

### 1.6 — Projects API: Position Tracking (CRITICAL — WAS UNDERREPRESENTED)

**Endpoint:** Project-based API (JSON format, not CSV)

**Capabilities:**
- Track keyword rankings across Google, Bing, Yahoo, Yandex
- **Device targeting:** Desktop, Mobile, Tablet
- **Location targeting:** Country, City, Region level
- **SERP Feature detection** with specific codes

**SERP Feature Code 52 — AI Overview:**
- `FK52` = Total keywords triggering AI Overview
- `FP52` = Keywords where your domain appears IN the AI Overview
- `serp_feature_filter: 536870912` = Exclude AI Overview rankings
- `serp_feature_filter: 536870914` = Exclude Local Pack AND AI Overview

**Other SERP Feature Codes (all trackable):**
- Featured Snippets
- Knowledge Panels
- Local Pack (Map Results)
- News Carousel
- Image Pack
- Video Results
- Direct Answer / Answer Box
- Review Stars
- Top Stories
- FAQ Rich Results
- Jobs Listing
- Shopping Results
- App Store Results

**Additional Position Tracking Fields:**
- Visibility Index (organic)
- Estimated traffic per keyword
- Ranking URL per keyword
- Up to 5 tags per keyword (for grouping)
- Competitor ranking comparison

**GEO relevance:** This is the single most important SEMrush endpoint for GEO. It directly measures whether a business appears in Google AI Overviews — the #1 metric for AEO. We were NOT using this in our original plan.

---

### 1.7 — Projects API: Site Audit (CRITICAL — WAS MISSING)

**Endpoint:** Project-based crawl API

**Schema Markup Detection (30+ types):**
- Organization
- **LocalBusiness** (critical for local GEO)
- **RealEstateAgent** (critical for realtor ICP)
- Product
- Review / Rating
- Article / NewsArticle / BlogPosting
- Event
- JobPosting
- **FAQPage** (critical for AEO — answer optimization)
- **HowTo** (critical for AEO)
- **QAPage** (critical for AEO)
- BreadcrumbList
- VideoObject
- Recipe
- 13+ additional types

**Structured Data Fields:**
- JSON-LD presence and validity
- Microdata presence
- Open Graph markup
- Twitter Card markup
- Valid structured data count
- Invalid/error count
- **Rich Results eligibility** (tells you if Google can show enhanced results)
- Markup Score (validity percentage)

**Technical SEO Issues Detected:**
- Crawlability errors (blocked pages, redirect chains)
- Meta tag issues (missing titles, duplicate descriptions)
- Duplicate content
- Broken links (internal and external)
- Core Web Vitals (LCP, FID, CLS)
- HTTPS/SSL issues
- Mobile usability problems
- Page speed issues
- Hreflang issues
- Canonical issues

**GEO relevance:** Site Audit validates that a business has the correct LocalBusiness/RealEstateAgent schema, FAQPage schema, and proper technical foundation for AI citation. This was COMPLETELY MISSING from our plan.

---

### 1.8 — Trends API: Traffic Analytics (CRITICAL — WAS MISSING)

**Endpoints:**
- Traffic Summary: `https://api.semrush.com/analytics/ta/api/v3/summary`
- Daily/Weekly Traffic Reports
- Geo Distribution Report
- Audience Demographics
- Traffic by Device

**Traffic Source Breakdown (ALL available channels):**

| Channel | Description |
|---|---|
| Direct | Direct URL entry |
| Referral | Referral traffic |
| Search Organic | Google/Bing organic |
| Search Paid | PPC traffic |
| Social Organic | Social media organic |
| Social Paid | Social media ads |
| Email | Email marketing |
| Display Ads | Display advertising |
| **AI Assistants** | **Traffic from ChatGPT, Claude, etc.** |
| **AI Search** | **Traffic from Google AI Overviews, Bing Copilot** |

**Audience Demographics:**
- Age groups: 18-24, 25-34, 35-44, 45-54, 55-64, 65+
- Gender breakdown
- Income level distribution
- Geo distribution (country/region)
- Device split (desktop/mobile/tablet)

**Engagement Metrics:**
- Unique visitors
- Total visits
- Bounce rate
- Pages per visit
- Average session duration
- Conversion rate

**Competitor Traffic Comparison:**
- Top 5 competitors' traffic side-by-side
- Source breakdown per competitor
- Audience overlap analysis

**Cost:** 1 unit per request (Trends API)
**Plan required:** Trends Premium API for full dataset

**GEO relevance:** The AI Assistants and AI Search traffic channels are GAME-CHANGING for our product. We can show businesses exactly how much traffic they get from ChatGPT, Perplexity, etc. This was COMPLETELY MISSING from our plan.

---

### 1.9 — Local API: Map Rank Tracker (CRITICAL — WAS MISSING)

**Endpoint:** `https://developer.semrush.com/api/v4/map-rank-tracker-2/`

**Data Available:**
- Google Maps keyword rankings
- **Average Rank** (aggregated across data points)
- **Share of Voice** (weighted rank metric)
- **Rank Distribution:**
  - Good (positions 1-3)
  - Average (positions 4-10)
  - Poor (positions 11-20)
  - Out of Top 20
- Competitor map rankings
- Location-based heatmaps
- Ranking trends over time

**Cost:** FREE — no API units required
**Plan required:** Available to all SEMrush users

**GEO relevance:** For local businesses and realtors, Google Maps ranking is foundational. AI assistants often cite businesses that dominate the local pack. This was MISSING from our plan.

---

### 1.10 — Local API: Listing Management

**Endpoint:** `https://developer.semrush.com/api/v4/listing-management/`

**Capabilities:**
- Push business data to 70+ directories (US), 40+ (international)
- **Voice search distribution:** Amazon Alexa, Apple Siri, Google Assistant, Bing
- Bulk updates (up to 50 locations per request)

**Updateable Fields:**
- Location Name
- Address (full)
- Phone Number
- Website URL
- Working Hours (daily)
- Holiday Hours
- Temporary Closure / Reopen Date

**Endpoints:**
- `GetLocations` — Retrieve all managed locations with IDs
- `UpdateLocations` — Push updates across directories

**Rate limits:** 5 updates/sec, 10 reads/sec
**Cost:** No API units consumed (included in SEMrush Local Pro)
**Plan required:** SEMrush Local Pro

**GEO relevance:** NAP consistency across directories is foundational for local AI citations. Voice assistant distribution ensures business data reaches Alexa, Siri, Google Assistant.

---

### 1.11 — Organic Traffic Insights (Integration)

**Available via Google Analytics + GSC + SEMrush fusion:**
- Click-through rate per keyword
- Sessions and volume per landing page
- Organic keywords from GSC + SEMrush combined
- Goal completions/conversions
- Bounce rate/engagement per page
- New vs. returning users
- Top 50 landing pages by traffic
- Conversion value attribution

**GEO relevance:** Ties AI visibility improvements to actual business conversions.

---

## PROVIDER 2: Perplexity Sonar API — Complete Feature Catalog

### API Access

- **Base URL:** `https://api.perplexity.ai/chat/completions`
- **Auth:** Bearer token (Authorization header)
- **Format:** OpenAI-compatible (can use OpenAI client libraries)
- **Rate limits:** Tier-based (RPM, TPD)

---

### 2.1 — Available Models

| Model | Context Window | Best For | Input Cost | Output Cost |
|---|---|---|---|---|
| `sonar` | 128k tokens | Fast, lightweight queries | $1/1M tokens | $1/1M tokens |
| `sonar-pro` | 200k tokens | Deep analysis, 2x citations | $3/1M tokens | $15/1M tokens |
| `sonar-reasoning` | 128k tokens | Complex analytical tasks | (varies) | (varies) |
| `sonar-reasoning-pro` | 128k tokens | Premium reasoning | (varies) | (varies) |
| `sonar-deep-research` | 128k tokens | Multi-step research reports | $2/1M tokens | $8/1M tokens |

**Additional costs:**
- Search queries: $5 per 1,000 requests
- Deep Research reasoning tokens: $3/1M
- **Citation tokens: NO LONGER BILLED** for sonar and sonar-pro

---

### 2.2 — Request Parameters (Complete)

#### Core Parameters
| Parameter | Type | Description |
|---|---|---|
| `model` | string (required) | Model to use |
| `messages` | array (required) | Message history [{role, content}] |
| `stream` | boolean | Enable streaming (default: false) |
| `temperature` | float (0-2) | Randomness control |
| `top_p` | float (0-1) | Nucleus sampling |
| `frequency_penalty` | float | Reduce repetition |
| `presence_penalty` | float | Encourage new topics |
| `max_tokens` | integer | Max completion tokens |

#### Web Search Configuration
| Parameter | Type | Description |
|---|---|---|
| `web_search_options.search_context_size` | string | `"low"` / `"medium"` / `"high"` — search depth |
| `web_search_options.search_type` | string | `"auto"` / `"pro"` / `"fast"` — routing mode |

#### Domain Filtering (CRITICAL FOR GEO)
| Parameter | Type | Description |
|---|---|---|
| `search_domain_filter` | array (max 20) | Include domains: `["domain.com"]` OR exclude: `["-domain.com"]` |

- Allowlist mode: only search specified domains
- Denylist mode: exclude specified domains
- **Cannot mix** allowlist and denylist in same request
- Partial domain matching supported

#### Recency Filtering
| Parameter | Type | Description |
|---|---|---|
| `search_recency_filter` | string | `"hour"` / `"day"` / `"week"` / `"month"` / `"year"` |

#### Response Customization
| Parameter | Type | Description |
|---|---|---|
| `return_citations` | boolean | Include source citations (default: enabled) |
| `return_images` | boolean | Include images (Tier-2+ only) |
| `return_related_questions` | boolean | Include follow-up questions |
| `response_format` | object | JSON Schema for structured outputs |

---

### 2.3 — Response Structure (Complete)

#### Main Response
```
{
  "id": "string",
  "model": "string",
  "created": timestamp,
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "string"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": int,
    "completion_tokens": int,
    "total_tokens": int
  },
  "citations": [...],
  "search_results": [...],
  "images": [...],
  "related_questions": [...]
}
```

#### Citations Array (CRITICAL FOR GEO)
Each citation object contains:
| Field | Type | Description |
|---|---|---|
| `url` | string | Full URL of cited source |
| `title` | string | Page title |
| `snippet` | string | Excerpt from source |
| `domain` | string | Source domain |
| `publish_date` | timestamp | Publication date (when available) |

#### Search Results Array
Each result contains:
| Field | Type | Description |
|---|---|---|
| `rank` | integer | Ranking position in search |
| `url` | string | Full URL |
| `title` | string | Page title |
| `snippet` | string | Content excerpt |
| `domain` | string | Source domain |
| `timestamp` | timestamp | Publication date |

#### Images Array (Tier-2+)
| Field | Type | Description |
|---|---|---|
| `imageUrl` | string | Image URL |
| `originUrl` | string | Source page URL |
| `height` | integer | Image height |
| `width` | integer | Image width |

#### Related Questions
- Array of strings — follow-up queries users might ask
- **GEO relevance:** Reveals what additional queries users ask about the business/topic

---

### 2.4 — Structured Output (JSON Schema)

- Define custom response schemas with `response_format`
- Type: `"json_schema"`
- Name field: 1-64 alphanumeric characters
- Recursive schemas NOT supported
- First request with new schema: 10-30 second warm-up delay
- **Do NOT request links in JSON responses** — use citations field instead

**GEO use case:** Force structured responses like:
```json
{
  "business_mentioned": boolean,
  "position": integer,
  "sentiment": "positive|neutral|negative",
  "competitors_mentioned": ["name1", "name2"],
  "citations_used": ["url1", "url2"]
}
```

---

### 2.5 — Agent API (Advanced — for AI Concierge)

**Built-in tools:**

1. **web_search** — search with domain/recency/date/language filters and content budget control
2. **fetch_url** — retrieve and extract full page content from URLs
3. **Custom function calling** — define custom functions, model autonomously decides when to invoke

**Response types:**
- `MessageOutputItem` — text response
- `SearchResultsOutputItem` — search results
- `FetchUrlResultsOutputItem` — URL content
- `FunctionCallOutputItem` — custom function results

**GEO relevance:** The Agent API can power our AI Concierge to autonomously research, fetch competitor pages, and generate GEO recommendations.

---

### 2.6 — Deep Research Mode

**Synchronous:** Single request/response, autonomous multi-step research
**Asynchronous:** Submit query, poll for completion, retrieve results

**Capabilities:**
- Autonomously evaluates multiple sources
- Multi-step research workflow
- Refines approach as information is gathered
- Generates comprehensive reports

**GEO relevance:** Can perform deep competitive analysis or comprehensive market research for a business's AI visibility landscape.

---

### 2.7 — Search Modes

| Mode | Parameter | Description | Billing |
|---|---|---|---|
| Low | `search_context_size: "low"` | Cost-optimized, simple queries | Lowest |
| Medium | `search_context_size: "medium"` | Balanced depth | Moderate |
| High | `search_context_size: "high"` | Maximum depth/context | Highest |
| Auto | `search_type: "auto"` | Intelligent routing | Pro if complex, Fast if simple |
| Pro | `search_type: "pro"` | Multi-step reasoning | Pro rate |
| Fast | `search_type: "fast"` | Single-step | Fast rate |

---

## PROVIDER 3: Otterly.ai — Complete Feature & Data Catalog

### Platform Overview

- **No public API** — all data via dashboard + CSV/PDF exports + Looker Studio connector
- **6 platforms tracked:** ChatGPT, Google AI Overviews, Google AI Mode, Perplexity, Gemini, Microsoft Copilot
- **Monitoring frequency:** Daily (automatic)
- **Citation accuracy:** 99%
- **Pricing:** Starts at $29/month per project

---

### 3.1 — AI Prompt Research Tool

**Input methods:**
- Keyword → conversational prompt conversion
- URL → topic extraction → prompt generation
- Brand/domain/industry-based generation
- Manual prompt creation
- Google Search Console prompt extraction

**Output per prompt:**
| Data Point | Description |
|---|---|
| Prompt Text | The generated conversational query |
| Relevance Score | Probability of user adoption (0-100) |
| Intent Volume | Estimated monthly search traffic |
| 3-Month Growth | Growth trend percentage |

---

### 3.2 — Search Prompt Monitoring (Per Prompt, Per Platform)

**Data Points Captured:**

| Data Point | Description |
|---|---|
| Brand Mentioned | Yes/No — whether brand appears in AI response |
| Brand Position | Ranking when multiple options listed |
| Brand Coverage | % of prompts where brand appears |
| Brand Mentions Count | Total count of brand mentions |
| Domain Cited | Yes/No — whether specific domain URL appears |
| Domain Citation Count | Number of times domain cited |
| Domain Coverage | % of prompts where domain appears |
| Citation Links | Specific URLs cited in responses |
| Citation Title | Title of cited content |
| Citation URL | Full URL being cited |
| Citation Position | Ranking of citation in response |
| Citation Domain | Domain extracted from URL |
| Citation Domain Category | Brand, News/Media, Blog, Community/Forum, Social Media, Other |
| Competitor Mentioned | Yes/No per competitor |
| Competitor Cited | Yes/No per competitor |
| Net Sentiment Score | -100 to +100 overall emotional tone |
| Sentiment Breakdown | % Negative / % Neutral / % Positive |
| Sentiment Count | Absolute volume of sentiment signals |
| Sentiment Attributes | Specific positive/negative/neutral descriptors |
| Date | Capture timestamp |
| Country | Geographic context |
| Service/Engine | Which AI platform |
| Tags | User-defined organizational tags |

---

### 3.3 — Brand Reports

**KPIs tracked per brand:**

#### Brand Visibility Metrics
| Metric | Description |
|---|---|
| Brand Coverage | % of prompts where brand appears (0-100%) |
| Brand Mentions | Total mention count |
| Share of Voice (SOV) | % vs. competitors |
| Brand Position | Average ranking position |
| Brand Rank | Competitive ranking position |
| Brand Coverage Rank | Position in coverage leaderboard |

#### Domain/Citation Metrics
| Metric | Description |
|---|---|
| Domain Citations | Count of domain citations |
| Domain Coverage | % of prompts citing domain |
| Domain Rank | Position in citation leaderboard |
| Top Cited URLs | Most referenced specific URLs |
| URL Citation Count | Citations per URL |
| Citation Share | % of total citations |

#### Sentiment Metrics
| Metric | Description |
|---|---|
| Net Sentiment Score (NSS) | -100 to +100 |
| Sentiment Breakdown | Neg/Neutral/Pos percentages |
| Sentiment Count | Volume of signals |
| Sentiment per Prompt | Drill-down per query |

#### Trend Metrics
| Metric | Description |
|---|---|
| Brand Coverage Over Time | Day-by-day tracking |
| Brand & Domain Trend | Daily movement chart |
| 3-Month Growth | Growth percentage |
| Competitive Comparison | Performance vs. competitors over time |

**Filtering:**
- Time range: 14 days, MTD, last month, 3/6/9/12 months, custom
- Engine: All, ChatGPT, Perplexity, Copilot, Google AIO, AI Mode, Gemini
- Country: US, GB, DE, NL, CH, AT, etc.
- Tags: Custom organizational tags
- Competitors: Specific competitor filtering

---

### 3.4 — Brand Visibility Index (BVI)

**Calculation:**
- X-axis: Brand Coverage (% of prompts where brand appears)
- Y-axis: Likelihood to Buy (calculated from average position in AI answers)
- Time-lapse slider: scrub day-by-day

**Quadrant Classification:**
| Quadrant | Coverage | Likelihood | Meaning |
|---|---|---|---|
| Leaders | High | High | AI top pick, primary recommendation |
| Niche | Low | High | Strong when mentioned, limited reach |
| Low Conversion | High | Low | Frequently seen but not top choice |
| Low Performance | Low | Low | Minimal AI presence |

---

### 3.5 — Domain Ranking & Analytics

| Data Point | Description |
|---|---|
| Weekly Link Tracking | All domains and their URLs tracked weekly |
| Link Position Changes | Week-over-week position shifts |
| Weekly Link Changes | New citations vs. lost citations |
| Domain Rank | Overall authority score in AI citations |
| URL-Specific Citations | Down to individual page level |
| Domain Category | Content type classification |
| Citation Frequency | How often cited |
| Platform Performance | Which engines cite most |
| Country Performance | Geo-specific citations |
| Historical Trends | Citation trends over time |

---

### 3.6 — Brand Sentiment Analysis

**Metrics:**
- Net Sentiment Score (NSS): -100 to +100
- Sentiment Breakdown: Negative/Neutral/Positive percentages
- Sentiment Count: Absolute volume
- Sentiment per platform
- Sentiment per competitor
- Sentiment per prompt
- Sentiment trends over time
- Individual sentiment attributes (specific positive/negative descriptors)

---

### 3.7 — GEO Audit (CRITICAL — Full Structure)

**Crawlability Checker:**
| Check | Description |
|---|---|
| Server Access | Bot access verification, crawler treatment |
| Robots.txt Analysis | Bot-specific breakdown, AI crawler permissions |
| AI Bot Blocking Detection | Identifies if AI crawlers are blocked |
| Misconfig Detection | Finds incorrect configurations |

**Content Checker:**
| Check | Description |
|---|---|
| Static vs. Dynamic Content | Impact on AI accessibility |
| Content Depth | Relevance and comprehensiveness |
| Metadata Quality | Title, description, headers |
| AI Readiness Level | Overall readiness scoring |

**Structured Data Evaluation:**
| Check | Description |
|---|---|
| Structure Quality | Schema markup validity |
| Content Analysis | Depth and relevance scoring |
| Technical Aspects | Performance and accessibility |
| AI Model Understanding | How well AI can parse the content |

**Audit Output:**
- Clear numerical scores per area
- Detailed breakdown: working vs. needs fixing
- Actionable suggestions ranked by priority
- Performance tracking over time
- PDF downloadable report
- 25+ evaluation factors (fluency, authority, technical structure, etc.)

---

### 3.8 — Website Citations Gap Analysis

| Analysis | Description |
|---|---|
| Most Cited Content | Which pages AI cites most, by engine |
| Citation Frequency per URL | How often each page is referenced |
| Citation Frequency per Domain | Overall domain performance |
| Missing Mention Opportunities | Where competitors cited but you're not |
| Domain Category Filters | Brand, News/Media, Blogs, Community/Forum, Social Media |
| PR Outreach Opportunities | Gaps suitable for media pitching |
| Content Team Insights | What content types AI prefers |
| Topic Expansion Data | Which topics need coverage |

---

### 3.9 — Export Capabilities (What Operator Can Extract)

#### CSV Export: Search Prompts

| Field | Description |
|---|---|
| Search Prompt | Exact prompt text |
| Country | Geographic context |
| Tags | Organizational tags |
| Intent Volume | Estimated monthly traffic |
| 3-Month Growth | Growth % |
| Total Citations | Total citation count |
| Brand Mentioned (per engine) | Yes/No for each of 6 platforms |
| All Engines Aggregate | Combined visibility |
| Brand Rank | Competitive position |
| Domain Cited (per engine) | Yes/No for each platform |
| Competitor Mentioned (per engine) | Yes/No |
| Competitor Cited (per engine) | Yes/No |

#### CSV Export: Citation Links — Full Report

| Field | Description |
|---|---|
| Prompt | Which prompt generated the citation |
| Country | Geographic context |
| Service | Which AI platform |
| Title | Title of cited content |
| URL | Specific URL cited |
| Position | Ranking in response |
| Date | Capture date |
| Domain | Domain extracted from URL |
| Domain Category | Brand/News/Blog/Community/Social/Other |
| My Brand Mentioned | Yes/No |
| Competitors Mentioned | Yes/No |

#### CSV Export: Citation Links — Summary Report

| Field | Description |
|---|---|
| Title | Content title |
| URL | Cited URL |
| Domain | Source domain |
| Domain Category | Classification |
| My Brand Mentioned | Yes/No |
| Competitors Mentioned | Yes/No |

#### PDF Export
- Full GEO Audit report
- Brand Report summaries
- Custom formatting

---

### 3.10 — Google Looker Studio Connector

**Available Data Fields:**

| Type | Field | Description |
|---|---|---|
| Dimension | Date | YYYY-MM-DD |
| Dimension | Country | Country code |
| Dimension | Brand Report | Report title |
| Dimension | AI Engine | Platform name |
| Dimension | Tags | Organizational tags |
| Metric | Brand Name | Text |
| Metric | Brand Coverage | % (0-100) |
| Metric | Brand Mentions | Count |
| Metric | Brand Share of Voice | % vs. competitors |
| Metric | Brand Rank | Competitive position |
| Metric | Brand Coverage Rank | Coverage leaderboard position |
| Metric | Domain Name | Text |
| Metric | Domain Coverage | % (0-100) |
| Metric | Domain Rank | Domain leaderboard position |
| Metric | Citation Name | Cited domain |
| Metric | Citations | Count for domain |
| Metric | Citation Share | % of total citations |
| Metric | Citation Rank | Citation leaderboard position |
| Metric | Cited URL | Specific URL |
| Metric | Cited URL Visits | Count per URL |

---

### 3.11 — Platforms: Per-Platform Data Availability

| Data Point | ChatGPT | Google AIO | AI Mode | Perplexity | Gemini | Copilot |
|---|---|---|---|---|---|---|
| Brand Mention | Yes | Yes | Yes | Yes | Yes | Yes |
| Brand Position | Yes | Yes | Yes | Yes | Yes | Yes |
| Domain Citation | Yes | Yes | Yes | Yes | Yes | Yes |
| Citation URLs | Yes | Yes | Yes | Yes | Yes | Yes |
| Sentiment | Yes | Yes | Yes | Yes | Yes | Yes |
| Citation Rate | ~varies | ~34% | ~varies | ~97% | ~varies | ~varies |

---

### 3.12 — Workspaces (Multi-Client Management)

- Separate workspaces per client (complete isolation)
- Unlimited brands per workspace
- Unlimited team members per workspace
- Role-based access controls
- Client-specific prompt sets
- Independent brand reports per workspace
- White-label capability

---

## GAPS IDENTIFIED IN ORIGINAL PIVOT PLAN

### SEMrush — Missed Endpoints

1. **Position Tracking API with AI Overview detection (SERP Code 52)** — This is the #1 most important SEMrush endpoint for GEO. It directly measures if a business appears in Google AI Overviews. Was completely absent from the plan.

2. **Site Audit API with schema markup validation** — Detects LocalBusiness, RealEstateAgent, FAQPage, HowTo schema. Essential for GEO onboarding audits. Was missing.

3. **Trends API with AI traffic channels** — Shows actual traffic from AI Assistants (ChatGPT, Claude) and AI Search (Google AI Overviews, Copilot). This is a killer feature for proving ROI. Was completely missing.

4. **Map Rank Tracker API** — Google Maps ranking for local businesses. Free (no API units). Critical for local GEO. Was missing.

5. **Subdomain Reports** — For multi-location businesses with city subdomains. Was missing.

6. **Question keyword variants** — SEMrush returns FAQ/question-form keywords. These map directly to AI prompts. Was not explicitly captured.

7. **SERP feature codes** — Full catalog of trackable SERP features beyond AI Overview (Featured Snippets, Knowledge Panels, Local Pack, FAQ, etc.). Was not detailed.

### Perplexity Sonar — Missed Features

1. **`search_results` array** — Returns the actual ranked search results Perplexity used (separate from citations). Contains rank, url, title, snippet, domain, timestamp. Was not in the plan.

2. **`return_related_questions`** — Returns follow-up questions users might ask. Critical for discovering additional GEO-relevant queries. Was missing.

3. **Structured Output (JSON Schema)** — Can force structured responses for consistent data extraction. Was not mentioned.

4. **Agent API** — Built-in web_search and fetch_url tools for autonomous research workflows. Can power our AI Concierge. Was not detailed.

5. **Deep Research mode (async)** — Submit research query, poll for completion. For comprehensive competitive analysis. Was barely mentioned.

6. **Search modes (low/medium/high)** — Cost/depth control per query. Was missing — we need this for budget management.

7. **Citation tokens no longer billed** — Significant cost reduction we weren't accounting for.

8. **`publish_date` on citations** — Can track content freshness of cited sources. Was missing.

### Otterly.ai — Missed Data Points

1. **6 platforms, not 5** — We listed 5 (ChatGPT, Perplexity, Google AIO, Gemini, Copilot). Missing: **Google AI Mode** (separate from AI Overviews). Must add to our ai_platforms table.

2. **Brand Visibility Index (BVI) quadrant system** — Coverage × Likelihood matrix with Leaders/Niche/Low Conversion/Low Performance classification. Was not captured — this is a high-value visualization.

3. **Net Sentiment Score (NSS)** — Specific -100 to +100 scoring system with multi-signal detection per response. Was oversimplified to "positive/neutral/negative".

4. **Domain Category classification** — Otterly classifies every cited domain as Brand, News/Media, Blog, Community/Forum, Social Media, Other. Critical for gap analysis. Was missing.

5. **Intent Volume per prompt** — Otterly estimates search volume for AI prompts (not just traditional keywords). Was missing.

6. **3-Month Growth metric** — Growth trend per prompt. Was missing.

7. **GEO Audit: AI bot blocking detection** — Crawlability checker specifically identifies if AI crawlers are blocked. Critical. Was not detailed.

8. **GEO Audit: 25+ evaluation factors** — We listed generic SWOT. The actual audit covers fluency, authority, technical structure, and 22+ other specific factors. Was underrepresented.

9. **Looker Studio connector fields** — 15+ data fields available via connector. Not mentioned — this could power our dashboard as an alternative to manual CSV imports for some data.

10. **Citation domain categorization in exports** — CSV exports include domain category per citation. Was missing from our import schema.

11. **Weekly link position changes** — Otterly tracks citation position changes week-over-week. Was not captured in our data model.

12. **Multiple brand variation detection** — Otterly matches company name, product name, acronyms, and alternative brand names. Was not mentioned in our tracked_queries design.

---

*This appendix is the exhaustive reference. The main PIVOT-PLAN.md should be updated to incorporate these findings.*
