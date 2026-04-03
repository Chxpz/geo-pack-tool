# Testing Strategy
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 🟢 Final - Ready for Development  
**Owner:** Engineering Team  

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Pyramid](#test-pyramid)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [API Testing](#api-testing)
7. [Performance Testing](#performance-testing)
8. [Test Coverage Goals](#test-coverage-goals)
9. [Testing Checklist](#testing-checklist)

---

## Testing Philosophy

### **Principles**

1. **Test Behavior, Not Implementation:** Focus on what code does, not how it does it
2. **Fast Feedback:** Unit tests run in <5 seconds, E2E tests in <2 minutes
3. **Confidence Over Coverage:** 80% coverage with meaningful tests > 100% coverage with brittle tests
4. **Flake-Free:** Tests must be deterministic (no random failures)
5. **Test in Production-Like Environment:** Staging mirrors production exactly

### **Testing Priorities**

**CRITICAL (must have 100% test coverage):**
- Authentication (login, signup, OAuth)
- Payment processing (Stripe checkout, subscription upgrades)
- Data accuracy (Truth Engine error detection)
- Webhooks (Shopify, Stripe, OpenAI ACP)

**HIGH (aim for 80% coverage):**
- Product sync (Shopify, WooCommerce)
- AI visibility scanning
- Dashboard data aggregation
- Alert notifications

**MEDIUM (basic happy path tests):**
- UI components (buttons, cards, charts)
- Email templates
- Admin utilities

---

## Test Pyramid

```
        ┌─────────────┐
        │   E2E (5%)  │  ← 20 tests (critical user flows)
        └─────────────┘
      ┌─────────────────┐
      │ Integration     │
      │    (15%)        │  ← 80 tests (API routes, database)
      └─────────────────┘
    ┌─────────────────────┐
    │   Unit (80%)        │  ← 400 tests (functions, utils)
    └─────────────────────┘
```

**Target: 500 total tests**
- Unit: 400 tests
- Integration: 80 tests
- E2E: 20 tests

---

## Unit Testing

### **1. Setup**

**Framework:** Vitest (faster than Jest for Next.js)

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**`vitest.config.ts`:**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.ts',
        '**/*.d.ts'
      ]
    }
  }
});
```

**`tests/setup.ts`:**

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams()
}));
```

---

### **2. Component Tests**

**Example: Product Card Component**

```typescript
// components/ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProductCard from './ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '123',
    name: 'Organic Coffee',
    price: 24.99,
    image_url: 'https://example.com/coffee.jpg',
    in_stock: true,
    ai_readability_score: 87
  };

  it('renders product name', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Organic Coffee')).toBeInTheDocument();
  });

  it('renders price formatted', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('$24.99')).toBeInTheDocument();
  });

  it('shows in-stock badge when in_stock is true', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('In Stock')).toBeInTheDocument();
  });

  it('shows out-of-stock badge when in_stock is false', () => {
    const outOfStockProduct = { ...mockProduct, in_stock: false };
    render(<ProductCard product={outOfStockProduct} />);
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });

  it('renders product image with correct alt text', () => {
    render(<ProductCard product={mockProduct} />);
    const img = screen.getByAltText('Organic Coffee');
    expect(img).toHaveAttribute('src', mockProduct.image_url);
  });

  it('displays AI readability score', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('87')).toBeInTheDocument();
  });
});
```

---

### **3. Utility Function Tests**

**Example: Price Formatter**

```typescript
// lib/formatPrice.test.ts
import { describe, it, expect } from 'vitest';
import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('formats USD price correctly', () => {
    expect(formatPrice(24.99, 'USD')).toBe('$24.99');
  });

  it('formats EUR price correctly', () => {
    expect(formatPrice(24.99, 'EUR')).toBe('€24.99');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatPrice(24.999, 'USD')).toBe('$25.00');
  });

  it('handles zero price', () => {
    expect(formatPrice(0, 'USD')).toBe('$0.00');
  });

  it('handles large numbers', () => {
    expect(formatPrice(1000000, 'USD')).toBe('$1,000,000.00');
  });
});
```

---

### **4. Hook Tests**

**Example: useAuth Hook**

```typescript
// hooks/useAuth.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAuth } from './useAuth';

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn()
}));

describe('useAuth', () => {
  it('returns user when authenticated', () => {
    const mockSession = {
      user: {
        id: '123',
        email: 'test@example.com',
        plan: 'starter'
      }
    };
    
    vi.mocked(useSession).mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockSession.user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns null when not authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

---

## Integration Testing

### **1. API Route Tests**

**Example: GET /api/products**

```typescript
// app/api/products/route.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from './route';
import { createMocks } from 'node-mocks-http';
import { prisma } from '@/lib/prisma';

describe('GET /api/products', () => {
  beforeEach(async () => {
    // Seed test database
    await prisma.users.create({
      data: {
        id: 'test-user-123',
        email: 'test@example.com',
        password_hash: 'hashed'
      }
    });

    await prisma.stores.create({
      data: {
        id: 'test-store-123',
        user_id: 'test-user-123',
        platform: 'shopify',
        store_url: 'test.myshopify.com'
      }
    });

    await prisma.products.createMany({
      data: [
        {
          id: 'product-1',
          store_id: 'test-store-123',
          name: 'Product A',
          price: 10.00
        },
        {
          id: 'product-2',
          store_id: 'test-store-123',
          name: 'Product B',
          price: 20.00
        }
      ]
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.products.deleteMany();
    await prisma.stores.deleteMany();
    await prisma.users.deleteMany();
  });

  it('returns products for authenticated user', async () => {
    const { req } = createMocks({
      method: 'GET',
      headers: {
        'Authorization': 'Bearer fake-jwt-token'
      }
    });

    // Mock authentication
    req.user = { id: 'test-user-123' };

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.products).toHaveLength(2);
  });

  it('returns 401 when not authenticated', async () => {
    const { req } = createMocks({
      method: 'GET'
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('filters products by search query', async () => {
    const { req } = createMocks({
      method: 'GET',
      query: { search: 'Product A' }
    });

    req.user = { id: 'test-user-123' };

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.products).toHaveLength(1);
    expect(data.data.products[0].name).toBe('Product A');
  });
});
```

---

### **2. Database Tests**

**Example: Product Sync Service**

```typescript
// services/shopifySync.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { syncShopifyProducts } from './shopifySync';
import { prisma } from '@/lib/prisma';
import nock from 'nock';

describe('syncShopifyProducts', () => {
  beforeEach(async () => {
    await prisma.stores.create({
      data: {
        id: 'test-store-123',
        user_id: 'test-user-123',
        platform: 'shopify',
        store_url: 'test.myshopify.com',
        access_token: 'encrypted-token'
      }
    });

    // Mock Shopify API
    nock('https://test.myshopify.com')
      .get('/admin/api/2024-01/products.json')
      .reply(200, {
        products: [
          {
            id: 7890123,
            title: 'Test Product',
            variants: [
              {
                price: '24.99',
                inventory_quantity: 100
              }
            ]
          }
        ]
      });
  });

  afterEach(async () => {
    nock.cleanAll();
    await prisma.products.deleteMany();
    await prisma.stores.deleteMany();
  });

  it('syncs products from Shopify', async () => {
    const result = await syncShopifyProducts('test-store-123');

    expect(result.synced_count).toBe(1);

    const products = await prisma.products.findMany({
      where: { store_id: 'test-store-123' }
    });

    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Test Product');
    expect(products[0].price).toBe(24.99);
  });

  it('updates existing products', async () => {
    // Create existing product
    await prisma.products.create({
      data: {
        id: 'existing-product',
        store_id: 'test-store-123',
        platform_id: '7890123',
        name: 'Old Name',
        price: 19.99
      }
    });

    await syncShopifyProducts('test-store-123');

    const updatedProduct = await prisma.products.findUnique({
      where: { id: 'existing-product' }
    });

    expect(updatedProduct.name).toBe('Test Product');
    expect(updatedProduct.price).toBe(24.99);
  });
});
```

---

## End-to-End Testing

### **1. Setup**

**Framework:** Playwright (faster and more reliable than Cypress)

```bash
npm install -D @playwright/test
npx playwright install
```

**`playwright.config.ts`:**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

---

### **2. Critical User Flow Tests**

**Example: Signup → Store Connection → Dashboard**

```typescript
// e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('user can sign up and connect store', async ({ page }) => {
    // 1. Navigate to signup page
    await page.goto('/signup');

    // 2. Fill signup form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="full_name"]', 'Test User');
    await page.click('button[type="submit"]');

    // 3. Verify email verification message
    await expect(page.locator('text=Check your email')).toBeVisible();

    // 4. Manually verify email (in test, bypass email verification)
    // ... (call API to mark email as verified)

    // 5. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // 6. Redirected to onboarding
    await expect(page).toHaveURL('/onboarding');

    // 7. Click "Connect Shopify"
    await page.click('text=Connect Shopify Store');

    // 8. Verify Shopify OAuth redirect
    await expect(page).toHaveURL(/accounts.shopify.com/);

    // 9. Mock Shopify OAuth callback
    // ... (in test environment, bypass Shopify OAuth)

    // 10. Verify dashboard loads
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
```

**Example: Product Visibility Check**

```typescript
// e2e/visibility.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AI Visibility Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as existing user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'existing@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('displays visibility metrics', async ({ page }) => {
    // Click on Visibility tab
    await page.click('text=Visibility');

    // Check hero metrics
    await expect(page.locator('[data-testid="total-mentions"]')).toBeVisible();
    await expect(page.locator('[data-testid="visibility-rate"]')).toBeVisible();

    // Check chart
    await expect(page.locator('canvas')).toBeVisible(); // Recharts canvas
  });

  test('can trigger manual scan', async ({ page }) => {
    await page.click('text=Visibility');
    
    // Click "Scan Now" button
    await page.click('button:has-text("Scan Now")');

    // Verify loading state
    await expect(page.locator('text=Scanning')).toBeVisible();

    // Wait for scan to complete (mock in test environment)
    await page.waitForSelector('text=Scan complete', { timeout: 10000 });

    // Verify updated metrics
    const mentions = await page.locator('[data-testid="total-mentions"]').textContent();
    expect(parseInt(mentions)).toBeGreaterThan(0);
  });
});
```

---

## API Testing

### **Postman/Thunder Client Collections**

**Collection: AgenticRev API**

```json
{
  "info": {
    "name": "AgenticRev API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Signup",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/signup",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"SecurePass123!\",\n  \"full_name\": \"Test User\"\n}"
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"SecurePass123!\"\n}"
            }
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status is 200\", function() {",
                  "  pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test(\"Returns access token\", function() {",
                  "  const res = pm.response.json();",
                  "  pm.expect(res.data.access_token).to.exist;",
                  "  pm.environment.set(\"access_token\", res.data.access_token);",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Products",
      "item": [
        {
          "name": "List Products",
          "request": {
            "method": "GET",
            "url": "{{baseUrl}}/api/products",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{access_token}}"
              }
            ]
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status is 200\", function() {",
                  "  pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test(\"Returns products array\", function() {",
                  "  const res = pm.response.json();",
                  "  pm.expect(res.data.products).to.be.an('array');",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Performance Testing

### **1. Load Testing (k6)**

```javascript
// performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  // Test dashboard page
  const res = http.get('https://app.agenticrev.com/dashboard', {
    headers: { 'Authorization': 'Bearer TEST_TOKEN' }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Run load test:**
```bash
k6 run performance/load-test.js
```

---

### **2. Lighthouse CI (Frontend Performance)**

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://preview-deployment.vercel.app
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

**`lighthouse-budget.json`:**
```json
{
  "performance": 90,
  "accessibility": 95,
  "best-practices": 90,
  "seo": 95
}
```

---

## Test Coverage Goals

| Module | Coverage Target | Status |
|--------|-----------------|--------|
| Auth (signup, login, OAuth) | 100% | 🔴 0% |
| API Routes (/api/*) | 90% | 🔴 0% |
| Shopify Sync | 85% | 🔴 0% |
| Truth Engine | 90% | 🔴 0% |
| AI Scanner | 80% | 🔴 0% |
| Dashboard Components | 70% | 🔴 0% |
| Utility Functions | 95% | 🔴 0% |

**Overall Target:** 85% line coverage

---

## Testing Checklist

### **Pre-Commit:**
- [ ] All unit tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)

### **Pre-PR:**
- [ ] Integration tests pass
- [ ] Code coverage >85%
- [ ] No console.log statements (except in dev mode)

### **Pre-Deployment:**
- [ ] All E2E tests pass (Playwright)
- [ ] Manual smoke tests (signup, login, dashboard)
- [ ] Lighthouse scores meet budget (Performance >90)

### **Post-Deployment:**
- [ ] Health check endpoint returns 200
- [ ] Sentry reports no new errors
- [ ] Database queries running <500ms (check CloudWatch)

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** Error Monitoring setup (Sentry, CloudWatch)  
**Dependencies:** Test database setup (Supabase dev instance)
