# AgenticRev — GEO Tool for Professionals & Businesses
## Complete Product & Engineering Plan

> **Document type:** Architecture & Implementation Plan  
> **Status:** Approved for development  
> **Date:** March 4, 2026  
> **Scope:** Full pivot of the AI Visibility feature from Shopify/e-commerce products to a universal GEO monitoring and recommendation platform targeting any professional or business.

---

## Table of Contents

1. [Strategic Context](#1-strategic-context)
2. [What We Are Building](#2-what-we-are-building)
3. [Research Basis — What the Data Says About GEO](#3-research-basis)
4. [Target Personas](#4-target-personas)
5. [What We Keep from the Existing Codebase](#5-what-we-keep)
6. [What We Remove / Deactivate](#6-what-we-remove)
7. [New Data Model](#7-new-data-model)
8. [Feature Architecture](#8-feature-architecture)
9. [GEO Health Score — Scoring Engine Design](#9-geo-health-score)
10. [Recommendations Engine](#10-recommendations-engine)
11. [Scanner Adaptation](#11-scanner-adaptation)
12. [Dashboard UI Plan](#12-dashboard-ui-plan)
13. [Billing Model](#13-billing-model)
14. [Implementation Phases — Localhost MVP](#14-implementation-phases)
15. [File Map — What to Build / Modify / Delete](#15-file-map)
16. [Environment Variables](#16-environment-variables)
17. [Open Questions & Deferred Work](#17-open-questions)

---

## 1. Strategic Context

### The Problem
AI assistants — ChatGPT, Perplexity, Gemini, Claude — are the new discovery layer for buyers of services and products. When someone asks "Who is the best real estate agent in Austin?" or "Which attorney handles estate planning in Miami?", the AI gives a name or refers to a firm. Most professionals and businesses have no idea whether they appear in those answers, let alone why they do or don't.

Traditional SEO tools measure rankings and clicks. They are blind to AI answers. **There is currently no affordable, self-serve tool that tells a realtor, attorney, dentist, or small business "here is how ChatGPT sees you, and here is what to do about it."**

### The Opportunity (by the numbers)
- ChatGPT reaches **800 million weekly users** (Search Engine Land, Feb 2026)
- Google Gemini surpassed **750 million monthly users** (Search Engine Land, Feb 2026)
- AI Overviews appear in at least **16% of all Google searches** (Semrush, 2026), significantly higher for high-intent queries
- Between **40–60% of cited AI sources change month to month** (Semrush AI Visibility Index, 2025) — meaning the competition is fluid and winnable
- Only **a small fraction of brands** appear in AI answers as both mentioned and cited (Backlinko/Semrush, 2026)

### The Product Vision
> *"Does your business appear when your next client asks ChatGPT? We show you, score you, and fix it."*

AgenticRev becomes a **GEO (Generative Engine Optimization) intelligence platform** for any professional or business. The client pays, gets a live dashboard showing how AI agents perceive them, receives a health score, and gets an actionable list of recommendations to improve their visibility — then we monitor it over time.

---

## 2. What We Are Building

### The Core Loop

```
Onboarding (entity profile)
    ↓
AI Scanner (4 platforms × N queries)
    ↓
GEO Health Score (0–100)
    ↓
Visibility Dashboard
    ↓
Recommendations Engine (what to do)
    ↓
Continuous monitoring (cron)
    ↓
Email alerts + weekly digest
```

### Three Pillars of Value

| Pillar | What the user sees | What it does |
|---|---|---|
| **Monitor** | Mention count, sentiment, platform breakdown, trend | Runs real queries against 4 AI platforms, stores raw results |
| **Score** | GEO Health Score (0–100), broken down by dimension | Aggregates signals into an understandable grade |
| **Recommend** | Ordered list of GEO action items with priority | Maps weaknesses in the score to specific, actionable improvements |

---

## 3. Research Basis

The following GEO framework is drawn from published research (Semrush AI Visibility Index 2025–2026, Backlinko "Seen & Trusted" Framework, Search Engine Land GEO Guide, Feb 2026). All scoring dimensions and recommendations in this plan are grounded in that research.

### What Makes a Brand Appear in AI Answers

According to the Backlinko/Semrush "Seen & Trusted" Framework, AI platforms mine signals from:

**Sentiment sources (Get Seen):**
1. **Review platforms** — G2, Capterra, Google Reviews, Yelp, Trustpilot. Detailed reviews carry more weight than ratings. G2 is a top source for ChatGPT in B2B/professional services.
2. **Community discussions** — Reddit, Quora, LinkedIn. Authentic engagement in threads where target audience asks questions. Tally.so made ChatGPT its #1 acquisition channel purely through Reddit presence.
3. **User-generated content & social proof** — Customer testimonials, LinkedIn posts, case studies publicly shared.
4. **"Best of" lists and comparison articles** — Third-party listicles (e.g., "Top 10 Real Estate Agents in Austin") are primary citation sources for AI.

**Authority sources (Be Trusted):**
1. **Technical website quality** — Semantic HTML, fast page speed, no JavaScript-only content, schema markup (Organization, LocalBusiness, Person, FAQ). AI crawlers cannot execute JavaScript.
2. **Entity clarity** — Consistent brand name, category, and value proposition across all platforms. Ambiguity in entity definition lowers citation confidence.
3. **Transparent, findable information** — Services listed, pricing visible, location data consistent. Hidden information triggers negative speculation in AI answers.
4. **Wikipedia / Knowledge Graph presence** — One of the most cited sources across all LLMs. Accurate Wikipedia and Google Knowledge Panel entries shape AI's base understanding.
5. **Original content with extractable facts** — Self-contained paragraphs, direct answers, concrete statistics. AI extracts passages without surrounding context — each paragraph must stand alone.

### Key Insight for Professionals vs. Products
For professionals (realtors, attorneys, doctors) and local businesses, the relevant citation layer is:
- **Google Business Profile** (feeds Knowledge Graph)
- **Industry-specific review sites** (Avvo for attorneys, Zillow/Realtor.com for realtors, Zocdoc for doctors, Yelp for restaurants)
- **Local community forums and Reddit** (e.g., r/Austin, Nextdoor)
- **Professional association directories** (Bar Association, NAR, medical boards)
- **LinkedIn profile and articles** (top-3 most cited source across LLMs globally)
- **YouTube** (second most cited video source by AI platforms)

---

## 4. Target Personas

### Primary: The Autonomous Professional
- **Who:** Realtor, attorney, financial advisor, therapist, dentist, accountant, architect, consultant
- **Pain:** They built their reputation on referrals and Google. They have no visibility into AI discovery.
- **Willingness to pay:** $49–$199/month. They spend this on Zillow Premier, Avvo, SEO tools.
- **Query types we scan for them:** "Best estate planning attorney in [city]", "Recommend a realtor for first-time homebuyers in [area]", "Who handles DUI defense in [city]"

### Secondary: The Small/Mid Business
- **Who:** Restaurant, dental practice, law firm, marketing agency, CPA firm, contractor
- **Pain:** The business may appear in AI but with wrong hours, wrong location, outdated pricing, or negative framing.
- **Willingness to pay:** $99–$499/month depending on competitive category
- **Query types we scan for them:** "Best [category] in [city]", "Recommend a [service type] near me", "[Business name] reviews", "Is [business name] good?"

### Out of Scope (this MVP)
- E-commerce product tracking (existing Shopify feature — preserved but not the focus)
- Enterprise brand monitoring (Semrush/Conductor territory — future roadmap)

---

## 5. What We Keep

Everything currently in the codebase is preserved. We are **adding a new module in parallel**, not replacing.

| Preserved | Why |
|---|---|
| `lib/scanner.ts` | Core scanner logic is reusable — we adapt `generateQueries()` for entity queries |
| `lib/stats.ts` | Aggregation logic reusable with minor schema changes |
| `lib/auth.ts`, `lib/auth-server.ts` | Auth stays identical |
| `lib/supabase.ts` | DB client unchanged |
| `lib/stripe.ts` | Billing stays — we update plan names and features copy only |
| `lib/email.ts` | Email stays for alerts and digest |
| `app/api/scanner/trigger/route.ts` | Reused as-is |
| `app/api/cron/scanner/route.ts` | Reused as-is |
| `app/dashboard/page.tsx` | Extended to support entities (not products) |
| All auth pages | Unchanged |
| Supabase migrations 001–002 | Keep existing schema, add new tables via 003+ |
| `components/dashboard/*` | Reused with new data shapes |
| `components/ui/*` | Reused |

---

## 6. What We Remove / Deactivate

We are **not deleting code** (per user instruction). We deactivate by routing and feature-flagging.

| Deactivated | Action |
|---|---|
| **Shopify OAuth flow** (`app/api/shopify/`, `lib/shopify.ts`) | Keep files; remove links from UI; no new user can initiate |
| **Shopify Sync cron** (`app/api/cron/shopify-sync/`) | Keep file; disable in `vercel.json` schedule by commenting out |
| **StoresSection** component | Remove from dashboard by default for GEO users |
| **ConnectButton / StoreCard** | Keep files; not rendered in new GEO onboarding |
| **Truth Engine** (`lib/truth-engine.ts`, `app/truth-engine/`) | Kept intact but not surfaced in GEO MVP; hidden from nav |
| **ACP / Action module** references | Strip from billing copy and plan features |
| **`maxStores`, `acpEnabled` in stripe.ts plan config** | Keep in code; not shown in GEO pricing copy |

**Why not delete:** The Shopify e-commerce path is a valid future upsell or separate product. Deleting it creates unnecessary rework.

---

## 7. New Data Model

New Supabase migration: `supabase/migrations/003_geo_entities.sql`

### New Tables

#### `geo_entities`
The central object for GEO monitoring. Replaces "products" as the thing we scan.

```sql
CREATE TABLE geo_entities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Identity
  name          TEXT NOT NULL,               -- "John Smith Real Estate" or "Smith & Jones Law Firm"
  entity_type   TEXT NOT NULL,               -- 'professional' | 'business' | 'brand'
  profession    TEXT,                        -- 'realtor' | 'attorney' | 'dentist' | 'restaurant' | etc.
  city          TEXT,                        -- "Austin" — geographic context for query generation
  state         TEXT,                        -- "TX"
  country       TEXT DEFAULT 'US',
  
  -- Online presence (inputs to recommendations engine)
  website_url   TEXT,
  linkedin_url  TEXT,
  google_biz_url TEXT,                       -- Google Business Profile URL
  yelp_url      TEXT,
  facebook_url  TEXT,
  twitter_url   TEXT,
  instagram_url TEXT,
  
  -- Professional-specific profiles
  avvo_url      TEXT,                        -- attorneys
  zillow_url    TEXT,                        -- realtors
  healthgrades_url TEXT,                    -- doctors/dentists
  custom_review_url TEXT,                   -- fallback for any review platform
  
  -- Profile completeness (for recommendations)
  has_website        BOOLEAN DEFAULT FALSE,
  has_schema_markup  BOOLEAN DEFAULT FALSE,
  has_google_biz     BOOLEAN DEFAULT FALSE,
  has_linkedin       BOOLEAN DEFAULT FALSE,
  has_reviews        BOOLEAN DEFAULT FALSE,
  has_faq_content    BOOLEAN DEFAULT FALSE,
  
  -- Status
  scan_status   TEXT DEFAULT 'pending',      -- 'pending' | 'scanning' | 'done' | 'error'
  last_scanned_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_geo_entities_user_id ON geo_entities(user_id);
```

#### `geo_mentions`
Stores individual AI platform scan results — per-query. Analogous to `ai_mentions` but scoped to entities.

```sql
CREATE TABLE geo_mentions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     UUID NOT NULL REFERENCES geo_entities(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_id   INTEGER NOT NULL REFERENCES ai_platforms(id),
  
  query         TEXT NOT NULL,               -- The exact query sent to the AI
  query_type    TEXT NOT NULL,               -- 'brand_search' | 'category_reco' | 'location_search' | 'comparison' | 'review_check'
  
  mentioned     BOOLEAN NOT NULL,
  position      INTEGER,                     -- Rank in a list response (1–10)
  sentiment     TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  
  framing       TEXT,                        -- Short extracted sentence about the entity from response
  ai_response   TEXT,                        -- Full response text (truncated to 2000 chars)
  citations     JSONB,                       -- URLs cited by Perplexity / GPT browsing
  
  scanned_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geo_mentions_entity_id ON geo_mentions(entity_id);
CREATE INDEX idx_geo_mentions_user_id ON geo_mentions(user_id);
CREATE INDEX idx_geo_mentions_scanned_at ON geo_mentions(scanned_at);
```

#### `geo_health_scores`
Persisted GEO score snapshots — one row per entity per scan run. Enables trend tracking over time.

```sql
CREATE TABLE geo_health_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id         UUID NOT NULL REFERENCES geo_entities(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Overall
  overall_score     INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  
  -- Dimensions (each 0–100)
  score_visibility      INTEGER NOT NULL,   -- % of queries where entity is mentioned
  score_sentiment       INTEGER NOT NULL,   -- weighted positive/neutral/negative ratio
  score_position        INTEGER NOT NULL,   -- avg position in ranked lists (1=100, 5=50, not ranked=0)
  score_platform_reach  INTEGER NOT NULL,   -- how many of 4 platforms mention the entity
  score_presence        INTEGER NOT NULL,   -- profile completeness (website, GBP, reviews, etc.)
  
  -- Dimension weights used (for auditability)
  weights_json   JSONB,
  
  scored_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geo_health_scores_entity_id ON geo_health_scores(entity_id);
```

#### `geo_recommendations`
Action items generated after each scan. Ordered by priority and impact.

```sql
CREATE TABLE geo_recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       UUID NOT NULL REFERENCES geo_entities(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  category        TEXT NOT NULL,    -- 'presence' | 'content' | 'reviews' | 'technical' | 'community'
  priority        TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  title           TEXT NOT NULL,    -- Short action title
  description     TEXT NOT NULL,    -- What to do and why
  impact_note     TEXT,             -- "Adding a Google Business Profile can increase ChatGPT citations by..."
  
  dismissed       BOOLEAN DEFAULT FALSE,
  completed       BOOLEAN DEFAULT FALSE,
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geo_recommendations_entity_id ON geo_recommendations(entity_id);
```

### How Existing Tables Are Used

| Existing table | Used for |
|---|---|
| `users` | Unchanged |
| `ai_platforms` | Unchanged — same 4 platforms |
| `subscriptions` | Unchanged — plan gates entity count |
| `truth_engine_errors` | Dormant for GEO product; preserved |
| `stores`, `products`, `ai_mentions` | Preserved for Shopify path |

---

## 8. Feature Architecture

```
app/
  geo/
    page.tsx                   ← GEO dashboard (server component)
    onboarding/
      page.tsx                 ← Entity profile creation wizard
  api/
    geo/
      entities/
        route.ts               ← GET list / POST create entity
        [id]/
          route.ts             ← GET single / PATCH / DELETE entity
      scan/
        route.ts               ← POST: trigger manual scan for user's entities
      stats/
        route.ts               ← GET: dashboard stats for GEO entities
      health/
        [entityId]/
          route.ts             ← GET: current health score + history
      recommendations/
        [entityId]/
          route.ts             ← GET: recommendations list
          dismiss/route.ts     ← POST: dismiss a recommendation
          complete/route.ts    ← POST: mark recommendation as completed
    cron/
      geo-scanner/
        route.ts               ← GET (cron): run geo scanner for all entities (daily)

lib/
  geo-scanner.ts               ← Adapted scanner: entity-based query generation
  geo-health.ts                ← Health score calculation engine
  geo-recommendations.ts       ← Recommendation rules engine
  geo-stats.ts                 ← Dashboard aggregation for entities

components/
  geo/
    EntityCard.tsx             ← Displays an entity with its health score badge
    EntityForm.tsx             ← Create/edit entity profile form
    HealthScoreGauge.tsx       ← Visual radial gauge for the 0–100 score
    ScoreDimensions.tsx        ← Bar chart of 5 score dimensions
    RecommendationsList.tsx    ← Ordered action items with dismiss/complete
    GeoMentionChart.tsx        ← Recharts line chart (reuses existing structure)
    PlatformBadges.tsx         ← Shows which platforms mention the entity
    ScanButton.tsx             ← GEO-specific (reuses pattern from dashboard)
```

---

## 9. GEO Health Score

### Score Architecture

The GEO Health Score is a single number (0–100) that answers: **"How findable and positively perceived is this entity by AI agents right now?"**

It aggregates five weighted dimensions:

| Dimension | Weight | What it measures |
|---|---|---|
| **Visibility** | 35% | % of scan queries where entity was mentioned across all platforms |
| **Sentiment** | 25% | Quality of mentions: positive weighted 1.0, neutral 0.5, negative 0.0 |
| **Position** | 15% | Average rank in list-type answers (position 1 = full points, drops linearly) |
| **Platform Reach** | 15% | How many of the 4 platforms mention the entity (25 pts each) |
| **Presence** | 10% | Profile completeness checklist score (see below) |

**Formula:**
```
overall_score = round(
  visibility_score * 0.35 +
  sentiment_score  * 0.25 +
  position_score   * 0.15 +
  reach_score      * 0.15 +
  presence_score   * 0.10
)
```

### Detailed Dimension Calculations

#### Visibility Score (0–100)
```
mention_rate = mentions_count / total_queries_run
visibility_score = round(mention_rate * 100)
```
Where `total_queries_run = platforms_count × queries_per_entity`.

#### Sentiment Score (0–100)
```
weighted_sentiment = (positive_count * 1.0 + neutral_count * 0.5 + negative_count * 0.0)
                   / total_mentioned_count    (if 0, score = 50 as baseline)
sentiment_score = round(weighted_sentiment * 100)
```
A neutral-only presence scores 50. Pure positive scores 100. Any negative drags it down.

#### Position Score (0–100)
Based on average position across all ranked-list mentions:
```
position_score = max(0, 100 - ((avg_position - 1) * 15))
```
Position 1 → 100 pts. Position 2 → 85. Position 5 → 40. Not in a list → 0 for that mention.

#### Platform Reach Score (0–100)
```
reach_score = (platforms_with_at_least_one_mention / 4) * 100
```
All 4 platforms mention the entity → 100. Only ChatGPT → 25.

#### Presence Score (0–100)
Evaluated from the entity's profile fields at time of scan:
```
presence_checks = [
  has_website          → 20 pts
  has_google_biz       → 20 pts
  has_linkedin         → 15 pts
  has_reviews          → 20 pts (any review platform URL set)
  has_faq_content      → 15 pts  (website has /faq or FAQ schema detected)
  has_schema_markup    → 10 pts  (Organization/LocalBusiness/Person schema)
]
presence_score = sum(passing_checks_pts)
```
Max 100. These fields are updated by the user in their entity profile, with future auto-detection possible.

### Grade Labels

| Score | Grade | Label |
|---|---|---|
| 85–100 | A | Excellent |
| 70–84 | B | Good |
| 50–69 | C | Fair |
| 30–49 | D | Poor |
| 0–29 | F | Not Visible |

---

## 10. Recommendations Engine

### Design Philosophy
Recommendations are **deterministic rules** mapped to score dimension weaknesses. They are generated after every scan, deduplicated (no duplicate open recommendations of the same category × priority for the same entity), and ordered by priority.

Each recommendation maps to one of the GEO research pillars from Backlinko/Semrush: **"Get Seen"** (sentiment battle) or **"Be Trusted"** (authority game).

### Recommendation Rule Set (`lib/geo-recommendations.ts`)

Rules are evaluated in order. Each rule has: `condition`, `category`, `priority`, `title`, `description`, `impact_note`.

---

**PRESENCE rules** (triggered by missing profile fields)

| Rule ID | Condition | Priority | Action |
|---|---|---|---|
| `P1` | `has_google_biz = false` | critical | "Claim your Google Business Profile" |
| `P2` | `has_website = false` | critical | "Create a professional website" |
| `P3` | `has_schema_markup = false` AND `has_website = true` | high | "Add structured data (schema.org) to your website" |
| `P4` | `has_linkedin = false` | high | "Create and optimize your LinkedIn profile" |
| `P5` | `has_reviews = false` | high | "Get listed on industry review platforms" |
| `P6` | `has_faq_content = false` AND `has_website = true` | medium | "Add an FAQ page to your website" |

---

**VISIBILITY rules** (triggered by low mention rate)

| Rule ID | Condition | Priority | Action |
|---|---|---|---|
| `V1` | `visibility_score < 20` | critical | "Your business is invisible to AI — start with a Google Business Profile and review strategy" |
| `V2` | `visibility_score < 50` AND `platform_reach < 2 platforms` | high | "Be consistent across all AI-monitored platforms" |
| `V3` | `chatgpt_mentions = 0` | high | "You are not appearing in ChatGPT — address review platform presence" |
| `V4` | `perplexity_mentions = 0` | medium | "Improve citation potential on real-time web (Perplexity tracks live web content)" |

---

**SENTIMENT rules** (triggered by negative or absent framing)

| Rule ID | Condition | Priority | Action |
|---|---|---|---|
| `S1` | `negative_mentions > 0` | critical | "AI is describing you negatively — audit and respond to negative reviews" |
| `S2` | `sentiment_score < 40` | high | "Improve your sentiment: request detailed positive reviews, not just star ratings" |
| `S3` | `neutral_mentions > 0 AND positive_mentions = 0` | medium | "Convert neutral AI mentions to positive — publish case studies and client testimonials" |

---

**CONTENT rules** (triggered by low content signals)

| Rule ID | Condition | Priority | Action |
|---|---|---|---|
| `C1` | `has_linkedin = true AND entity has no LinkedIn articles detected` | high | "Publish LinkedIn articles about your expertise — LinkedIn is a top 3 source for all LLMs" |
| `C2` | `profession is 'attorney' OR 'realtor' AND no FAQ detected` | high | "Publish FAQ content answering the questions your clients ask AI" |
| `C3` | `visibility_score < 60` | medium | "Create a YouTube channel or video content — YouTube is a primary AI citation source" |
| `C4` | `has_website = true` | medium | "Rewrite your About/Bio page with extractable, self-contained paragraphs AI can quote directly" |

---

**COMMUNITY rules** (triggered by lack of earned mentions)

| Rule ID | Condition | Priority | Action |
|---|---|---|---|
| `CM1` | All entities | medium | "Participate in Reddit and Quora threads where people ask about your profession or service area" |
| `CM2` | `sentiment_score < 70` | high | "Encourage clients to discuss you by name in online forums and community groups" |
| `CM3` | `visibility_score < 40` | high | "Request inclusion in '[Profession] in [City]' roundup articles and local directories" |

---

**TECHNICAL rules** (triggered by website checks)

| Rule ID | Condition | Priority | Action |
|---|---|---|---|
| `T1` | `has_website = true AND has_schema_markup = false` | high | "Add Organization or LocalBusiness schema markup to your homepage" |
| `T2` | `has_website = true` | medium | "Ensure your website loads without JavaScript being required — AI crawlers cannot execute JS" |
| `T3` | `has_website = true` | low | "Run a page speed test — AI cites fast, stable sites more consistently" |

---

### Recommendation Deduplication
Before inserting new recommendations after a scan:
1. Load all open (non-dismissed, non-completed) recommendations for the entity.
2. For each triggered rule, check if an identical `(entity_id, category, title)` row already exists as open.
3. If it exists, skip. If it does not exist, insert.
4. After evaluating all rules, query for previously open recommendations whose conditions are now satisfied (e.g., `P1` condition flips because user added a Google Business URL) and mark them `completed = true` automatically.

---

## 11. Scanner Adaptation

### Current Scanner Problem
`lib/scanner.ts` generates queries for e-commerce products:
- "Where can I buy [Product Name]?"
- "What are the best [category] brands?"

These are wrong for professionals. A realtor doesn't want to be found for "where can I buy realtors."

### New: `lib/geo-scanner.ts`

#### Query Generation for Entities

```typescript
function generateEntityQueries(entity: GeoEntity): QuerySet[] {
  const { name, profession, city, state } = entity;
  const location = [city, state].filter(Boolean).join(', ');
  const queries: QuerySet[] = [];

  // 1. Direct name search — does the AI know who this entity is?
  queries.push({
    query: `Who is ${name}?`,
    type: 'brand_search'
  });

  // 2. Category recommendation with location — where service buyers look
  if (profession && location) {
    queries.push({
      query: `Best ${profession} in ${location}`,
      type: 'category_reco'
    });
    queries.push({
      query: `Recommend a ${profession} near ${city ?? location}`,
      type: 'location_search'
    });
  }

  // 3. Review / reputation check
  queries.push({
    query: `Is ${name} a good ${profession ?? 'professional'}?`,
    type: 'review_check'
  });

  // 4. Comparison / alternatives
  if (profession && location) {
    queries.push({
      query: `Top ${profession}s in ${location} compared`,
      type: 'comparison'
    });
  }

  return queries;
}
```

#### Profession-Specific Query Variants

The query generator is enhanced with profession-specific templates driven by a lookup table:

```typescript
const PROFESSION_QUERY_TEMPLATES: Record<string, string[]> = {
  realtor: [
    'best realtor for first-time homebuyers in {city}',
    'who is the top real estate agent in {city} for luxury homes',
    'recommended buyer{apostrophe}s agent in {city}',
  ],
  attorney: [
    'best {specialty} attorney in {city}',
    'top-rated lawyer for {specialty} cases in {city}',
    'who handles {specialty} law in {city}',
  ],
  dentist: [
    'best dentist in {city}',
    'who is a good family dentist in {city}',
    'top-rated dental office in {city}',
  ],
  restaurant: [
    'best {cuisine} restaurant in {city}',
    'highly recommended {cuisine} place near {city}',
  ],
  generic: [
    'best {profession} in {city}',
    'top-rated {profession} near {city}',
    'recommend a {profession} in {city}',
  ],
};
```

For professionals with a specialty field (attorneys: estate planning, DUI; realtors: luxury, commercial), the specialty is injected into the templates.

#### Scan Execution

The entity scanner follows the same pattern as the product scanner:
- Loads all `geo_entities` for the user (or all users for cron)
- Generates 5–7 queries per entity per platform = up to 28 AI API calls per entity
- Writes results to `geo_mentions`
- After scan completes, triggers health score recalculation
- After health score, triggers recommendation generation
- Updates `geo_entities.last_scanned_at`

#### Rate Limiting (same as existing)
- 300ms sleep between queries on same platform
- 500ms sleep between platform switches
- Failed API calls are logged + counted (not silent `continue`)

---

## 12. Dashboard UI Plan

### Routes

| Route | Description |
|---|---|
| `/geo` | Main GEO dashboard — health score, mention chart, platform breakdown, recommendations |
| `/geo/onboarding` | Step-by-step entity profile setup |
| `/geo/entities` | List of all user's entities (if multiple) |
| `/geo/entities/[id]` | Deep-dive into a single entity |

### GEO Dashboard Layout (`/geo/page.tsx`)

```
[ Header: AgenticRev — GEO Dashboard ]

[ Verify Email Banner (if unverified) ]

[ Entity selector (dropdown or cards if multiple entities) ]

┌─────────────────────────────────────────────────────────┐
│  GEO Health Score         │ Last scanned: March 4, 2026 │
│                           │                              │
│     [ Gauge: 62 / 100 ]   │ [ Score Dimensions Bar ]     │
│     Grade: C — Fair       │   Visibility    ████░░  55  │
│                           │   Sentiment     ███████ 85  │
│                           │   Position      ████░░  48  │
│                           │   Platform Reach███░░░  50  │
│                           │   Presence      █████░  70  │
│                           │                              │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐ ┌───────────────────┐
│  Mentions (7 days)                   │ │  Platform Reach   │
│  [Line chart: ChatGPT/Perplexity/   │ │  [Bar chart]      │
│   Gemini/Claude]                     │ │                   │
└──────────────────────────────────────┘ └───────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Recommendations (ordered by priority)                   │
│                                                         │
│  🔴 CRITICAL  Claim your Google Business Profile        │
│  Reasoning: GBP is the primary source for ChatGPT...   │
│  [ Mark Complete ] [ Dismiss ]                          │
│                                                         │
│  🔴 CRITICAL  You are invisible to AI — build presence  │
│  ...                                                    │
│                                                         │
│  🟠 HIGH  Add schema markup to your website             │
│  ...                                                    │
│                                                         │
│  🟡 MEDIUM  Publish LinkedIn articles                   │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘

[ Scan Now button ]  [ View full history → ]
```

### GEO Onboarding Wizard (`/geo/onboarding/page.tsx`)

Multi-step form. Steps:

1. **Entity Type** — Individual Professional / Business / Brand
2. **Basic Info** — Name, profession/category, city, state
3. **Online Presence** — Website, Google Business Profile URL, LinkedIn, primary review platform URL
4. **Profile Verification** — Show the entity profile summary; confirm before first scan
5. **First Scan** — Trigger scan immediately; show progress indicator; redirect to dashboard on completion

The wizard uses `useState` in a client component with no page navigation between steps (single-page wizard).

### Component Inventory

| Component | Type | Description |
|---|---|---|
| `HealthScoreGauge.tsx` | Client | Radial SVG gauge (no extra library), color-coded by grade |
| `ScoreDimensions.tsx` | Client | Horizontal bar chart using Recharts `BarChart` (reuses existing pattern) |
| `RecommendationsList.tsx` | Client | Ordered cards with priority badge, dismiss/complete actions via SWR mutations |
| `GeoMentionChart.tsx` | Client | Fork of `MentionChart.tsx` with `geo_mentions` data shape |
| `PlatformBadges.tsx` | Server | Shows 4 platform chips: green tick = mentioned, grey = not seen |
| `EntityCard.tsx` | Server | Summary card for entity list page |
| `EntityForm.tsx` | Client | Create/edit form with Zod validation |
| `ScanButton.tsx` (geo) | Client | Same pattern as existing `ScanButton.tsx`, calls `POST /api/geo/scan` |

---

## 13. Billing Model

### Plan Redesign for GEO

The existing `PLAN_CONFIG` in `lib/stripe.ts` is updated with GEO-centric names and features. The code structure stays the same.

| Plan | Price/mo | Entities | Scan Frequency | History | Features |
|---|---|---|---|---|---|
| **Free** | $0 | 1 | Weekly (manual only) | 7 days | 4 platform scans, health score, top 3 recommendations |
| **Solo** | $49 | 1 | Daily | 30 days | Full recommendations, email alerts, weekly digest |
| **Pro** | $99 | 5 | Daily | 90 days | All Solo + comparison queries, sentiment analysis |
| **Agency** | $299 | 25 | Daily | 365 days | All Pro + client reporting, white-label ready |

**Key change from current model:** Replace `maxProducts` with `maxEntities`. Replace `maxStores` with nothing (irrelevant). Remove `acpEnabled`.

> **Note on Stripe IDs:** Free plan has no Stripe Price ID. Paid plans require corresponding `STRIPE_PRICE_ID_SOLO`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_AGENCY` env vars in Stripe dashboard and `.env.local`.

---

## 14. Implementation Phases — Localhost MVP

### Prerequisites (Day 0 — 30 min)
- [ ] Supabase project running locally or via hosted project
- [ ] At least one API key set: `OPENAI_API_KEY` (minimum to test scanner)
- [ ] `npm run dev` succeeds
- [ ] `npm run typecheck` passes on current codebase

---

### Phase 1 — Data Model (Day 1, ~4 hours)

**Goal:** New tables exist in Supabase. TypeScript types updated.

Tasks:
1. Write `supabase/migrations/003_geo_entities.sql` (tables: `geo_entities`, `geo_mentions`, `geo_health_scores`, `geo_recommendations`)
2. Apply migration to local/hosted Supabase
3. Add new types to `lib/types.ts`:
   - `GeoEntity`
   - `GeoMention`
   - `GeoHealthScore`
   - `GeoRecommendation`
   - `GeoEntityType` (union: `'professional' | 'business' | 'brand'`)
4. Run `npm run typecheck` — must pass

Deliverable: `supabase/migrations/003_geo_entities.sql` + updated `lib/types.ts`.

---

### Phase 2 — Scanner Engine (Day 2, ~5 hours)

**Goal:** `lib/geo-scanner.ts` can run a scan for an entity and write to `geo_mentions`.

Tasks:
1. Create `lib/geo-scanner.ts` with:
   - `generateEntityQueries(entity: GeoEntity): QuerySet[]`
   - `scanEntityOnPlatform(entity, platform): Promise<number>`
   - `runGeoScanner(userId?, limit?): Promise<ScanRunResult>`
   - Reuses `scanOpenAI`, `scanPerplexity`, `scanGemini`, `scanClaude` from `lib/scanner.ts` (import + reuse, do not duplicate)
2. Create `app/api/geo/scan/route.ts` — POST endpoint, auth-gated, calls `runGeoScanner(session.user.id)`
3. Create `app/api/cron/geo-scanner/route.ts` — GET endpoint, CRON_SECRET gated
4. Add cron entry to `vercel.json` (commented out for localhost):
   ```json
   { "path": "/api/cron/geo-scanner", "schedule": "0 3 * * *" }
   ```
5. Write a one-off test: create a test entity in DB, run scanner manually via `POST /api/geo/scan`, verify rows appear in `geo_mentions`
6. `npm run typecheck` must pass

Deliverable: Scanner works end-to-end for at least one platform (OpenAI).

---

### Phase 3 — Health Score Engine (Day 2–3, ~3 hours)

**Goal:** After a scan, `lib/geo-health.ts` can compute and persist a `geo_health_scores` row.

Tasks:
1. Create `lib/geo-health.ts` with:
   - `computeHealthScore(entityId: string, userId: string, windowDays: number): Promise<GeoHealthScore>`
   - Internal functions: `calcVisibilityScore`, `calcSentimentScore`, `calcPositionScore`, `calcReachScore`, `calcPresenceScore`
   - `persistHealthScore(score: GeoHealthScore): Promise<void>`
   - `getScoreHistory(entityId: string, limit: number): Promise<GeoHealthScore[]>`
2. Wire into `runGeoScanner()`: after scan completes for an entity, call `computeHealthScore` + `persistHealthScore`
3. `npm run typecheck` must pass

Deliverable: `geo_health_scores` row appears after every scan.

---

### Phase 4 — Recommendations Engine (Day 3, ~3 hours)

**Goal:** After a scan + health score, recommendations are generated and stored.

Tasks:
1. Create `lib/geo-recommendations.ts` with:
   - `generateRecommendations(entityId: string, score: GeoHealthScore, entity: GeoEntity): GeoRecommendation[]`
   - `persistRecommendations(recs: GeoRecommendation[]): Promise<void>` — with deduplication logic
   - `autoCompleteRecommendations(entityId: string, entity: GeoEntity): Promise<number>` — marks rules whose conditions are now satisfied as completed
2. Wire into post-scan flow: `runGeoScanner` → `computeHealthScore` → `generateRecommendations` → `persistRecommendations`
3. `npm run typecheck` must pass

Deliverable: `geo_recommendations` rows appear after scan with correct priority ordering.

---

### Phase 5 — API Routes (Day 3–4, ~4 hours)

**Goal:** All frontend-facing API routes exist and are typed.

Routes to build:

```
GET  /api/geo/entities           → list user's entities
POST /api/geo/entities           → create entity (Zod validated)
GET  /api/geo/entities/[id]      → get single entity
PATCH /api/geo/entities/[id]     → update entity profile
DELETE /api/geo/entities/[id]    → soft-delete entity

GET  /api/geo/stats              → dashboard stats (mentions, platform breakdown, timeline)
GET  /api/geo/health/[entityId]  → latest health score + last 30 days history
GET  /api/geo/recommendations/[entityId]  → open recommendations
POST /api/geo/recommendations/[entityId]/dismiss  → dismiss a recommendation
POST /api/geo/recommendations/[entityId]/complete → mark complete

POST /api/geo/scan               → manual scan trigger (auth-gated)
```

All routes:
- Use `auth()` from `lib/auth-server.ts`
- Guard `supabaseAdmin === null` → 503
- Validate input with Zod
- Return typed `NextResponse.json()`
- `npm run typecheck` must pass

---

### Phase 6 — GEO Dashboard UI (Day 4–5, ~6 hours)

**Goal:** `/geo` page renders with real data; user can see health score, mentions chart, and recommendations.

Tasks:
1. Create `app/geo/page.tsx` — server component; reads session, fetches entity list, stats, latest health score, open recommendations
2. Build `components/geo/HealthScoreGauge.tsx` — SVG radial gauge
3. Build `components/geo/ScoreDimensions.tsx` — Recharts BarChart (5 dimensions)
4. Build `components/geo/RecommendationsList.tsx` — cards with priority badge + dismiss/complete buttons (SWR mutations)
5. Build `components/geo/GeoMentionChart.tsx` — fork of existing `MentionChart.tsx`
6. Build `components/geo/PlatformBadges.tsx` — 4 platform status chips
7. Add "GEO" link to navigation in `app/geo/page.tsx` layout (and update `app/dashboard/page.tsx` nav)
8. Mobile responsive — all components use Tailwind responsive classes
9. `npm run typecheck && npm run lint` must pass

---

### Phase 7 — Onboarding Wizard (Day 5, ~3 hours)

**Goal:** A new user can create their first entity profile and trigger their first scan from `/geo/onboarding`.

Tasks:
1. Create `app/geo/onboarding/page.tsx` — multi-step wizard (client component)
2. Build `components/geo/EntityForm.tsx` — Zod schema for entity creation
3. On final step: call `POST /api/geo/entities` then `POST /api/geo/scan`, redirect to `/geo` on success
4. Redirect unauthenticated users to `/login`
5. If user already has entities, redirect `/geo/onboarding` → `/geo`
6. `npm run typecheck && npm run lint` must pass

---

### Phase 8 — Wire Billing (Day 6, ~2 hours)

**Goal:** Plan limits are enforced for entity count.

Tasks:
1. Add `maxEntities` field to `PlanConfig` in `lib/stripe.ts`
2. Update `PLAN_CONFIG` free/solo/pro/agency with new values and GEO-centric feature descriptions
3. In `POST /api/geo/entities`: check current entity count vs `sub.maxEntities`; return 403 with upgrade message if over limit
4. Show upgrade CTA on `/geo` dashboard if user is on free plan and has 0 entities left
5. `npm run typecheck && npm run lint` must pass

---

### Phase 9 — Localhost Validation (Day 6, ~2 hours)

**Goal:** End-to-end working feature on localhost.

Validation checklist:
- [ ] Create account → go through GEO onboarding → entity created
- [ ] Trigger scan → at least one platform scan completes (OpenAI minimum)
- [ ] `geo_mentions` rows appear in DB
- [ ] `geo_health_scores` row appears in DB
- [ ] `geo_recommendations` rows appear in DB
- [ ] Dashboard shows health score gauge with non-zero value
- [ ] Dashboard shows platform breakdown bar chart
- [ ] Dashboard shows 7-day timeline chart
- [ ] Recommendations list shows at least 3 items
- [ ] Dismiss a recommendation → it disappears from list
- [ ] `npm run build` succeeds (no TypeScript errors)

---

## 15. File Map

### New Files to Create

```
supabase/migrations/003_geo_entities.sql
lib/geo-scanner.ts
lib/geo-health.ts
lib/geo-recommendations.ts
lib/geo-stats.ts
app/geo/page.tsx
app/geo/onboarding/page.tsx
app/api/geo/entities/route.ts
app/api/geo/entities/[id]/route.ts
app/api/geo/scan/route.ts
app/api/geo/stats/route.ts
app/api/geo/health/[entityId]/route.ts
app/api/geo/recommendations/[entityId]/route.ts
app/api/geo/recommendations/[entityId]/dismiss/route.ts
app/api/geo/recommendations/[entityId]/complete/route.ts
app/api/cron/geo-scanner/route.ts
components/geo/HealthScoreGauge.tsx
components/geo/ScoreDimensions.tsx
components/geo/RecommendationsList.tsx
components/geo/GeoMentionChart.tsx
components/geo/PlatformBadges.tsx
components/geo/EntityCard.tsx
components/geo/EntityForm.tsx
components/geo/ScanButton.tsx
```

### Files to Modify

```
lib/types.ts              → Add GeoEntity, GeoMention, GeoHealthScore, GeoRecommendation types
lib/stripe.ts             → Add maxEntities to PlanConfig; update PLAN_CONFIG
lib/scanner.ts            → Export scanOpenAI/scanPerplexity/scanGemini/scanClaude for reuse by geo-scanner
app/dashboard/page.tsx    → Add "GEO Dashboard" link to nav
vercel.json               → Add geo-scanner cron entry (commented out for localhost)
```

### Files to Leave Unchanged

```
lib/auth.ts
lib/auth-server.ts
lib/supabase.ts
lib/email.ts
lib/shopify.ts            (preserved, deactivated from UI)
lib/truth-engine.ts       (preserved, deactivated from UI)
app/api/auth/             (all auth routes)
app/api/shopify/          (preserved, deactivated from UI)
app/api/cron/shopify-sync
app/api/cron/truth-engine
app/api/webhooks/
app/login/, app/signup/, app/forgot-password/, app/reset-password/
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_auth_tokens.sql
components/billing/
components/stores/
components/truth-engine/
components/onboarding/
```

---

## 16. Environment Variables

The following new env vars are needed:

```bash
# Already required (unchanged)
NEXTAUTH_SECRET=
NEXTAUTH_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
PERPLEXITY_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
CRON_SECRET=

# New for GEO billing plans (add to .env.example)
STRIPE_PRICE_ID_SOLO=
STRIPE_PRICE_ID_PRO=
STRIPE_PRICE_ID_AGENCY=
```

For **localhost MVP**, only `OPENAI_API_KEY` is strictly required. The scanner will skip platforms with missing API keys (same pattern as existing scanner).

---

## 17. Open Questions & Deferred Work

### Deferred — Post MVP

| Item | Notes |
|---|---|
| **Website metadata auto-detection** | Fetch the entity's website and auto-detect schema markup presence, FAQ pages, page speed. Removes manual checkbox entry. |
| **Google Business Profile integration** | Use Google My Business API to pull reviews and verify GBP existence automatically. |
| **Review platform scan** | Use Yelp API / Google Places API to pull existing reviews and include in sentiment calculations. |
| **Share of voice vs. competitors** | Track competitor entities and show relative mention rate. Requires user to define competitors. |
| **LinkedIn article / content scanning** | Scan LinkedIn for the entity's published content; score content quality for extractability. |
| **Wikipedia/Knowledge Graph check** | Auto-detect whether entity has a Wikipedia page or Google Knowledge Panel. |
| **PDF / export reporting** | Agency-tier feature: generate a one-page GEO health report PDF for clients. |
| **White-label dashboard** | Agency plan: custom domain, logo replacement for client-facing views. |
| **Free website scan tool** | Marketing acquisition tool: single-query free scan to show a non-user how their business appears. |
| **ACP / OpenAI Shopping integration** | Retained in codebase. Roadmap for H2 2026. |
| **Auto-response text extraction** | Extract the specific sentence about the entity from the AI response and store as `framing`. Currently partially implemented. |
| **Multi-language / international** | Non-English scan queries for entities in non-English markets. |

### Open Questions for Decision

| Question | Recommendation |
|---|---|
| Should `geo_mentions` table be separate from `ai_mentions` or extend it? | Separate. Different schema (entity_id vs product_id, query_type field, framing field). Avoids polluting the existing e-commerce scan flow. |
| Should the GEO dashboard replace the existing `/dashboard` route? | No. Existing `/dashboard` stays for Shopify users. `/geo` is the new route. For new registrations, show GEO onboarding first. |
| How do we handle a user who has both Shopify stores and GEO entities? | Show both in nav. Long-term: account for this in plan limits. For now, treat them independently. |
| Should the first scan run immediately on entity creation, or be manually triggered? | Run automatically on first creation (better UX), limit subsequent scans by plan. |
| For the free plan, should manual scans be rate-limited? | Yes — 1 manual scan per 24 hours on free. Enforce in `POST /api/geo/scan` by checking `last_scanned_at`. |

---

## References

The following external sources were used to derive the GEO framework, health score dimensions, and recommendation rules in this document:

1. Leigh McKenzie, "Generative Engine Optimization (GEO): How to Win AI Mentions," *Search Engine Land*, February 11, 2026. https://searchengineland.com/generative-engine-optimization-geo-444418

2. Leigh McKenzie & Asif Ali, "How to Rank in AI Search (New Strategy & Framework)," *Backlinko*, February 6, 2026. https://backlinko.com/ai-search-strategy

3. Semrush AI Visibility Index (Enterprise), Q4 2025. https://ai-visibility-index.semrush.com/

4. Conductor Academy, "Generative Engine Optimization (GEO)," *Conductor*, 2026. https://www.conductor.com/academy/glossary/generative-engine-optimization/

5. Marie Martens, "From $2 to $3M ARR: How We Bootstrapped Tally with a Tiny Team," *Tally Blog* (cited in Backlinko, 2026). https://blog.tally.so/from-2-to-3m-arr-how-we-bootstrapped-tally-with-a-tiny-team/

---

*End of document. This plan covers everything needed to deliver the GEO feature on localhost as a functional MVP. No Shopify dependency. No e-commerce product model. Built on the existing infrastructure.*
