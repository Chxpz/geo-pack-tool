# Credentials Guide

Step-by-step instructions for obtaining every credential required to run AgenticRev in production.

---

## 1. Supabase

**Variables:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

1. Go to [supabase.com](https://supabase.com) and create a project (or use an existing one).
2. Navigate to **Project Settings > API**.
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
4. Apply all migrations from `supabase/migrations/` (000 through 007) against your project database via the Supabase SQL Editor or CLI.

---

## 2. NextAuth

**Variables:** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`

1. `NEXTAUTH_URL` is your app's public URL:
   - Local: `http://localhost:3000`
   - Production: `https://yourdomain.com`
2. Generate `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

---

## 3. OpenAI

**Variable:** `OPENAI_API_KEY`

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Click **Create new secret key**.
3. Copy the key → `OPENAI_API_KEY`.
4. Ensure your account has access to `gpt-4o` (used for scanning and concierge).

---

## 4. Perplexity

**Variables:** `PERPLEXITY_API_KEY`, `PERPLEXITY_SONAR_API_KEY`

1. Go to [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api).
2. Generate an API key → `PERPLEXITY_API_KEY` (used for mention scanning).
3. Generate a second key (or reuse the same one) → `PERPLEXITY_SONAR_API_KEY` (used for Sonar web search in the concierge).
4. Ensure your account has access to the `sonar` and `sonar-pro` models.

---

## 5. Anthropic (Claude)

**Variable:** `ANTHROPIC_API_KEY`

1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
2. Click **Create Key**.
3. Copy the key → `ANTHROPIC_API_KEY`.

---

## 6. Google Gemini

**Variable:** `GEMINI_API_KEY`

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Click **Create API key** (select or create a Google Cloud project).
3. Copy the key → `GEMINI_API_KEY`.

---

## 7. SEMrush

**Variable:** `SEMRUSH_API_KEY`

1. Go to [semrush.com](https://www.semrush.com) and log in (requires a paid plan with API access).
2. Navigate to your account menu or visit the API documentation page.
3. Your API key is shown under **API Access** or **Subscription Info**.
4. Copy the key → `SEMRUSH_API_KEY`.

---

## 8. Stripe

**Variables:** `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS`, `STRIPE_PRICE_ID_ENTERPRISE`

### API Keys

1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys).
2. Copy:
   - **Publishable key** → `STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`
3. For testing, use the test mode keys (`pk_test_...`, `sk_test_...`).

### Webhook Secret

1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks).
2. Click **Add endpoint**.
3. Set the URL to `https://yourdomain.com/api/webhooks/stripe`.
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add endpoint**, then reveal the **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

### Price IDs (Products)

1. Go to [dashboard.stripe.com/products](https://dashboard.stripe.com/products).
2. Create a product called **AgenticRev** (or similar).
3. Add three recurring monthly USD prices:
   - **Pro** — $149/month → copy the price ID → `STRIPE_PRICE_ID_PRO`
   - **Business** — $399/month → copy the price ID → `STRIPE_PRICE_ID_BUSINESS`
   - **Enterprise** — $899/month → copy the price ID → `STRIPE_PRICE_ID_ENTERPRISE`
4. Price IDs look like `price_1Abc...`.

---

## 9. Resend (Email)

**Variables:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

1. Go to [resend.com](https://resend.com) and create an account.
2. Navigate to **API Keys** and create a key → `RESEND_API_KEY`.
3. For production: go to **Domains**, add and verify your sending domain (e.g., `agenticrev.com`). Then set `RESEND_FROM_EMAIL=AgenticRev <noreply@agenticrev.com>`.
4. For testing: use Resend's shared test address: `RESEND_FROM_EMAIL=AgenticRev <onboarding@resend.dev>`.

---

## 10. Cron Secret

**Variable:** `CRON_SECRET`

Generate locally:
```bash
openssl rand -hex 32
```

This secret protects the four cron endpoints (`/api/cron/*`). The cron scheduler (Vercel) sends it as `Authorization: Bearer <CRON_SECRET>`.

---

## 11. Stack3 Audit System

**Variables:** `STACK3_AUDIT_API_URL`, `STACK3_AUDIT_API_KEY`

1. `STACK3_AUDIT_API_URL` — the base URL of the deployed Stack3 Audit System:
   - Local: `http://localhost:3001`
   - Production: `https://audit.stack3.io` (or wherever it's deployed)
2. `STACK3_AUDIT_API_KEY` — must be at least 32 characters and must match the `API_KEY` environment variable configured on the Stack3 Audit System deployment.
3. Generate a key:
   ```bash
   openssl rand -hex 32
   ```
4. Set the same value in both:
   - AgenticRev's `STACK3_AUDIT_API_KEY`
   - Stack3 Audit System's `API_KEY`

---

## 12. Agent Model (Optional)

**Variable:** `AGENT_MODEL`

Override the AI concierge model. Defaults to `gpt-5.4-mini` if not set. Only change this if you want to use a different model for the enterprise concierge chat.

---

## Quick Reference

| Variable | Source | Required |
|----------|--------|----------|
| `SUPABASE_URL` | Supabase dashboard | Yes |
| `SUPABASE_ANON_KEY` | Supabase dashboard | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard | Yes |
| `NEXTAUTH_URL` | Your deployment URL | Yes |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Yes |
| `OPENAI_API_KEY` | OpenAI platform | Yes |
| `PERPLEXITY_API_KEY` | Perplexity settings | Yes |
| `PERPLEXITY_SONAR_API_KEY` | Perplexity settings | Yes |
| `ANTHROPIC_API_KEY` | Anthropic console | Yes |
| `GEMINI_API_KEY` | Google AI Studio | Yes |
| `SEMRUSH_API_KEY` | SEMrush account | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe dashboard | Yes |
| `STRIPE_SECRET_KEY` | Stripe dashboard | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | Yes |
| `STRIPE_PRICE_ID_PRO` | Stripe products | Yes |
| `STRIPE_PRICE_ID_BUSINESS` | Stripe products | Yes |
| `STRIPE_PRICE_ID_ENTERPRISE` | Stripe products | Yes |
| `RESEND_API_KEY` | Resend dashboard | Yes |
| `RESEND_FROM_EMAIL` | Verified domain in Resend | Yes |
| `CRON_SECRET` | `openssl rand -hex 32` | Yes |
| `STACK3_AUDIT_API_URL` | Stack3 Audit deployment | Yes |
| `STACK3_AUDIT_API_KEY` | `openssl rand -hex 32` | Yes |
| `AGENT_MODEL` | N/A | No |
