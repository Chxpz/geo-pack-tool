# Product Requirements Document (PRD)
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 🟢 Final - Ready for Development  
**Owner:** Product Team  

---

## Executive Summary

**Product Name:** AgenticRev  
**Tagline:** The Operating System for AI-Native Commerce  
**One-Liner:** AgenticRev helps e-commerce merchants get discovered, recommended, and purchased through AI assistants like ChatGPT.

**Problem Statement:**  
E-commerce merchants have zero visibility into AI-driven commerce. They don't know when ChatGPT recommends their products, don't control what product information AI agents receive, and can't enable instant checkout when AI agents find them. This creates three critical gaps:
1. **Visibility Gap** - "Is ChatGPT recommending my products?"
2. **Accuracy Gap** - "Is the AI sharing correct pricing and inventory?"
3. **Action Gap** - "Can customers buy instantly through ChatGPT?"

**Solution:**  
AgenticRev is a SaaS platform with 4 integrated modules that close the loop:
- **Visibility** - Track product mentions in ChatGPT, Perplexity, Gemini, Claude
- **Truth Engine** - Govern product data accuracy across all AI agents
- **Action** - Enable instant checkout via OpenAI Agentic Commerce Protocol (ACP)
- **Reliability** - Monitor AI agent uptime, accuracy drift, citation tracking

**Target Market:**  
500,000 addressable Shopify and WooCommerce merchants doing $10K+/month in revenue.

**Business Model:**  
Freemium SaaS with Free → Starter ($79/mo) → Growth ($199/mo) → Agency ($499/mo) tiers.

---

## Product Vision & Strategy

### **Vision (3 Years)**
AgenticRev becomes the default infrastructure layer for AI-driven commerce, powering 100,000+ merchants who generate $1B+ in annual GMV through AI agents.

### **Mission**
Democratize AI commerce for indie e-commerce founders who lack enterprise budgets but need enterprise-grade AI visibility and enablement tools.

### **Strategic Pillars**
1. **Commerce-Native** - Built specifically for product merchants, not generic marketers
2. **Truth-First** - Data governance prevents AI hallucinations and merchant liability
3. **Action-Enabled** - Don't just track visibility, enable revenue through ACP checkout
4. **Indie-Friendly** - Pricing and complexity designed for bootstrapped founders

---

## Target Users

### **Primary User Persona: The Indie E-Commerce Founder**

**Demographics:**
- Age: 28-45
- Role: Founder/Owner of e-commerce business
- Company Size: Solo founder or 2-5 person team
- Revenue: $10K-$100K/month
- Platform: Shopify (80%), WooCommerce (20%)

**Psychographics:**
- Tech-savvy but not a developer
- Manages marketing, product, customer service
- Budget-conscious, ROI-focused
- Early adopter of new commerce tools
- Active in Shopify community, indie hacker forums

**Pain Points:**
1. "I don't know if AI assistants are recommending my products to shoppers"
2. "ChatGPT might be showing wrong prices or out-of-stock items"
3. "Customers can't buy through ChatGPT even if they find my products"
4. "I'm losing sales to competitors who are optimized for AI discovery"
5. "I can't afford $10K/month enterprise SEO tools"

**Jobs to Be Done:**
- **Functional:** Track AI visibility, fix product data errors, enable AI-driven checkout
- **Emotional:** Feel confident they're not missing the AI commerce wave
- **Social:** Stay competitive with other Shopify merchants adopting AI tools

### **Secondary Persona: The Agency Growth Hacker**

**Demographics:**
- Role: Growth/Marketing Manager at Shopify agency
- Manages: 5-20 e-commerce clients
- Budget: $500-$2,000/month per tool

**Pain Points:**
1. "I need to report AI visibility metrics to clients but have no data"
2. "Managing product feeds for 15 clients manually is impossible"
3. "Clients ask about ChatGPT integration and I have no answer"

---

## Core Features & Modules

### **Module 1: Visibility Dashboard** 🔍

**Purpose:** Track where and how AI agents recommend merchant products.

**Key Features:**

#### 1.1 AI Search Tracking
- Monitor ChatGPT, Perplexity, Gemini, Claude for product mentions
- Track frequency of product recommendations per query type
- Identify which prompts/queries trigger product visibility
- Competitor comparison - "Who else is recommended for similar queries?"

**User Story:**
> As an e-commerce merchant, I want to see which AI agents recommend my products and for which types of customer queries, so I can understand my AI visibility and identify optimization opportunities.

**Acceptance Criteria:**
- [ ] Dashboard displays mentions across 4+ AI platforms (ChatGPT, Perplexity, Gemini, Claude)
- [ ] Shows mention frequency over time (daily, weekly, monthly)
- [ ] Displays sample queries that triggered product recommendations
- [ ] Shows competitor products recommended alongside merchant's products
- [ ] Exports data to CSV for reporting

#### 1.2 Position & Sentiment Tracking
- Track position in AI recommendation lists (1st, 2nd, 3rd mentioned, etc.)
- Sentiment analysis of how products are described
- Citation tracking - which sources AI agents use for product info

**User Story:**
> As a merchant, I want to know if my product is recommended first or third, and whether the AI describes it positively or negatively, so I can improve my positioning.

**Acceptance Criteria:**
- [ ] Dashboard shows average position for each product across AI platforms
- [ ] Sentiment score (positive/neutral/negative) with examples
- [ ] Shows which websites/sources AI agents cite when recommending products
- [ ] Trending arrows (position improving/declining)

#### 1.3 Query Intelligence
- Library of successful prompts that trigger product visibility
- Prompt engineering suggestions based on product category
- "Miss analysis" - queries where competitors appear but merchant doesn't

**User Story:**
> As a merchant, I want to know which customer questions/prompts lead to my products being recommended, so I can optimize my product descriptions and metadata.

**Acceptance Criteria:**
- [ ] Shows top 20 prompts that generated product mentions
- [ ] Suggests optimizations for low-visibility products
- [ ] Identifies "missed opportunities" where merchant should appear but doesn't

---

### **Module 2: Truth Engine** ✅

**Purpose:** Govern product data accuracy across all AI agents to prevent hallucinations, errors, and merchant liability.

**Key Features:**

#### 2.1 Product Data Governance
- Central "source of truth" for product catalog
- Sync product data from Shopify (WooCommerce deferred to Phase 2)
- Detect and flag data inconsistencies
- Version control for product data changes

**User Story:**
> As a merchant, I want one place to manage my product data that ensures AI agents always have accurate pricing, inventory, and specifications, so I don't lose sales or face customer complaints.

**Acceptance Criteria:**
- [ ] Syncs product catalog from Shopify every 15 minutes (WooCommerce support in Phase 2)
- [ ] Displays data inconsistencies (e.g., price mismatch between store and AI agent)
- [ ] Allows manual overrides for specific fields
- [ ] Logs all data changes with timestamp and user

#### 2.2 AI Accuracy Monitoring
- Monitor what data AI agents display for merchant products
- Flag errors (wrong price, outdated inventory, incorrect specs)
- Alert merchant when critical errors detected
- Track "correction rate" - how often data is fixed

**User Story:**
> As a merchant, I want to be alerted immediately if ChatGPT is showing the wrong price for my best-selling product, so I can fix it before losing sales or facing liability.

**Acceptance Criteria:**
- [ ] Checks AI agent outputs against source of truth daily
- [ ] Email/SMS alerts for critical errors (pricing, inventory availability)
- [ ] Dashboard shows error rate per product
- [ ] Tracks error resolution time

#### 2.3 Structured Data Optimization
- Optimize product schema for AI agent understanding
- Generate AI-friendly product descriptions
- Ensure structured data (JSON-LD) is machine-readable
- Test data against AI agent parsers

**User Story:**
> As a merchant, I want my product data structured correctly so AI agents understand and recommend my products accurately without hallucinations.

**Acceptance Criteria:**
- [ ] Validates JSON-LD structured data for each product
- [ ] Scores products on "AI readability" (1-100)
- [ ] Suggests improvements for low-scoring products
- [ ] One-click apply optimizations

---

### **Module 3: Action Layer (ACP Integration)** 🛒

**Purpose:** Enable instant checkout through OpenAI Agentic Commerce Protocol (ACP) so customers can buy products directly in ChatGPT.

**Key Features:**

#### 3.1 ACP Product Feed Generator
- Automatically generate OpenAI ACP-compliant product feeds
- Sync feeds with catalog updates (pricing, inventory changes)
- Test feeds for ACP compliance
- Submit feeds to OpenAI Commerce API

**User Story:**
> As a merchant, I want my products available for instant checkout in ChatGPT when it launches Shopify ACP in Q2 2026, without needing to manually create product feeds.

**Acceptance Criteria:**
- [ ] Generates ACP product feed in JSON format per OpenAI spec
- [ ] Updates feed automatically when product data changes
- [ ] Validates feed against ACP schema before submission
- [ ] One-click publish to OpenAI Commerce API

#### 3.2 Instant Checkout Enablement
- Enable ChatGPT Shop Pay checkout for merchant products
- Handle cart creation, tax calculation, shipping
- Process payments via Shopify Payments integration
- Order fulfillment sync back to Shopify/WooCommerce

**User Story:**
> As a merchant, when a customer says "I want to buy this" in ChatGPT, they can complete checkout instantly without leaving the chat, and the order appears in my Shopify dashboard.

**Acceptance Criteria:**
- [ ] ChatGPT users can add products to cart via natural language
- [ ] Checkout flow includes tax, shipping calculation
- [ ] Payment processed via Shopify Payments
- [ ] Order syncs to Shopify Orders within 60 seconds
- [ ] Email confirmation sent to customer

#### 3.3 ACP Analytics
- Track conversion rate (view → add to cart → purchase) in ChatGPT
- Revenue attribution to AI-driven sales
- Compare AI channel performance vs. organic/paid
- ROI calculator for AgenticRev investment

**User Story:**
> As a merchant, I want to see how much revenue comes from ChatGPT vs. my website, and whether AgenticRev is generating positive ROI.

**Acceptance Criteria:**
- [ ] Dashboard shows AI-driven revenue (last 7/30/90 days)
- [ ] Conversion funnel: AI mentions → product views → purchases
- [ ] Average order value for AI channel vs. other channels
- [ ] ROI widget: Revenue generated vs. AgenticRev subscription cost

---

### **Module 4: Reliability Monitoring** 📊

**Purpose:** Monitor AI agent uptime, accuracy drift, and system health to ensure consistent performance.

**Key Features:**

#### 4.1 AI Agent Uptime Tracking
- Monitor ChatGPT, Perplexity, Gemini API availability
- Track response times for commerce queries
- Alert when AI agents go down or slow down
- Historical uptime dashboard

**User Story:**
> As a merchant, I want to know if OpenAI's ACP API is down so I can inform customers or switch to alternative checkout.

**Acceptance Criteria:**
- [ ] Monitors ACP API uptime every 5 minutes
- [ ] Displays uptime percentage (99.9% SLA tracking)
- [ ] Alerts via email/SMS when downtime detected
- [ ] Shows historical uptime over 30/90 days

#### 4.2 LLM Drift Detection
- Track changes in AI agent behavior over time
- Detect when AI starts recommending different products
- Monitor for "citation drift" - changing which sources AI trusts
- Alert when dramatic shifts occur

**User Story:**
> As a merchant, I want to be notified if ChatGPT suddenly stops recommending my best-selling product, so I can investigate and fix the issue.

**Acceptance Criteria:**
- [ ] Baseline product mention frequency (7-day average)
- [ ] Alert when mention frequency drops >30%
- [ ] Shows trend chart of visibility over time
- [ ] Suggests potential causes (competitor optimization, data changes)

#### 4.3 Data Pipeline Health
- Monitor sync status between Shopify/WooCommerce and AgenticRev
- Track API rate limits and errors
- Alert when product feed fails to update
- System health dashboard

**User Story:**
> As a merchant, I want to be confident that my product data is syncing correctly so AI agents always have current inventory and pricing.

**Acceptance Criteria:**
- [ ] Shows last sync time for each product
- [ ] Displays API errors (Shopify, OpenAI, etc.)
- [ ] Alerts when sync fails >2 times
- [ ] One-click manual resync button

---

## User Flows

### **Flow 1: Onboarding (New Merchant)**

1. Merchant signs up with email (or Shopify OAuth)
2. Connects Shopify/WooCommerce store (OAuth authorization)
3. AgenticRev syncs product catalog (5-500 products)
4. Initial AI visibility scan runs (takes 2-5 minutes)
5. Dashboard shows first results with tutorial overlay
6. Merchant sees which products appear in AI and which don't
7. CTA: "Enable ACP Checkout" (Action module upsell)

**Success Metric:** 70% of merchants complete onboarding and see first AI visibility results

### **Flow 2: Monitoring AI Visibility (Weekly Check-In)**

1. Merchant logs into dashboard
2. Sees weekly summary: "Your products were mentioned 47 times this week (+12% vs. last week)"
3. Clicks into top-performing product to see details
4. Reviews prompts that triggered visibility
5. Checks competitor comparison
6. Identifies one low-visibility product to optimize
7. Uses Truth Engine to improve product description
8. Waits 48 hours, checks if visibility improved

**Success Metric:** 40% of active users log in weekly to check AI visibility

### **Flow 3: Fixing Data Errors (Alert-Driven)**

1. Merchant receives email alert: "ChatGPT is showing wrong price for Product X"
2. Clicks alert, lands on Truth Engine error page
3. Sees side-by-side comparison: Shopify price vs. AI-displayed price
4. Clicks "Fix Error" → AgenticRev syncs correct data
5. Confirmation: "Data updated, AI agents will reflect changes within 24 hours"
6. Merchant can track when correction appears in AI outputs

**Success Metric:** 80% of critical errors resolved within 24 hours

### **Flow 4: Enabling ACP Checkout (Conversion Flow)**

1. Merchant sees banner: "Shopify ACP now available - Enable instant checkout in ChatGPT"
2. Clicks "Enable ACP" → upgrade prompt (requires Growth plan $199/mo)
3. Upgrades to Growth plan
4. ACP setup wizard:
   - Step 1: Generate ACP product feed
   - Step 2: Test feed with OpenAI validator
   - Step 3: Submit to OpenAI Commerce API
   - Step 4: Wait for approval (1-2 days)
   - Step 5: Live in ChatGPT!
5. First ACP order notification: "You made your first ChatGPT sale! 🎉"

**Success Metric:** 25% of Growth plan users enable ACP within 30 days

---

## Success Metrics & KPIs

### **North Star Metric**
**AI-Driven GMV (Gross Merchandise Value):** Total revenue generated by merchants through AI-enabled channels (ChatGPT checkout, AI-driven traffic).

**Target:** $10M AI-driven GMV by end of Year 1

### **Product Metrics**

#### Activation Metrics
- **Signup → Onboarding Completion:** 70% target
- **Onboarding → First AI Visibility Result:** 90% (within 5 minutes)
- **Free → Paid Conversion:** 5% within 14 days, 8-12% within 90 days (conservative target based on SMB SaaS benchmarks; Unit Economics model uses 15-25% as optimistic projection pending validation)

#### Engagement Metrics
- **Weekly Active Users (WAU):** 40% of total users
- **Monthly Active Users (MAU):** 65% of total users
- **Sessions per Week:** 2.5 average
- **Time in Dashboard:** 8 minutes average per session

#### Feature Adoption
- **Visibility Dashboard:** 100% of users (core feature)
- **Truth Engine:** 60% of users fix at least one data error
- **ACP Checkout Enabled:** 25% of Growth plan users
- **Reliability Monitoring:** 40% of users set up alerts

#### Revenue Metrics
- **Monthly Recurring Revenue (MRR):** ~$28.9K by Month 6, ~$115.5K by Month 12 *(canonical source: Unit Economics model)*
- **Average Revenue Per User (ARPU):** $214/month (paid customers only) / $86/month (blended incl. free)
- **Churn Rate:** <5% monthly (target: 3.5% blended)
- **Lifetime Value (LTV):** $5,132 (blended paid customer, 29-month lifetime)
- **Customer Acquisition Cost (CAC):** $450 blended (target 11.4:1 LTV:CAC ratio)
- **Gross Margin:** 82.7% blended across all paid tiers

#### Quality Metrics
- **Data Accuracy Rate:** 99%+ (Truth Engine catching errors)
- **Sync Success Rate:** 99.5%+ (Shopify/WooCommerce → AgenticRev)
- **ACP Uptime:** 99.9%+ SLA
- **Alert Response Time:** 95% of critical alerts result in merchant action within 24 hours

---

## Pricing & Packaging

### **Free Tier** (Acquisition Only)
**Price:** $0  
**Limits:**
- 1 connected store
- 10 products tracked
- 7 days of visibility data
- Weekly AI visibility reports
**Goal:** Drive signups, demonstrate value, convert to Starter

### **Starter Plan** 💼
**Price:** $79/month  
**Limits:**
- 1 store
- Up to 100 products
- 30 days historical data
- Visibility tracking (ChatGPT, Perplexity, Gemini, Claude)
- Truth Engine (basic data governance)
- Email alerts
**Target Audience:** Solo founders, new stores

### **Growth Plan** 🚀
**Price:** $199/month  
**Everything in Starter, plus:**
- Up to 500 products
- 90 days historical data
- **ACP Product Feed Generator**
- **Instant Checkout Enabled** (when ACP launches)
- Priority support
- API access
**Target Audience:** Scaling stores ($50K-$200K/month revenue)

### **Agency Plan** 🏢
**Price:** $499/month  
**Everything in Growth, plus:**
- Up to 5 connected stores
- Unlimited products
- 365 days historical data
- White-label reporting
- Dedicated account manager
- Custom integrations
**Target Audience:** Agencies managing multiple client stores

---

## Technical Requirements

### **Performance**
- Dashboard load time: <2 seconds
- AI visibility scan: Complete within 5 minutes for 100 products
- Shopify sync: Real-time (within 60 seconds of product update)
- API response time: <500ms for all endpoints

### **Scalability**
- Support 10,000 merchants by Year 1
- Handle 500,000 products across all merchants
- Process 1M+ AI visibility checks per day

### **Security**
- SOC 2-aligned security controls enforced from Day 1 (formal SOC 2 Type I audit targeting Year 2)
- OAuth 2.0 for Shopify/WooCommerce authentication
- Encrypted data at rest (AES-256) and in transit (TLS 1.3)
- PCI DSS compliant for payment processing (via Shopify Payments)

### **Integrations**
- Shopify (OAuth, REST API, Webhooks)
- WooCommerce (REST API, Webhooks)
- OpenAI ACP (Commerce API when available Q2 2026)
- Perplexity Search API
- Anthropic Claude API
- Google Gemini API

### **Browser Support**
- Chrome 90+ (primary)
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile responsive (iOS Safari, Chrome Mobile)

---

## Out of Scope (V1)

The following features are **explicitly not included** in V1 to maintain focus and ship faster:

❌ **Multi-language support** (English only initially)  
❌ **Mobile native apps** (web-only, mobile-responsive)  
❌ **Custom AI agent training** (use existing LLMs only)  
❌ **Inventory management** (sync from Shopify/WooCommerce, don't replace)  
❌ **Customer support chatbot** (manual support initially)  
❌ **Social media integrations** (focus on AI agents only)  
❌ **Advanced analytics** (basic metrics only, no predictive)  
❌ **Third-party app marketplace** (no plugins/extensions)  
❌ **Multi-currency support** (USD only initially)  
❌ **Enterprise SSO** (email/password + OAuth only)  

These may be added in V2+ based on customer demand.

---

## Dependencies & Risks

### **Critical Dependencies**

1. **OpenAI ACP Launch** (Q2 2026)
   - **Risk:** If ACP delays beyond Q2 2026, Action module can't launch
   - **Mitigation:** Build Visibility + Truth Engine first, ACP is Phase 3

2. **Shopify Partnership**
   - **Risk:** Shopify may not approve app for app store
   - **Mitigation:** Can distribute outside app store initially

3. **AI Platform APIs**
   - **Risk:** AI platforms change output formats, deprecate endpoints, or add rate limits
   - **Mitigation:** Build flexible response parsers, automated regression tests for each platform, exponential backoff with queue-based retry — all three have confirmed public APIs as of March 2026

### **Technical Risks**

1. **Rate Limiting**
   - **Risk:** OpenAI, Shopify APIs have rate limits that could throttle service
   - **Mitigation:** Implement caching, batch requests, exponential backoff

2. **AI Agent Changes**
   - **Risk:** ChatGPT/Perplexity change output formats, breaking our parsers
   - **Mitigation:** Build flexible parsers, automated tests, alerts for changes

3. **Scaling Costs**
   - **Risk:** OpenAI API costs grow faster than revenue at scale
   - **Mitigation:** Per-user cost limits, caching, GPT-4o Mini for most queries

### **Market Risks**

1. **Competitor with More Funding**
   - **Risk:** Peec.ai ($21M Series A) pivots to commerce
   - **Mitigation:** Speed to market, Truth Engine IP, indie hacker community

2. **Shopify Builds In-House**
   - **Risk:** Shopify launches native AI visibility tool
   - **Mitigation:** Multi-platform expansion (WooCommerce in Phase 2), Truth Engine differentiation, first-mover advantage in indie hacker community

---

## Launch Strategy

### **Phase 1: MVP — 10-Day Launch Sprint (March 3–13, 2026)**
**Goal:** Ship, launch, and start monetizing within 10 days

**Features:**
- Visibility Dashboard (all 4 AI platforms from Day 1: ChatGPT, Perplexity, Gemini, Claude)
- Basic Truth Engine (data sync + price/inventory error detection)
- Free + Starter plan ($79/mo)
- Shopify-only (WooCommerce explicitly deferred to Phase 2)
- White-glove manual onboarding for first 10 customers

**Platform Coverage Decision:** All 4 AI platforms ship in MVP to maximize value proposition and start monetizing ASAP. Backend effort is similar (same Lambda pattern repeated), and stronger first impression justifies the scope.

**Success Criteria:**
- 10 paying customers @ $79/mo = $790 MRR
- NPS >40
- <10% monthly churn

### **Phase 2: Growth Features (March 13 – April 30, 2026)**
**Goal:** Scale to 100 customers, add Growth plan

**Features:**
- WooCommerce integration
- ACP Product Feed Generator (ready for ACP launch)
- Growth plan ($199/mo)
- Automated onboarding, query intelligence, SEO content

**Success Criteria:**
- 100 customers = $28,900 MRR *(per Unit Economics model)*
- 20% free → paid conversion
- Dashboard load time <2 seconds

### **Phase 3: ACP Launch (June 2026)**
**Goal:** Enable instant checkout, drive upgrades to Growth plan

**Features:**
- Instant Checkout via OpenAI ACP (tied to Shopify ACP rollout)
- ACP Analytics dashboard
- Shopify App Store submission

**Success Criteria:**
- 250 customers = $30K MRR
- 50 merchants processing ACP orders
- Featured in Shopify ACP launch announcement

### **Phase 4: Scale (Q3–Q4 2026)**
**Goal:** 1,000 customers, $115K–$200K MRR

**Features:**
- Agency plan (multi-store management, white-label reporting)
- Public API access + webhooks
- Advanced analytics (competitor tracking, predictive trends)
- Internationalization

**Success Criteria:**
- 1,000 customers = ~$115K MRR *(Unit Economics trajectory)*
- $10M AI-driven GMV across all merchants (aspirational)
- Shopify App Store "Staff Pick"

---

## Appendix: User Stories (Complete List)

### Visibility Module
1. As a merchant, I want to see which AI agents mention my products so I know my AI visibility
2. As a merchant, I want to compare my AI visibility to competitors so I can benchmark performance
3. As a merchant, I want to export AI mention data so I can report to stakeholders
4. As a merchant, I want to see trending prompts so I can optimize my product descriptions

### Truth Engine
5. As a merchant, I want my product catalog to auto-sync from Shopify so data stays current
6. As a merchant, I want alerts when AI shows wrong pricing so I can fix errors immediately
7. As a merchant, I want to see a "data health score" so I know which products need attention
8. As a merchant, I want one-click fixes for data errors so corrections are fast

### Action Module
9. As a merchant, I want to generate ACP feeds automatically so I don't manually code JSON
10. As a merchant, I want to enable ChatGPT checkout so customers can buy without leaving chat
11. As a merchant, I want to see which sales came from ChatGPT so I can measure ROI
12. As a merchant, I want ACP orders to appear in Shopify so fulfillment is seamless

### Reliability
13. As a merchant, I want uptime monitoring so I know when ACP is down
14. As a merchant, I want drift alerts so I know if my visibility is declining
15. As a merchant, I want sync status for my products so I can troubleshoot issues

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** Move to Technical Architecture document  
**Questions/Clarifications:** None - all decisions finalized
