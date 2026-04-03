# AgenticRev — Product Pivot Plan

> **Date:** April 2, 2026
> **Author:** Rafa (Stack3 Labs)
> **Status:** ACTIVE — Single source of truth for the pivot
> **Supersedes:** All prior product/ICP documentation that references Shopify-only e-commerce merchants

---

## 1. Why We Are Pivoting

AgenticRev was originally built as an AI Commerce Operations platform for Shopify merchants. The MVP is complete with 9 features shipped (auth, Shopify OAuth, product sync, AI scanner across 4 platforms, visibility dashboard, Truth Engine, email alerts, Stripe billing, onboarding).

We are pivoting because:

- The ICP (Ideal Customer Profile) is changing from **Shopify e-commerce merchants** to **Realtors** and **Small Businesses** of any kind.
- The core value proposition remains the same: **helping businesses get discovered, cited, and recommended by AI search engines** (ChatGPT, Perplexity, Gemini, Claude, Google AI Overviews).
- The domain stays within **GEO (Generative Engine Optimization)** and **AEO (Answer Engine Optimization)**.
- We are **adding data providers** (SEMrush API, Perplexity Sonar API, Otterly.ai manual operator workflow) to the existing LLM analysis capabilities we already have.
- We are **not removing** any existing LLM search engine analysis. We are expanding, not contracting.

---

## 2. New ICP Definitions

### 2.1 — Realtors (Real Estate Agents & Brokerages)

**Who they are:**
- Individual real estate agents, teams, and brokerages
- Primarily in the United States and Canada
- Range from solo agents doing $2M–$10M annual volume to teams/brokerages doing $50M+

**What they care about:**
- Being the agent AI recommends when someone asks "best realtor in [city/neighborhood]"
- Appearing in ChatGPT, Perplexity, Google AI Overviews for hyper-local queries ("homes for sale in Coral Gables", "best real estate agent near me")
- Their online authority signals: Google Business Profile, Zillow reviews, Realtor.com profile, personal website, social media presence
- Transaction data visibility (AI models cite agents with verifiable transaction history)
- Neighborhood expertise positioning (school districts, local amenities, market trends)

**Their pain today:**
- They invest in traditional SEO but AI search bypasses their listings entirely
- Competitors with stronger digital presence get cited by AI while they remain invisible
- They have no way to know if ChatGPT or Perplexity recommends them or their competitors
- They lack technical knowledge to implement structured data, schema markup, or GEO strategies
- They do not know what prompts or queries are relevant to their market

**What we give them:**
- Visibility into exactly how AI search engines see them (and their competitors)
- Actionable GEO/AEO audit with specific recommendations for their market
- Monitoring of their AI presence over time (trending up or down)
- Citation tracking — which sources AI uses when recommending agents
- Structured data and content optimization recommendations specific to real estate

### 2.2 — Small Businesses (Any Vertical)

**Who they are:**
- Local businesses: restaurants, law firms, dental practices, plumbers, fitness studios, salons, accountants, etc.
- Online-first small businesses: SaaS startups, e-commerce stores, consultancies, agencies
- 1–50 employees, typically with limited marketing resources
- May or may not have a website; some operate primarily through Google Business Profile and social media

**What they care about:**
- Being found when someone asks an AI assistant "best [service] in [location]" or "who should I hire for [need]"
- Understanding what AI says about their business today
- Knowing if they appear in AI-generated recommendations versus their competitors
- Getting practical, non-technical guidance on how to improve AI visibility
- ROI on their marketing spend — AI search is the new channel they need to win

**Their pain today:**
- Zero visibility into AI search — they do not know what ChatGPT says about them
- Traditional SEO agencies do not offer GEO/AEO services yet (or charge premium agency rates)
- No affordable self-serve tool to monitor and optimize AI presence
- They see competitors getting recommended by AI and do not understand why
- Schema markup, structured data, and AI-readable content are foreign concepts

**What we give them:**
- Plain-language AI visibility audit: "here is what AI says about you today"
- Competitor benchmarking within their local market
- Step-by-step GEO/AEO optimization recommendations (not generic — specific to their business type and location)
- Ongoing monitoring with alerts when visibility changes
- Content and schema recommendations that are actionable without a developer

---

## 3. What We Are Building — The Platform

### 3.1 — Platform Name

**AgenticRev** (unchanged — the name still works for the new positioning)

### 3.2 — Positioning Statement

AgenticRev is the AI Visibility Platform for businesses that need to be found, cited, and recommended by AI search engines. We combine real-time LLM analysis, SEO intelligence, citation tracking, and expert optimization into a single platform that tells you exactly how AI sees your business — and what to do about it.

### 3.3 — The Four Pillars (Modules)

#### Pillar 1: AI Visibility Scanner (EXISTS — EXPANDING)

**What it does today:**
- Queries ChatGPT (GPT-4o-mini), Perplexity (sonar-small-online), Gemini (gemini-2.5-flash), Claude (claude-3.5-haiku)
- Extracts mention position, sentiment, and citations
- Generates 3 queries per tracked entity
- Stores results in `ai_mentions` table

**What changes:**
- The "entity" being scanned is no longer a Shopify product. It is a **business** (a realtor, a restaurant, a law firm, etc.)
- Query generation shifts from product purchase intent to **local/service discovery intent**:
  - Realtors: "best real estate agent in [city]", "who should I hire to sell my home in [neighborhood]", "top-rated realtors near [zip code]"
  - Small Business: "best [business type] in [city]", "recommend a [service] near me", "[business name] reviews"
- We add **competitor tracking** — the scan also checks if competitors appear in the same queries and at what position
- We add **Perplexity Sonar API** as a first-class data source (replacing our current direct Perplexity query with the official API):
  - Use `search_domain_filter` to focus on user's domain and competitor domains
  - Use `return_citations` to capture exactly which sources Perplexity cites
  - Use `search_recency_filter` for time-bounded analysis
  - Sonar models: `sonar` for standard queries, `sonar-pro` for deep multi-step analysis
  - Cost: ~$1/M input tokens + $5/1K searches (Sonar standard)

**Perplexity Sonar API integration details:**
> **Full parameter specification:** See `docs/PIVOT-PLAN-PROVIDER-APPENDIX.md` Section 2

- Models: `sonar` (128k ctx, $1/M tokens) for standard scans, `sonar-pro` (200k ctx, $3/M input) for deep analysis, `sonar-deep-research` for comprehensive competitive reports
- `search_domain_filter` (max 20 domains): allowlist OR denylist mode for focused analysis
- `return_citations`: returns full citation objects with url, title, snippet, domain, publish_date
- `return_related_questions`: returns follow-up queries users might ask (feeds our prompt discovery)
- `search_results` array: returns the actual ranked search results Perplexity used (rank, url, title, snippet, domain, timestamp) — SEPARATE from citations
- `search_recency_filter`: hour/day/week/month/year — time-bounded analysis
- `web_search_options.search_context_size`: low/medium/high — controls depth vs. cost per query
- `response_format` with JSON Schema: force structured responses for consistent data extraction (e.g., business_mentioned, position, sentiment, competitors)
- **Citation tokens no longer billed** for sonar and sonar-pro — significant cost reduction
- Agent API: built-in `web_search` and `fetch_url` tools for autonomous workflows (powers AI Concierge)
- Deep Research (async mode): submit research query, poll for results — for comprehensive competitive analysis

**New data captured per scan:**
- Business mentioned: yes/no
- Position in recommendation list (if numbered)
- Sentiment: positive / neutral / negative (use structured output for consistency)
- Competitors mentioned in same response (names + positions + sentiments)
- Citations: full objects with url, title, snippet, domain, publish_date
- Search results: ranked list of sources Perplexity used (separate from citations)
- Related questions: follow-up queries users might ask
- AI response verbatim text (for operator review)
- Platform + model version
- Query used
- Search context size used (low/medium/high)
- Token usage (prompt + completion)
- Timestamp

#### Pillar 2: SEO & Authority Intelligence (NEW — via SEMrush API)

> **Full endpoint specification:** See `docs/PIVOT-PLAN-PROVIDER-APPENDIX.md` Section 1

**What it does:**
Pulls traditional SEO and authority signals that directly influence whether AI search engines cite a business. This is not presented as "SEMrush data" — it is presented as the business's **Digital Authority Profile**.

**SEMrush API endpoints we use (9 total):**

1. **Domain Overview** (`/domain_overview`) — 1 unit/line
   - Organic keywords count, traffic estimate, traffic cost, domain rank, backlinks count

2. **Domain Organic Search Keywords** (`/domain_organic`) — 10 units/line (live)
   - Full keyword list with position, volume, traffic %, ranking URL
   - **AI Overview columns: FK52 (keywords triggering AI Overview) and FP52 (keywords where domain appears IN AI Overview)** — THIS IS THE DIRECT MEASUREMENT OF GOOGLE AI OVERVIEW VISIBILITY
   - Question keyword variants (FAQ-form phrases that map to AI prompts)

3. **Backlinks Overview** (`/backlinks_overview`) — varies
   - Total backlinks, referring domains, Authority Score (0-100), follow/nofollow ratio, domain categories, anchor text analysis

4. **Keyword Overview** (`/keyword_overview`) — 10 units/keyword
   - Search volume, keyword difficulty, CPC, SERP features present, intent signals, question variants, related keywords

5. **Position Tracking API** (Projects API — JSON) — CRITICAL FOR GEO
   - Keyword rankings across Google, Bing, Yahoo
   - **SERP Feature Code 52 = AI Overview detection** — tracks whether domain appears in Google AI Overviews per keyword
   - All SERP features tracked: Featured Snippets, Knowledge Panels, Local Pack, Answer Box, FAQ Rich Results, News, Images, Video, Review Stars
   - Device targeting: Desktop, Mobile, Tablet
   - Location targeting: Country, City, Region level
   - Competitor ranking comparison per keyword

6. **Site Audit API** (Projects API) — CRITICAL FOR GEO
   - **Schema markup detection (30+ types):** LocalBusiness, RealEstateAgent, FAQPage, HowTo, QAPage, Organization, Product, Review, Article, BreadcrumbList, VideoObject, and 20+ more
   - JSON-LD, Microdata, Open Graph, Twitter Card validation
   - Rich Results eligibility check
   - Markup Score (validity percentage)
   - Technical issues: crawlability, broken links, duplicate content, Core Web Vitals (LCP, FID, CLS), HTTPS, mobile usability

7. **Trends API: Traffic Analytics** — 1 unit/request — CRITICAL FOR GEO
   - **AI Assistant traffic channel:** Direct measurement of traffic from ChatGPT, Claude, etc.
   - **AI Search traffic channel:** Direct measurement of traffic from Google AI Overviews, Bing Copilot
   - Full traffic source breakdown: direct, referral, organic, paid, social, email, display, AI assistants, AI search
   - Audience demographics: age, gender, income, geo distribution
   - Engagement: bounce rate, pages/visit, session duration, conversion rate
   - Competitor traffic comparison (top 5 competitors side-by-side)

8. **Map Rank Tracker API** (`/v4/map-rank-tracker-2/`) — FREE (no units)
   - Google Maps keyword rankings
   - Average Rank, Share of Voice
   - Rank distribution: Good (1-3), Average (4-10), Poor (11-20), Out of Top 20
   - Competitor map rankings, location heatmaps

9. **Listing Management API** (`/v4/listing-management/`) — No units (Local Pro)
   - Push NAP data to 70+ directories (US), 40+ (international)
   - Voice search distribution: Amazon Alexa, Apple Siri, Google Assistant, Bing
   - Bulk updates (50 locations per request)
   - Rate limit: 5 updates/sec, 10 reads/sec

**How we use this data:**

- **AI Overview Visibility (FK52/FP52 + Position Tracking Code 52):** THE primary metric — directly measures if the business appears in Google AI Overviews. Displayed as a headline KPI.
- **AI Traffic (Trends API):** Shows actual visits from ChatGPT, Claude, Google AI Overviews, Copilot. Proves ROI. Headline KPI.
- **Authority Score:** Digital authority benchmark vs. competitors.
- **Schema Health (Site Audit):** Validates LocalBusiness/RealEstateAgent/FAQPage schema. Critical for GEO onboarding — we detect missing schema and generate recommendations.
- **Local Pack Position (Map Rank Tracker):** Google Maps visibility for local queries. Free to query.
- **Organic Keywords → AI Prompts:** Keywords already driving traffic become priority prompts for AI scanner. Question variants map directly to conversational AI queries.
- **Backlink Authority:** Influences AI citation likelihood. Gap analysis vs. competitors reveals opportunities.
- **NAP Consistency (Listing Management):** Ensures business data is accurate across all directories that feed AI systems and voice assistants.
- **Traffic Value:** Express ROI in dollar terms — "your organic traffic is worth $X/month, AI traffic adds $Y"

**SEMrush API access requirements:**
- Business plan or higher ($499.95/month from SEMrush) is required for Standard API access
- API units purchased separately (~$50 per million units)
- We manage this as a platform cost, not passed through to users
- We must be deliberate about which endpoints we call and how often to control unit consumption

**Unit budget strategy:**
- Domain Overview: called once on onboarding + weekly refresh = low cost
- Organic Keywords: called on onboarding (top 100 keywords) + monthly full pull = moderate cost
- Backlinks Overview: called on onboarding + weekly refresh = low cost
- Keyword Overview: called for generated GEO queries (batch of 20-50 per user) = moderate cost
- Budget ceiling per user per month: define based on plan tier (see Section 5)

#### Pillar 3: Citation & Visibility Monitoring (NEW — via Otterly.ai Operator Workflow)

> **Full data point specification:** See `docs/PIVOT-PLAN-PROVIDER-APPENDIX.md` Section 3

**What it does:**
Otterly.ai is the industry-leading AI search monitoring platform (G2 #1 AEO platform 2026, 20,000+ users). It tracks brand mentions across **6 AI platforms:** ChatGPT, Google AI Overviews, Google AI Mode, Perplexity, Gemini, and Microsoft Copilot. It provides GEO audits, citation analysis, competitor benchmarking, sentiment analysis, and share-of-voice metrics with 99% citation accuracy.

**Why manual operator workflow:**
Otterly.ai does not have a public API (on their roadmap, not yet released). All data extraction is through their web dashboard with CSV/PDF exports and a Google Looker Studio connector. Therefore, this pillar operates as a **managed service** where a human operator uses Otterly.ai on behalf of the customer and imports the data into AgenticRev.

**Operator workflow — step by step:**

1. **Setup (once per customer):**
   - Operator logs into Otterly.ai workspace for the customer
   - Creates a Brand Report for the customer's brand (with name variations, domain variations)
   - Creates Brand Reports for each competitor
   - Configures tracked prompts using:
     - Otterly's AI Prompt Research Tool (keyword → prompt conversion, URL → topic extraction)
     - Same queries generated by our AI Scanner (for cross-platform consistency)
     - Google Search Console prompt extraction (if customer provides GSC access)
   - Tags prompts by category (discovery, comparison, review, location, service)
   - Sets parameters: all 6 platforms, language, geographic region (US, GB, etc.)

2. **Data collection (recurring — weekly or bi-weekly depending on plan):**
   - Otterly monitors prompts **daily automatically** — operator does not trigger scans manually
   - Operator opens customer's Otterly workspace at scheduled interval
   - Exports the following CSV files:

   **CSV Export 1 — Search Prompts (per prompt, per platform):**
   - Search Prompt text, Country, Tags
   - Intent Volume (estimated monthly traffic), 3-Month Growth %
   - Total Citations count
   - Brand Mentioned: Yes/No per engine (ChatGPT, Perplexity, Copilot, Google AIO, AI Mode, Gemini)
   - All Engines aggregate
   - Brand Rank (competitive position)
   - Domain Cited: Yes/No per engine
   - Competitor Mentioned: Yes/No per engine
   - Competitor Cited: Yes/No per engine

   **CSV Export 2 — Citation Links Full Report (per citation):**
   - Prompt (which query generated this), Country, Service (platform)
   - Title, URL, Position (rank in response), Date
   - Domain, **Domain Category** (Brand, News/Media, Blog, Community/Forum, Social Media, Other)
   - My Brand Mentioned: Yes/No
   - Competitors Mentioned: Yes/No

   **CSV Export 3 — Citation Links Summary:**
   - Title, URL, Domain, Domain Category
   - My Brand Mentioned, Competitors Mentioned

3. **Additional data extraction:**

   **Brand Report metrics (captured from dashboard or Looker Studio):**
   - Brand Coverage (%), Brand Mentions (count), Share of Voice (%)
   - Brand Position (avg rank), Brand Rank (competitive position)
   - Domain Coverage (%), Domain Citations (count), Domain Rank
   - Top Cited URLs with citation count per URL
   - Citation Share (% of total)
   - **Net Sentiment Score (NSS):** -100 to +100 scale
   - **Sentiment Breakdown:** Negative / Neutral / Positive percentages
   - **Sentiment Count:** Absolute volume of sentiment signals
   - Trends: day-by-day brand coverage, 3-month growth

   **Brand Visibility Index (BVI):**
   - Coverage (X-axis) × Likelihood to Buy (Y-axis) quadrant mapping
   - Classification: Leaders / Niche / Low Conversion / Low Performance
   - Time-lapse data (day-by-day position changes)

   **Domain Ranking & Analytics:**
   - Weekly link tracking (all domains and URLs)
   - Link position changes (week-over-week)
   - New citations vs. lost citations
   - Domain category breakdown per cited domain

4. **Data import into AgenticRev:**
   - Operator uploads CSVs to AgenticRev's admin import tool
   - System parses CSVs and maps data to internal schema:
     - Prompt results → `ai_mentions` table (extended with Otterly source flag)
     - Citations → `citations` table (url, title, domain, domain_category, position, platform, scan_date)
     - Brand metrics → `brand_visibility` table (coverage_rate, share_of_voice, nss_score, sentiment_breakdown, competitor_data, platform, period)
     - BVI position → `brand_visibility` table (bvi_quadrant, coverage_x, likelihood_y)
     - Domain changes → `citations` table (with week-over-week diff tracking)
   - System generates diff: what changed since last import (new citations, lost citations, visibility up/down, sentiment shifts)

5. **GEO Audit (once on onboarding + quarterly):**
   - Operator runs Otterly's GEO Audit for the customer's website:
     - **Crawlability Checker:** Server access, robots.txt analysis, AI bot blocking detection, misconfiguration detection
     - **Content Checker:** Static vs. dynamic content, AI accessibility impact, content depth/relevance, metadata quality
     - **Structured Data Evaluation:** Schema markup validity, content analysis, technical aspects scoring, AI model understanding
   - Output: Clear scores per area, 25+ evaluation factors (fluency, authority, technical structure, etc.), actionable suggestions ranked by priority
   - Exports PDF report + captures scores
   - Uploads to AgenticRev → stored in `geo_audits` table

6. **Google Looker Studio connector (alternative data path):**
   - Otterly provides a native Looker Studio connector with 15+ data fields
   - Available fields: Date, Country, Brand Report, AI Engine, Tags, Brand Coverage, Brand Mentions, Brand SOV, Brand Rank, Domain Coverage, Domain Rank, Citation Name, Citations, Citation Share, Citation Rank, Cited URL, Cited URL Visits
   - Can potentially be used as a semi-automated data pipeline (Looker → BigQuery → our DB) to reduce operator manual export burden on higher-tier plans

**What data Otterly provides that we surface:**

- **Brand Visibility Index (BVI):** Quadrant positioning — Leaders, Niche, Low Conversion, Low Performance — with time-lapse visualization
- **Brand Coverage:** % of tracked prompts where the brand appears
- **Share of Voice:** Brand's mention share vs. competitors
- **Net Sentiment Score (NSS):** -100 to +100 with breakdown (negative/neutral/positive)
- **Citation Map:** URLs/domains cited, categorized by type (Brand, News, Blog, Community, Social)
- **Citation Gap Analysis:** Where competitors are cited but you are not, by domain category
- **Platform Breakdown:** Visibility per AI platform (ChatGPT, Perplexity, Google AIO, AI Mode, Gemini, Copilot)
- **Trend Lines:** Day-by-day tracking with weekly citation position changes
- **Intent Volume:** Estimated search traffic per tracked prompt
- **GEO Audit:** Crawlability, content quality, structured data, 25+ factor scoring with recommendations
- **Domain Ranking:** Weekly link tracking with new/lost citation detection

**Operator capacity planning:**
- One operator can manage ~30-50 accounts (depending on frequency)
- Each account requires ~15-30 minutes per data cycle (export + import + review)
- Otterly.ai subscription cost: starts at $29/month per project (volume pricing via Workspaces for agencies)
- Workspaces provide complete client isolation with unlimited team members
- This cost is factored into our platform pricing (see Section 5)

#### Pillar 4: AI Concierge — GEO Specialist Agent (NEW — Premium Feature)

**What it does:**
An AI-powered agent that acts as a dedicated GEO specialist for the customer. Available only on the highest-tier plan. This is not a chatbot that answers generic questions — it is an agent with full access to the customer's data (scan results, SEMrush data, Otterly data, historical trends) that provides:

**Capabilities:**

1. **Personalized Insights:**
   - "Your visibility on ChatGPT dropped 15% this week. The main cause appears to be [competitor X] publishing a new neighborhood guide that Perplexity is now citing instead of your blog post."
   - "Perplexity cites your Zillow profile but never your personal website. Here is why and what to do about it."

2. **Strategic Recommendations:**
   - Content briefs: "Write a blog post titled [X] targeting the query [Y]. Structure it with these H2s. Include these data points. This query has [Z] monthly search volume and currently triggers AI responses that do not mention you."
   - Schema markup suggestions: Generates specific JSON-LD code blocks for the customer's website (LocalBusiness, RealEstateAgent, FAQPage, etc.)
   - Google Business Profile optimization: Specific edits to categories, description, attributes, photos, Q&A

3. **Competitive Intelligence:**
   - "Your top 3 competitors for the query [X] are [A, B, C]. Here is what each one does that you do not."
   - "Competitor [A] has 3x your backlinks from local news sites. Here are 5 local publications you should pitch for coverage."

4. **Progress Tracking:**
   - "Last month you implemented 4 of 7 recommendations. The ones you completed correlated with a 12% visibility increase on Perplexity."
   - "Your AI readability score improved from 45 to 72. The remaining gaps are [X, Y, Z]."

5. **Report Generation:**
   - Weekly/monthly performance reports with visualizations
   - Board-ready summaries for brokerage owners or business stakeholders
   - Exportable PDF/DOCX reports with branding

**Technical implementation:**
- Built on top of our existing LLM infrastructure (we already call OpenAI, Claude, etc.)
- **Perplexity Agent API** for autonomous research: built-in `web_search` (with domain/recency filters) and `fetch_url` tools allow the agent to autonomously research competitor websites, check content freshness, and validate recommendations
- **Perplexity Deep Research mode** for comprehensive competitive reports: async mode submits deep research queries and polls for results
- System prompt includes the customer's full data context (latest scan results, SEMrush metrics, Otterly data, AI Overview visibility, AI traffic data, historical trends)
- Uses RAG (Retrieval Augmented Generation) over customer's data stored in our database
- Conversation history persisted per customer
- Available via in-app chat interface on the dashboard
- Can be triggered to generate scheduled reports (weekly digest with agent commentary)
- **Structured output** via Perplexity's `response_format` for consistent report generation

**What it is NOT:**
- It is not a generic ChatGPT wrapper
- It does not have access to data outside what we have collected for the customer
- It does not make changes to the customer's website or profiles — it provides instructions and recommendations
- It does not replace the human operator for Otterly data collection

---

## 4. Data Architecture — What We Collect and From Where

### 4.1 — Data Source Map

| Data Point | Source | Method | Frequency |
|---|---|---|---|
| **— AI Scanner (Direct LLM Queries) —** | | | |
| AI mention (mentioned yes/no) | ChatGPT, Perplexity, Gemini, Claude | Direct LLM API calls (existing scanner) | Daily/Weekly (by plan) |
| AI mention position | ChatGPT, Perplexity, Gemini, Claude | Direct LLM API calls (existing scanner) | Daily/Weekly (by plan) |
| AI mention sentiment | ChatGPT, Perplexity, Gemini, Claude | Direct LLM API calls (existing scanner) | Daily/Weekly (by plan) |
| Competitor mentions + positions | All 4 LLM platforms | Direct LLM API calls (new) | Per scan |
| AI response full text | All 4 LLM platforms | Direct LLM API calls | Per scan |
| **— Perplexity Sonar API (Enhanced) —** | | | |
| Citations (url, title, snippet, domain, publish_date) | Perplexity Sonar API | `return_citations` | Per scan |
| Search results (rank, url, title, snippet, domain, timestamp) | Perplexity Sonar API | `search_results` response field | Per scan |
| Related questions | Perplexity Sonar API | `return_related_questions` | Per scan |
| Domain-filtered analysis | Perplexity Sonar API | `search_domain_filter` | On-demand |
| Deep competitive research | Perplexity Sonar API | `sonar-deep-research` (async) | On-demand (Enterprise) |
| **— SEMrush API (9 endpoints) —** | | | |
| Domain authority + rank | SEMrush API | `/domain_overview` | Onboarding + Weekly |
| Organic keywords + positions | SEMrush API | `/domain_organic` | Onboarding + Monthly |
| Organic traffic estimate + cost | SEMrush API | `/domain_overview` | Onboarding + Weekly |
| **AI Overview visibility (FK52, FP52)** | **SEMrush API** | **`/domain_organic` + Position Tracking** | **Onboarding + Weekly** |
| **SERP features (Snippets, Local Pack, FAQ, etc.)** | **SEMrush API** | **Position Tracking (Code 52 + others)** | **Weekly** |
| **Schema markup health (30+ types)** | **SEMrush API** | **Site Audit API** | **Onboarding + Monthly** |
| **AI traffic (ChatGPT, Claude, AI Overviews, Copilot)** | **SEMrush Trends API** | **Traffic Analytics** | **Weekly** |
| **Google Maps ranking** | **SEMrush API** | **Map Rank Tracker (FREE)** | **Onboarding + Weekly** |
| Backlink profile + authority | SEMrush API | `/backlinks_overview` | Onboarding + Weekly |
| Keyword volume + difficulty + intent | SEMrush API | `/keyword_overview` | On-demand per query batch |
| Question keyword variants | SEMrush API | `/keyword_overview` | On-demand per query batch |
| **Competitor traffic comparison** | **SEMrush Trends API** | **Traffic Analytics** | **Monthly** |
| **Audience demographics** | **SEMrush Trends API** | **Traffic Analytics** | **Monthly** |
| Business listing NAP accuracy | SEMrush Listing Mgmt API | `GetLocations` | Onboarding + Monthly |
| **— Otterly.ai (6 platforms, operator workflow) —** | | | |
| Brand Coverage (%) per platform | Otterly.ai | CSV export / Looker Studio | Weekly/Bi-weekly |
| Brand Mentions (count) per platform | Otterly.ai | CSV export / Looker Studio | Weekly/Bi-weekly |
| Share of Voice (%) vs. competitors | Otterly.ai | CSV export / Looker Studio | Weekly/Bi-weekly |
| Brand Position (avg rank) | Otterly.ai | CSV export / Looker Studio | Weekly/Bi-weekly |
| **Brand Visibility Index (BVI quadrant)** | **Otterly.ai** | **Dashboard capture** | **Weekly/Bi-weekly** |
| **Net Sentiment Score (-100 to +100)** | **Otterly.ai** | **Dashboard / CSV** | **Weekly/Bi-weekly** |
| **Sentiment Breakdown (neg/neutral/pos %)** | **Otterly.ai** | **Dashboard / CSV** | **Weekly/Bi-weekly** |
| Domain Citations + Coverage + Rank | Otterly.ai | CSV export / Looker Studio | Weekly/Bi-weekly |
| **Citation domain categories (Brand/News/Blog/Forum/Social)** | **Otterly.ai** | **CSV export** | **Weekly/Bi-weekly** |
| **Intent Volume per prompt** | **Otterly.ai** | **CSV export** | **Weekly/Bi-weekly** |
| **3-Month Growth per prompt** | **Otterly.ai** | **CSV export** | **Weekly/Bi-weekly** |
| **Weekly citation position changes** | **Otterly.ai** | **Dashboard export** | **Weekly** |
| **New vs. lost citations week-over-week** | **Otterly.ai** | **Dashboard export** | **Weekly** |
| Google AIO visibility | Otterly.ai | CSV export | Weekly/Bi-weekly |
| **Google AI Mode visibility** | **Otterly.ai** | **CSV export** | **Weekly/Bi-weekly** |
| **Microsoft Copilot visibility** | **Otterly.ai** | **CSV export** | **Weekly/Bi-weekly** |
| **Gemini visibility** | **Otterly.ai** | **CSV export** | **Weekly/Bi-weekly** |
| GEO Audit (crawlability, content, schema, 25+ factors) | Otterly.ai | Manual operator PDF/data export | Onboarding + Quarterly |
| Citation Gap Analysis (missing vs. competitors) | Otterly.ai | Manual operator export | Onboarding + Quarterly |
| **— User Input —** | | | |
| Business profile | User input (onboarding) | Form submission | Once + edits |
| Competitor list | User input + AI suggestion | Form + LLM | Once + edits |
| Tracked queries/prompts | System generated + user custom + Otterly Prompt Research | Algorithm + form + import | Ongoing |

### 4.2 — New Database Tables Required

The following tables must be added to the existing schema (the 14 existing tables remain, with modifications noted):

**New tables:**

1. **`businesses`** — Replaces `stores` as the primary entity. Represents the customer's business being tracked.
   - `id` (UUID PK)
   - `user_id` (FK → users)
   - `business_name`
   - `business_type` (enum: realtor, restaurant, law_firm, dental, plumber, salon, accountant, saas, ecommerce, agency, other)
   - `business_category` (free text for specificity)
   - `address_street`, `address_city`, `address_state`, `address_zip`, `address_country`
   - `phone`
   - `email`
   - `website_url`
   - `google_business_profile_url`
   - `social_profiles` (JSONB — keys: zillow, realtor_com, yelp, linkedin, facebook, instagram, twitter, tiktok)
   - `service_areas` (JSONB array — list of cities/neighborhoods/zip codes served)
   - `description` (business description for AI query generation context)
   - `created_at`, `updated_at`

2. **`competitors`** — Competitor businesses being tracked alongside the user's business.
   - `id` (UUID PK)
   - `business_id` (FK → businesses)
   - `user_id` (FK → users)
   - `competitor_name`
   - `website_url`
   - `google_business_profile_url`
   - `notes`
   - `created_at`

3. **`tracked_queries`** — The prompts/queries we monitor across AI platforms.
   - `id` (UUID PK)
   - `business_id` (FK → businesses)
   - `user_id` (FK → users)
   - `query_text` (the prompt sent to AI platforms)
   - `query_type` (enum: system_generated, user_custom, otterly_imported, otterly_prompt_research, gsc_imported)
   - `intent_category` (enum: discovery, comparison, review, service_specific, location_specific)
   - `intent_volume` (integer, nullable — estimated monthly search volume from Otterly)
   - `growth_3m` (decimal, nullable — 3-month growth % from Otterly)
   - `tags` (JSONB array — organizational tags matching Otterly tags)
   - `is_active` (boolean)
   - `created_at`

4. **`citations`** — URLs cited by AI platforms when mentioning the business or competitors.
   - `id` (UUID PK)
   - `ai_mention_id` (FK → ai_mentions, nullable)
   - `business_id` (FK → businesses)
   - `user_id` (FK → users)
   - `cited_url`
   - `cited_domain`
   - `cited_title` (text — page title of cited content)
   - `cited_snippet` (text — excerpt from Perplexity Sonar or Otterly)
   - `cited_publish_date` (timestamp, nullable — from Perplexity Sonar)
   - `platform_id` (FK → ai_platforms)
   - `position` (integer, nullable — rank of citation in AI response)
   - `domain_category` (enum: brand, news_media, blog, community_forum, social_media, other — from Otterly classification)
   - `is_own_domain` (boolean)
   - `is_competitor_domain` (boolean)
   - `competitor_id` (FK → competitors, nullable — if citation belongs to a competitor)
   - `source` (enum: llm_scan, perplexity_sonar, otterly_import)
   - `scan_date`
   - `created_at`

5. **`brand_visibility`** — Aggregated visibility metrics (primarily from Otterly imports).
   - `id` (UUID PK)
   - `business_id` (FK → businesses)
   - `user_id` (FK → users)
   - `platform_id` (FK → ai_platforms, nullable — null means aggregate across all)
   - `coverage_rate` (decimal — % of tracked prompts where brand appears)
   - `share_of_voice` (decimal — % of total mentions vs. competitors)
   - `mention_count` (integer)
   - `brand_position_avg` (decimal — average ranking position)
   - `brand_rank` (integer — competitive ranking)
   - `domain_coverage` (decimal — % of prompts citing domain)
   - `domain_citations_count` (integer)
   - `domain_rank` (integer — domain citation leaderboard position)
   - `nss_score` (decimal — Net Sentiment Score -100 to +100)
   - `sentiment_negative_pct` (decimal)
   - `sentiment_neutral_pct` (decimal)
   - `sentiment_positive_pct` (decimal)
   - `sentiment_count` (integer — volume of sentiment signals)
   - `bvi_quadrant` (enum: leaders, niche, low_conversion, low_performance — Brand Visibility Index)
   - `bvi_coverage_x` (decimal — BVI x-axis value)
   - `bvi_likelihood_y` (decimal — BVI y-axis value)
   - `competitor_mention_counts` (JSONB — {competitor_id: count})
   - `source` (enum: calculated, otterly_import, looker_studio)
   - `period_start`, `period_end`
   - `created_at`

6. **`seo_snapshots`** — Point-in-time SEMrush data captures.
   - `id` (UUID PK)
   - `business_id` (FK → businesses)
   - `user_id` (FK → users)
   - `domain_authority_rank` (integer)
   - `organic_keywords_count` (integer)
   - `organic_traffic` (integer)
   - `organic_traffic_cost` (decimal)
   - `backlinks_total` (integer)
   - `referring_domains` (integer)
   - `authority_score` (integer)
   - `ai_overview_keywords_total` (integer — FK52: keywords triggering AI Overview)
   - `ai_overview_keywords_present` (integer — FP52: keywords where domain appears in AI Overview)
   - `ai_traffic_assistants` (integer — traffic from ChatGPT, Claude etc. via Trends API)
   - `ai_traffic_search` (integer — traffic from Google AI Overviews, Copilot via Trends API)
   - `maps_avg_rank` (decimal — Google Maps average rank via Map Rank Tracker)
   - `maps_share_of_voice` (decimal — Maps SoV)
   - `maps_rank_good_pct` (decimal — % positions 1-3)
   - `maps_rank_avg_pct` (decimal — % positions 4-10)
   - `maps_rank_poor_pct` (decimal — % positions 11-20)
   - `serp_features` (JSONB — {feature_code: {total_keywords, keywords_present}} for all tracked SERP features)
   - `schema_types_found` (JSONB array — schema types detected by Site Audit: ["LocalBusiness", "FAQPage", etc.])
   - `schema_valid_count` (integer)
   - `schema_invalid_count` (integer)
   - `schema_markup_score` (decimal — validity percentage)
   - `site_health_score` (decimal — Site Audit overall score)
   - `core_web_vitals` (JSONB — {lcp, fid, cls} scores)
   - `top_keywords` (JSONB — array of {keyword, position, volume, traffic_pct, ai_overview_present})
   - `traffic_sources` (JSONB — {direct, referral, organic, paid, social, email, display, ai_assistants, ai_search} from Trends API)
   - `audience_demographics` (JSONB — {age_groups, gender, income, geo} from Trends API)
   - `snapshot_date`
   - `created_at`

7. **`geo_audits`** — GEO audit results from Otterly or internal analysis.
   - `id` (UUID PK)
   - `business_id` (FK → businesses)
   - `user_id` (FK → users)
   - `audit_type` (enum: initial, quarterly, on_demand)
   - `crawlability_score` (decimal — Otterly crawlability checker score)
   - `crawlability_details` (JSONB — {server_access, robots_txt, ai_bot_blocking, misconfigs})
   - `content_score` (decimal — Otterly content checker score)
   - `content_details` (JSONB — {static_vs_dynamic, depth, relevance, metadata_quality, ai_readiness})
   - `structured_data_score` (decimal — Otterly structured data evaluation score)
   - `structured_data_details` (JSONB — {structure_quality, content_analysis, technical_aspects, ai_understanding})
   - `strengths` (JSONB array)
   - `weaknesses` (JSONB array)
   - `opportunities` (JSONB array)
   - `threats` (JSONB array)
   - `recommendations` (JSONB array — each with: title, description, priority, category, status)
   - `evaluation_factors` (JSONB — 25+ scored factors: fluency, authority, technical_structure, etc.)
   - `overall_score` (integer 1-100)
   - `source` (enum: otterly, internal, agent)
   - `audit_date`
   - `created_at`

8. **`agent_conversations`** — AI Concierge chat history.
   - `id` (UUID PK)
   - `business_id` (FK → businesses)
   - `user_id` (FK → users)
   - `messages` (JSONB array — [{role, content, timestamp}])
   - `context_snapshot` (JSONB — data context provided to agent at conversation start)
   - `created_at`, `updated_at`

9. **`operator_tasks`** — Tracks manual Otterly data collection tasks for the operations team.
   - `id` (UUID PK)
   - `business_id` (FK → businesses)
   - `user_id` (FK → users)
   - `operator_id` (UUID — internal operator user)
   - `task_type` (enum: otterly_setup, otterly_scan, otterly_export, geo_audit)
   - `status` (enum: pending, in_progress, completed, failed)
   - `notes` (text)
   - `data_files` (JSONB — references to uploaded CSV files)
   - `due_date`
   - `completed_at`
   - `created_at`

10. **`data_imports`** — Log of all external data imports (Otterly CSVs, etc.).
    - `id` (UUID PK)
    - `business_id` (FK → businesses)
    - `operator_id` (UUID)
    - `import_type` (enum: otterly_prompts, otterly_citations, otterly_visibility, otterly_geo_audit)
    - `file_name`
    - `row_count` (integer)
    - `status` (enum: pending, processing, completed, failed)
    - `error_log` (text, nullable)
    - `created_at`

**Modified existing tables:**

- **`ai_mentions`** — Add columns:
  - `business_id` (FK → businesses) — replaces product-centric reference
  - `query_id` (FK → tracked_queries)
  - `competitors_mentioned` (JSONB — [{competitor_id, name, position, sentiment}])
  - `search_results` (JSONB — array of {rank, url, title, snippet, domain, timestamp} from Perplexity Sonar)
  - `related_questions` (JSONB — array of strings from Perplexity `return_related_questions`)
  - `search_context_size` (enum: low, medium, high — Perplexity search depth used)
  - `nss_score` (decimal, nullable — Net Sentiment Score from Otterly if imported)
  - `sentiment_attributes` (JSONB, nullable — specific positive/negative descriptors from Otterly)
  - `domain_cited` (boolean — was the user's domain specifically cited in the response)
  - `source` (enum: direct_llm, perplexity_sonar, otterly_import)
  - `token_usage` (JSONB — {prompt_tokens, completion_tokens, total_tokens})
  - Keep `product_id` as nullable for backward compatibility during migration

- **`ai_platforms`** — Add rows for all platforms Otterly tracks:
  - `google_aio` (Google AI Overviews) — tracked via Otterly
  - `google_ai_mode` (Google AI Mode) — tracked via Otterly (separate from AI Overviews)
  - `copilot` (Microsoft Copilot) — tracked via Otterly
  - Existing: `chatgpt`, `perplexity`, `gemini`, `claude` (scanned directly via LLM API + tracked via Otterly)
  - Total: 7 platform rows (4 direct LLM scan + 3 Otterly-only)

- **`users`** — Add column:
  - `role` (enum: customer, operator, admin) — to distinguish platform operators from customers

- **`subscriptions`** — Update plan definitions (see Section 5)

**Tables that become deprecated (not deleted, just unused for new signups):**
- `stores` (replaced by `businesses`)
- `products` (no longer tracking individual products — tracking businesses as entities)
- `truth_engine_errors` (replaced by `geo_audits` and AI Concierge recommendations)
- `acp_feeds`, `acp_orders` (ACP was Shopify-specific checkout, no longer applicable)

---

## 5. Pricing & Plans

### 5.1 — Plan Structure

| Feature | Free | Pro | Business | Enterprise |
|---|---|---|---|---|
| **Price** | $0/month | $149/month | $399/month | $899/month |
| **Businesses tracked** | 1 | 1 | 3 | 10 |
| **Competitors per business** | 2 | 5 | 10 | 25 |
| **AI Scanner** | Weekly (4 platforms) | Daily (4 platforms) | Daily (4 platforms) | Real-time on demand |
| **Tracked queries** | 10 | 50 | 150 | 500 |
| **SEMrush data** | Domain overview only | Full domain + keywords | Full domain + keywords + backlinks | Full suite + historical |
| **Perplexity Sonar API** | Standard Sonar | Standard Sonar | Sonar Pro (deep analysis) | Sonar Pro + Deep Research |
| **Otterly.ai data** | None | Bi-weekly import | Weekly import | Weekly import + quarterly GEO audit |
| **Citation tracking** | From LLM scans only | LLM + Perplexity Sonar | LLM + Sonar + Otterly | Full citation map |
| **Google AIO tracking** | None | None | Via Otterly | Via Otterly |
| **AI Concierge Agent** | None | None | None | Full access — chat + reports |
| **Reports** | Basic dashboard | Dashboard + PDF export | Dashboard + PDF + weekly email | Dashboard + PDF + email + agent-generated insights |
| **Data retention** | 30 days | 90 days | 180 days | 365 days |
| **Operator SLA** | None | None | 48h turnaround | 24h turnaround |
| **Onboarding** | Self-serve | Self-serve + guide | Guided setup call | Dedicated onboarding + strategy session |

### 5.2 — Cost Structure Per User (Platform Costs)

| Cost Component | Free | Pro | Business | Enterprise |
|---|---|---|---|---|
| LLM API calls (4 platforms) | ~$0.50/mo | ~$3/mo | ~$8/mo | ~$15/mo |
| SEMrush API units | ~$0.10/mo | ~$2/mo | ~$5/mo | ~$12/mo |
| Perplexity Sonar API | ~$0.20/mo | ~$2/mo | ~$8/mo | ~$15/mo |
| Otterly.ai subscription (amortized) | $0 | ~$2/mo | ~$5/mo | ~$8/mo |
| Operator labor (amortized) | $0 | $0 | ~$15/mo | ~$25/mo |
| AI Concierge compute | $0 | $0 | $0 | ~$10/mo |
| **Total platform cost/user** | **~$0.80** | **~$9** | **~$41** | **~$85** |
| **Gross margin** | N/A | **94%** | **90%** | **91%** |

### 5.3 — Revenue Targets

- Month 1-3: 30 paid users (20 Pro + 8 Business + 2 Enterprise) = **$7,778 MRR**
- Month 4-6: 100 paid users (60 Pro + 30 Business + 10 Enterprise) = **$29,930 MRR**
- Month 7-12: 300 paid users (150 Pro + 100 Business + 50 Enterprise) = **$107,350 MRR**

These are planning targets, not validated projections. Actual conversion rates will be measured from launch.

---

## 6. User Flows — New Onboarding

### 6.1 — Signup Flow (All Users)

1. User lands on marketing site → clicks "Start Free" or "Get Started"
2. Signup form: Full name, Email, Password, Company/Business name
3. Email verification (existing flow — keep as-is)
4. Redirect to onboarding wizard

### 6.2 — Onboarding Wizard (Replaces Shopify-centric wizard)

**Step 1: Tell Us About Your Business**
- Business name (pre-filled from signup)
- Business type (dropdown: Real Estate Agent, Real Estate Brokerage, Restaurant, Law Firm, Dental Practice, Medical Practice, Home Services, Fitness/Wellness, Salon/Spa, Accounting/Finance, Marketing Agency, SaaS/Tech, E-commerce, Consulting, Other)
- Website URL (optional — some businesses may not have one)
- Phone number
- Physical address (street, city, state, zip, country)
- Service areas (multi-select or free-text: cities, neighborhoods, zip codes)

**Step 2: Set Up Your Online Presence** (dynamic based on business type)
- Google Business Profile URL
- If Realtor: Zillow profile URL, Realtor.com profile URL
- If Restaurant: Yelp URL, TripAdvisor URL
- If Professional Service: LinkedIn URL
- Social media: Facebook, Instagram, Twitter/X (optional)
- "We will scan these to understand your current AI visibility"

**Step 3: Add Competitors**
- "Who are your top competitors?" (minimum 1, up to plan limit)
- For each competitor: Name + Website URL
- OR: "Let AI suggest competitors" → we run a quick LLM query: "Who are the top [business type] in [city]?" and present results for user to confirm
- User selects which are actually their competitors

**Step 4: Your First AI Scan**
- "We are now scanning how AI search engines see your business"
- Show progress: Querying ChatGPT... Querying Perplexity... Querying Gemini... Querying Claude...
- Display initial results: "ChatGPT mentions you in 2 of 10 queries" / "Perplexity never mentions you"
- CTA: "Go to your dashboard to see the full picture"

### 6.3 — Post-Onboarding (Background)

After onboarding completes, the system triggers (asynchronously):
1. SEMrush domain overview pull (if website URL provided)
2. First full AI scan across all generated queries
3. Operator task creation for Otterly setup (if on Business or Enterprise plan)
4. Welcome email with link to dashboard + "what to expect" timeline

---

## 7. Dashboard — New Design

### 7.1 — Top-Level Metrics (visible to all plans)

- **AI Visibility Score:** 0-100 composite score. Calculated from: % of tracked queries where business is mentioned (weighted by platform), average mention position, sentiment balance, citation count pointing to own domain. Formula to be defined during implementation.
- **Share of Voice:** % of total AI mentions across tracked queries that reference the user's business vs. competitors. Only available when Otterly data is present (Business+ plans) or calculated from LLM scans.
- **Citation Count:** Number of unique URLs being cited by AI platforms when responding to tracked queries. Broken down by: own domain, competitor domains, third-party domains.
- **Authority Score:** From SEMrush domain overview. Displayed as a single number with trend arrow (up/down vs. last period).

### 7.2 — Sections

1. **AI Visibility Over Time** (line chart — exists, needs redesign)
   - X-axis: dates (7/30/90/180/365 days depending on plan)
   - Y-axis: visibility score or mention count
   - Lines: one per platform + aggregate
   - Toggle between: mention count, visibility score, share of voice

2. **Platform Breakdown** (bar chart — exists, needs redesign)
   - Bars for each platform: ChatGPT, Perplexity, Gemini, Claude, Google AIO
   - Show: mentions found / total queries per platform
   - Color-coded: green (mentioned), red (not mentioned)

3. **Competitor Comparison** (NEW)
   - Table: Business name | Visibility Score | Mentions | Top Cited Source | Trend
   - User's business highlighted at top
   - Sort by visibility score descending
   - Click on competitor → expanded view of their mentions + citations

4. **Top Performing Queries** (NEW — replaces Top Products Table)
   - Table: Query text | Platforms mentioned on | Position | Sentiment | Last scanned
   - Sortable by mention count, recency
   - Click on query → expanded view showing full AI responses per platform

5. **Citation Map** (NEW)
   - Visual: domain → citation relationship
   - Table: Cited URL | Cited by (platforms) | Frequency | Own/Competitor/Third-party
   - Filter by: own domain only, competitor domains, all
   - Export to CSV

6. **SEO Health** (NEW — SEMrush data)
   - Authority Score with trend
   - Organic keywords count
   - Organic traffic estimate
   - Top 10 keywords (with position and volume)
   - Backlinks summary

7. **GEO Audit Summary** (NEW — shown when audit data exists)
   - Overall GEO score (1-100)
   - SWOT quadrant visualization
   - Top 5 recommendations with priority badges
   - Link to full audit details page

8. **AI Concierge** (Enterprise only)
   - Chat widget (fixed bottom-right or dedicated section)
   - Recent agent insights/recommendations
   - "Ask about your visibility" prompt suggestions

### 7.3 — Navigation (Sidebar/Top)

- Dashboard (home)
- AI Scans (query management + scan history)
- Citations (citation tracking detail page)
- Competitors (competitor management)
- GEO Audit (audit results + recommendations)
- Reports (generated reports + export)
- AI Concierge (Enterprise — full-page chat)
- Settings (account, billing, business profile, team)
- Billing (plan management)

---

## 8. What Changes in the Existing Codebase

### 8.1 — Files That Stay As-Is (No Changes)

- `lib/auth.ts` — NextAuth configuration (unchanged)
- `lib/auth-server.ts` — Server-side auth (unchanged)
- `lib/tokens.ts` — Email verification/password reset tokens (unchanged)
- `lib/supabase.ts` — Supabase client initialization (unchanged)
- `app/api/auth/*` — All auth routes (unchanged)
- `app/api/billing/*` — Billing routes (minor plan name updates)
- `app/api/webhooks/stripe/route.ts` — Stripe webhook handler (unchanged)
- `app/api/health/route.ts` — Health check (unchanged)
- `components/providers/*` — Session and Theme providers (unchanged)
- `components/ui/DarkModeToggle.tsx` — Dark mode toggle (unchanged)
- `components/billing/BillingButtons.tsx` — Billing buttons (unchanged, just plan label updates)

### 8.2 — Files That Get Modified

- `lib/types.ts` — Add new types: Business, Competitor, TrackedQuery, Citation, BrandVisibility, SEOSnapshot, GEOAudit, AgentConversation, OperatorTask. Deprecate: Store, Product (keep for migration).
- `lib/scanner.ts` — Refactor to scan businesses instead of products. Change query generation from purchase-intent to discovery-intent. Add competitor mention extraction. Add Perplexity Sonar API integration.
- `lib/email.ts` — Update email templates for new ICP language. Add GEO audit notification template. Update weekly digest to reflect new metrics.
- `lib/stats.ts` — Rewrite to aggregate business visibility metrics instead of product mentions. Add competitor stats, citation stats, SEO snapshot data.
- `lib/stripe.ts` — Update PLAN_CONFIG with new plan definitions (Free/Pro/Business/Enterprise). Update limits: maxBusinesses, maxCompetitors, maxQueries.
- `app/dashboard/page.tsx` — Full redesign (see Section 7).
- `app/onboarding/page.tsx` — Replace Shopify wizard with business-centric wizard (see Section 6.2).
- `app/page.tsx` — Landing page copy rewrite for new ICP.
- `app/billing/page.tsx` — Update plan cards to match new pricing.
- `app/layout.tsx` — Add new navigation items.
- `app/globals.css` — Styling updates for new components.
- `supabase/migrations/` — New migration file(s) for schema changes.
- `vercel.json` — Update cron schedules if needed.
- `components/dashboard/*` — All dashboard components need updating for new data shapes.
- `components/onboarding/OnboardingWizard.tsx` — Complete rewrite.

### 8.3 — Files That Get Removed (Deprecated)

- `lib/shopify.ts` — Shopify API utilities (no longer needed for new signups)
- `lib/truth-engine.ts` — Replaced by GEO audit system
- `app/api/shopify/*` — Shopify OAuth install/callback routes
- `app/api/webhooks/shopify/route.ts` — Shopify webhook handler
- `app/api/products/sync/route.ts` — Product sync route
- `app/api/cron/shopify-sync/route.ts` — Shopify sync cron
- `app/api/truth-engine/*` — Truth Engine routes
- `app/api/cron/truth-engine/route.ts` — Truth Engine cron
- `app/truth-engine/page.tsx` — Truth Engine page
- `components/truth-engine/*` — Truth Engine components
- `components/stores/*` — Store connection components (ConnectButton, StoreCard, StoresSection)

### 8.4 — New Files to Create

**Lib:**
- `lib/semrush.ts` — SEMrush API client (domain overview, organic keywords, backlinks, keyword overview)
- `lib/perplexity-sonar.ts` — Perplexity Sonar API client (replaces direct Perplexity call in scanner)
- `lib/query-generator.ts` — AI-powered query generation for businesses (discovery-intent prompts)
- `lib/visibility-score.ts` — Composite visibility score calculation
- `lib/otterly-import.ts` — CSV parser for Otterly data imports
- `lib/geo-agent.ts` — AI Concierge agent system prompt + RAG context builder

**API Routes:**
- `app/api/businesses/route.ts` — CRUD for businesses
- `app/api/businesses/[id]/route.ts` — Individual business operations
- `app/api/competitors/route.ts` — CRUD for competitors
- `app/api/competitors/suggest/route.ts` — AI-generated competitor suggestions
- `app/api/queries/route.ts` — CRUD for tracked queries
- `app/api/queries/generate/route.ts` — Auto-generate queries for a business
- `app/api/citations/route.ts` — Citation data retrieval
- `app/api/seo/snapshot/route.ts` — Trigger SEMrush data pull
- `app/api/seo/keywords/route.ts` — Keyword data retrieval
- `app/api/geo-audit/route.ts` — GEO audit results
- `app/api/agent/chat/route.ts` — AI Concierge chat endpoint
- `app/api/agent/insights/route.ts` — Agent-generated insights
- `app/api/admin/import/route.ts` — Operator CSV import endpoint
- `app/api/admin/tasks/route.ts` — Operator task management
- `app/api/cron/seo-refresh/route.ts` — Weekly SEMrush data refresh cron
- `app/api/reports/generate/route.ts` — Report generation endpoint

**Pages:**
- `app/citations/page.tsx` — Citation tracking detail page
- `app/competitors/page.tsx` — Competitor management page
- `app/geo-audit/page.tsx` — GEO audit results page
- `app/reports/page.tsx` — Reports listing and export page
- `app/agent/page.tsx` — AI Concierge full-page chat (Enterprise)
- `app/admin/page.tsx` — Operator admin panel
- `app/admin/import/page.tsx` — Operator data import page
- `app/admin/tasks/page.tsx` — Operator task queue page
- `app/scans/page.tsx` — Scan history and query management page

**Components:**
- `components/dashboard/VisibilityScore.tsx` — Composite score display
- `components/dashboard/CompetitorTable.tsx` — Competitor comparison table
- `components/dashboard/CitationMap.tsx` — Citation visualization
- `components/dashboard/SEOHealth.tsx` — SEMrush data display
- `components/dashboard/GEOAuditSummary.tsx` — Audit summary card
- `components/dashboard/QueryTable.tsx` — Top performing queries
- `components/onboarding/BusinessForm.tsx` — Business details step
- `components/onboarding/PresenceForm.tsx` — Online presence step
- `components/onboarding/CompetitorForm.tsx` — Competitor setup step
- `components/onboarding/FirstScan.tsx` — First scan step
- `components/agent/ChatWidget.tsx` — AI Concierge chat interface
- `components/agent/InsightCard.tsx` — Agent insight display
- `components/competitors/CompetitorCard.tsx` — Individual competitor card
- `components/citations/CitationTable.tsx` — Citation detail table
- `components/admin/ImportForm.tsx` — CSV upload form
- `components/admin/TaskQueue.tsx` — Operator task list

---

## 9. Environment Variables — New Additions

```
# SEMrush API
SEMRUSH_API_KEY=                    # SEMrush API key (Business plan required)

# Perplexity Sonar API (replaces PERPLEXITY_API_KEY usage in scanner)
PERPLEXITY_SONAR_API_KEY=           # Perplexity API key for Sonar models

# Otterly (no API — credentials for reference only)
# OTTERLY_EMAIL=                    # Operator's Otterly login (stored securely, not in env)
# OTTERLY_PASSWORD=                 # Operator's Otterly password (stored securely, not in env)

# AI Concierge
AGENT_MODEL=gpt-4o                  # Model used for AI Concierge (configurable)
AGENT_MAX_TOKENS=4096               # Max response tokens for agent
```

Existing variables that remain unchanged:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- `PERPLEXITY_API_KEY` (may merge with `PERPLEXITY_SONAR_API_KEY` — same key, different usage)
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_*` (update names: STARTER→PRO, GROWTH→BUSINESS, AGENCY→ENTERPRISE)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `CRON_SECRET`

---

## 10. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core platform works for new ICP with basic scanning.

1. Create new database migration with all new tables
2. Build business onboarding flow (replace Shopify wizard)
3. Refactor scanner to work with businesses instead of products
4. Implement query generator for discovery-intent prompts
5. Update dashboard to show business visibility metrics
6. Implement competitor mention extraction in scanner
7. Update pricing/billing with new plan structure
8. Rewrite landing page copy for new positioning
9. Create business CRUD API routes

### Phase 2: SEMrush Integration (Weeks 3-4)

**Goal:** SEO intelligence data flowing into the platform.

1. Build SEMrush API client (`lib/semrush.ts`)
2. Implement domain overview pull on onboarding
3. Build weekly SEMrush refresh cron job
4. Create SEO Health dashboard section
5. Implement keyword overview for tracked queries
6. Build organic keywords pull and display
7. Implement backlinks overview display
8. Create authority score trend tracking

### Phase 3: Perplexity Sonar Upgrade (Week 5)

**Goal:** Rich citation data from Perplexity API.

1. Build Perplexity Sonar API client (`lib/perplexity-sonar.ts`)
2. Replace direct Perplexity call in scanner with Sonar API
3. Implement citation extraction from Sonar responses
4. Build Citation tracking page and dashboard section
5. Implement domain filtering for focused analysis
6. Add search recency filtering

### Phase 4: Otterly Operator Workflow (Weeks 6-7)

**Goal:** Manual data import pipeline working.

1. Build admin panel for operators
2. Build CSV import parser for Otterly data formats (prompts, citations, visibility)
3. Build operator task queue system
4. Create data import logging and error handling
5. Build brand visibility aggregation from Otterly data
6. Implement GEO audit import and display
7. Build Google AIO tracking display (Otterly data)
8. Create operator onboarding documentation

### Phase 5: AI Concierge Agent (Weeks 8-9)

**Goal:** AI agent working for Enterprise customers.

1. Design agent system prompt with RAG context
2. Build context builder that assembles customer data snapshot
3. Implement chat API route with conversation persistence
4. Build chat UI component
5. Implement insight generation (scheduled + on-demand)
6. Build report generation capability
7. Implement schema markup recommendation generator
8. Build content brief generator

### Phase 6: Polish & Launch Prep (Week 10)

**Goal:** Production-ready for first customers.

1. End-to-end testing across all flows
2. Verify all plan limits are enforced correctly
3. Email template updates for new ICP
4. Documentation updates (all docs/ folder)
5. Operator training materials
6. Performance testing (dashboard load times)
7. Security review (new API keys, new admin routes)
8. Soft launch to beta users

---

## 11. What We Are NOT Building (Explicit Scope Boundaries)

- **Shopify integration for new users** — existing Shopify code is deprecated, not maintained. No new features for e-commerce merchants.
- **WooCommerce or any e-commerce platform** — fully out of scope.
- **ACP (Agentic Commerce Protocol)** — was Shopify-specific, no longer relevant.
- **Automated Otterly.ai interaction** — no scraping, no browser automation. Operator manually uses the platform.
- **White-label reporting** — not in initial launch. May add later.
- **Mobile app** — web only.
- **Multi-language** — English only at launch.
- **Self-serve Otterly integration** — users do not log into Otterly themselves. The operator handles it.
- **SEMrush account for users** — we use our own SEMrush API access. Users do not need SEMrush accounts.
- **Direct website editing** — the AI Concierge recommends changes but does not implement them on the user's website.

---

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| SEMrush API costs exceed budget | High — margins erode | Strict per-user unit budgets. Cache aggressively. Only pull data at defined intervals. Monitor usage weekly. |
| Otterly.ai changes pricing or features | Medium — operator workflow disrupted | Diversify manual sources. Build internal citation tracking as fallback. |
| Perplexity Sonar API rate limits or downtime | Medium — scan quality degrades | Graceful degradation: fall back to direct Perplexity query. Queue retries. |
| Operator cannot scale beyond 50 accounts | High — bottleneck to growth | Hire additional operators. Streamline workflow with better tooling. Explore Otterly API if/when released. |
| AI Concierge generates inaccurate recommendations | High — trust damage | Constrain agent to only reference verified data. Add disclaimers. Human review option. |
| Realtors expect leads, not visibility data | Medium — ICP mismatch | Position clearly as visibility intelligence, not lead gen. Show ROI connection: visibility → leads. |
| Small businesses churn due to slow AI visibility gains | High — retention risk | Set expectations in onboarding: 3-6 months for meaningful change. Show incremental wins. |
| SEMrush changes API access requirements | Medium — integration breaks | Abstract SEMrush behind `lib/semrush.ts` interface. Can swap providers. |

---

## 13. Success Metrics

**Primary:**
- 30 paid users within 90 days of launch
- Monthly churn < 8%
- NPS > 40
- Dashboard load time < 3 seconds

**Secondary:**
- Average time-to-value: < 5 minutes (first scan results visible)
- Operator efficiency: < 20 minutes per account per data cycle
- AI Concierge usage: > 3 conversations per Enterprise user per week
- Upgrade rate: > 10% Free → Pro within 30 days

---

## 14. Open Questions (Must Resolve Before Implementation)

1. **SEMrush API access:** Do we already have a SEMrush Business plan, or do we need to purchase one? What is our initial API unit budget?
2. **Otterly.ai account:** How many Otterly projects do we need to manage? Do we need multiple accounts for scaling?
3. **Perplexity API key:** Is our existing Perplexity API key Sonar-compatible, or do we need a separate registration?
4. **Operator hiring:** Do we have an operator ready, or do we need to hire? What is the timeline?
5. **Stripe pricing:** Do we need to create new Stripe Price IDs for Pro/Business/Enterprise, or update existing ones?
6. **Domain/branding:** Does "AgenticRev" still work for the new positioning, or do we rebrand?
7. **Existing users:** Are there any existing Shopify users we need to migrate or grandfather?
8. **Realtor-specific data sources:** Should we integrate Zillow, Realtor.com, or MLS data in the future? (Not MVP, but influences schema design.)

---

## 15. Document Changelog

| Date | Change | Author |
|---|---|---|
| 2026-04-02 | Initial pivot plan created | Rafa / Claude |
| 2026-04-02 | MAJOR UPDATE: Exhaustive provider audit. Added 5 missing SEMrush endpoints (Position Tracking with AI Overview Code 52, Site Audit with schema detection, Trends API with AI traffic channels, Map Rank Tracker, Subdomain Reports). Added missing Perplexity Sonar features (search_results array, return_related_questions, structured output, Agent API, Deep Research async mode, search modes). Expanded Otterly from 5 to 6 platforms (added Google AI Mode). Added 25+ missing data fields: BVI quadrant, NSS sentiment scoring, domain categories, intent volume, citation position changes, AI traffic metrics. Updated all database table schemas to capture every available data point. Created companion doc `PIVOT-PLAN-PROVIDER-APPENDIX.md` with complete endpoint catalog. | Rafa / Claude |

---

*This document is the canonical reference for the AgenticRev product pivot. All implementation decisions should reference this plan. Update this document as decisions are made on open questions.*
