# User Flows & Journey Maps
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 🟢 Final - Ready for Development  
**Owner:** Product Team  

---

## Overview

This document maps out every user interaction with AgenticRev from signup to advanced usage. Each flow includes:
- Step-by-step user actions
- System responses
- Decision points
- Error states
- Success criteria
- Time estimates

**Target Audience:** Developers (for implementation), Designers (for UI/UX), Product (for validation)

---

## Flow Categories

1. **Onboarding Flows** - First-time user experience
2. **Core Activity Flows** - Daily/weekly usage patterns
3. **Configuration Flows** - Setup and settings
4. **Monetization Flows** - Upgrade and payment
5. **Alert & Error Flows** - Error handling and notifications

---

## ONBOARDING FLOWS

### **Flow 1A: Signup (Email)**

**Goal:** Merchant creates account with email/password  
**Entry Point:** Landing page CTA "Start Free Trial"  
**Time Estimate:** 2-3 minutes  
**Success Rate Target:** 80% of visitors who click CTA complete signup

#### Steps:

1. **Landing Page**
   - User clicks "Start Free Trial" button
   - → Navigate to `/signup`

2. **Signup Form**
   - Fields:
     - Email address (required)
     - Password (min 8 chars, 1 number, 1 special char)
     - Company name (optional)
     - [ ] "I agree to Terms of Service" checkbox
   - User fills form, clicks "Create Account"
   - → **Validation:**
     - ✅ Email format valid
     - ✅ Email not already registered
     - ✅ Password meets requirements
     - ✅ Terms accepted
   - → If validation fails: Show inline error messages (red)
   - → If validation passes: Create user account

3. **Email Verification**
   - System sends verification email
   - Show page: "Check your email to verify your account"
   - User clicks verification link in email
   - → Mark account as verified
   - → Navigate to `/onboarding/connect-store`

#### Success Metrics:
- 80% signup completion (form submission)
- 90% email verification within 24 hours
- <5% bounce rate on signup form

---

### **Flow 1B: Signup (Shopify OAuth)**

**Goal:** Merchant signs up with Shopify account (faster onboarding)  
**Entry Point:** Landing page "Sign Up with Shopify" button  
**Time Estimate:** 1-2 minutes  
**Success Rate Target:** 90% (easier than email signup)

#### Steps:

1. **Landing Page**
   - User clicks "Sign Up with Shopify" button
   - → Redirect to Shopify OAuth: `https://accounts.shopify.com/oauth/authorize?client_id=XXX&scope=read_products,write_orders...`

2. **Shopify Authorization**
   - Shopify shows permission screen:
     - "AgenticRev wants to access your store: [merchant-store.myshopify.com]"
     - Permissions needed: Read products, Read orders, Write orders, Read customers
   - User clicks "Install App"
   - → Shopify redirects to callback: `/auth/shopify/callback?code=XXX&shop=merchant-store.myshopify.com`

3. **Auto-Account Creation**
   - System:
     - Exchanges code for access token
     - Fetches merchant email, store name from Shopify
     - Creates AgenticRev account (no password needed - OAuth only)
     - Marks store as connected
   - → Navigate directly to `/onboarding/initial-scan`

4. **Product Sync Starts**
   - System automatically syncs product catalog in background
   - Show progress: "Syncing your products... 23/156 complete"

#### Success Metrics:
- 90% OAuth completion (installation)
- 95% of OAuth users reach initial scan page

---

### **Flow 2: Store Connection (For Email Signup Users)**

**Goal:** Connect Shopify store  
**Entry Point:** Post-verification or from dashboard "Connect Store" button  
**Time Estimate:** 2-4 minutes  

> ⚠️ **MVP SCOPE (Phase 1 - March 2026):** Shopify only. WooCommerce support is explicitly deferred to Phase 2 (April 2026) to maintain 10-day launch timeline and focus on the 80% of addressable market using Shopify.

#### Steps:

1. **Platform Selection**
   - Page shows Shopify as the only active option:
     - 🛍️ **Shopify** [Connect Shopify Store]
     - 🛒 **WooCommerce** — *Coming April 2026 (Phase 2)* — [Join Waitlist]

2. **Shopify Connection**
   - User enters Shopify store URL: `your-store.myshopify.com`
   - Clicks "Connect"
   - → Redirect to Shopify OAuth (same as Flow 1B step 2)
   - → After authorization, return to `/onboarding/initial-scan`

3. **Product Sync Begins**
   - System fetches all products via Shopify API
   - Shows progress bar: "Syncing products from Shopify... 45/230"
   - Estimated time: "~3 minutes remaining"

#### Edge Cases:
- **No products in store:** Show warning "Your store has 0 products. Add products to Shopify first."
- **API rate limit:** Slow down sync, show "Syncing... this may take longer for large catalogs"
- **Connection timeout:** Retry 3 times, then show error with support link

#### Success Metrics:
- 95% successful Shopify store connection
- 90% complete product sync within 10 minutes

---

### **Flow 3: Initial AI Visibility Scan**

**Goal:** Run first scan to show merchant which AI agents mention their products  
**Entry Point:** Automatically after product sync completes  
**Time Estimate:** 3-5 minutes (automated)  
**Success Rate Target:** 100% (automated, no user action needed)

#### Steps:

1. **Scan Initialization**
   - Page shows: "Scanning AI platforms for your products..."
   - Loading animation (spinner + progress bar)
   - Checklist:
     - [ ] Checking ChatGPT...
     - [ ] Checking Perplexity...
     - [ ] Checking Gemini...
     - [ ] Checking Claude...

2. **Scan Process (Backend)**
   - For each product:
     - Query ChatGPT with: "Recommend products like [product name]"
     - Query Perplexity with: "Best [product category] products"
     - Query Gemini with: "Where can I buy [product type]"
     - Query Claude with: "Compare [product] alternatives"
   - Parse responses, detect if merchant's product mentioned
   - Store results: { platform, query, mentioned: true/false, position, timestamp }

3. **Scan Complete**
   - Page shows results:
     - "✅ Scan complete! Here's what we found:"
     - **Summary Card:**
       - "Your products were mentioned 12 times across AI platforms"
       - "Top platform: Perplexity (8 mentions)"
       - "Highest visibility product: Organic Coffee Blend"
   - CTA: "View Full Report" → Navigate to `/dashboard`

4. **First Dashboard View**
   - Tutorial overlay highlights key features:
     - ① "This is your AI Visibility score"
     - ② "Click any product to see details"
     - ③ "Set up alerts in the Truth Engine"
   - User clicks "Got it" to dismiss tutorial

#### Success Metrics:
- 100% of scans complete within 5 minutes
- 85% of users click "View Full Report"
- 70% complete tutorial (don't skip)

---

## CORE ACTIVITY FLOWS

### **Flow 4: Daily Dashboard Check-In**

**Goal:** Merchant monitors AI visibility trends and reviews updates  
**Entry Point:** User logs in → lands on dashboard  
**Frequency:** 2-3x per week (target)  
**Time Estimate:** 3-5 minutes per session

#### Steps:

1. **Dashboard Home**
   - **Hero Metrics (Top of Page):**
     - AI Mentions (last 7 days): **47** (+12% vs. previous week) ↗️
     - Products Visible: **23/50** (46%)
     - Top Platform: **ChatGPT** (29 mentions)
   
2. **Weekly Summary Card**
   - "Your weekly AI visibility summary"
   - Graph: Mentions over time (line chart, 7 days)
   - Top 3 performing products:
     1. Organic Coffee Blend - 18 mentions
     2. Bamboo Yoga Mat - 12 mentions
     3. Eco Water Bottle - 9 mentions
   - Bottom 3 products (low visibility):
     1. Travel Mug - 0 mentions ⚠️
     2. Tea Sampler Set - 1 mention
     3. Reusable Straws - 1 mention
   - CTA: "Optimize Low-Visibility Products"

3. **Alerts & Notifications Panel**
   - **Recent Alerts:**
     - 🔴 **Critical:** ChatGPT showing wrong price for "Organic Coffee Blend" (2h ago)
     - 🟡 **Warning:** Perplexity visibility dropped 25% this week
     - 🟢 **Success:** ACP feed sync completed (4h ago)
   - User clicks on critical alert → Navigate to Flow 8 (Fix Data Error)

4. **Product List Table**
   - Columns:
     - Product Name | AI Mentions (7d) | Top Platform | Visibility Trend | Actions
   - Sortable by any column
   - User clicks product name → Navigate to Flow 5 (Product Detail View)

5. **Quick Actions Sidebar**
   - [ ] Run AI scan now (re-scan all products)
   - [ ] Export visibility report (CSV)
   - [ ] Configure alerts
   - [ ] Upgrade to Growth Plan

#### Success Metrics:
- 40% Weekly Active Users (WAU)
- Average session: 8 minutes
- 60% of users click into at least one product detail

---

### **Flow 5: Product Detail View**

**Goal:** Deep dive into AI visibility for a specific product  
**Entry Point:** Click product from dashboard table  
**Time Estimate:** 5-7 minutes  

#### Steps:

1. **Product Header**
   - Product image, name, SKU
   - Current price (from Shopify)
   - Inventory status (In Stock / Low Stock / Out of Stock)
   - "View in Shopify" link (external)

2. **AI Visibility Overview**
   - **Metrics (Last 30 Days):**
     - Total Mentions: 47
     - Average Position: 2.3 (out of 5 recommendations)
     - Sentiment: 78% Positive, 18% Neutral, 4% Negative
     - Top Platform: ChatGPT (32 mentions)
   
3. **Mentions Timeline**
   - Line chart: Mentions per day (last 30 days)
   - Annotations for spikes/drops
   - Hover tooltip shows sample query that triggered mention

4. **Query Intelligence Section**
   - **Top Queries That Trigger This Product:**
     1. "Best organic coffee brands" → Mentioned on ChatGPT, Perplexity
     2. "Where to buy fair trade coffee" → Mentioned on Gemini
     3. "Organic coffee online" → Mentioned on Perplexity, Claude
   - **Missed Opportunities (Queries where competitors appear but you don't):**
     1. "Eco-friendly coffee subscription" → Competitors: BrandX, BrandY
     2. "Best coffee for cold brew" → Competitors: BrandZ
   - CTA: "Optimize Product Description" (opens suggestion modal)

5. **Platform Breakdown Table**
   - | Platform | Mentions | Avg. Position | Sentiment | Sample Output |
   - ChatGPT | 32 | 1.8 | 85% Positive | "I recommend [Product Name] for..." [View Full]
   - Perplexity | 12 | 2.5 | 70% Positive | [View Full]
   - Gemini | 3 | 4.0 | 65% Neutral | [View Full]
   - Claude | 0 | ― | ― | Not mentioned ⚠️

6. **Optimization Suggestions Panel**
   - "💡 **Improve This Product's AI Visibility:**"
     - ✅ Add keyword "fair trade" to description (high opportunity)
     - ✅ Upload higher quality product image (AI indexing improved by 40%)
     - ✅ Add structured data for roast type, origin country
   - Button: "Apply All Suggestions" → Navigate to Truth Engine editor

#### User Actions:
- View sample AI outputs (modal popup)
- Export product report (PDF/CSV)
- Configure alerts for this product
- Edit product in Truth Engine

#### Success Metrics:
- 70% of dashboard users view at least 1 product detail
- 30% click optimization suggestions
- 15% apply at least one suggestion

---

### **Flow 6: Query Intelligence Library**

**Goal:** Browse successful prompts and identify optimization opportunities  
**Entry Point:** Dashboard → "Query Intelligence" tab  
**Time Estimate:** 5-10 minutes  

#### Steps:

1. **Query Library Home**
   - **Search Bar:** "Search queries... (e.g., 'organic coffee')"
   - **Filter Options:**
     - Platform: All / ChatGPT / Perplexity / Gemini / Claude
     - Result: All / Mentioned / Not Mentioned
     - Date Range: Last 7 days / 30 days / 90 days

2. **Top Performing Queries**
   - Table:
     - | Query | Platform | Your Products Mentioned | Position | Competitors |
     - "Best organic coffee brands" | ChatGPT | ✅ Organic Coffee Blend (#1) | 1 | BrandX (#2), BrandY (#3)
     - "Eco-friendly coffee subscription" | Perplexity | ❌ Not mentioned | ― | BrandZ (#1), BrandX (#2)
   - Click query → Expand to see full AI response

3. **Missed Opportunities Tab**
   - Queries where merchant SHOULD appear but doesn't
   - Sorted by search volume (estimate)
   - Each query shows:
     - Query text
     - Why you should appear (relevance score)
     - Competitors who appear
     - Suggested fix (e.g., "Add keyword 'subscription' to Coffee Blend product")

4. **Prompt Suggestions**
   - "💡 **Test these prompts with your products:**"
   - AI-generated prompts based on merchant's product category
   - Button: "Test This Prompt" → Runs live AI query, shows results

#### Success Metrics:
- 25% of weekly users visit Query Intelligence
- 40% of visitors test at least one prompt
- 20% apply optimization suggestions from this page

---

## CONFIGURATION FLOWS

### **Flow 7: Truth Engine - Product Data Sync**

**Goal:** Ensure product data accuracy, fix errors  
**Entry Point:** Dashboard → "Truth Engine" tab OR alert notification  
**Time Estimate:** 3-5 minutes to review, 1-2 minutes per fix  

#### Steps:

1. **Truth Engine Dashboard**
   - **Data Health Score:** 87/100 🟢
     - Calculation: (Products with no errors / Total products) × 100
   - **Error Summary:**
     - 🔴 Critical Errors: 2 (price mismatches)
     - 🟡 Warnings: 5 (missing structured data)
     - 🟢 Healthy Products: 43/50

2. **Error List Table**
   - | Product | Error Type | Severity | Shopify Value | AI Value | Detected | Actions |
   - Organic Coffee | Price Mismatch | Critical | $24.99 | $19.99 | 2h ago | [Fix Now]
   - Yoga Mat | Missing Schema | Warning | ― | ― | 1d ago | [Add Schema]
   
3. **Fix Error Flow (Price Mismatch)**
   - User clicks "Fix Now" on Organic Coffee error
   - **Modal opens:**
     - "Price Mismatch Detected"
     - Side-by-side comparison:
       - **Your Shopify Store:** $24.99 (updated 3 days ago)
       - **ChatGPT Output:** $19.99 (outdated)
     - **Actions:**
       - [🔄 Sync Correct Price to AI Agents] (recommended)
       - [✏️ Update Shopify Price] (if Shopify is wrong)
       - [⏸️ Ignore This Error] (not recommended)
   - User clicks "Sync Correct Price"
   - System:
     - Updates ACP product feed with $24.99
     - Triggers re-sync to OpenAI API
     - Marks error as resolved
   - **Confirmation:** "✅ Price updated! AI agents will reflect $24.99 within 24 hours."

4. **Add Missing Schema Flow**
   - User clicks "Add Schema" on Yoga Mat warning
   - **Form opens:**
     - "Add Structured Data for Better AI Understanding"
     - Fields (pre-filled from product description if possible):
       - Material: [Bamboo]
       - Dimensions: [72" x 24"]
       - Weight: [5 lbs]
       - Color: [Natural]
       - Care Instructions: [Wipe clean]
   - User fills/edits fields, clicks "Save"
   - System generates JSON-LD structured data, adds to product metadata

5. **Bulk Actions**
   - Checkbox select multiple products
   - Actions: "Fix All Price Errors" | "Export Error Report" | "Ignore Selected"

#### Success Metrics:
- 80% of errors resolved within 24 hours of detection
- 95% of critical errors resolved vs. 60% of warnings (prioritization working)
- <2% false positive error rate

---

### **Flow 8: Configure Alerts**

**Goal:** Set up email/SMS notifications for important events  
**Entry Point:** Dashboard → Settings → Alerts  
**Time Estimate:** 2-3 minutes  

#### Steps:

1. **Alerts Settings Page**
   - **Alert Channels:**
     - ✅ Email: merchant@example.com
     - ☐ SMS: +1 (___) ___-____ [Add Phone Number]
     - ☐ Slack: [Connect Slack Workspace]

2. **Alert Types (Toggles)**
   - **Critical Errors (Email + SMS):**
     - ✅ Price mismatch detected
     - ✅ Out-of-stock product recommended by AI
     - ✅ ACP API downtime >5 minutes
   
   - **Warnings (Email Only):**
     - ✅ Visibility dropped >30% week-over-week
     - ☐ Competitor mentioned more than your products
     - ☐ New AI platform available to track
   
   - **Success Notifications (Email):**
     - ✅ First ACP order received
     - ☐ Product reached #1 position on any AI platform
     - ☐ Weekly visibility summary

3. **Alert Frequency:**
   - Critical: Immediate (real-time)
   - Warnings: Daily digest (9am merchant timezone)
   - Success: Real-time

4. **Test Alert**
   - Button: "Send Test Alert" → Sends test email/SMS
   - Confirmation: "✅ Test alert sent to merchant@example.com"

#### Success Metrics:
- 70% of users configure at least one alert
- 90% of critical alerts result in merchant action within 24h
- <1% alert unsubscribe rate

---

## MONETIZATION FLOWS

### **Flow 9: Upgrade from Free to Starter**

**Goal:** Convert free user to paying customer  
**Entry Point:** Hit free tier limit OR click "Upgrade" button  
**Time Estimate:** 2-3 minutes  
**Conversion Target:** 5% within 14 days, 12% within 90 days  

#### Steps:

1. **Trigger (Limit Reached)**
   - User has 10 products (free limit reached)
   - Tries to sync 11th product
   - **Modal blocks action:**
     - "You've reached the Free tier limit (10 products)"
     - "Upgrade to Starter to track up to 100 products"
     - [View Plans] [Upgrade Now]

2. **Pricing Page**
   - Comparison table:
     - | Feature | Free | Starter ($79/mo) | Growth ($199/mo) |
     - Products Tracked | 10 | 100 | 500
     - Historical Data | 7 days | 30 days | 90 days
     - ACP Checkout | ❌ | ❌ | ✅
     - Truth Engine | Basic | Full | Full + Priority
   - Highlight: "Most Popular" badge on Starter
   - Annual discount: "Save 20% with annual billing"

3. **Select Plan**
   - User clicks "Choose Starter"
   - **Billing Cycle:**
     - ○ Monthly ($79/mo)
     - ● Annual ($758/year) *Save $190!*
   - Button: "Continue to Payment"

4. **Payment Form (Stripe Checkout)**
   - Redirect to Stripe hosted checkout page
   - Fields (pre-filled from Shopify if available):
     - Card number
     - Expiration
     - CVC
     - Billing ZIP
   - "Subscribe to Starter Plan - $79/month"
   - User completes payment

5. **Upgrade Confirmation**
   - **Success Page:**
     - "🎉 Welcome to AgenticRev Starter!"
     - "Your account has been upgraded"
     - **What's New:**
       - ✅ Track up to 100 products
       - ✅ 30 days of historical data
       - ✅ Full Truth Engine access
     - CTA: "Sync More Products" → Navigate to dashboard

6. **Post-Upgrade Email**
   - Subject: "🎉 Your AgenticRev Starter plan is active"
   - Body: Receipt, next billing date, support links
   - CTA: "Set Up Your First Alert"

#### Edge Cases:
- **Payment fails:** Show error, offer trial extension, suggest updating payment method
- **Upgrade during trial:** Pro-rate remaining trial days as credit

#### Success Metrics:
- 12% free → paid conversion within 90 days
- 5% conversion within 14 days (activation-driven)
- <2% failed payment rate

---

### **Flow 10: Upgrade from Starter to Growth (ACP Enablement)**

**Goal:** Upsell to Growth plan when ACP launches  
**Entry Point:** Banner on dashboard OR upgrade prompt when attempting ACP features  
**Time Estimate:** 2-3 minutes  
**Conversion Target:** 25% of Starter users upgrade within 30 days of ACP launch  

#### Steps:

1. **ACP Launch Announcement (In-App Banner)**
   - **Top of Dashboard:**
     - "🚀 NEW: ChatGPT Instant Checkout Is Live!"
     - "Enable your products for purchase directly in ChatGPT"
     - [Learn More] [Enable ACP] (→ upgrade flow)

2. **Feature Gating**
   - Starter user clicks "Enable ACP" button
   - **Modal:**
     - "ACP Checkout requires Growth Plan"
     - **Benefits of Growth:**
       - ✅ Instant checkout in ChatGPT
       - ✅ Track up to 500 products
       - ✅ 90 days historical data
       - ✅ Priority support
     - "Current plan: Starter ($79/mo)"
     - "Growth plan: $199/mo (+$120/mo)"
     - [Upgrade to Growth] [Learn More]

3. **Upgrade Flow**
   - User clicks "Upgrade to Growth"
   - **Confirmation Modal:**
     - "Upgrade to Growth Plan?"
     - "Your card ending in 1234 will be charged $199/mo starting today"
     - "You'll receive a pro-rated credit of $XX for unused Starter time"
     - [Confirm Upgrade] [Cancel]
   - User confirms
   - System:
     - Updates subscription in Stripe
     - Pro-rates previous plan
     - Unlocks Growth features

4. **ACP Setup Wizard (Auto-Launch After Upgrade)**
   - **Step 1: Generate ACP Feed**
     - "Generating your ACP product feed..."
     - Progress: "Processing 47/100 products"
     - "✅ Feed generated successfully"
   
   - **Step 2: Validate Feed**
     - "Testing feed against OpenAI ACP schema..."
     - "✅ All products validated"
   
   - **Step 3: Submit to OpenAI**
     - "Submitting feed to OpenAI Commerce API..."
     - "✅ Feed submitted for review"
     - "Approval typically takes 1-2 business days"
   
   - **Step 4: Complete**
     - "🎉 You're all set!"
     - "We'll notify you when OpenAI approves your feed"
     - "Expected timeline: 1-2 days"
     - [Return to Dashboard]

5. **Follow-Up Emails**
   - **Day 0:** "Welcome to Growth Plan - ACP setup in progress"
   - **Day 1-2:** "Your ACP feed is under review"
   - **Day 2-3:** "✅ Approved! Your products are live in ChatGPT" (if approved)

#### Success Metrics:
- 25% of Starter users upgrade to Growth within 30 days of ACP launch
- 90% of Growth users complete ACP setup wizard
- 50% of Growth users process first ACP order within 14 days

---

## ALERT & ERROR FLOWS

### **Flow 11: Critical Error Alert → Resolution**

**Goal:** Notify merchant of critical issue, guide to quick fix  
**Trigger:** System detects critical error (price mismatch, inventory error, ACP downtime)  
**Time to Resolution Target:** <24 hours for 80% of errors  

#### Steps:

1. **Error Detection (Backend)**
   - Automated daily scan checks:
     - Shopify product price vs. AI-displayed price
     - Shopify inventory status vs. AI recommendations
     - ACP API health check
   - Error found: ChatGPT recommending "Organic Coffee Blend" at $19.99, Shopify shows $24.99

2. **Alert Sent**
   - **Email:**
     - Subject: "🔴 Critical: Price error detected for Organic Coffee Blend"
     - Body:
       - "ChatGPT is showing incorrect pricing for your product"
       - Shopify: $24.99 | ChatGPT: $19.99
       - "This could lead to lost sales or customer complaints"
       - CTA Button: "Fix This Now"
   - **In-App Notification:**
     - Red badge on dashboard nav
     - Alert panel shows error at top

3. **User Clicks "Fix This Now"**
   - Lands on Truth Engine → specific error page
   - See Flow 7 (Fix Error Flow) for resolution steps

4. **Error Resolved**
   - User syncs correct price → $24.99
   - **Confirmation Email:**
     - Subject: "✅ Price error resolved for Organic Coffee Blend"
     - Body: "AI agents will reflect $24.99 within 24 hours. We'll monitor to confirm."

5. **Follow-Up Check (24 Hours Later)**
   - System re-scans ChatGPT output
   - ✅ If fixed: No action
   - ❌ If still wrong: Escalate alert, offer manual support

#### Success Metrics:
- 95% alert delivery rate (email + in-app)
- 80% of critical errors clicked within 6 hours
- 80% of errors resolved within 24 hours

---

### **Flow 12: First ACP Order Notification (Success Flow)**

**Goal:** Celebrate merchant's first AI-driven sale, drive engagement  
**Trigger:** First order comes through ChatGPT ACP checkout  
**Emotion:** Excitement, validation, achievement  

#### Steps:

1. **Order Detection**
   - OpenAI ACP webhook hits: `POST /webhooks/acp/order`
   - Payload: { order_id, merchant_id, total, items, customer }
   - System verifies it's merchant's first ACP order ever

2. **Immediate In-App Notification**
   - **Toast Notification (if merchant is logged in):**
     - "🎉 Congratulations! You just made your first ChatGPT sale!"
     - Amount: "$47.98"
     - Product: "Organic Coffee Blend"
     - [View Order Details]

3. **Celebration Email**
   - Subject: "🎉 You made your first ChatGPT sale!"
   - Body:
     - "Congratulations! A customer just purchased through ChatGPT"
     - **Order Details:**
       - Product: Organic Coffee Blend
       - Amount: $47.98
       - Order #: ACP-00123
     - "This is just the beginning of AI-driven commerce for your store!"
     - **Next Steps:**
       - ✅ Order synced to Shopify - fulfill as normal
       - ✅ Track more ACP sales in your dashboard
     - CTA: "View ACP Analytics"

4. **Dashboard Update**
   - ACP Analytics widget shows:
     - "💰 ACP Revenue (Last 30 Days): $47.98"
     - "Orders: 1"
     - "Conversion Rate: 12.5%"

5. **Social Proof Opportunity**
   - Optional: "Share your achievement!"
   - Pre-filled tweet: "Just made my first sale through ChatGPT with @AgenticRev! The future of AI commerce is here 🚀"

#### Success Metrics:
- 100% of first orders trigger celebration email
- 40% of merchants click "View ACP Analytics"
- 10% share on social media

---

## EDGE CASES & ERROR STATES

### **Flow 13: Store Disconnection / API Failure**

**Goal:** Gracefully handle when Shopify/WooCommerce connection breaks  
**Trigger:** API authentication fails, webhooks stop, manual disconnection  

#### Steps:

1. **Detection**
   - Scheduled sync job fails 3 times in a row
   - Error: `401 Unauthorized` or `403 Forbidden`

2. **Alert Merchant**
   - **Email:**
     - Subject: "⚠️ Your Shopify connection needs attention"
     - "We're unable to sync your product data. Please reconnect your store."
   - **In-App Banner (Red):**
     - "⚠️ Store connection lost. Product data is not syncing. [Reconnect Now]"

3. **Reconnection Flow**
   - User clicks "Reconnect Now"
   - → Navigate to `/settings/integrations`
   - Shows "Shopify: ❌ Disconnected"
   - Button: "Reconnect Shopify"
   - → Redirect to Shopify OAuth (same as onboarding)
   - → After auth, test connection
   - ✅ "Reconnected! Syncing products now..."

4. **Data Integrity Check**
   - System compares last successful sync vs. current Shopify data
   - Identifies changes made while disconnected
   - Shows summary: "3 products updated, 1 new product added while disconnected"

#### Success Metrics:
- 90% reconnection rate within 48 hours
- <1% of users remain disconnected >7 days

---

## ACCESSIBILITY & MOBILE CONSIDERATIONS

### **Mobile Responsive Flows**

All flows must work on mobile browsers (iOS Safari, Chrome Mobile):

**Dashboard (Mobile):**
- Stack cards vertically
- Collapse side navigation to hamburger menu
- Swipe gestures for charts (scroll timeline)
- Tap product cards to see details (full-screen modal)

**Truth Engine (Mobile):**
- Error list: Card view instead of table
- Fix error: Full-screen modal with clear CTA buttons
- Bulk actions: Hidden behind "More" menu

**ACP Setup Wizard (Mobile):**
- Step-by-step full-screen pages
- Large touch targets (min 44px)
- Progress indicator at top

### **Accessibility Requirements**

- WCAG 2.1 AA compliance minimum
- Keyboard navigation for all flows
- Screen reader labels for all interactive elements
- Color contrast ratio >4.5:1 for text
- Focus indicators visible on all clickable elements

---

## Success Metrics Summary

| Flow | Primary Metric | Target | Measurement |
|------|---------------|--------|-------------|
| Signup (Email) | Completion Rate | 80% | Signups / Landing Page Clicks |
| Signup (Shopify OAuth) | Completion Rate | 90% | OAuth Installs / Button Clicks |
| Store Connection | Success Rate | 95% | Successful Connections / Attempts |
| Initial Scan | Completion Time | <5 min | 90th percentile scan duration |
| Dashboard Check-In | Weekly Active Users | 40% | Users active 1+ times/week |
| Product Detail View | View Rate | 70% | Users viewing details / Dashboard users |
| Truth Engine Errors | Resolution Time | <24 hrs | 80% of errors resolved |
| Free → Starter Upgrade | Conversion Rate | 12% | Paid users / Free users (90 days) |
| Starter → Growth Upgrade | Conversion Rate | 25% | Growth users / Starter users (30 days) |
| First ACP Order | Email Click Rate | 40% | Email clicks / Emails sent |

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** Move to Feature Specifications (UI mockups, component details)  
**Dependencies:** PRD must be finalized before implementing these flows
