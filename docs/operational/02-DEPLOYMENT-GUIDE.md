# Deployment Guide
## AgenticRev: AI Commerce Operations Platform

**Document Version:** 1.0  
**Last Updated:** March 3, 2026  
**Status:** ⚠️ OBSOLETE FOR MVP — See Technical Architecture doc for current stack  
**Owner:** DevOps Team  

> ⚠️ **CRITICAL - DO NOT USE FOR MVP DEPLOYMENT**
> 
> This deployment guide was written for an earlier AWS Lambda + multi-cloud architecture that has been **completely replaced**. The current architecture (documented in `docs/technical/01-TECHNICAL-ARCHITECTURE.md`) uses **Vercel + Supabase only** with zero AWS services through Phase 2.
>
> **Actual MVP deployment (10-day sprint):**
> 1. `git push` to `main` → Vercel auto-deploys frontend + all API routes (one deployment, one platform)
> 2. Run `supabase db push` → applies schema migrations to Supabase
> 3. Set environment variables in Vercel dashboard (Settings → Environment Variables)
> 4. Configure Vercel Cron Jobs in `vercel.json` (replaces AWS EventBridge, zero config, zero cost)
> 5. Total infrastructure cost: $45/month (Vercel Pro $20 + Supabase Pro $25)
>
> **Why this document exists:** Preserved for Phase 3+ reference only, when AWS Lambda may be added for heavy async batch processing if Vercel function limits (60s timeout, 1GB memory) are exceeded at scale. For MVP launch (March 13, 2026), ignore all AWS sections below and follow the Technical Architecture document instead.
>
> **If you're deploying the MVP, close this file and read:** `docs/technical/01-TECHNICAL-ARCHITECTURE.md` (sections: "Infrastructure & Deployment" and "Vercel + Supabase Setup")

---

## Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [AWS Setup](#aws-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [Supabase Setup](#supabase-setup)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Environment Configuration](#environment-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Deployment Checklist](#deployment-checklist)

---

## Infrastructure Overview

### **Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                         PRODUCTION                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│              │         │                  │         │              │
│  Vercel      │────────▶│  AWS Lambda      │────────▶│  Supabase    │
│  (Frontend)  │         │  (Backend)       │         │  (Database)  │
│              │         │                  │         │              │
└──────────────┘         └──────────────────┘         └──────────────┘
      │                         │                           │
      │                         │                           │
      ▼                         ▼                           ▼
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Cloudflare  │         │  AWS S3          │         │  Upstash     │
│  (DNS)       │         │  (ACP Feeds)     │         │  (Redis)     │
└──────────────┘         └──────────────────┘         └──────────────┘

External Services:
- Shopify API
- OpenAI API (ChatGPT + ACP)
- Perplexity, Gemini, Claude APIs
- Stripe (billing)
- SendGrid (emails)
```

---

## AWS Setup

### **1. AWS Account Configuration**

**Prerequisites:**
- AWS account with billing enabled
- IAM user with AdministratorAccess (for initial setup)
- AWS CLI installed: `brew install awscli`

**Sign in to AWS:**
```bash
aws configure
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: us-east-1
# Default output format: json
```

---

### **2. Lambda Functions Setup**

**Create Lambda Functions:**

```bash
# 1. Create execution role
aws iam create-role \
  --role-name AgenticRevLambdaRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# 2. Attach policies
aws iam attach-role-policy \
  --role-name AgenticRevLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
  --role-name AgenticRevLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# 3. Create Lambda functions
# AI Scanner Service
aws lambda create-function \
  --function-name agenticrev-ai-scanner \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/AgenticRevLambdaRole \
  --handler src.scanner.handler \
  --timeout 300 \
  --memory-size 512 \
  --environment Variables={
      OPENAI_API_KEY=sk-...,
      PERPLEXITY_API_KEY=...,
      DATABASE_URL=postgresql://...
    }

# Truth Engine Service
aws lambda create-function \
  --function-name agenticrev-truth-engine \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/AgenticRevLambdaRole \
  --handler src.truth_engine.handler \
  --timeout 60 \
  --memory-size 256

# Shopify Sync Service
aws lambda create-function \
  --function-name agenticrev-shopify-sync \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/AgenticRevLambdaRole \
  --handler src.shopify_sync.handler \
  --timeout 300 \
  --memory-size 512
```

**Deploy Lambda Code:**

```bash
# Build Docker container (Lambda uses container images)
cd backend/
docker build -t agenticrev-scanner:latest -f Dockerfile.scanner .

# Push to ECR (Elastic Container Registry)
aws ecr create-repository --repository-name agenticrev-scanner

aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker tag agenticrev-scanner:latest \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/agenticrev-scanner:latest

docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/agenticrev-scanner:latest

# Update Lambda to use new image
aws lambda update-function-code \
  --function-name agenticrev-ai-scanner \
  --image-uri ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/agenticrev-scanner:latest
```

---

### **3. S3 Buckets**

**Create S3 buckets:**

```bash
# ACP Feeds bucket (private)
aws s3 mb s3://agenticrev-acp-feeds --region us-east-1

# Block public access
aws s3api put-public-access-block \
  --bucket agenticrev-acp-feeds \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket agenticrev-acp-feeds \
  --versioning-configuration Status=Enabled

# Lifecycle policy (delete feeds older than 90 days)
aws s3api put-bucket-lifecycle-configuration \
  --bucket agenticrev-acp-feeds \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "DeleteOldFeeds",
      "Status": "Enabled",
      "Expiration": {"Days": 90}
    }]
  }'
```

---

### **4. API Gateway (Optional - for external webhooks)**

**Create REST API:**

```bash
# Create API
aws apigateway create-rest-api \
  --name AgenticRevAPI \
  --description "AgenticRev webhook endpoints"

# Get API ID
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='AgenticRevAPI'].id" --output text)

# Create resource
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/'].id" --output text)

aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part webhooks

# Integrate with Lambda
# ... (complex setup, better to use Vercel API routes)
```

**Note:** For MVP, use Vercel API routes for webhooks instead of API Gateway to reduce complexity.

---

### **5. EventBridge (Scheduled Jobs)**

**Daily Product Sync (2am UTC):**

```bash
# Create EventBridge rule
aws events put-rule \
  --name agenticrev-daily-sync \
  --schedule-expression "cron(0 2 * * ? *)" \
  --description "Daily product sync at 2am UTC"

# Add Lambda as target
aws events put-targets \
  --rule agenticrev-daily-sync \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:ACCOUNT_ID:function:agenticrev-shopify-sync"

# Grant EventBridge permission to invoke Lambda
aws lambda add-permission \
  --function-name agenticrev-shopify-sync \
  --statement-id AllowEventBridge \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:ACCOUNT_ID:rule/agenticrev-daily-sync
```

---

### **6. Secrets Manager**

**Store API keys securely:**

```bash
# Shopify
aws secretsmanager create-secret \
  --name prod/shopify/client_secret \
  --secret-string "shpsec_xxxxx"

# OpenAI
aws secretsmanager create-secret \
  --name prod/openai/api_key \
  --secret-string "sk-xxxxx"

# Stripe
aws secretsmanager create-secret \
  --name prod/stripe/secret_key \
  --secret-string "sk_live_xxxxx"

# Access in Lambda:
# import boto3
# client = boto3.client('secretsmanager')
# response = client.get_secret_value(SecretId='prod/shopify/client_secret')
# secret = response['SecretString']
```

---

## Vercel Deployment

### **1. Project Setup**

**Connect GitHub repo:**

1. Sign up at https://vercel.com
2. Import Git Repository → Select `agenticrev/platform`
3. Framework Preset: **Next.js**
4. Root Directory: `./` (monorepo root)

**Project Settings:**

```bash
# Build Command
npm run build

# Output Directory
.next

# Install Command
npm install

# Development Command
npm run dev
```

---

### **2. Environment Variables**

**Add in Vercel Dashboard (Settings → Environment Variables):**

```bash
# Database
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres

# NextAuth
NEXTAUTH_URL=https://app.agenticrev.com
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# Shopify
SHOPIFY_CLIENT_ID=xxxxx
SHOPIFY_CLIENT_SECRET=shpca_xxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxx

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# SendGrid
SENDGRID_API_KEY=SG.xxxxx

# Upstash Redis
UPSTASH_REDIS_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_TOKEN=xxxxx
```

**Set for all environments (Production, Preview, Development).**

---

### **3. Custom Domain**

**Add custom domain:**

1. Vercel Dashboard → Settings → Domains
2. Add `app.agenticrev.com`
3. Update DNS (Cloudflare):
   - **CNAME:** `app` → `cname.vercel-dns.com`
4. Vercel auto-provisions SSL certificate (Let's Encrypt)

---

### **4. Deployment**

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Deploy to production
vercel --prod

# Preview deployment (for testing)
vercel
```

**Automatic Deployments:**
- Push to `main` branch → Production deployment
- Push to feature branches → Preview deployment

---

## Supabase Setup

### **1. Create Project**

1. Sign up at https://supabase.com
2. New Project → `agenticrev-prod`
3. Region: **US East (Ohio)** (close to AWS Lambda)
4. Database Password: Generate strong password

**Get Connection String:**
```
postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres
```

---

### **2. Run Migrations**

**Create migrations folder:**

```bash
cd backend/
mkdir -p supabase/migrations
```

**Migration files:**

`001_initial_schema.sql`:
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  email_verified BOOLEAN DEFAULT FALSE,
  shopify_provider VARCHAR(255),
  shopify_uid VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Stores table
-- ... (full schema from 02-DATABASE-SCHEMA.md)
```

**Apply migrations:**

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# Link project
supabase link --project-ref xxx

# Apply migrations
supabase db push
```

---

### **3. Row-Level Security (RLS)**

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policies (see 05-SECURITY-COMPLIANCE.md for full policies)
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (id = current_user_id());

-- ... (all policies)
```

---

### **4. Backups**

- Daily automated backups (Supabase manages this)
- Point-in-time recovery: 7 days
- Manual backup: `supabase db dump > backup.sql`

---

## CI/CD Pipeline

### **GitHub Actions Workflow**

**`.github/workflows/deploy.yml`:**

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linter
        run: npm run lint
      
      - name: Type check
        run: npm run typecheck

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build Lambda container (AI Scanner)
        run: |
          cd backend/
          docker build -t agenticrev-scanner:${{ github.sha }} -f Dockerfile.scanner .
          docker tag agenticrev-scanner:${{ github.sha }} \
            ${{ steps.login-ecr.outputs.registry }}/agenticrev-scanner:latest
          docker push ${{ steps.login-ecr.outputs.registry }}/agenticrev-scanner:latest
      
      - name: Update Lambda function
        run: |
          aws lambda update-function-code \
            --function-name agenticrev-ai-scanner \
            --image-uri ${{ steps.login-ecr.outputs.registry }}/agenticrev-scanner:latest
```

---

## Environment Configuration

### **Environment Files**

**Local Development (`.env.local`):**

```bash
# Database (local Postgres or Supabase dev)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agenticrev_dev

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-change-in-production

# Shopify (test app)
SHOPIFY_CLIENT_ID=test_client_id
SHOPIFY_CLIENT_SECRET=test_client_secret

# OpenAI (use personal API key)
OPENAI_API_KEY=sk-xxxxx

# Stripe (test mode)
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

# Redis (Upstash free tier)
UPSTASH_REDIS_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_TOKEN=xxxxx
```

**Production (Vercel Environment Variables):**
- Stored in Vercel Dashboard (see Vercel section above)
- Never commit `.env.production` to Git

---

## Monitoring & Logging

### **1. Vercel Analytics**

- Automatic traffic analytics (free)
- Enable in Vercel Dashboard → Analytics

---

### **2. AWS CloudWatch**

**Lambda Logs:**
- Automatic logging to CloudWatch Logs
- Log group: `/aws/lambda/agenticrev-ai-scanner`

**View logs:**
```bash
aws logs tail /aws/lambda/agenticrev-ai-scanner --follow
```

**Alarms:**

```bash
# Alert on Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name agenticrev-lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=agenticrev-ai-scanner \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:agenticrev-alerts
```

---

### **3. Sentry (Error Tracking)**

**Install Sentry:**

```bash
npm install @sentry/nextjs @sentry/node
```

**`sentry.client.config.js`:**

```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  tracesSampleRate: 0.1, // 10% of requests
});
```

**`sentry.server.config.js`:**

```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  tracesSampleRate: 0.1,
});
```

---

### **4. Uptime Monitoring (UptimeRobot)**

**Monitor endpoints:**
- https://app.agenticrev.com (homepage)
- https://app.agenticrev.com/api/health (health check)

**Health check endpoint:**

```typescript
// app/api/health/route.ts
export async function GET() {
  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    return Response.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({
      status: 'error',
      database: 'disconnected'
    }, { status: 503 });
  }
}
```

---

## Deployment Checklist

### **Pre-Launch Checklist:**

**Infrastructure:**
- [ ] AWS Lambda functions deployed (AI Scanner, Truth Engine, Shopify Sync)
- [ ] S3 buckets created (`agenticrev-acp-feeds`)
- [ ] EventBridge scheduled jobs configured (daily sync at 2am)
- [ ] Secrets stored in AWS Secrets Manager (Shopify, OpenAI, Stripe)
- [ ] IAM roles configured (least privilege)

**Frontend (Vercel):**
- [ ] Project deployed to Vercel
- [ ] Environment variables configured (production)
- [ ] Custom domain configured (`app.agenticrev.com`)
- [ ] SSL certificate active
- [ ] Automatic deployments from `main` branch

**Database (Supabase):**
- [ ] Project created (production)
- [ ] All migrations applied (12 tables)
- [ ] Row-Level Security (RLS) policies enabled
- [ ] Daily backups enabled
- [ ] Connection string added to Vercel

**CI/CD:**
- [ ] GitHub Actions workflow configured
- [ ] Tests pass before deployment
- [ ] Automatic deployments on merge to `main`

**Monitoring:**
- [ ] Sentry error tracking configured
- [ ] CloudWatch alarms created (Lambda errors, high latency)
- [ ] Uptime monitoring enabled (UptimeRobot)
- [ ] Health check endpoint (`/api/health`) working

**Security:**
- [ ] All secrets in environment variables (not hardcoded)
- [ ] HTTPS enforced (Vercel + custom domain)
- [ ] CORS configured (only allow app.agenticrev.com)
- [ ] Rate limiting enabled (Upstash Redis)
- [ ] Webhook HMAC verification (Shopify, Stripe)

**Third-Party Integrations:**
- [ ] Shopify app created in Shopify Partner Dashboard
- [ ] Stripe account in live mode (webhook endpoints configured)
- [ ] OpenAI API key (production tier with sufficient quota)
- [ ] SendGrid sender verified (hello@agenticrev.com)

**DNS:**
- [ ] Domain registered (agenticrev.com)
- [ ] DNS managed by Cloudflare
- [ ] CNAME record: `app` → `cname.vercel-dns.com`
- [ ] A record: `@` → Vercel IP (for main site)

---

**Deployment Steps (Launch Day):**

1. **Final code freeze:**
   - Merge all feature branches to `main`
   - Tag release: `git tag v1.0.0 && git push --tags`

2. **Database migration:**
   - Run `supabase db push` (production)
   - Verify schema: `supabase db dump`

3. **Deploy backend:**
   - Push Lambda containers to ECR
   - Update all Lambda functions
   - Test Lambda invocations

4. **Deploy frontend:**
   - Push to `main` (triggers Vercel deployment)
   - Verify deployment: https://app.agenticrev.com

5. **Smoke tests:**
   - [ ] Sign up flow works
   - [ ] Shopify OAuth works
   - [ ] Product sync works
   - [ ] Dashboard loads
   - [ ] Subscription checkout works (Stripe test mode first)

6. **Go live:**
   - Switch Stripe to live mode
   - Announce on Twitter/ProductHunt

---

**Document Status:** ✅ Complete - Ready for Development  
**Next Steps:** Testing Strategy (unit, integration, E2E test plans)
