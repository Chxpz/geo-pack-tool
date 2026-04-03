# Security Review Checklist

This document outlines all security checks required for the AgenticRev ICP Pivot platform. Use this as a pre-deployment checklist and for ongoing security audits.

## Authentication & Authorization

### Auth Checks on API Routes
- [ ] All `/api/*` routes require authentication (via NextAuth session)
- [ ] API routes validate user identity before accessing data
- [ ] Session tokens are validated on every request
- [ ] JWT tokens (if used) are properly signed and verified
- [ ] Tokens expire after reasonable duration (default: 24 hours)
- [ ] Refresh token rotation is implemented
- [ ] Public endpoints are explicitly marked and documented
- [ ] No sensitive data in JWT payload (only user ID, email)
- [ ] Cookie security flags set: HttpOnly, Secure, SameSite

**Verification:**
```bash
# Check all routes have auth middleware
grep -r "getServerSession\|auth" app/api/ | grep -c "route.ts"

# Verify auth is in error path
grep -r "401\|Unauthorized" app/api/*/route.ts
```

### Role-Based Access Control (RBAC)
- [ ] User roles are enforced: `user`, `operator`, `admin`
- [ ] Operator routes check role before processing
- [ ] Admin routes restricted to admin role only
- [ ] Role is stored in database, not in JWT (for revocation)
- [ ] Role changes take effect immediately (session refresh required)
- [ ] No privilege escalation possible through URL manipulation

**Operator Role Checks:**
```typescript
// Example: Only operators can perform data imports
if (session.user.role !== 'operator') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Database Security

### RLS (Row-Level Security) Policies
- [ ] All tables have RLS enabled (except reference tables)
- [ ] `ai_mentions` table filters by business ownership
- [ ] `citations` table filters by business ownership
- [ ] `competitors` table filters by business ownership
- [ ] `users` table restricts to own record
- [ ] `businesses` table filters by user_id
- [ ] `tasks` table filters by admin or operator role
- [ ] No policies allow unrestricted table access

**Policy Check:**
```sql
-- Verify RLS is enabled on sensitive tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should show: (all sensitive tables should have rowsecurity = true)
```

**Example RLS Policy:**
```sql
CREATE POLICY "Users can only view their own businesses"
  ON businesses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only view mentions for their businesses"
  ON ai_mentions
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );
```

### Data Leakage Prevention
- [ ] No cross-customer data visible in API responses
- [ ] Queries filter by business_id from authenticated user
- [ ] No `SELECT *` without WHERE clause filters
- [ ] API responses don't include unrelated user data
- [ ] Search/filter endpoints validate user ownership

**Test:**
```typescript
// Test: user A cannot access user B's data
const { data: mentionsB } = await supabase
  .from('ai_mentions')
  .select('*')
  .eq('business_id', userB_businessId);
// Should fail if userA calls this API
```

### Database Credentials
- [ ] Admin connection string only in server code
- [ ] Anon key restricted to RLS policies
- [ ] Service role key never exposed to client
- [ ] Database credentials not in version control
- [ ] .env files in .gitignore
- [ ] Secrets managed via environment variables

## API Security

### Input Validation
- [ ] All POST/PUT endpoints validate input schema
- [ ] File uploads limited by size and type
- [ ] URL parameters validated and sanitized
- [ ] Query parameters type-checked
- [ ] No SQL injection vulnerabilities
- [ ] No command injection vulnerabilities

**Example Validation:**
```typescript
import { z } from 'zod';

const createTaskSchema = z.object({
  businessId: z.string().uuid(),
  queryTerm: z.string().max(255).min(1),
  competitors: z.array(z.string().url()).max(10),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = createTaskSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
}
```

### Rate Limiting
- [ ] API routes have rate limiting
- [ ] Rate limits enforced per user/IP
- [ ] Login endpoints aggressively rate limited
- [ ] File upload endpoints rate limited
- [ ] Rate limit headers included in responses

**Example with middleware:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 requests per hour
});

export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
}
```

### CORS Security
- [ ] CORS headers properly configured
- [ ] Only allowed origins can access API
- [ ] Credentials sent with proper CORS handling
- [ ] No wildcard (`*`) for sensitive endpoints

## Environment Variables & Secrets

### CRON_SECRET Protection
- [ ] CRON_SECRET is long and random (> 32 chars)
- [ ] Verified on every cron endpoint
- [ ] Rotated periodically
- [ ] Never logged or exposed
- [ ] Separate from API keys

**Verification:**
```typescript
// Every cron route must verify:
const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
if (cronSecret !== process.env.CRON_SECRET) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
```

### Environment Variables
- [ ] All secrets in .env.local (not committed)
- [ ] .env.example includes all required vars (no values)
- [ ] Sensitive values never logged
- [ ] Different secrets for dev/staging/production
- [ ] Secret rotation documented

**Required Variables:**
```
NEXTAUTH_SECRET=
NEXTAUTH_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
CRON_SECRET=
```

## Data Protection

### Encryption
- [ ] Passwords hashed (bcrypt or similar)
- [ ] Sensitive data encrypted at rest if needed
- [ ] HTTPS enforced in production
- [ ] Secrets not stored in logs

### Data Retention
- [ ] Data retention policy documented in docs/
- [ ] Cron job runs daily to delete old data
- [ ] Data deleted based on plan retention limits
- [ ] Deletion logs kept for compliance
- [ ] GDPR deletion requests handled

**Verify Cron:**
```bash
# Check data retention cron exists
test -f app/api/cron/data-retention/route.ts && echo "OK"

# Check it's configured in vercel.json
grep -A5 "data-retention" vercel.json
```

## Frontend Security

### XSS Prevention
- [ ] React automatically escapes text content
- [ ] dangerouslySetInnerHTML not used
- [ ] Content from external sources sanitized
- [ ] No `eval()` or dynamic code execution

### CSRF Protection
- [ ] Forms use CSRF tokens (NextAuth handles this)
- [ ] State-changing requests use POST/PUT/DELETE
- [ ] SameSite cookie attribute set

### Secure Headers
- [ ] Content-Security-Policy header set
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configured

**Next.js headers config:**
```typescript
// next.config.ts
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'",
          },
        ],
      },
    ];
  },
};
```

## Third-Party Integrations

### Stripe Integration
- [ ] Stripe API key only in server code
- [ ] Publishable key safe to expose to client
- [ ] Webhook signature verified
- [ ] No sensitive data passed to client-side Stripe calls

### Supabase Integration
- [ ] Anon key used only for client (with RLS)
- [ ] Service role key only for server operations
- [ ] Auth state managed securely via NextAuth
- [ ] Session tokens validated

## Monitoring & Logging

### Error Handling
- [ ] Errors don't leak sensitive information
- [ ] Stack traces not shown to users
- [ ] Errors logged for debugging (server-side only)
- [ ] PII not included in error logs

### Audit Logging
- [ ] Admin actions logged with timestamp and user ID
- [ ] Data modifications logged
- [ ] Failed auth attempts logged
- [ ] Logs retained for compliance period

## Deployment Security

### Production Checklist
- [ ] NEXTAUTH_SECRET is strong random value
- [ ] NEXTAUTH_URL matches production domain
- [ ] All .env secrets configured in production
- [ ] CRON_SECRET different from dev environment
- [ ] SSL/TLS certificate valid
- [ ] Database backups enabled
- [ ] Monitoring and alerting configured
- [ ] Security headers in production
- [ ] Rate limiting active
- [ ] File uploads to secure bucket with access control

### Vercel Deployment
- [ ] Environment variables set in Vercel dashboard
- [ ] Preview deployments also have security headers
- [ ] Function timeouts reasonable
- [ ] Automatic HTTPS enabled
- [ ] DDoS protection enabled

## Security Testing

### Manual Testing
- [ ] Test cross-site scripting (XSS) with `<script>alert('xss')</script>`
- [ ] Test SQL injection with `'; DROP TABLE users; --`
- [ ] Verify user A cannot access user B's data
- [ ] Verify non-operators cannot access operator routes
- [ ] Verify cron endpoints reject invalid secrets

### Automated Testing
- [ ] Run static security analysis: `npm audit`
- [ ] Check dependencies for vulnerabilities
- [ ] Use OWASP dependency checker

```bash
# Check for known vulnerabilities
npm audit

# Update vulnerable packages
npm audit fix
```

## Incident Response

### Security Incident Procedures
- [ ] Incident response plan documented
- [ ] Escalation path defined
- [ ] Communication template prepared
- [ ] Forensics/logging capability confirmed
- [ ] Backup/recovery procedures tested

## Compliance

### GDPR (if serving EU users)
- [ ] User data deletion implemented
- [ ] Data portability available
- [ ] Privacy policy updated
- [ ] Consent collected for data processing
- [ ] Data Processing Agreement with third parties

### General Compliance
- [ ] Terms of Service document
- [ ] Privacy Policy document
- [ ] Acceptable Use Policy
- [ ] Data retention policy
- [ ] Security contact information

## Sign-Off

Pre-deployment security checklist:

- [ ] All items above reviewed and marked complete
- [ ] Security team approval obtained
- [ ] No open security vulnerabilities
- [ ] Deployment authorized
- [ ] Monitoring alerts configured

**Reviewed by:** ________________
**Date:** ________________
**Next review:** ________________
