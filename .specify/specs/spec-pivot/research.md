# Research: AgenticRev ICP Pivot

## Decisions

### D1: Perplexity Sonar as Primary, Legacy as Fallback
- **Decision**: Use Perplexity Sonar API as the primary Perplexity scanning method; keep legacy direct query (sonar-small-online) as fallback
- **Rationale**: Sonar provides richer data (citations with metadata, search_results array, related_questions, structured output). Citation tokens are no longer billed, reducing costs. Structured output ensures consistent data extraction. The legacy path provides graceful degradation.
- **Alternatives Considered**:
  - Sonar only (no fallback): Rejected — violates graceful degradation constitution principle
  - Legacy only (no Sonar upgrade): Rejected — misses critical citation data, search_results, and related_questions

### D2: SEMrush Position Tracking via Projects API (not Analytics API)
- **Decision**: Use SEMrush Projects API for Position Tracking (SERP Code 52 / AI Overview detection) rather than the Analytics API domain_organic endpoint alone
- **Rationale**: The Projects API provides ongoing rank tracking with SERP feature detection including Code 52 (AI Overview). The Analytics API's FK52/FP52 columns give aggregate counts, but Position Tracking gives per-keyword AI Overview presence. We use BOTH: FK52/FP52 from domain_organic for headline KPIs, Position Tracking for detailed per-keyword analysis.
- **Alternatives Considered**:
  - Analytics API FK52/FP52 only: Rejected — gives totals but not per-keyword breakdown or competitor comparison per keyword
  - Position Tracking only: Rejected — FK52/FP52 headline numbers are valuable for dashboard KPI cards

### D3: Otterly Operator Workflow (Manual) — No Automation
- **Decision**: Human operators manually export CSVs from Otterly.ai and import via admin panel. No scraping, no browser automation, no Puppeteer.
- **Rationale**: Otterly has no public API. Scraping violates ToS and is fragile. The operator cost (~$15-25/mo per Enterprise account) is acceptable given 90%+ gross margins. Operator workflow also provides quality control on imported data.
- **Alternatives Considered**:
  - Browser automation (Puppeteer/Playwright): Rejected — violates Otterly ToS, fragile, maintenance burden
  - Looker Studio → BigQuery → DB pipeline: Considered for future — partially automates the data flow. Good candidate for Phase 2 optimization.
  - Wait for Otterly API: Rejected — timeline unknown, can't block product launch

### D4: AI Concierge Model Architecture
- **Decision**: Use configurable LLM (default: GPT-4o via AGENT_MODEL env var) as primary conversation model, with Perplexity Agent API as a tool for web research
- **Rationale**: GPT-4o provides the best conversational quality for advisory chat. Perplexity Agent API's `web_search` and `fetch_url` tools are superior for autonomous web research (competitor analysis, content freshness checks). Separating concerns: GPT-4o for conversation, Perplexity for research.
- **Alternatives Considered**:
  - Perplexity as sole model: Rejected — Sonar is optimized for search, not advisory conversation
  - Claude as primary: Viable alternative. Can be swapped via AGENT_MODEL env var. GPT-4o chosen as default for function calling maturity.
  - Multi-model orchestration: Over-engineered for MVP. Can revisit.

### D5: AI Visibility Score Calculation
- **Decision**: Composite score (0-100) = `(mention_rate × 0.4) + (avg_position_normalized × 0.2) + (sentiment_score × 0.2) + (own_domain_citation_rate × 0.2)`
- **Rationale**: Mention rate is the strongest signal (are you being mentioned at all?). Position and sentiment add quality dimension. Own-domain citation rate measures whether AI is directing traffic to your site specifically. Weights are configurable for tuning post-launch.
- **Alternatives Considered**:
  - Simple mention percentage: Rejected — too simplistic, doesn't capture quality
  - ML-based score: Over-engineered for MVP. Insufficient training data. Can revisit when we have usage data.
  - Include SEMrush authority in score: Rejected — visibility score should reflect AI platform behavior, not SEO inputs. Authority is shown separately.

### D6: Database Schema — businesses Replaces stores
- **Decision**: Create new `businesses` table as primary entity. Soft-deprecate `stores` (add deprecated_at, keep data). Do NOT rename or alter `stores`.
- **Rationale**: Clean schema for new ICP. `businesses` has fundamentally different fields (address, service_areas, social_profiles, business_type). Renaming `stores` would break existing code and data. Soft deprecation preserves migration path.
- **Alternatives Considered**:
  - Rename stores to businesses: Rejected — breaks all existing foreign keys, triggers, and code references
  - Extend stores with new columns: Rejected — semantic mismatch (stores ≠ businesses), too many irrelevant Shopify columns

### D7: Query Generation Strategy
- **Decision**: LLM-powered query generation using business_type + city/neighborhood + service_areas. Templates per business type with LLM expansion.
- **Rationale**: Discovery-intent queries differ radically from purchase-intent queries. "Best realtor in Coral Gables" vs. "buy [product] online" require fundamentally different generation logic. LLM generates natural-language queries that match how users actually prompt AI assistants.
- **Alternatives Considered**:
  - Template-only (no LLM): Rejected — too rigid, misses natural phrasing variations
  - User-provided queries only: Rejected — users don't know what queries matter; system should generate + user can customize
  - Otterly Prompt Research integration: Will be added — operator imports prompt suggestions from Otterly's AI Prompt Research Tool as `query_type: 'otterly_prompt_research'`

### D8: Caching Strategy for External APIs
- **Decision**: SEMrush: 24h cache minimum (weekly refresh cron). Perplexity Sonar: per-scan only (no persistent cache — each scan gets fresh results). LLMs: per-scan only. Otterly: manual import cadence (weekly/bi-weekly).
- **Rationale**: SEMrush data changes slowly (keyword rankings, authority scores shift over days/weeks). Perplexity and LLM results should be fresh each scan to detect changes. Otterly cadence is operator-driven.
- **Alternatives Considered**:
  - Aggressive caching on all sources (7-day): Rejected — stale LLM/Sonar results defeat the purpose of monitoring
  - No caching: Rejected — wasteful API unit consumption, violates cost-conscious principle

## Open Questions

- Should we implement a Looker Studio → BigQuery → Supabase semi-automated pipeline for Otterly data (reduces operator burden on Business+ plans)? → Deferred to post-MVP.
- Should the AI Concierge support voice input/output? → Deferred. Text chat only at launch.
- What is the exact SEMrush API unit budget per plan tier? → Needs determination based on actual unit consumption testing during development.
- Should we track Perplexity's `search_results` separately from `citations` in the UI? → Yes, but in a collapsed/advanced section. Citations are the primary UI element.
