# Data Model: AgenticRev ICP Pivot

## Entities

### businesses (NEW — replaces stores)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| user_id | UUID | FK → users, NOT NULL | Owning user |
| business_name | TEXT | NOT NULL | Display name |
| business_type | ENUM | NOT NULL | realtor, restaurant, law_firm, dental, plumber, salon, accountant, saas, ecommerce, agency, medical, fitness, home_services, consulting, other |
| business_category | TEXT | nullable | Free-text specificity (e.g., "pediatric dentist") |
| address_street | TEXT | nullable | Street address |
| address_city | TEXT | nullable | City |
| address_state | TEXT | nullable | State/province |
| address_zip | TEXT | nullable | ZIP/postal code |
| address_country | TEXT | default 'US' | ISO country code |
| phone | TEXT | nullable | Business phone |
| email | TEXT | nullable | Business email |
| website_url | TEXT | nullable | Primary website (optional — some businesses have none) |
| google_business_profile_url | TEXT | nullable | GBP URL |
| social_profiles | JSONB | default '{}' | Keys: zillow, realtor_com, yelp, linkedin, facebook, instagram, twitter, tiktok |
| service_areas | JSONB | default '[]' | Array of cities/neighborhoods/zip codes served |
| description | TEXT | nullable | Business description for AI query generation context |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | default now() | Last update timestamp |

**Relationships**:
- businesses belongs to users (user_id)
- businesses has many competitors
- businesses has many tracked_queries
- businesses has many ai_mentions (via business_id)
- businesses has many citations
- businesses has many brand_visibility records
- businesses has many seo_snapshots
- businesses has many geo_audits
- businesses has many agent_conversations
- businesses has many operator_tasks

**Validation Rules**:
- business_name: min 2 chars, max 200 chars
- website_url: valid URL format when present
- service_areas: at least 1 area required for local businesses (business_type not in [saas, ecommerce])
- Max businesses per user enforced at API level per plan: Free(1), Pro(1), Business(3), Enterprise(10)

---

### competitors

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| business_id | UUID | FK → businesses, NOT NULL | Parent business |
| user_id | UUID | FK → users, NOT NULL | Owning user (for RLS) |
| competitor_name | TEXT | NOT NULL | Competitor display name |
| website_url | TEXT | nullable | Competitor website |
| google_business_profile_url | TEXT | nullable | Competitor GBP URL |
| notes | TEXT | nullable | User notes about competitor |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |

**Relationships**:
- competitors belongs to businesses (business_id)
- competitors has many citations (via competitor_id)

**Validation Rules**:
- competitor_name: min 2 chars, max 200 chars
- Max competitors per business enforced per plan: Free(2), Pro(5), Business(10), Enterprise(25)
- UNIQUE constraint on (business_id, competitor_name)

---

### tracked_queries

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| business_id | UUID | FK → businesses, NOT NULL | Parent business |
| user_id | UUID | FK → users, NOT NULL | Owning user (for RLS) |
| query_text | TEXT | NOT NULL | The prompt sent to AI platforms |
| query_type | ENUM | NOT NULL | system_generated, user_custom, otterly_imported, otterly_prompt_research, gsc_imported, sonar_discovered |
| intent_category | ENUM | nullable | discovery, comparison, review, service_specific, location_specific |
| intent_volume | INTEGER | nullable | Estimated monthly search volume (from Otterly) |
| growth_3m | DECIMAL | nullable | 3-month growth % (from Otterly) |
| tags | JSONB | default '[]' | Organizational tags |
| is_active | BOOLEAN | default true | Whether query is actively scanned |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |

**Relationships**:
- tracked_queries belongs to businesses (business_id)
- tracked_queries has many ai_mentions (via query_id)

**Validation Rules**:
- query_text: min 5 chars, max 500 chars
- Max active queries per business per plan: Free(10), Pro(50), Business(150), Enterprise(500)
- UNIQUE constraint on (business_id, query_text)

---

### ai_mentions (MODIFIED — existing table extended)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| business_id | UUID | FK → businesses, nullable | New: linked business (nullable for migration) |
| product_id | UUID | FK → products, nullable | Legacy: kept for backward compat |
| query_id | UUID | FK → tracked_queries, nullable | New: linked query |
| user_id | UUID | FK → users, NOT NULL | Owning user |
| platform_id | UUID | FK → ai_platforms, NOT NULL | AI platform |
| query_text | TEXT | NOT NULL | Query used (denormalized for legacy compat) |
| mentioned | BOOLEAN | NOT NULL | Was business mentioned? |
| position | INTEGER | nullable | Position in recommendation list |
| sentiment | TEXT | nullable | positive, neutral, negative |
| context | TEXT | nullable | Full AI response text |
| competitors_mentioned | JSONB | default '[]' | New: [{competitor_id, name, position, sentiment}] |
| search_results | JSONB | nullable | New: Perplexity Sonar search results array |
| related_questions | JSONB | nullable | New: Perplexity related questions array |
| search_context_size | TEXT | nullable | New: low/medium/high (Perplexity) |
| nss_score | DECIMAL | nullable | New: Net Sentiment Score (Otterly import) |
| sentiment_attributes | JSONB | nullable | New: positive/negative descriptors (Otterly) |
| domain_cited | BOOLEAN | nullable | New: was user's domain specifically cited? |
| source | TEXT | default 'llm_scan' | New: llm_scan, perplexity_sonar, otterly_import |
| token_usage | JSONB | nullable | New: {prompt_tokens, completion_tokens, total_tokens} |
| scan_date | TIMESTAMPTZ | default now() | Scan timestamp |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |

**State Transitions**: N/A (append-only — each scan creates new rows)

---

### citations (NEW)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| ai_mention_id | UUID | FK → ai_mentions, nullable | Linked scan mention |
| business_id | UUID | FK → businesses, NOT NULL | Parent business |
| user_id | UUID | FK → users, NOT NULL | Owning user (for RLS) |
| cited_url | TEXT | NOT NULL | Full URL of cited source |
| cited_domain | TEXT | NOT NULL | Domain extracted from URL |
| cited_title | TEXT | nullable | Page title |
| cited_snippet | TEXT | nullable | Excerpt from source |
| cited_publish_date | TIMESTAMPTZ | nullable | Publication date (from Perplexity Sonar) |
| platform_id | UUID | FK → ai_platforms, NOT NULL | Which AI platform cited this |
| position | INTEGER | nullable | Rank of citation in response |
| domain_category | TEXT | nullable | brand, news_media, blog, community_forum, social_media, other (from Otterly) |
| is_own_domain | BOOLEAN | default false | Is this the user's domain? |
| is_competitor_domain | BOOLEAN | default false | Is this a competitor's domain? |
| competitor_id | UUID | FK → competitors, nullable | If citation belongs to a competitor |
| source | TEXT | NOT NULL | llm_scan, perplexity_sonar, otterly_import |
| scan_date | TIMESTAMPTZ | NOT NULL | When the citation was captured |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |

**Relationships**:
- citations belongs to businesses (business_id)
- citations optionally belongs to ai_mentions (ai_mention_id)
- citations optionally belongs to competitors (competitor_id)

**Validation Rules**:
- cited_url: valid URL format
- cited_domain: extracted from cited_url, normalized (lowercase, no www prefix)

---

### brand_visibility (NEW)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| business_id | UUID | FK → businesses, NOT NULL | Parent business |
| user_id | UUID | FK → users, NOT NULL | Owning user (for RLS) |
| platform_id | UUID | FK → ai_platforms, nullable | null = aggregate across all |
| coverage_rate | DECIMAL | nullable | % of tracked prompts where brand appears |
| share_of_voice | DECIMAL | nullable | % of mentions vs. competitors |
| mention_count | INTEGER | nullable | Total mentions in period |
| brand_position_avg | DECIMAL | nullable | Average ranking position |
| brand_rank | INTEGER | nullable | Competitive ranking |
| domain_coverage | DECIMAL | nullable | % of prompts citing user's domain |
| domain_citations_count | INTEGER | nullable | Total domain citations |
| domain_rank | INTEGER | nullable | Domain leaderboard position |
| nss_score | DECIMAL | nullable | Net Sentiment Score (-100 to +100) |
| sentiment_negative_pct | DECIMAL | nullable | Negative sentiment % |
| sentiment_neutral_pct | DECIMAL | nullable | Neutral sentiment % |
| sentiment_positive_pct | DECIMAL | nullable | Positive sentiment % |
| sentiment_count | INTEGER | nullable | Volume of sentiment signals |
| bvi_quadrant | TEXT | nullable | leaders, niche, low_conversion, low_performance |
| bvi_coverage_x | DECIMAL | nullable | BVI x-axis value |
| bvi_likelihood_y | DECIMAL | nullable | BVI y-axis value |
| competitor_mention_counts | JSONB | default '{}' | {competitor_id: count} |
| source | TEXT | NOT NULL | calculated, otterly_import, looker_studio |
| period_start | DATE | NOT NULL | Period start |
| period_end | DATE | NOT NULL | Period end |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |

---

### seo_snapshots (NEW)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| business_id | UUID | FK → businesses, NOT NULL | Parent business |
| user_id | UUID | FK → users, NOT NULL | Owning user (for RLS) |
| domain_authority_rank | INTEGER | nullable | SEMrush domain rank |
| organic_keywords_count | INTEGER | nullable | Total organic keywords |
| organic_traffic | INTEGER | nullable | Est. monthly organic traffic |
| organic_traffic_cost | DECIMAL | nullable | Dollar value of organic traffic |
| backlinks_total | INTEGER | nullable | Total backlinks |
| referring_domains | INTEGER | nullable | Unique referring domains |
| authority_score | INTEGER | nullable | Authority Score (0-100) |
| ai_overview_keywords_total | INTEGER | nullable | FK52: keywords triggering AI Overview |
| ai_overview_keywords_present | INTEGER | nullable | FP52: keywords where domain appears IN AI Overview |
| ai_traffic_assistants | INTEGER | nullable | Traffic from ChatGPT, Claude etc. (Trends API) |
| ai_traffic_search | INTEGER | nullable | Traffic from Google AI Overviews, Copilot (Trends API) |
| maps_avg_rank | DECIMAL | nullable | Google Maps avg rank |
| maps_share_of_voice | DECIMAL | nullable | Maps Share of Voice |
| maps_rank_good_pct | DECIMAL | nullable | % positions 1-3 |
| maps_rank_avg_pct | DECIMAL | nullable | % positions 4-10 |
| maps_rank_poor_pct | DECIMAL | nullable | % positions 11-20 |
| serp_features | JSONB | default '{}' | {feature_code: {total_keywords, keywords_present}} |
| schema_types_found | JSONB | default '[]' | Schema types detected by Site Audit |
| schema_valid_count | INTEGER | nullable | Valid structured data count |
| schema_invalid_count | INTEGER | nullable | Invalid/error count |
| schema_markup_score | DECIMAL | nullable | Validity percentage |
| site_health_score | DECIMAL | nullable | Site Audit overall score |
| core_web_vitals | JSONB | nullable | {lcp, fid, cls} |
| top_keywords | JSONB | default '[]' | [{keyword, position, volume, traffic_pct, ai_overview_present}] |
| traffic_sources | JSONB | default '{}' | {direct, referral, organic, paid, social, email, display, ai_assistants, ai_search} |
| audience_demographics | JSONB | nullable | {age_groups, gender, income, geo} |
| snapshot_date | DATE | NOT NULL | Date of snapshot |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |

---

### geo_audits (NEW)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| business_id | UUID | FK → businesses, NOT NULL | Parent business |
| user_id | UUID | FK → users, NOT NULL | Owning user (for RLS) |
| audit_type | TEXT | NOT NULL | initial, quarterly, on_demand |
| crawlability_score | DECIMAL | nullable | 0-100 |
| crawlability_details | JSONB | nullable | {server_access, robots_txt, ai_bot_blocking, misconfigs} |
| content_score | DECIMAL | nullable | 0-100 |
| content_details | JSONB | nullable | {static_vs_dynamic, depth, relevance, metadata_quality, ai_readiness} |
| structured_data_score | DECIMAL | nullable | 0-100 |
| structured_data_details | JSONB | nullable | {structure_quality, content_analysis, technical_aspects, ai_understanding} |
| strengths | JSONB | default '[]' | SWOT strengths |
| weaknesses | JSONB | default '[]' | SWOT weaknesses |
| opportunities | JSONB | default '[]' | SWOT opportunities |
| threats | JSONB | default '[]' | SWOT threats |
| recommendations | JSONB | default '[]' | [{title, description, priority, category, status}] |
| evaluation_factors | JSONB | default '{}' | 25+ scored factors |
| overall_score | INTEGER | nullable | 1-100 |
| source | TEXT | NOT NULL | otterly, internal, agent |
| audit_date | DATE | NOT NULL | Date of audit |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |

**State Transitions for recommendations**:
- pending → in_progress: User starts working on recommendation
- in_progress → completed: User marks as done
- pending → dismissed: User explicitly skips
- completed/dismissed → pending: User re-opens

---

### agent_conversations (NEW)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| business_id | UUID | FK → businesses, NOT NULL | Business context |
| user_id | UUID | FK → users, NOT NULL | Owning user (for RLS) |
| messages | JSONB | default '[]' | [{role, content, timestamp}] |
| context_snapshot | JSONB | nullable | Data context at conversation start |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | default now() | Last message timestamp |

---

### operator_tasks (NEW)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| business_id | UUID | FK → businesses, NOT NULL | Target business |
| user_id | UUID | FK → users, NOT NULL | Customer's user_id |
| operator_id | UUID | nullable | Assigned operator user_id |
| task_type | TEXT | NOT NULL | otterly_setup, otterly_scan, otterly_export, geo_audit |
| status | TEXT | default 'pending' | pending, in_progress, completed, failed |
| notes | TEXT | nullable | Operator notes |
| data_files | JSONB | default '[]' | References to uploaded files |
| due_date | TIMESTAMPTZ | nullable | SLA deadline |
| completed_at | TIMESTAMPTZ | nullable | Completion timestamp |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |

**State Transitions**:
- pending → in_progress: Operator picks up task
- in_progress → completed: Data imported successfully
- in_progress → failed: Import failed (with notes)
- failed → in_progress: Operator retries

---

### data_imports (NEW)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| business_id | UUID | FK → businesses, NOT NULL | Target business |
| operator_id | UUID | NOT NULL | Importing operator |
| import_type | TEXT | NOT NULL | otterly_prompts, otterly_citations, otterly_citations_summary, otterly_visibility, otterly_geo_audit |
| file_name | TEXT | NOT NULL | Uploaded file name |
| row_count | INTEGER | nullable | Rows processed |
| status | TEXT | default 'pending' | pending, processing, completed, failed |
| error_log | TEXT | nullable | Error details if failed |
| diff_summary | JSONB | nullable | {new_citations, lost_citations, visibility_change, sentiment_shift} |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |

**State Transitions**:
- pending → processing: Parser starts
- processing → completed: All rows inserted
- processing → failed: Parsing or validation error

---

### ai_platforms (MODIFIED — add rows)

Existing rows: chatgpt, perplexity, gemini, claude

New rows to add:
| name | slug | scan_method | Description |
|------|------|-------------|-------------|
| Google AI Overviews | google_aio | otterly_only | Tracked via Otterly |
| Google AI Mode | google_ai_mode | otterly_only | Tracked via Otterly (separate from AIO) |
| Microsoft Copilot | copilot | otterly_only | Tracked via Otterly |

Total: 7 platform rows (4 direct LLM + 3 Otterly-only)

---

### users (MODIFIED — add column)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| role | TEXT | default 'customer' | customer, operator, admin |

---

## Entity Relationship Summary

```text
users 1──N businesses
users 1──N subscriptions
businesses 1──N competitors
businesses 1──N tracked_queries
businesses 1──N ai_mentions
businesses 1──N citations
businesses 1──N brand_visibility
businesses 1──N seo_snapshots
businesses 1──N geo_audits
businesses 1──N agent_conversations
businesses 1──N operator_tasks
tracked_queries 1──N ai_mentions
ai_mentions 1──N citations
competitors 0──N citations
ai_platforms 1──N ai_mentions
ai_platforms 1──N citations
ai_platforms 0──N brand_visibility
operator_tasks N──1 users (operator_id)
data_imports N──1 businesses
```

## Indexes Required

- `businesses`: (user_id), (business_type, address_city)
- `competitors`: (business_id), (user_id)
- `tracked_queries`: (business_id), (user_id), (business_id, is_active)
- `ai_mentions`: (business_id, scan_date), (query_id), (platform_id, scan_date), (user_id)
- `citations`: (business_id, scan_date), (cited_domain), (platform_id), (user_id)
- `brand_visibility`: (business_id, period_start), (user_id)
- `seo_snapshots`: (business_id, snapshot_date), (user_id)
- `geo_audits`: (business_id, audit_date), (user_id)
- `agent_conversations`: (business_id), (user_id)
- `operator_tasks`: (operator_id, status), (business_id), (due_date, status)
- `data_imports`: (business_id), (operator_id, status)
