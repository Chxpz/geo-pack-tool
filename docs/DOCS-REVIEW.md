# Documentation Review Report
## AgenticRev: Full Docs Audit

**Reviewed by:** Documentation Audit (Indie Hacker / Startup Founder Lens)  
**Review Date:** March 3, 2026  
**Scope:** All 14 documents inside `/docs`  
**Verdict:** ⚠️ NOT READY — 7 critical inconsistencies + 8 major gaps found

---

## How to Read This Report

| Severity | Meaning |
|----------|---------|
| 🔴 **CRITICAL** | Contradictions between documents. Devs will build the wrong thing or get blocked. Must fix before writing code. |
| 🟠 **MAJOR** | Significant gaps where a feature is referenced but not fully defined. Will cause mid-sprint confusion. |
| 🟡 **MINOR** | Small inconsistencies, typos, or ambiguities. Low-risk but should be cleaned up. |
| 🔵 **QUESTION** | I need your answer to decide how the doc should be corrected. |

---

## 🔴 CRITICAL INCONSISTENCIES

### C1 — ARPU / LTV / CAC: PRD and Unit Economics are completely different planets

The PRD and the Unit Economics document list radically different numbers for the same metrics. This will cause investor and team confusion.

| Metric | PRD (01-PRODUCT-REQUIREMENTS.md) | Unit Economics (UNIT-ECONOMICS.md) |
|--------|----------------------------------|-------------------------------------|
| Blended ARPU | **$45/month** | **$86–$214/month** |
| LTV | **$1,620** | **$4,104** |
| CAC | **<$200** | **$420–$450** |
| LTV:CAC target | **8:1** | **9.1:1** |

**Root cause:** The PRD appears to have been written independently and never reconciled with the Unit Economics model.

**What to fix:** Pick one source of truth. The Unit Economics document has full workings shown — those numbers should be canonical. The PRD Revenue Metrics section needs to be updated to match. Or, if the PRD numbers are aspirational targets (not actuals), label them clearly.

> 🔵 **Question C1:** Which set of numbers represents your real model — the Unit Economics doc or the PRD? Are the PRD numbers aspirational targets vs. actual projections? 
RPC:Yes

---

### C2 — Free → Paid Conversion Rate: 5–12% (PRD) vs. 15–25% (Unit Economics)

- **PRD** states: "Free → Paid Conversion: 5% within 14 days, 12% within 90 days"
- **Unit Economics** assumes: "Free → Paid conversion: 15% (Month 1-3), 20% (Month 4-6), 25% (Month 7-12)"

The Unit Economics model is built on 3× more optimistic conversion than the PRD considers healthy. This means the unit economics are inflated if the PRD numbers are realistic.

**What to fix:** Reconcile to a single conversion rate assumption. Run the unit econ model with the PRD's more conservative 12%-at-90-days rate and see how it affects MRR projections.

> 🔵 **Question C2:** Have you done any validation of conversion rate? What's the assumption based on — industry benchmarks, competitor data, customer discovery interviews?
Rpc: No just claude projections research.
---

### C3 — MRR Targets: Three documents, three different numbers

| Phase | PRD targets | Unit Economics | Roadmap milestones |
|-------|-------------|----------------|--------------------|
| Month 6 | **$50,000** | **$115,500** | **$11,500–$30,000** |
| Month 12 | **$200,000** | **$462,200** | **$200,000** |

The Roadmap milestone for Phase 3 (Month 5, ACP launch) is $30K MRR. The PRD says $50K by Month 6. The Unit Economics says $115K by Month 7-12. These cannot all be right simultaneously.

**What to fix:** There should be one shared revenue model (a simple table: Month 1 → Month 12, projected MRR). That table should be the single source of truth referenced by PRD, Unit Economics, and Roadmap.

> 🔵 **Question C3:** What is your actual Month 6 MRR target? The three documents have a 10× spread between them ($11.5K vs. $115.5K).
rpc:the one in the unit economics
---

### C4 — Blended Gross Margin contradicts itself within the same document

Inside **UNIT-ECONOMICS.md**, two sections give different answers:

- **Executive Summary** states: Blended Gross Margin = **89.4%**
- **Blended COGS Calculation** (same document, section below) shows: `($214 - $37.01) / $214` = **82.7%**

These can't both be correct. There's also nowhere in the document that explains how 89.4% was derived.

**What to fix:** Either correct the executive summary to 82.7% (matching the shown math), or add a footnote explaining the 89.4% calculation (perhaps it excludes the Agency tier's high support costs).
rpc:make the corrections
---

### C5 — WooCommerce: PRD says it's in MVP, Roadmap says it's deferred

- **PRD**: Lists WooCommerce throughout as a core supported platform with "✅ Syncs product catalog from Shopify/WooCommerce" as MVP acceptance criteria
- **User Flows (02-USER-FLOWS.md) Flow 2**: Includes a complete WooCommerce store connection flow as part of onboarding
- **Development Roadmap, Week 3-4**: "WooCommerce Integration (Optional for MVP) — **Decision: DEFER to Phase 2**"

If a developer reads the PRD, they build WooCommerce. If they read the Roadmap, they don't. This is a direct conflict.

**What to fix:** Either (a) add WooCommerce to MVP scope in the Roadmap, (b) update the PRD and User Flows to mark WooCommerce as Phase 2, or (c) add a callout in User Flow 2 noting WooCommerce is deferred. Make the decision explicit and consistent.

> 🔵 **Question C5:** Is WooCommerce in the MVP or not? My recommendation: defer it. Your target says 80% of addressable market is Shopify — don't dilute MVP scope.
rpc: we focus on shopfy right now

---

### C6 — Phase 3 ACP Timeline is Physically Impossible

From the Roadmap Visual Roadmap:

- Phase 2 ends: **Week 16 → July 1, 2026**
- Phase 3 begins: **Week 17** (after Phase 2)
- Phase 3 estimated launch date: **"est. June-July 2026"**

Phase 3 **starts** at Week 17 (which is July 2026) but is labeled as launching in **June-July 2026**. Phase 3 contains 3+ weeks of features before "launch." That math doesn't work — the ACP Launch can't happen before Phase 3 begins.

Furthermore, the Roadmap's own milestone table says "ACP Live: **August 1, 2026**" in the milestone summary, which contradicts the "Phase 3 Launch Date: June-July 2026" header.

**What to fix:** Align the Phase 3 header launch date to August 1, 2026 (per the milestone table). Update any stakeholder-facing timelines accordingly.
rpc: we have 10 days to launch and start monetizing this project.

---

### C7 — AI Platforms in MVP: Roadmap contradicts PRD Launch Strategy

- **Development Roadmap Week 5-6 (MVP)**: Plans to scan all 4 platforms — "OpenAI, Perplexity, Claude, Gemini"
- **PRD Appendix (Launch Strategy - Phase 1)**: "Visibility Dashboard (ChatGPT + Perplexity only)"

One says 4 platforms at MVP launch. One says 2. This determines the scope of the Week 5-6 sprint.

**What to fix:** Decide and lock in. Recommendation: 4 platforms from Day 1 is a stronger value prop and the backend effort is similar (same Lambda pattern repeated). But document the decision in both places.

> 🔵 **Question C7:** 2 platforms (faster MVP) or 4 platforms (stronger first impression)? What does your customer discovery tell you about which platforms your target users care most about?
rpc: we need to have this all shipped asap and start to monetizing asap

---

## 🟠 MAJOR GAPS

### G1 — Reliability Module: No database table, no roadmap week, no complete spec

**PRD Module 4 (Reliability Monitoring)** defines three features:
- 4.1 AI Agent Uptime Tracking
- 4.2 LLM Drift Detection
- 4.3 Data Pipeline Health

**Issues:**
1. The **Database Schema** (12 tables listed) has no table for `ai_uptime_checks`, `drift_events`, or any Reliability-specific storage
2. The **Development Roadmap Phases 1–3** has no "Reliability Module" sprint week assigned — it's listed as a Phase 4 item under "Reliability & Monitoring" but that section in Phase 4 covers infrastructure uptime, not the merchant-facing Reliability module
3. **Feature Specs (03-FEATURE-SPECS.md)** covers Reliability only as "Feature 4.1: Alert Configuration" which is really a notification settings UI, not the uptime/drift monitoring features described in the PRD

**What to fill in:**
- Add `ai_platform_checks` table to schema (platform, checked_at, is_up, response_ms)
- Add `drift_events` table (product_id, baseline_mentions, current_mentions, delta_pct, detected_at)
- Assign Reliability Module a roadmap week (suggest Week 13-14 or Phase 3)
- Complete the Feature Specs for F4.2 and F4.3

> 🔵 **Question G1:** Is the Reliability Module a paid differentiator (Growth/Agency only) or available to all paid plans? This affects design priority significantly.

---

### G2 — Competitor Tracking Feature: In PRD, not in Schema or Roadmap

**PRD Feature 1.1** includes: "Competitor comparison — Who else is recommended for similar queries?" as an acceptance criterion with `- [ ] Shows competitor products recommended alongside merchant's products`.

**Issues:**
- No `competitor_products` or `competitor_mentions` table in the Database Schema
- No roadmap week assigned to building this feature
- Would require tracking products from other stores that AgenticRev users don't own
- Significant complexity: how do you identify who the competitors are? User-defined? Auto-detected?

This is a meaty feature that deserves its own spec, schema, and explicit roadmap placement — or it needs to be explicitly moved to Phase 4 as "Advanced Analytics."

> 🔵 **Question G2:** How does competitor tracking work? Does the merchant define their competitors manually, or does the system auto-detect them from AI responses? Is this MVP, Phase 2, or Phase 4?

---

### G3 — White-Label Reporting: Agency feature with zero specification

**PRD, Pricing, Agency Plan** includes: "White-label reporting"  
**Roadmap Phase 4** shows: "White-label reports (PDF export with agency branding)"

**Issues:**
- No UI/UX wireframe or component spec for white-label
- No database schema fields for agency branding (logo URL, brand color, custom domain, etc.)
- No API spec for generating branded PDF reports
- No mention of the PDF generation library/service to use

**What to fill in:** Either spec it out (add schema fields, a UI screen for brand settings, an API endpoint) or explicitly postpone it with a note that it will be designed when Phase 4 begins.

---

### G4 — Annual Billing: Schema ready, product not defined

**Database Schema** `subscriptions` table has `billing_cycle VARCHAR(50), -- 'monthly' or 'annual'`.

**Issues:**
- No annual pricing is defined anywhere in PRD, Unit Economics, or Feature Specs
- No upgrade flow for monthly → annual is documented
- No discount % mentioned (industry standard is 20% off = 10 months for 12)

A subscription field exists in the database for something that has never been priced or spec'd. Either remove the field until it's designed, or add annual pricing to the PRD and Unit Economics.

> 🔵 **Question G4:** Do you plan to offer annual billing at launch? If so, what's the discount? Annual billing is a strong LTV and churn lever — worth designing early.

---

### G5 — AI Readability Score: Referenced but computation never defined

The `products` table includes an `ai_readability_score` field. Feature Specs confirm it's a 1–100 score displayed on the Product Card. PRD says: "Scores products on 'AI readability' (1-100)" and "One-click apply optimizations."

**Issues:**
- How is the score computed? What inputs? (description length, keyword density, schema markup, structured data completeness?)
- What constitutes a "100" vs a "50"?
- What are the "optimizations" that get suggested?
- Which Lambda service generates this — Scanner or Truth Engine?

**What to fill in:** Add a sub-spec to Feature Specs (or Truth Engine specs) defining the scoring algorithm, the input fields, the suggested improvements, and which service owns the computation.

---

### G6 — SOC 2 Type II in Year 1: Stated as a requirement, not achievable on this timeline

**PRD Technical Requirements** states: "SOC 2 Type II compliance (Year 1)"

**Reality check:** SOC 2 Type II requires:
1. Minimum 6-month observation period with controls in place
2. Formal audit by accredited third party (~$30K–$50K)
3. Legal and compliance prep work (months)

If you launch May 1, 2026, you cannot achieve SOC 2 Type II by May 1, 2027 (Year 1) unless you start the prep work on Day 1 of development. The roadmap has no SOC 2 preparation tasks, no budget line item, and the Security doc doesn't mention it.

**What to fix:** Either (a) change to "SOC 2 Type I compliance (Year 1), Type II by Year 2", (b) add explicit SOC 2 tasks and budget ($40–60K) to the Roadmap, or (c) remove the SOC 2 claim entirely and replace with "Follows SOC 2 principles" until you're actually compliant.

> 🔵 **Question G6:** Is SOC 2 required by your target customer? Solo founders and small agencies typically don't ask for it. Is this for a future enterprise sales play or investor optics?

---

### G7 — Perplexity API Access: Uncertain availability acknowledged in PRD but not resolved

**PRD Dependencies & Risks** says: "Risk: Perplexity, Claude, Gemini may not have public APIs for search data — Mitigation: Start with web scraping, migrate to APIs when available"

**Issues:**
- As of March 2026, Perplexity does have a public API (`api.perplexity.ai`) — the web scraping concern is possibly outdated
- Integration Specs (04) correctly documents the Perplexity API integration
- The PRD risk still references web scraping as the fallback, which is fragile, legally grey, and will likely break
- If the Perplexity API is used, the PRD risk item should be updated to remove the scraping concern

**What to fix:** Confirm Perplexity's llama-online-huge-128k model (or current best) is accessible via their API for search-style queries. Update the PRD risk to reflect confirmed API access. Remove web scraping as a planned fallback.

---

### G8 — Public Developer API: Priced as a feature, never specified

**PRD Growth Plan** includes: "API access"  
**Development Roadmap Phase 4** includes a "REST API documentation" and "API key generation" sprint.

**Issues:**
- The API Specs doc (03) covers internal endpoints only — there is no external/public developer API designed
- No documentation of what a "public API" exposes vs. what remains internal
- No rate limit policy for external API (separate from internal usage limits)
- No webhook event spec for external consumers

A meaningful "API access" plan feature requires its own API design document before it reaches Phase 4. Otherwise you'll design it in a sprint under pressure and likely break existing contracts.

---

## 🟡 MINOR ISSUES

### M1 — "Perplexly" Typo in Two Separate Documents

- **Roadmap Week 5-6**: "Progress indicator (checking ChatGPT, Perplexly, etc.)"
- **PRD Module 4.1**: "Monitor ChatGPT, Perplexly, Gemini API availability"

Should be "Perplexity" in both cases.

---

### M2 — README Navigation Link is Broken

In `docs/README.md`, the documentation index links to:
```
[04-INTEGRATION-SPECS.md](technical/04-INTEGRATION-SPECS.md)
```

The actual filename is `04-INTEGRATION-SPECIFICATIONS.md`. This link 404s.

---

### M3 — README Completion Checklist is Inconsistent with Its Own Index

The README index at the top shows all items as `- [ ]` (unchecked). The completion checklist at the bottom shows "**14/14 Documents Complete ✅**". These can't both be true simultaneously. Pick one state and make them consistent.

---

### M4 — Customer Support Hourly Rate Varies Without Explanation

Inside Unit Economics, the COGS calculation uses different support rates:
- Starter tier: `$20/hr`
- Agency tier: `$25/hr`

If this reflects a difference (e.g., Starter = contractor, Agency = dedicated employee), that should be noted. Otherwise it looks like an error and inflates Agency COGS slightly.

---

### M5 — Lambda Timeout for AI Scanner May Be Insufficient

**Deployment Guide** creates the AI Scanner Lambda with `--timeout 300` (5 minutes).  
**Development Roadmap** plans parallel calls to 4 AI platforms per product.

For a Starter user with 100 products × 4 platforms = 400 API calls, even with concurrency, a 300-second timeout may be tight. The scan success target is "complete within 5 minutes for 100 products." This needs a capacity estimate (calls per second achievable given rate limits and Lambda concurrency).

**What to note:** Add a performance budget note in the Architecture doc: expected Lambda execution time per tier, and the concurrency model (parallel per-product? batched? separate Lambda invocations per platform?).

---

### M6 — "North Star Metric: $10M AI-Driven GMV Year 1" is Disconnected from All Other Projections

**PRD** sets the North Star as "$10M AI-driven GMV by end of Year 1."

**Reality check:** The Unit Economics shows ARR of ~$5.5M by end of Year 2. ACP isn't live until August 2026 (Month 5). To drive $10M GMV through ACP in ~7 months (Aug 2026 → Feb 2027), with 50-250 merchants on ACP, each merchant would need to process ~$40K–$200K through ChatGPT checkout in their first months of ACP.

This is wildly optimistic and inconsistent with every other projection in every other document. The North Star is fine as an aspirational ceiling, but it needs a footnote: "Assumes broad ACP merchant adoption by Q4 2026."

---

### M7 — Team Budget Contradiction in the Same Document

**Development Roadmap, Resource Allocation:**
- Narrative says: "Total Cost: ~$20K/month (2 devs @ $10K/month)"
- Budget table says: "Salaries MVP (M1-2): **$40K**"

$20K/month × 2 months = $40K — so the table is correct if it's cumulative, but labeling it "$40K" for the entire 2-month MVP phase while the narrative says "$20K/month" looks inconsistent without clarification. Add "(2 months)" to the budget table row label.

---

## 🔵 OPEN QUESTIONS (Decisions Needed From You)

These are not documentation errors — they're genuine strategic questions where the docs currently reflect ambiguity that needs your decision.

| # | Question | Why It Matters |
|---|----------|---------------|
| **Q1** | Is the Agency plan (`$499/mo`) intended to bring meaningful MRR at launch, or is it a sleeper tier for later? Unit econ assumes 15% of paid customers are Agency users immediately — at launch with 10-50 customers, you likely have zero agencies. | Affects conversion funnel design, onboarding prioritization, and unit econ accuracy. |
| **Q2** | ACP Growth plan gating: Growth plan ($199) includes "Instant Checkout Enabled (when ACP launches)" but ACP won't be ready until August 2026. What do Growth plan users get for their extra $120/month over Starter **before** ACP is live? The current value difference is: 400 more products, 60 more days history, "Priority support." Is that enough to justify the price jump? | Risk of high churn among early Growth plan subscribers who expected ACP. |
| **Q3** | What is the actual go-to-market channel for finding the first 10 paying customers? The roadmap mentions "Manual onboarding — first 10 customers get white-glove support" but says devs are 100% focused on building. Who is doing GTM during Weeks 1-8? Is that you (the founder)? | If nobody is selling while the product is being built, the May 1 launch will produce zero signups. |
| **Q4** | The pricing page in User Flows shows two signup options: "Start Free Trial" and "Sign Up with Shopify." Is this a 14-day free trial of the Starter plan, or is it permanently free? The PRD says "7-day free trial of Starter plan" in the churn risk mitigation section, but the pricing table shows a permanent Free tier. These are two different acquisition models. | Determines onboarding flow, Stripe integration complexity, and conversion rate benchmarks. These should not coexist without being explicitly designed as separate paths. |
| **Q5** | The Reliability Module (Module 4) is not assigned to any phase/sprint in the Roadmap. When does it ship? Without it, the Agency plan value prop is weaker, since reliability monitoring is the feature most relevant to agencies managing multiple client stores. | If Reliability ships in Phase 4 (Months 6-12), Agency plan tier should probably also wait until then — otherwise you're selling a plan that's missing a core advertised feature. |

---

## Summary Scorecard

| Area | Status | Key Issue |
|------|--------|-----------|
| Product Definition | 🟠 Mostly aligned | WooCommerce MVP decision, competitor tracking undefined |
| Pricing & Packaging | 🟠 Mostly aligned | Annual billing ghost field, Growth pre-ACP value gap |
| Financial Model | 🔴 Misaligned | PRD vs Unit Econ use completely different numbers |
| Roadmap & Timeline | 🔴 Misaligned | Phase 3 date impossible, ACP timeline conflicts |
| Database Schema | 🟠 Mostly complete | Missing Reliability module tables |
| API Specs | ✅ Well defined | Minor internal-vs-public distinction needed |
| Technical Architecture | ✅ Well defined | Lambda sizing note needed |
| Integration Specs | ✅ Well defined | Perplexity scraping risk outdated |
| Testing Strategy | ✅ Well defined | No gaps found |
| Error Monitoring | ✅ Well defined | No gaps found |
| Deployment Guide | ✅ Well defined | No gaps found |
| Security & Compliance | 🟠 Mostly aligned | SOC 2 Type II claim unrealistic |
| UI/UX Requirements | ✅ Well defined | No gaps found |
| Unit Economics | 🔴 Internal contradiction | 89.4% vs 82.7% gross margin, conversion rate inflation |

---

## Recommended Fix Order (Before Writing a Single Line of Code)

1. **Fix C4 first** (5 min) — it's a single math error in the Unit Econ executive summary.
2. **Fix M2 first** (2 min) — broken README link.
3. **Answer Q5, then fix G1** — Reliability module needs a roadmap slot and schema tables.
4. **Answer C5 (WooCommerce yes/no)** — then update PRD, User Flows, or Roadmap to match.
5. **Answer C7 (4 platforms or 2 at MVP)** — then align PRD Launch Strategy with Roadmap Week 5-6.
6. **Fix C6** (Phase 3 dates) — update the header launch date to August 1, 2026.
7. **Build one shared revenue model (C1, C2, C3)** — a single spreadsheet or table that becomes the source of truth for PRD, Roadmap, and Unit Economics sections.
8. **Address G6 (SOC 2)** — decide if it's a real requirement or aspirational phrasing.
9. **Fix M1** (two Perplexity typos).
10. **Fix M3** (README checklist state).

---

*This review covers 14 documents, ~12,000+ lines of documentation. The architecture, tech stack, integration details, UI patterns, testing strategy, and deployment approach are all solid and internally consistent. The inconsistencies are concentrated in business/financial alignment and product scope decisions — the exact areas where ambiguity is most expensive when it surfaces mid-development.*

*Clean these up, answer the open questions above, and this documentation is ready for a developer to start Sprint 1.*
