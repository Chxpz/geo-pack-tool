# Error Monitoring & Observability
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 🟢 Final - Ready for Development  
**Owner:** DevOps + Engineering Team  

---

## Table of Contents

1. [Observability Strategy](#observability-strategy)
2. [Error Tracking (Sentry)](#error-tracking-sentry)
3. [Application Logging](#application-logging)
4. [AWS CloudWatch](#aws-cloudwatch)
5. [Uptime Monitoring](#uptime-monitoring)
6. [Alerting & On-Call](#alerting--on-call)
7. [Incident Response](#incident-response)
8. [Monitoring Checklist](#monitoring-checklist)

---

## Observability Strategy

### **The Three Pillars**

1. **Logs:** What happened? (timestamped events)
2. **Metrics:** How much/how fast? (numerical measurements)
3. **Traces:** Where did it go? (request flow across services)

### **Key Metrics to Monitor**

**Application Health:**
- Error rate (errors per minute)
- Response time (p50, p95, p99)
- Throughput (requests per second)
- Uptime (99.9% SLA target)

**Business Metrics:**
- New signups per day
- Active users (DAU, WAU, MAU)
- Conversion rate (Free → Paid)
- AI mentions scanned per day
- ACP orders placed

**Infrastructure:**
- Lambda execution duration
- Lambda cold starts
- Database connection pool usage
- Redis cache hit rate
- S3 object count

---

## Error Tracking (Sentry)

### **1. Setup**

**Install Sentry SDK:**

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

**`sentry.client.config.ts`:**

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  
  // Sample rate for performance monitoring
  tracesSampleRate: 0.1, // 10% of requests
  
  // Sample rate for session replays
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Don't report errors in development
  enabled: process.env.NODE_ENV === 'production',
  
  // Ignore common browser errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed' // User offline errors
  ],
  
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.['Authorization'];
    }
    
    // Don't send PII
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    
    return event;
  }
});
```

**`sentry.server.config.ts`:**

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
  
  integrations: [
    new Sentry.Integrations.Postgres(),
  ]
});
```

**`sentry.edge.config.ts`:**

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

---

### **2. Error Capture**

**Automatic Error Capture:**

```typescript
// Sentry automatically captures:
// - Unhandled exceptions
// - Unhandled promise rejections
// - Console.error logs (configured)

// Example: API route error
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Business logic
    const result = await processPayment(body);
    
    return Response.json({ success: true, data: result });
    
  } catch (error) {
    // Automatically reported to Sentry
    console.error('Payment processing failed:', error);
    
    // Add custom context
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        endpoint: '/api/payments',
        user_plan: req.user?.plan
      },
      extra: {
        request_body: body,
        user_id: req.user?.id
      }
    });
    
    return Response.json({
      success: false,
      error: { code: 'PAYMENT_FAILED', message: error.message }
    }, { status: 500 });
  }
}
```

**Manual Error Capture:**

```typescript
// Capture non-exception errors
Sentry.captureMessage('Unusual behavior detected', {
  level: 'warning',
  tags: {
    feature: 'ai-scanner',
    platform: 'chatgpt'
  },
  extra: {
    product_id: '123',
    query: 'Best organic coffee'
  }
});

// Capture breadcrumbs (context trail)
Sentry.addBreadcrumb({
  category: 'shopify',
  message: 'Product sync started',
  level: 'info',
  data: {
    store_id: 'store-123',
    product_count: 47
  }
});
```

---

### **3. Performance Monitoring**

**Track slow API routes:**

```typescript
import * as Sentry from '@sentry/nextjs';

export async function GET(req: Request) {
  const transaction = Sentry.startTransaction({
    op: 'http.request',
    name: 'GET /api/products'
  });
  
  try {
    // Database query
    const span1 = transaction.startChild({
      op: 'db.query',
      description: 'Fetch products from database'
    });
    
    const products = await prisma.products.findMany();
    span1.finish();
    
    // External API call
    const span2 = transaction.startChild({
      op: 'http.client',
      description: 'Fetch AI mentions from cache'
    });
    
    const mentions = await redis.get(`mentions:${products[0].id}`);
    span2.finish();
    
    transaction.setStatus('ok');
    return Response.json({ success: true, data: { products } });
    
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
    
  } finally {
    transaction.finish();
  }
}
```

---

### **4. User Feedback**

**Capture user feedback on errors:**

```typescript
// When error occurs, show feedback form
import { showReportDialog } from '@sentry/nextjs';

try {
  // Code that might fail
} catch (error) {
  const eventId = Sentry.captureException(error);
  
  // Show user feedback dialog
  showReportDialog({
    eventId: eventId,
    title: 'Something went wrong',
    subtitle: 'Our team has been notified. Please provide additional context:',
    user: {
      name: currentUser.full_name,
      email: currentUser.email
    }
  });
}
```

---

## Application Logging

### **1. Structured Logging**

**Log Levels:**
- **DEBUG:** Detailed info for debugging (dev only)
- **INFO:** General informational messages
- **WARN:** Warning messages (non-critical issues)
- **ERROR:** Error messages (failures)
- **FATAL:** Critical errors (system crash)

**Winston Logger (Backend/Lambda):**

```python
import logging
import json
from datetime import datetime

# Configure structured logging
logger = logging.getLogger('agenticrev')
logger.setLevel(logging.INFO)

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'message': record.getMessage(),
            'service': 'ai-scanner',
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add extra context
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id
        if hasattr(record, 'store_id'):
            log_data['store_id'] = record.store_id
        
        return json.dumps(log_data)

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)

# Usage
logger.info('Product sync started', extra={'store_id': 'store-123', 'product_count': 47})
logger.error('Shopify API error', extra={'error': str(e), 'api_endpoint': '/products.json'})
```

**Frontend Logging (Console):**

```typescript
// lib/logger.ts
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const CURRENT_LEVEL = process.env.NODE_ENV === 'production' 
  ? LOG_LEVELS.INFO 
  : LOG_LEVELS.DEBUG;

export const logger = {
  debug: (message: string, context?: any) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  },
  
  info: (message: string, context?: any) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.log(`[INFO] ${message}`, context);
    }
  },
  
  warn: (message: string, context?: any) => {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${message}`, context);
    }
  },
  
  error: (message: string, error?: Error, context?: any) => {
    console.error(`[ERROR] ${message}`, { error, ...context });
    
    // Send to Sentry
    Sentry.captureException(error, {
      level: 'error',
      extra: { message, ...context }
    });
  }
};

// Usage
logger.info('User logged in', { user_id: '123', plan: 'starter' });
logger.error('Payment failed', error, { amount: 79.00, user_id: '123' });
```

---

## AWS CloudWatch

### **1. Lambda Logs**

**Automatic Log Groups:**
- `/aws/lambda/agenticrev-ai-scanner`
- `/aws/lambda/agenticrev-truth-engine`
- `/aws/lambda/agenticrev-shopify-sync`

**Query Logs (AWS CLI):**

```bash
# Tail logs in real-time
aws logs tail /aws/lambda/agenticrev-ai-scanner --follow

# Search for errors in last hour
aws logs filter-log-events \
  --log-group-name /aws/lambda/agenticrev-ai-scanner \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' '+%s%3N')

# Export logs to S3 (for long-term storage)
aws logs create-export-task \
  --log-group-name /aws/lambda/agenticrev-ai-scanner \
  --from $(date -u -d '7 days ago' '+%s%3N') \
  --to $(date -u '+%s%3N') \
  --destination agenticrev-logs \
  --destination-prefix lambda-logs/
```

---

### **2. CloudWatch Metrics**

**Custom Metrics:**

```python
import boto3

cloudwatch = boto3.client('cloudwatch')

def log_metric(metric_name: str, value: float, unit: str = 'Count'):
    """Send custom metric to CloudWatch."""
    cloudwatch.put_metric_data(
        Namespace='AgenticRev',
        MetricData=[
            {
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit,
                'Timestamp': datetime.utcnow()
            }
        ]
    )

# Usage
log_metric('ProductsSynced', 47, 'Count')
log_metric('AIMentionsFound', 18, 'Count')
log_metric('ScanDuration', 3.2, 'Seconds')
```

**Key Metrics to Track:**
- `ProductsSynced` (Count)
- `AIMentionsFound` (Count)
- `TruthEngineErrors` (Count)
- `ACPOrdersPlaced` (Count)
- `ScanDuration` (Seconds)
- `ShopifyAPIErrors` (Count)

---

### **3. CloudWatch Alarms**

**Create Alarms:**

```bash
# Lambda error rate > 5% in 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name agenticrev-lambda-high-error-rate \
  --alarm-description "Lambda error rate exceeded 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=agenticrev-ai-scanner \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:agenticrev-alerts

# Lambda duration > 250s (near 300s timeout)
aws cloudwatch put-metric-alarm \
  --alarm-name agenticrev-lambda-long-duration \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --threshold 250000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=agenticrev-ai-scanner \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:agenticrev-alerts

# Database connection errors
aws cloudwatch put-metric-alarm \
  --alarm-name agenticrev-database-errors \
  --metric-name DatabaseConnectionErrors \
  --namespace AgenticRev \
  --statistic Sum \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:agenticrev-alerts
```

---

### **4. CloudWatch Dashboards**

**Create Dashboard:**

```bash
aws cloudwatch put-dashboard \
  --dashboard-name AgenticRevProduction \
  --dashboard-body file://dashboard.json
```

**`dashboard.json`:**

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "Lambda Invocations",
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum", "label": "AI Scanner"}]
        ],
        "period": 300,
        "region": "us-east-1"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Lambda Errors",
        "metrics": [
          ["AWS/Lambda", "Errors", {"stat": "Sum", "color": "#d62728"}]
        ],
        "period": 300,
        "region": "us-east-1"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Lambda Duration (p95)",
        "metrics": [
          ["AWS/Lambda", "Duration", {"stat": "p95"}]
        ],
        "period": 300,
        "region": "us-east-1"
      }
    }
  ]
}
```

---

## Uptime Monitoring

### **1. UptimeRobot**

**Monitor endpoints:**

| Endpoint | Type | Interval | Alert |
|----------|------|----------|-------|
| https://app.agenticrev.com | HTTP(S) | 5 min | >2 failures |
| https://app.agenticrev.com/api/health | HTTP(S) | 5 min | >1 failure |
| https://api.agenticrev.com/health | HTTP(S) | 5 min | >1 failure |

**Health Check Endpoint:**

```typescript
// app/api/health/route.ts
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export async function GET() {
  const checks = {
    database: false,
    redis: false
  };
  
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }
  
  try {
    // Check Redis
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }
  
  const allHealthy = Object.values(checks).every(v => v === true);
  
  return Response.json({
    status: allHealthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  }, {
    status: allHealthy ? 200 : 503
  });
}
```

---

### **2. Status Page**

**Status.io / Statuspage.io:**

- Public status page: https://status.agenticrev.com
- Shows uptime for:
  - Web Application
  - API
  - AI Scanning Service
  - Shopify Integration
- Post incident updates during outages

---

## Alerting & On-Call

### **1. Alert Channels**

**Slack Integration:**

```python
import requests

def send_slack_alert(message: str, severity: str = 'error'):
    """Send alert to Slack #alerts channel."""
    webhook_url = os.getenv('SLACK_WEBHOOK_URL')
    
    color = {
        'info': '#36a64f',
        'warning': '#ff9900',
        'error': '#ff0000'
    }[severity]
    
    payload = {
        'attachments': [{
            'color': color,
            'title': f'🚨 {severity.upper()} Alert',
            'text': message,
            'footer': 'AgenticRev Monitoring',
            'ts': int(datetime.utcnow().timestamp())
        }]
    }
    
    requests.post(webhook_url, json=payload)

# Usage
send_slack_alert('Lambda error rate exceeded 5%', severity='error')
```

**PagerDuty (On-Call Rotation):**

```python
import pdpyras

def trigger_pagerduty_incident(title: str, details: dict):
    """Trigger PagerDuty incident for on-call engineer."""
    session = pdpyras.EventsAPISession(os.getenv('PAGERDUTY_INTEGRATION_KEY'))
    
    session.trigger(
        summary=title,
        source='AgenticRev Monitoring',
        severity='error',
        custom_details=details
    )

# Usage
trigger_pagerduty_incident(
    title='Database connection pool exhausted',
    details={
        'active_connections': 95,
        'max_connections': 100,
        'queue_size': 23
    }
)
```

---

### **2. Alert Routing**

**Severity-Based Routing:**

| Severity | Channel | Response Time |
|----------|---------|---------------|
| INFO | Slack #logs | No response needed |
| WARNING | Slack #alerts | Review within 24h |
| ERROR | Slack #alerts + Email | Review within 4h |
| CRITICAL | PagerDuty (on-call) | Immediate response |

**Critical Alerts:**
- API uptime <99% (5min window)
- Database down
- Lambda cold start >10 seconds
- Payment processing failures
- Data loss detected

---

## Incident Response

### **Incident Response Playbook**

**1. Detection:**
- Alert triggered (PagerDuty, Slack, CloudWatch)
- User report (support ticket, Twitter)

**2. Acknowledge:**
- On-call engineer acknowledges alert within 15 minutes
- Update status page: "Investigating issue"

**3. Triage:**
- Check CloudWatch logs for errors
- Check Sentry for stack traces
- Check database/Redis health
- Identify affected users

**4. Communicate:**
- Update status page with details
- Notify affected users via email (if data loss)
- Post update in Slack #incidents

**5. Mitigate:**
- Rollback deployment if caused by recent change
- Scale up resources if performance issue
- Disable feature if causing widespread errors

**6. Resolve:**
- Deploy fix
- Verify fix in production
- Monitor for 30 minutes
- Update status page: "Resolved"

**7. Post-Mortem:**
- Document timeline (when detected, when resolved)
- Root cause analysis
- Action items to prevent recurrence
- Share with team

---

### **Example Incident: Database Connection Pool Exhausted**

**Timeline:**
- **10:15 AM:** CloudWatch alarm triggered (active connections >95)
- **10:17 AM:** On-call engineer acknowledged
- **10:20 AM:** Identified root cause (missing connection.close() in Shopify sync)
- **10:22 AM:** Status page updated: "Database performance degraded"
- **10:25 AM:** Deployed hotfix (add connection.close())
- **10:30 AM:** Connection pool returned to normal (<50 connections)
- **10:35 AM:** Status page updated: "Resolved"

**Root Cause:**
Shopify sync Lambda function was not closing database connections, causing connection pool exhaustion.

**Fix:**
Added explicit `await prisma.$disconnect()` in Lambda handler.

**Prevention:**
- Add database connection monitoring metric
- Set alarm for >70 active connections (early warning)
- Code review checklist: verify connection cleanup

---

## Monitoring Checklist

### **Pre-Launch:**

**Error Tracking:**
- [ ] Sentry configured (client, server, edge)
- [ ] Error sampling rate set (10% for performance)
- [ ] PII filtering enabled (no email/IP in errors)
- [ ] User feedback dialog integrated

**Logging:**
- [ ] Structured logging implemented (JSON format)
- [ ] Log levels configured (INFO for production)
- [ ] CloudWatch log retention set (30 days)

**Metrics:**
- [ ] Custom CloudWatch metrics defined (ProductsSynced, AIMentionsFound, etc.)
- [ ] CloudWatch dashboard created
- [ ] Lambda metrics monitored (duration, errors, invocations)

**Alerting:**
- [ ] CloudWatch alarms created (Lambda errors, high duration)
- [ ] Slack webhook configured (#alerts channel)
- [ ] PagerDuty integration setup (on-call rotation)
- [ ] Alert routing rules defined (INFO → Slack, CRITICAL → PagerDuty)

**Uptime:**
- [ ] UptimeRobot monitors configured (5min interval)
- [ ] Health check endpoint implemented (/api/health)
- [ ] Status page setup (status.agenticrev.com)

**Incident Response:**
- [ ] Incident response playbook documented
- [ ] On-call rotation schedule defined
- [ ] Rollback procedure tested
- [ ] Post-mortem template created

---

### **Post-Launch Monitoring:**

**Daily:**
- [ ] Check Sentry for new errors (>10 occurrences)
- [ ] Review CloudWatch dashboard (Lambda errors, duration)
- [ ] Monitor Slack #alerts for warnings

**Weekly:**
- [ ] Review top 10 errors in Sentry (prioritize fixes)
- [ ] Check uptime percentage (target: 99.9%)
- [ ] Review CloudWatch costs (optimize log retention)

**Monthly:**
- [ ] Review incident post-mortems (identify patterns)
- [ ] Update alerting thresholds (reduce false positives)
- [ ] Rotate on-call schedule

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** Feature Specifications (granular product feature details)  
**Dependencies:** Sentry account, AWS CloudWatch access, Slack workspace
