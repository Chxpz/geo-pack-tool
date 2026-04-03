# Security & Compliance
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** 🟢 Final - Ready for Development  
**Owner:** Engineering + Legal Team  

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Encryption](#data-encryption)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Privacy & Compliance](#privacy--compliance)
7. [Incident Response](#incident-response)
8. [Security Checklist](#security-checklist)

---

## Security Overview

### **Security Principles**

1. **Defense in Depth:** Multiple layers of security controls
2. **Least Privilege:** Users/services only have minimum necessary access
3. **Zero Trust:** Always verify, never trust implicitly
4. **Encryption Everywhere:** Data encrypted in transit and at rest
5. **Auditability:** All actions logged for forensic analysis

### **Threat Model**

**Assets to Protect:**
- User credentials (email, password hashes)
- Store access tokens (Shopify, WooCommerce)
- API keys (OpenAI, Stripe)
- Customer PII (email, names, addresses from ACP orders)
- Business intelligence (AI visibility data, revenue metrics)

**Threat Actors:**
- **External:** Hackers attempting data breaches, credential stuffing
- **Internal:** Malicious employees (access to production database)
- **Third-party:** Compromised API keys, supply chain attacks

**Attack Vectors:**
- SQL injection (Postgres queries)
- XSS (cross-site scripting in Next.js frontend)
- CSRF (cross-site request forgery)
- API key theft (stored in browser localStorage)
- Webhook forgery (fake Shopify/Stripe webhooks)
- DDoS (overwhelming API endpoints)

---

## Authentication & Authorization

### **1. User Authentication**

**Strategy:** JWT tokens with short expiration + refresh tokens

**Implementation:**

```typescript
// NextAuth.js configuration
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 1. Lookup user in database
        const user = await db.users.findUnique({
          where: { email: credentials.email }
        });
        
        if (!user) {
          throw new Error('Invalid credentials');
        }
        
        // 2. Verify password (bcrypt)
        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );
        
        if (!passwordValid) {
          // Log failed login attempt
          await logFailedLogin(user.id, req.ip);
          throw new Error('Invalid credentials');
        }
        
        // 3. Check if email verified
        if (!user.email_verified) {
          throw new Error('Please verify your email');
        }
        
        // 4. Return user object (stored in JWT)
        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          plan: user.subscription?.plan || 'free'
        };
      }
    })
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    encryption: true,
  },
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.plan = user.plan;
      }
      return token;
    },
    
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.plan = token.plan;
      return session;
    }
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  }
});
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character
- Not in common passwords list (check against HaveIBeenPwned API)

**Password Hashing:**
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}
```

---

### **2. Shopify OAuth Security**

**HMAC Verification:**

```python
import hmac
import hashlib

def verify_shopify_hmac(params: dict, hmac_to_verify: str) -> bool:
    """Verify Shopify webhook/OAuth HMAC signature."""
    # Sort params alphabetically (excluding hmac itself)
    sorted_params = {k: v for k, v in sorted(params.items()) if k != 'hmac'}
    
    # Create query string
    query_string = '&'.join(f'{k}={v}' for k, v in sorted_params.items())
    
    # Compute HMAC-SHA256
    computed_hmac = hmac.new(
        SHOPIFY_CLIENT_SECRET.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # Constant-time comparison (prevents timing attacks)
    return hmac.compare_digest(computed_hmac, hmac_to_verify)
```

**State Token (CSRF Protection):**

```python
import secrets

def generate_oauth_state() -> str:
    """Generate random state token for OAuth flow."""
    state = secrets.token_urlsafe(32)
    
    # Store in Redis with 10-minute TTL
    redis.setex(f"oauth:state:{state}", 600, "1")
    
    return state

def verify_oauth_state(state: str) -> bool:
    """Verify state token matches stored value."""
    exists = redis.exists(f"oauth:state:{state}")
    
    if exists:
        # Delete after verification (one-time use)
        redis.delete(f"oauth:state:{state}")
        return True
    
    return False
```

---

### **3. API Authorization**

**Middleware (Next.js API Routes):**

```typescript
import { getServerSession } from 'next-auth';

export async function withAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: Function
) {
  // 1. Get session from JWT token
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }
  
  // 2. Attach user to request
  req.user = session.user;
  
  // 3. Call handler
  return handler(req, res);
}

// Usage in API route
export default async function handler(req, res) {
  return withAuth(req, res, async (req, res) => {
    // User is authenticated, req.user available
    const stores = await getStores(req.user.id);
    return res.json({ success: true, data: { stores } });
  });
}
```

**Row-Level Security (PostgreSQL):**

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own data
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (id = current_user_id());

CREATE POLICY stores_select_own ON stores
  FOR SELECT
  USING (user_id = current_user_id());

-- Products: users can only see products from their stores
CREATE POLICY products_select_own ON products
  FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE user_id = current_user_id()
    )
  );

-- Helper function to get current authenticated user
CREATE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.user_id', TRUE), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Set user context before queries (in application code)
-- SET app.user_id = 'user-uuid-123';
```

---

## Data Encryption

### **1. Encryption at Rest**

**Database Encryption (PostgreSQL):**
- Supabase enables AES-256 encryption by default
- Transparent Data Encryption (TDE) for all tables

**Sensitive Fields (Application-Level Encryption):**

```python
from cryptography.fernet import Fernet
import os

# Encryption key (stored in AWS Secrets Manager)
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
cipher_suite = Fernet(ENCRYPTION_KEY)

def encrypt_token(token: str) -> str:
    """Encrypt access token before storing in database."""
    return cipher_suite.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    """Decrypt access token when needed."""
    return cipher_suite.decrypt(encrypted_token.encode()).decode()

# Usage
store.access_token = encrypt_token(shopify_access_token)
await db.stores.create(store)

# Later...
shopify_token = decrypt_token(store.access_token)
```

**Fields Requiring Encryption:**
- `stores.access_token`
- `stores.api_secret`
- `users.shopify_access_token`

**Object Storage (AWS S3):**
- ACP feeds: S3 Server-Side Encryption (SSE-S3)
- Product images: Public (no encryption needed)

---

### **2. Encryption in Transit**

**TLS 1.3:**
- All HTTP traffic uses HTTPS (TLS 1.3)
- Vercel automatic HTTPS for frontend
- API Gateway enforces HTTPS for Lambda functions

**Certificate Management:**
- Let's Encrypt for custom domain
- Auto-renewal via Vercel/AWS Certificate Manager

**Database Connections:**
```python
# PostgreSQL connection string
DATABASE_URL = "postgresql://user:pass@db.supabase.co:5432/postgres?sslmode=require"
```

---

## API Security

### **1. Rate Limiting**

**Implementation (Redis + Middleware):**

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN
});

export async function rateLimiter(
  identifier: string, // user_id or IP address
  plan: string
) {
  const limits = {
    free: { rpm: 30, rph: 500 },
    starter: { rpm: 100, rph: 2000 },
    growth: { rpm: 300, rph: 10000 },
    agency: { rpm: 1000, rph: 50000 }
  };
  
  const limit = limits[plan] || limits.free;
  
  // Sliding window (per minute)
  const keyMinute = `ratelimit:${identifier}:${Math.floor(Date.now() / 60000)}`;
  const countMinute = await redis.incr(keyMinute);
  
  if (countMinute === 1) {
    await redis.expire(keyMinute, 60); // TTL 60 seconds
  }
  
  if (countMinute > limit.rpm) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }
  
  // Sliding window (per hour)
  const keyHour = `ratelimit:${identifier}:${Math.floor(Date.now() / 3600000)}`;
  const countHour = await redis.incr(keyHour);
  
  if (countHour === 1) {
    await redis.expire(keyHour, 3600); // TTL 1 hour
  }
  
  if (countHour > limit.rph) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }
  
  return {
    limit: limit.rpm,
    remaining: limit.rpm - countMinute,
    reset: Math.ceil(Date.now() / 60000) * 60000
  };
}
```

---

### **2. Input Validation**

**Zod Schema Validation:**

```typescript
import { z } from 'zod';

// Product update validation
const productUpdateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  price: z.number().positive().max(1000000),
  inventory_quantity: z.number().int().nonnegative()
});

export default async function handler(req, res) {
  // Validate request body
  try {
    const validatedData = productUpdateSchema.parse(req.body);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.errors[0].message
      }
    });
  }
  
  // Proceed with update
}
```

**SQL Injection Prevention:**
- Always use parameterized queries (never string concatenation)
- Prisma ORM provides automatic escaping

```typescript
// ✅ SAFE (parameterized)
const product = await prisma.products.findFirst({
  where: { id: productId }
});

// ❌ UNSAFE (SQL injection vulnerable)
const product = await prisma.$queryRaw`SELECT * FROM products WHERE id = ${productId}`;
```

---

### **3. CORS Configuration**

```typescript
// Next.js API route CORS
export async function middleware(req: NextApiRequest, res: NextApiResponse) {
  // Allow only our frontend domain
  res.setHeader('Access-Control-Allow-Origin', 'https://app.agenticrev.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
}
```

---

## Infrastructure Security

### **1. AWS Security**

**IAM Roles (Least Privilege):**

```yaml
# Lambda execution role (minimal permissions)
LambdaExecutionRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Statement:
        - Effect: Allow
          Principal:
            Service: lambda.amazonaws.com
          Action: sts:AssumeRole
    Policies:
      - PolicyName: LambdaBasicExecution
        PolicyDocument:
          Statement:
            - Effect: Allow
              Action:
                - logs:CreateLogGroup
                - logs:CreateLogStream
                - logs:PutLogEvents
              Resource: arn:aws:logs:*:*:*
            
            - Effect: Allow
              Action:
                - s3:PutObject
                - s3:GetObject
              Resource: arn:aws:s3:::agenticrev-acp-feeds/*
            
            # NO admin access, NO excessive permissions
```

**Secrets Management:**
- AWS Secrets Manager for API keys
- Never hardcode secrets in code
- Rotate secrets every 90 days

```python
import boto3
import json

secrets_client = boto3.client('secretsmanager', region_name='us-east-1')

def get_secret(secret_name: str) -> dict:
    """Retrieve secret from AWS Secrets Manager."""
    response = secrets_client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Usage
shopify_secret = get_secret('prod/shopify/client_secret')
```

---

### **2. Container Security (Docker)**

**Lambda Dockerfile:**

```dockerfile
FROM public.ecr.aws/lambda/python:3.11

# Use non-root user
RUN useradd -m appuser
USER appuser

# Copy only necessary files
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

# No shell access
CMD ["src.handler.main"]
```

**Image Scanning:**
- AWS ECR automatic vulnerability scanning
- Fail build if critical vulnerabilities found

---

### **3. Database Security**

**Supabase Configuration:**

```yaml
# Connection pooling (prevents connection exhaustion)
max_connections: 100
pool_size: 20

# Statement timeout (prevent long-running queries)
statement_timeout: 30s

# SSL required
ssl_mode: require

# IP allowlist (Vercel, Lambda IPs only)
allowed_ips:
  - 52.14.0.0/16  # AWS Lambda US-East-1
  - 76.76.21.0/24 # Vercel
```

**Backup Strategy:**
- Automated daily backups (Supabase)
- Point-in-time recovery (7 days)
- Weekly backup to S3 (long-term retention)

---

## Privacy & Compliance

### **1. GDPR Compliance**

**User Data Rights:**

1. **Right to Access:** Users can export all their data
   ```typescript
   async function exportUserData(userId: string) {
     const data = {
       user: await db.users.findUnique({ where: { id: userId } }),
       stores: await db.stores.findMany({ where: { user_id: userId } }),
       products: await db.products.findMany({ where: { store: { user_id: userId } } }),
       // ... all related data
     };
     
     return JSON.stringify(data, null, 2);
   }
   ```

2. **Right to Deletion:** Users can delete their account (soft delete)
   ```typescript
   async function deleteUser(userId: string) {
     await db.users.update({
       where: { id: userId },
       data: {
         deleted_at: new Date(),
         email: `deleted_${userId}@deleted.com`, // Anonymize
         full_name: 'Deleted User'
       }
     });
     
     // Delete all related data
     await db.stores.deleteMany({ where: { user_id: userId } });
     await db.products.deleteMany({ where: { store: { user_id: userId } } });
   }
   ```

3. **Right to Portability:** Data export in JSON format

4. **Right to Opt-Out:** Marketing email preferences

**Cookie Consent:**
- Cookie banner on first visit
- Store consent in localStorage
- Only essential cookies (no tracking)

---

### **2. PCI DSS Compliance**

**Payment Data:**
- **NO credit card data stored** (Stripe handles all payment processing)
- Only store Stripe customer ID and subscription ID
- Stripe is PCI DSS Level 1 compliant

**Audit Trail:**
```sql
-- Log all subscription changes
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_value, new_value)
VALUES (
  'user-uuid-123',
  'subscription.upgraded',
  'subscription',
  'sub-uuid-456',
  '{"plan": "starter"}',
  '{"plan": "growth"}'
);
```

---

### **3. SOC 2 Type II (Future)**

**Controls to Implement (Year 2):**

1. **Access Control:**
   - MFA for all employees
   - VPN access to production database
   - Role-based access (RBAC)

2. **Change Management:**
   - Code review required for all production deploys
   - Automated testing (100% CI/CD)
   - Deployment audit logs

3. **Incident Response:**
   - 24-hour incident response SLA
   - Security incident playbook
   - Post-mortem documentation

4. **Vendor Management:**
   - Audit third-party vendors (Shopify, OpenAI, Stripe)
   - Data Processing Agreements (DPAs)
   - Annual security reviews

---

## Incident Response

### **Security Incident Playbook**

**1. Detection:**
- CloudWatch alarms for anomalous activity
- Failed login spike (>100 failed logins in 1 hour)
- Unusual API usage (10x normal rate)

**2. Containment:**
- Revoke compromised API keys immediately
- Block malicious IP addresses (WAF)
- Force password reset for affected users

**3. Investigation:**
- Query audit logs for root cause
- Check CloudWatch logs for attack patterns
- Identify scope of breach

**4. Remediation:**
- Patch vulnerability
- Rotate all secrets (Shopify, OpenAI, Stripe, database passwords)
- Deploy fix to production

**5. Communication:**
- Notify affected users within 72 hours (GDPR requirement)
- Publish security advisory on status page
- Report to authorities if >500 users affected

**6. Post-Mortem:**
- Document incident timeline
- Identify prevention measures
- Update security policies

---

## Security Checklist

### **Pre-Launch Checklist:**

- [ ] **Authentication:**
  - [ ] Password hashing with bcrypt (12 rounds)
  - [ ] JWT tokens with 24-hour expiration
  - [ ] Email verification flow implemented
  - [ ] Failed login rate limiting (5 attempts → 15min lockout)

- [ ] **Authorization:**
  - [ ] Row-Level Security (RLS) enabled on all tables
  - [ ] API middleware verifies JWT on all routes
  - [ ] Users can only access their own data

- [ ] **Encryption:**
  - [ ] TLS 1.3 for all HTTPS traffic
  - [ ] Database encryption at rest (AES-256)
  - [ ] Shopify access tokens encrypted in database
  - [ ] Secrets stored in AWS Secrets Manager (not .env)

- [ ] **Input Validation:**
  - [ ] Zod schemas for all API requests
  - [ ] SQL injection prevention (Prisma ORM)
  - [ ] XSS prevention (React escapes by default, but verify user-generated content)

- [ ] **API Security:**
  - [ ] Rate limiting by plan (30-1000 req/min)
  - [ ] CORS configured (only allow app.agenticrev.com)
  - [ ] HMAC verification for all webhooks (Shopify, Stripe, OpenAI)

- [ ] **Infrastructure:**
  - [ ] Lambda IAM roles (least privilege)
  - [ ] S3 buckets not publicly accessible
  - [ ] Database IP allowlist (Vercel + Lambda only)
  - [ ] CloudWatch alarms for failed logins, API errors

- [ ] **Compliance:**
  - [ ] Privacy Policy published
  - [ ] Terms of Service published
  - [ ] Cookie consent banner
  - [ ] GDPR data export/deletion endpoints
  - [ ] Audit logging enabled

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** Deployment Guide (AWS setup, CI/CD pipeline)  
**Dependencies:** Legal review of Privacy Policy and Terms of Service required before launch
