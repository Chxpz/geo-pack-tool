# Performance Testing Guidelines

This document outlines performance requirements and how to test them for the AgenticRev ICP Pivot platform.

## Performance Targets

### Dashboard Page Load
- **Target:** < 3 seconds (First Contentful Paint)
- **Stretch Goal:** < 2 seconds
- **Measurement:** Time from navigation until key dashboard sections are visible and interactive
- **Method:** Use Promise.all() to parallelize data fetches

### Key Database Queries
- **Visibility Score Fetch:** < 500ms
- **Platform Breakdown:** < 800ms
- **Top Queries:** < 1s
- **Competitor Data:** < 1.5s

### Lighthouse Targets (on dashboard page)
- **Performance:** 75+
- **Accessibility:** 90+
- **Best Practices:** 85+
- **SEO:** 90+

## Testing Methods

### 1. Local Performance Testing

Use Chrome DevTools Lighthouse:

```bash
# Open dashboard in Chrome
# Press F12 → Lighthouse tab
# Click "Analyze page load"
```

Acceptance criteria:
- All sections visible before 3 second mark
- Time to Interactive (TTI) < 4 seconds
- Cumulative Layout Shift (CLS) < 0.1

### 2. Database Query Analysis

Use EXPLAIN ANALYZE on key queries:

```sql
-- Visibility score query
EXPLAIN ANALYZE
SELECT
  COUNT(DISTINCT platform) as platform_count,
  SUM(citation_count) as total_citations
FROM ai_mentions
WHERE business_id = $1 AND created_at > now() - interval '30 days'
GROUP BY business_id;

-- Platform breakdown query
EXPLAIN ANALYZE
SELECT
  platform,
  COUNT(*) as count,
  SUM(visibility_score) as total_score
FROM ai_mentions
WHERE business_id = $1 AND created_at > now() - interval '30 days'
GROUP BY platform
ORDER BY count DESC;

-- Top queries query
EXPLAIN ANALYZE
SELECT
  query,
  COUNT(*) as mention_count,
  AVG(ranking_position) as avg_position,
  MAX(created_at) as latest_mention
FROM ai_mentions
WHERE business_id = $1 AND created_at > now() - interval '30 days'
GROUP BY query
ORDER BY mention_count DESC
LIMIT 20;

-- Competitor data query
EXPLAIN ANALYZE
SELECT
  c.id,
  c.name,
  COUNT(DISTINCT am.query) as total_queries,
  COUNT(DISTINCT am.platform) as platforms_active,
  AVG(am.visibility_score) as avg_visibility
FROM competitors c
LEFT JOIN ai_mentions am ON am.competitor_id = c.id AND am.created_at > now() - interval '30 days'
WHERE c.business_id = $1
GROUP BY c.id, c.name;
```

All queries should complete in < 1.5 seconds with good index coverage.

### 3. Load Testing with k6

```bash
# Install k6: https://k6.io/docs/getting-started/installation/

# Create load test
cat > tests/performance/dashboard-load.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.1'],     // Error rate < 10%
  },
};

export default function() {
  let res = http.get('http://localhost:3000/api/visibility/score');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF

# Run test
k6 run tests/performance/dashboard-load.js
```

### 4. Real User Monitoring

Add monitoring in production:

```typescript
// app/dashboard/page.tsx
import { useEffect } from 'react';

export default function Dashboard() {
  useEffect(() => {
    // Mark performance metrics
    if (typeof window !== 'undefined' && window.performance) {
      const marks = performance.getEntriesByType('measure');
      const dashboardLoad = marks.find(m => m.name === 'dashboard-load');

      if (dashboardLoad) {
        console.log(`Dashboard loaded in ${dashboardLoad.duration}ms`);

        // Send to analytics/monitoring service
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/performance', JSON.stringify({
            metric: 'dashboard-load',
            duration: dashboardLoad.duration,
            timestamp: new Date().toISOString(),
          }));
        }
      }
    }
  }, []);
}
```

## Optimization Checklist

- [ ] Dashboard uses Promise.all() for parallel API calls
- [ ] API routes leverage Redis caching for frequently accessed data
- [ ] Database indexes exist on:
  - `ai_mentions(business_id, created_at)`
  - `ai_mentions(platform, business_id)`
  - `competitors(business_id)`
- [ ] Images are optimized (use next/image)
- [ ] Bundle size is analyzed with `npm run build`
- [ ] Unused dependencies are removed
- [ ] CSS is tree-shaken (Tailwind purge configured)
- [ ] JavaScript is code-split at route boundaries
- [ ] Third-party scripts load asynchronously

## Common Performance Issues

### Issue: Dashboard slow to load
**Check:**
- Are API calls loading serially instead of parallel?
- Are database queries missing indexes?
- Is there N+1 query problem?
- Are large datasets being fetched unnecessarily?

**Solution:**
- Use Promise.all() to parallelize
- Add missing database indexes
- Implement pagination/limits
- Add query result caching

### Issue: High bundle size
**Check:**
```bash
npm run build
# Check .next/static/chunks/ for large files
```

**Solution:**
- Remove unused dependencies
- Enable dynamic imports for heavy libraries
- Use tree-shaking compatible packages

### Issue: Layout shift during load
**Check:**
- Are skeleton loaders matching final layout?
- Are image dimensions specified?

**Solution:**
- Update VisibilityScoreSkeleton, etc. to match real components
- Use fixed dimensions in Image components

## Monitoring in Production

Set up monitoring with services like:
- **Vercel Analytics:** Built-in for Next.js apps on Vercel
- **Sentry:** For error tracking and performance monitoring
- **LogRocket:** For session replay and performance insights
- **New Relic:** For comprehensive APM

## References

- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/learn-pages-router/seo/web-performance)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [k6 Load Testing](https://k6.io/)
