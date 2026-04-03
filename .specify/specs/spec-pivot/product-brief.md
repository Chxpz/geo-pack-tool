# Product Brief: AgenticRev — AI Visibility Platform for Realtors & Small Businesses

**Date**: 2026-04-02
**Author**: Rafa (Stack3 Labs) / Generated from Pivot Plan briefing
**Status**: Draft

## Vision

Every local business and realtor knows exactly how AI search engines see them — and has a clear, actionable path to becoming the one AI recommends.

## Target Users

| User Type | Context | Pain Point |
|-----------|---------|------------|
| **Realtors** (agents, teams, brokerages) | Solo agents doing $2M–$10M annual volume to teams/brokerages at $50M+, primarily US and Canada | AI search bypasses their listings entirely; competitors with stronger digital presence get cited while they remain invisible; no way to know if ChatGPT or Perplexity recommends them; lack technical knowledge for schema markup and GEO strategies |
| **Small Businesses** (any vertical) | Local businesses (restaurants, law firms, dental, plumber, salon, accountant, etc.) and online-first SMBs (SaaS, e-commerce, consultancies), 1–50 employees, limited marketing resources | Zero visibility into what AI says about them; traditional SEO agencies don't offer GEO/AEO; no affordable self-serve monitoring tool; see competitors recommended by AI without understanding why |
| **Operators** (internal) | Stack3 Labs team members who manually collect Otterly.ai data on behalf of customers | Need efficient workflow tooling, task queue management, CSV import pipeline, and clear SOPs for data collection cycles |

## Problem Statement

AI search engines (ChatGPT, Perplexity, Gemini, Claude, Google AI Overviews, Google AI Mode, Microsoft Copilot) are rapidly becoming the primary way consumers discover and choose local businesses and service providers. Yet small businesses and realtors have zero visibility into what these AI platforms say about them, no tools to monitor their AI presence over time, and no actionable guidance on how to improve. Traditional SEO agencies either don't offer GEO/AEO services or charge premium agency rates inaccessible to SMBs.

## Core Value Proposition

AgenticRev is the only self-serve platform that combines real-time LLM analysis across 4 AI engines, SEMrush-powered SEO and authority intelligence (including direct AI Overview visibility measurement), Perplexity Sonar citation extraction, and Otterly.ai's 6-platform citation monitoring — all unified into a single dashboard that tells businesses exactly how AI sees them and what to do about it. The highest tier includes an AI Concierge agent that acts as a dedicated GEO specialist with full access to the customer's data.

## Scope

### In Scope

- **Pillar 1 — AI Visibility Scanner:** Direct LLM queries across ChatGPT, Perplexity, Gemini, Claude with competitor extraction; Perplexity Sonar API integration for rich citation data, related questions, domain-filtered analysis, and structured output
- **Pillar 2 — SEO & Authority Intelligence:** SEMrush API integration (9 endpoints): Domain Overview, Domain Organic (FK52/FP52 AI Overview columns), Backlinks Overview, Keyword Overview, Position Tracking (SERP Code 52 AI Overview detection), Site Audit (30+ schema types), Trends API (AI traffic channels), Map Rank Tracker (FREE), Listing Management
- **Pillar 3 — Citation & Visibility Monitoring:** Otterly.ai operator workflow — manual CSV exports across 6 AI platforms (ChatGPT, Google AI Overviews, Google AI Mode, Perplexity, Gemini, Microsoft Copilot); Brand Visibility Index (BVI), Net Sentiment Score (NSS), Domain Category classification, GEO Audit (25+ factors), gap analysis, weekly citation tracking
- **Pillar 4 — AI Concierge Agent:** Enterprise-only AI agent with RAG over customer data; Perplexity Agent API for autonomous research; Deep Research mode for competitive reports; personalized insights, content briefs, schema markup recommendations, competitive intelligence, progress tracking, report generation
- **Business onboarding:** Replace Shopify wizard with business-centric flow (business profile → online presence → competitors → first scan)
- **New dashboard:** AI Visibility Score (0-100 composite), Share of Voice, Citation Map, Competitor Comparison, SEO Health, GEO Audit Summary, Platform Breakdown
- **Pricing restructure:** Free ($0) / Pro ($149) / Business ($399) / Enterprise ($899)
- **Operator admin panel:** CSV import, task queue, data import logging
- **Database migration:** 10 new tables, 4 modified tables, 4 deprecated tables

### Out of Scope

- Shopify integration for new users (existing code deprecated)
- WooCommerce or any e-commerce platform integration
- ACP (Agentic Commerce Protocol) — was Shopify-specific
- Automated Otterly.ai interaction (no scraping, no browser automation)
- White-label reporting
- Mobile app
- Multi-language support (English only at launch)
- Self-serve Otterly integration (users don't log into Otterly)
- SEMrush accounts for users (we use our own API access)
- Direct website editing (Concierge recommends, doesn't implement)
- Zillow/Realtor.com/MLS data integrations (future consideration)

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Paid users within 90 days | 30 | Stripe subscription count |
| Monthly churn rate | < 8% | Subscription cancellations / active subs |
| NPS score | > 40 | In-app survey |
| Dashboard load time | < 3 seconds | Vercel analytics / synthetic monitoring |
| Time-to-value (first scan) | < 5 minutes | Onboarding completion timestamp – signup timestamp |
| Operator efficiency | < 20 min per account per data cycle | Operator task completion timestamps |
| AI Concierge usage (Enterprise) | > 3 conversations per user per week | agent_conversations table count |
| Free → Pro upgrade rate | > 10% within 30 days | Subscription upgrade events |

## Key Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| SEMrush API costs exceed budget | High — margins erode | Strict per-user unit budgets; aggressive caching; pull data only at defined intervals; weekly usage monitoring |
| Otterly.ai changes pricing or features | Medium — operator workflow disrupted | Diversify manual sources; build internal citation tracking as fallback |
| Perplexity Sonar API rate limits or downtime | Medium — scan quality degrades | Graceful degradation: fall back to direct Perplexity query; queue retries |
| Operator cannot scale beyond 50 accounts | High — bottleneck to growth | Hire additional operators; streamline workflow tooling; explore Otterly API if/when released |
| AI Concierge generates inaccurate recommendations | High — trust damage | Constrain agent to verified data only; add disclaimers; human review option |
| Realtors expect leads, not visibility data | Medium — ICP mismatch | Position clearly as visibility intelligence, not lead gen; show ROI connection: visibility → leads |
| Small businesses churn due to slow AI visibility gains | High — retention risk | Set expectations in onboarding: 3-6 months for meaningful change; show incremental wins |

## Timeline & Constraints

- **Implementation timeline:** 10 weeks across 6 phases
- **Tech stack:** Next.js 16 (App Router), React 19, TypeScript 5 strict, Supabase PostgreSQL, Stripe, Resend, Vercel
- **Existing MVP:** 9 features shipped (auth, Shopify OAuth, product sync, AI scanner, dashboard, Truth Engine, email alerts, Stripe billing, onboarding) — pivoting, not greenfield
- **External dependencies:** SEMrush Business plan ($499.95/mo), Perplexity Sonar API access, Otterly.ai subscription (per-project pricing), human operator for Otterly workflow
- **Budget constraints:** Platform costs per user must maintain >90% gross margin at Pro+ tiers
- **Regulatory:** No PII beyond business profile data; AI Concierge includes disclaimers; no automated decision-making on behalf of users
