# Feature Specifications
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 🟢 Final - Ready for Development  
**Owner:** Product Team  

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Module 1: Visibility Dashboard](#module-1-visibility-dashboard)
3. [Module 2: Truth Engine](#module-2-truth-engine)
4. [Module 3: Action Layer (ACP)](#module-3-action-layer-acp)
5. [Module 4: Reliability Monitoring](#module-4-reliability-monitoring)
6. [Supporting Features](#supporting-features)

---

## Feature Overview

This document provides **granular specifications** for each feature in AgenticRev. Each feature includes:
- **Description:** What it does
- **User Story:** Who needs it and why
- **Acceptance Criteria:** Specific requirements
- **UI Elements:** Components, states, interactions
- **Backend Logic:** Database queries, business rules
- **Edge Cases:** Error handling, empty states

---

## Module 1: Visibility Dashboard

### **Feature 1.1: AI Visibility Overview (Hero Cards)**

**Description:**  
Display 4 hero metrics at the top of the dashboard showing AI visibility performance.

**User Story:**  
_As an e-commerce merchant, I want to see at-a-glance how visible my products are in AI search, so I can quickly assess my AI presence._

**Acceptance Criteria:**
- [x] Display 4 metric cards: Total Mentions, Visibility Rate, Top Platform, Mentions Trend
- [x] Each card shows current value + percentage change vs. previous period
- [x] Green arrow (↑) for positive change, red arrow (↓) for negative change
- [x] Period selector: 7d, 30d, 90d (default: 7d)
- [x] Loading state: Skeleton cards while data loads
- [x] Empty state: "No data yet. Run your first AI scan to see visibility metrics."

**UI Elements:**

```typescript
<Card className="dashboard-metric-card">
  <CardHeader>
    <h3 className="text-sm font-medium text-gray-500">Total Mentions</h3>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">47</div>
    <div className="text-sm text-green-600 flex items-center">
      <ArrowUpIcon className="w-4 h-4 mr-1" />
      +12 (34.3%)
    </div>
    <p className="text-xs text-gray-400 mt-1">vs. previous 7 days</p>
  </CardContent>
</Card>
```

**Backend Logic:**

```sql
-- Calculate total mentions in period
SELECT COUNT(*) as total_mentions
FROM ai_mentions
WHERE user_id = $1 
  AND scanned_at >= NOW() - INTERVAL '7 days'
  AND mentioned = true;

-- Calculate previous period for comparison
SELECT COUNT(*) as previous_mentions
FROM ai_mentions
WHERE user_id = $1 
  AND scanned_at >= NOW() - INTERVAL '14 days'
  AND scanned_at < NOW() - INTERVAL '7 days'
  AND mentioned = true;

-- Percent change = ((current - previous) / previous) * 100
```

**Edge Cases:**
- No previous data: Show "N/A" for percent change
- Zero mentions: Show "0" with neutral color (no arrow)
- First scan: Show "Welcome! Your first scan results will appear here."

---

### **Feature 1.2: AI Platform Breakdown Chart**

**Description:**  
Line chart showing mentions over time, broken down by AI platform (ChatGPT, Perplexity, Gemini, Claude).

**User Story:**  
_As a merchant, I want to see which AI platforms mention my products most frequently, so I can identify where to focus optimization efforts._

**Acceptance Criteria:**
- [x] Line chart with 4 lines (one per platform)
- [x] X-axis: Date (daily data points)
- [x] Y-axis: Number of mentions
- [x] Legend with platform names and colors
- [x] Tooltip on hover showing exact values
- [x] Responsive (stacks vertically on mobile)

**UI Elements:**

```typescript
<LineChart width={800} height={400} data={timelineData}>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="chatgpt" stroke="#10a37f" name="ChatGPT" />
  <Line type="monotone" dataKey="perplexity" stroke="#1fb6ff" name="Perplexity" />
  <Line type="monotone" dataKey="gemini" stroke="#4285f4" name="Gemini" />
  <Line type="monotone" dataKey="claude" stroke="#cc785c" name="Claude" />
</LineChart>
```

**Backend Logic:**

```sql
-- Get daily mentions by platform (last 7 days)
SELECT 
  DATE(scanned_at) as date,
  SUM(CASE WHEN platform_id = 'chatgpt' AND mentioned = true THEN 1 ELSE 0 END) as chatgpt,
  SUM(CASE WHEN platform_id = 'perplexity' AND mentioned = true THEN 1 ELSE 0 END) as perplexity,
  SUM(CASE WHEN platform_id = 'gemini' AND mentioned = true THEN 1 ELSE 0 END) as gemini,
  SUM(CASE WHEN platform_id = 'claude' AND mentioned = true THEN 1 ELSE 0 END) as claude
FROM ai_mentions
WHERE user_id = $1 
  AND scanned_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(scanned_at)
ORDER BY date ASC;
```

**Edge Cases:**
- No mentions: Show empty chart with message "No AI mentions yet. Run a scan to populate this chart."
- Single platform: Chart still displays with only one line
- Platform never scanned: Line shows as 0 throughout

---

### **Feature 1.3: Top Products Table**

**Description:**  
Table showing top 10 products by AI mentions, with product name, mentions count, and average position.

**User Story:**  
_As a merchant, I want to see which of my products are mentioned most in AI, so I can understand what's driving visibility._

**Acceptance Criteria:**
- [x] Display top 10 products (sorted by mentions descending)
- [x] Columns: Product Name (with image), Total Mentions, Avg Position, View Details button
- [x] Clicking product name opens product detail page
- [x] "View All Products" button below table
- [x] Pagination if >10 products

**UI Elements:**

```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Product</TableHead>
      <TableHead>Mentions</TableHead>
      <TableHead>Avg Position</TableHead>
      <TableHead></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {topProducts.map(product => (
      <TableRow key={product.id}>
        <TableCell className="flex items-center gap-3">
          <img src={product.image_url} className="w-12 h-12 rounded" />
          <span className="font-medium">{product.name}</span>
        </TableCell>
        <TableCell>{product.mentions}</TableCell>
        <TableCell>
          <Badge variant={product.avg_position <= 3 ? 'success' : 'default'}>
            #{product.avg_position}
          </Badge>
        </TableCell>
        <TableCell>
          <Button variant="ghost" onClick={() => router.push(`/products/${product.id}`)}>
            View Details →
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Backend Logic:**

```sql
-- Top products by mentions
SELECT 
  p.id,
  p.name,
  p.image_url,
  COUNT(am.id) as mentions,
  ROUND(AVG(am.position), 1) as avg_position
FROM products p
JOIN ai_mentions am ON am.product_id = p.id
WHERE p.store_id IN (SELECT id FROM stores WHERE user_id = $1)
  AND am.scanned_at >= NOW() - INTERVAL '7 days'
  AND am.mentioned = true
GROUP BY p.id, p.name, p.image_url
ORDER BY mentions DESC
LIMIT 10;
```

---

### **Feature 1.4: Manual Scan Trigger**

**Description:**  
Button to manually trigger AI visibility scan for all products.

**User Story:**  
_As a merchant, I want to manually trigger a scan after updating my product descriptions, so I can immediately see if visibility improved._

**Acceptance Criteria:**
- [x] "Scan Now" button visible on dashboard
- [x] Shows loading state when scan in progress
- [x] Disabled if scan already running
- [x] Shows estimated duration (e.g., "~5 minutes for 47 products")
- [x] Quota enforcement: Free (1x/week), Starter (1x/day), Growth (unlimited)
- [x] Real-time progress updates via WebSocket
- [x] Success toast: "Scan complete! Found 18 new mentions."

**UI Elements:**

```typescript
<Button 
  onClick={handleScanClick}
  disabled={scanInProgress || scanQuotaExceeded}
>
  {scanInProgress ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Scanning... ({scanProgress.current}/{scanProgress.total})
    </>
  ) : (
    <>
      <RefreshCw className="mr-2 h-4 w-4" />
      Scan Now
    </>
  )}
</Button>

{scanQuotaExceeded && (
  <Alert variant="warning">
    <AlertTitle>Scan Quota Exceeded</AlertTitle>
    <AlertDescription>
      Free plan allows 1 scan per week. Upgrade to Starter for daily scans.
      <Button variant="link" onClick={() => router.push('/pricing')}>
        Upgrade Now →
      </Button>
    </AlertDescription>
  </Alert>
)}
```

**Backend Logic:**

```typescript
// Check scan quota
const lastScan = await prisma.ai_mentions.findFirst({
  where: {
    user_id: userId,
    scanned_at: { gte: scanQuotaCutoff }
  },
  orderBy: { scanned_at: 'desc' }
});

if (lastScan && !canScan(user.plan, lastScan.scanned_at)) {
  throw new Error('SCAN_QUOTA_EXCEEDED');
}

// Trigger scan job (Lambda)
await lambda.invoke({
  FunctionName: 'agenticrev-ai-scanner',
  InvocationType: 'Event',
  Payload: JSON.stringify({
    user_id: userId,
    products: products.map(p => p.id)
  })
});

// Save job record
await prisma.scan_jobs.create({
  data: {
    user_id: userId,
    status: 'pending',
    products_count: products.length,
    estimated_duration: products.length * 5 // 5 seconds per product
  }
});
```

---

## Module 2: Truth Engine

### **Feature 2.1: Data Accuracy Error List**

**Description:**  
List of detected data accuracy errors (price mismatches, inventory errors, etc.) with severity badges.

**User Story:**  
_As a merchant, I want to see when AI platforms display incorrect information about my products, so I can fix errors before they hurt sales._

**Acceptance Criteria:**
- [x] Table showing all errors (critical first, then warnings)
- [x] Columns: Product Name, Error Type, Severity, Expected vs Actual, Fix button
- [x] Filter by severity (Critical, Warning, All)
- [x] Filter by resolved status (Unresolved, Resolved, All)
- [x] Auto-fix button (when applicable)
- [x] "Ignore" button (hides error from list)

**UI Elements:**

```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Product</TableHead>
      <TableHead>Error Type</TableHead>
      <TableHead>Severity</TableHead>
      <TableHead>Details</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {errors.map(error => (
      <TableRow key={error.id}>
        <TableCell>{error.product_name}</TableCell>
        <TableCell>
          <Badge variant="outline">
            {error.error_type === 'price_mismatch' ? 'Price Mismatch' : 
             error.error_type === 'inventory_error' ? 'Inventory Error' :
             error.error_type === 'missing_schema' ? 'Missing Schema' : 'Other'}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={error.severity === 'critical' ? 'destructive' : 'warning'}>
            {error.severity}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="text-sm">
            <div className="text-gray-500">Expected: <strong>{error.expected_value}</strong></div>
            <div className="text-red-600">Actual: <strong>{error.actual_value}</strong></div>
          </div>
        </TableCell>
        <TableCell className="flex gap-2">
          {error.can_auto_fix && (
            <Button size="sm" onClick={() => handleAutoFix(error.id)}>
              Auto-Fix
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => handleIgnore(error.id)}>
            Ignore
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Backend Logic:**

```sql
-- Detect price mismatches
INSERT INTO truth_engine_errors (product_id, error_type, severity, expected_value, actual_value)
SELECT 
  p.id,
  'price_mismatch',
  'critical',
  p.price::text,
  am.response_full::json->>'price' as actual_value
FROM products p
JOIN ai_mentions am ON am.product_id = p.id
WHERE am.response_full::json->>'price' IS NOT NULL
  AND am.response_full::json->>'price' != p.price::text
  AND am.scanned_at >= NOW() - INTERVAL '24 hours';
```

**Edge Cases:**
- No errors: Show success message "Great work! No data errors detected. 🎉"
- Auto-fix fails: Show error toast "Auto-fix failed. Please update manually in Shopify."

---

### **Feature 2.2: Data Health Score**

**Description:**  
Overall data quality score (0-100) based on number of errors and product schema completeness.

**User Story:**  
_As a merchant, I want a single number that tells me how healthy my product data is, so I can quickly assess if action is needed._

**Acceptance Criteria:**
- [x] Score displayed prominently (large number 0-100)
- [x] Color-coded: Green (90-100), Yellow (70-89), Red (<70)
- [x] Breakdown of score components: Accuracy, Schema Quality, AI Readability
- [x] Recalculated after each scan
- [x] Historical chart showing score over time

**UI Elements:**

```typescript
<Card className="data-health-card">
  <CardHeader>
    <h2 className="text-lg font-semibold">Data Health Score</h2>
  </CardHeader>
  <CardContent>
    <div className={`text-6xl font-bold ${
      score >= 90 ? 'text-green-600' : 
      score >= 70 ? 'text-yellow-600' : 
      'text-red-600'
    }`}>
      {score}
    </div>
    <div className="mt-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span>Accuracy</span>
        <span className="font-medium">{accuracyScore}/100</span>
      </div>
      <Progress value={accuracyScore} />
      
      <div className="flex justify-between text-sm">
        <span>Schema Quality</span>
        <span className="font-medium">{schemaScore}/100</span>
      </div>
      <Progress value={schemaScore} />
      
      <div className="flex justify-between text-sm">
        <span>AI Readability</span>
        <span className="font-medium">{readabilityScore}/100</span>
      </div>
      <Progress value={readabilityScore} />
    </div>
  </CardContent>
</Card>
```

**Backend Logic:**

```typescript
function calculateDataHealthScore(userId: string): number {
  // Accuracy score (errors deduct points)
  const criticalErrors = await countErrors(userId, 'critical');
  const warningErrors = await countErrors(userId, 'warning');
  const accuracyScore = 100 - (criticalErrors * 10) - (warningErrors * 2);
  
  // Schema quality (% of products with valid JSON-LD)
  const totalProducts = await countProducts(userId);
  const productsWithSchema = await countProductsWithSchema(userId);
  const schemaScore = (productsWithSchema / totalProducts) * 100;
  
  // AI readability (average readability score)
  const avgReadability = await averageReadabilityScore(userId);
  
  // Overall score (weighted average)
  const overallScore = (accuracyScore * 0.5) + (schemaScore * 0.3) + (avgReadability * 0.2);
  
  return Math.round(Math.max(0, Math.min(100, overallScore)));
}
```

---

## Module 3: Action Layer (ACP)

### **Feature 3.1: ACP Feed Generator**

**Description:**  
Generate OpenAI-compatible product feed for ChatGPT Commerce.

**User Story:**  
_As a merchant, I want to export my product catalog in OpenAI's required format, so I can enable instant checkout in ChatGPT._

**Acceptance Criteria:**
- [x] "Generate ACP Feed" button on dashboard
- [x] Only enabled for Growth+ plans
- [x] Only includes in-stock products
- [x] Validates feed against OpenAI schema before generation
- [x] Saves feed to S3 with unique URL
- [x] Shows feed URL + "Submit to OpenAI" button
- [x] Logs feed generation in audit trail

**UI Elements:**

```typescript
<Card className="acp-feed-card">
  <CardHeader>
    <h3 className="text-lg font-semibold">OpenAI Commerce Feed</h3>
    {user.plan === 'free' || user.plan === 'starter' ? (
      <Badge variant="outline">Growth Plan Required</Badge>
    ) : null}
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-600 mb-4">
      Generate a product feed compatible with OpenAI's Action for Commerce Platform.
      This enables instant checkout in ChatGPT.
    </p>
    
    {latestFeed ? (
      <div className="space-y-3">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-xs text-gray-500">Feed URL</div>
          <div className="text-sm font-mono truncate">{latestFeed.feed_url}</div>
          <div className="text-xs text-gray-500 mt-1">
            Generated {formatDate(latestFeed.generated_at)} • {latestFeed.product_count} products
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleSubmitToOpenAI}>
            Submit to OpenAI
          </Button>
          <Button variant="outline" onClick={handleRegenerateFeed}>
            Regenerate Feed
          </Button>
        </div>
      </div>
    ) : (
      <Button 
        onClick={handleGenerateFeed}
        disabled={user.plan === 'free' || user.plan === 'starter'}
      >
        Generate Feed
      </Button>
    )}
  </CardContent>
</Card>
```

**Backend Logic:**

```typescript
async function generateACPFeed(userId: string) {
  // Get in-stock products
  const products = await prisma.products.findMany({
    where: {
      store: { user_id: userId },
      in_stock: true
    }
  });
  
  // Generate feed JSON
  const feed = {
    schema_version: '1.0',
    merchant: {
      id: userId,
      name: products[0].store.store_name,
      url: products[0].store.store_domain
    },
    products: products.map(p => ({
      id: p.id,
      title: p.name,
      description: p.description,
      price: { value: p.price.toString(), currency: p.currency },
      availability: 'in_stock',
      image_url: p.image_url,
      product_url: p.product_url,
      schema_markup: p.schema_json
    }))
  };
  
  // Upload to S3
  const feedUrl = await s3.putObject({
    Bucket: 'agenticrev-acp-feeds',
    Key: `feeds/${userId}/feed-${Date.now()}.json`,
    Body: JSON.stringify(feed),
    ContentType: 'application/json'
  });
  
  // Save feed record
  await prisma.acp_feeds.create({
    data: {
      store_id: products[0].store_id,
      feed_url: feedUrl,
      product_count: products.length,
      status: 'generated'
    }
  });
  
  return feedUrl;
}
```

---

### **Feature 3.2: ACP Order Dashboard**

**Description:**  
List of orders placed via ChatGPT instant checkout.

**User Story:**  
_As a merchant, I want to see orders that came from ChatGPT, so I can track revenue from AI-driven sales._

**Acceptance Criteria:**
- [x] Table showing ACP orders (order number, customer, total, status, date)
- [x] Badge showing "ChatGPT Order"
- [x] Filter by fulfillment status (All, Pending, Fulfilled, Canceled)
- [x] Sort by date (newest first)
- [x] Click order to view details
- [x] "First ACP Order" celebration modal (confetti animation)

**UI Elements:**

```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Order #</TableHead>
      <TableHead>Customer</TableHead>
      <TableHead>Total</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Date</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {acpOrders.map(order => (
      <TableRow key={order.id}>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="font-mono">{order.order_number}</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              ChatGPT Order
            </Badge>
          </div>
        </TableCell>
        <TableCell>{order.customer_email}</TableCell>
        <TableCell className="font-semibold">
          {formatPrice(order.total, order.currency)}
        </TableCell>
        <TableCell>
          <Badge variant={
            order.fulfillment_status === 'fulfilled' ? 'success' : 
            order.fulfillment_status === 'pending' ? 'warning' : 
            'default'
          }>
            {order.fulfillment_status}
          </Badge>
        </TableCell>
        <TableCell>{formatDate(order.placed_at)}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>

{/* First Order Celebration */}
{showFirstOrderModal && (
  <Dialog open={true} onOpenChange={setShowFirstOrderModal}>
    <DialogContent className="text-center">
      <Confetti active={true} />
      <h2 className="text-2xl font-bold">🎉 Your First ACP Order!</h2>
      <p className="text-gray-600">
        Congratulations! You just got your first order through ChatGPT.
        This is what AI-native commerce looks like.
      </p>
      <Button onClick={() => setShowFirstOrderModal(false)}>
        Let's Go! 🚀
      </Button>
    </DialogContent>
  </Dialog>
)}
```

---

## Module 4: Reliability Monitoring

### **Feature 4.1: Alert Configuration**

**Description:**  
User-configurable alerts for critical events (price mismatches, inventory errors, ACP orders).

**User Story:**  
_As a merchant, I want to be notified immediately when AI platforms display wrong prices, so I can fix them before losing sales._

**Acceptance Criteria:**
- [x] Alert types: Price Mismatch, Inventory Error, Out of Stock, New ACP Order
- [x] Channels: Email, SMS (future), In-App
- [x] Frequency: Immediate, Daily Digest, Weekly Digest
- [x] Enable/disable toggle for each alert type
- [x] Test alert button (sends sample alert)

**UI Elements:**

```typescript
<Card className="alerts-config">
  <CardHeader>
    <h3 className="text-lg font-semibold">Alert Preferences</h3>
  </CardHeader>
  <CardContent className="space-y-4">
    {alertTypes.map(alertType => (
      <div key={alertType.id} className="flex items-center justify-between border-b pb-3">
        <div>
          <div className="font-medium">{alertType.name}</div>
          <div className="text-sm text-gray-500">{alertType.description}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Checkbox 
              checked={alertType.email_enabled} 
              onCheckedChange={(checked) => updateAlert(alertType.id, 'email', checked)}
              label="Email"
            />
            <Checkbox 
              checked={alertType.in_app_enabled} 
              onCheckedChange={(checked) => updateAlert(alertType.id, 'in_app', checked)}
              label="In-App"
            />
          </div>
          <Select value={alertType.frequency} onValueChange={(freq) => updateFrequency(alertType.id, freq)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
          <Switch checked={alertType.enabled} onCheckedChange={(enabled) => toggleAlert(alertType.id, enabled)} />
        </div>
      </div>
    ))}
  </CardContent>
</Card>
```

---

## Supporting Features

### **Feature S1: Onboarding Wizard**

**Description:**  
3-step wizard guiding new users through signup → store connection → first scan.

**MVP Scope:** Shopify only. WooCommerce support deferred to Phase 2 (April 2026).

**Steps:**
1. **Account Setup:** Email, password, full name
2. **Store Connection:** Shopify OAuth (WooCommerce option shows "Coming Phase 2" badge)
3. **First Scan:** Trigger initial AI visibility scan

**UI:** Full-screen wizard with progress indicator (1/3, 2/3, 3/3).

---

### **Feature S2: Upgrade Flow**

**Description:**  
In-app upgrade modal with plan comparison and Stripe checkout.

**Trigger:** User clicks "Upgrade" badge or hits plan limit.

**UI:** Modal showing plan comparison table → "Upgrade to [Plan]" button → Stripe Checkout.

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** UI/UX Requirements (final document)  
**Dependencies:** Product Requirements Document, User Flows

---

*This document covers 90% of feature specifications. Additional micro-features (CSV export, search filters, etc.) will be added during development as needed.*
