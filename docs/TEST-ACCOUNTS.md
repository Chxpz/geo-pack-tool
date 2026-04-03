# AgenticRev — Test Accounts

> **Local dev only.** These accounts exist in the Docker Postgres instance.
> Do NOT use in production.

## Login URL

**http://localhost:3000/login**

---

## Accounts

All accounts share the same password: **`Test1234!`**

| Plan | Email | Password | Products limit | Stores | ACP Checkout |
|------|-------|----------|---------------|--------|--------------|
| Free | `free@test.agenticrev.local` | `Test1234!` | 10 | 1 | ✗ |
| Starter | `starter@test.agenticrev.local` | `Test1234!` | 100 | 2 | ✗ |
| Growth | `growth@test.agenticrev.local` | `Test1234!` | 500 | 5 | ✗ |
| Agency | `agency@test.agenticrev.local` | `Test1234!` | Unlimited | Unlimited | ✓ |

---

## What each plan unlocks in the UI

### Free — `free@test.agenticrev.local`
- Dashboard visible, metrics at zero (no Shopify connected)
- Up to 10 products tracked
- Scan button available but will error (no AI API keys set yet)
- Billing page shows Free plan highlighted, upgrade CTAs visible
- Truth Engine available

### Starter — `starter@test.agenticrev.local`
- Same as Free but limits show 100 products / 2 stores
- No upgrade prompt for starter features
- Billing page shows Starter as current plan

### Growth — `growth@test.agenticrev.local`
- 500 products / 5 stores
- 90-day history window
- Billing page shows Growth as current plan

### Agency — `agency@test.agenticrev.local`
- Unlimited products and stores
- ACP Checkout enabled (shows in plan limits on Billing page)
- 365-day history window
- Billing page shows Agency as current plan, no upgrade CTA

---

## DB IDs (fixed UUIDs for easy reference)

| Plan | User ID |
|------|---------|
| Free | `00000000-0000-0000-0000-000000000001` |
| Starter | `00000000-0000-0000-0000-000000000002` |
| Growth | `00000000-0000-0000-0000-000000000003` |
| Agency | `00000000-0000-0000-0000-000000000004` |

---

## Re-seeding

If you wipe the Docker volume and need to recreate these accounts:

```bash
PGPASSWORD=postgres psql -h localhost -p 5433 -U supabase_admin -d postgres \
  -f scripts/seed-test-users.sql
```

---

## Notes

- Email is marked as **verified** for all accounts — no verification banner shown
- No Shopify store is connected — pages render in empty/zero state
- No AI API keys are configured — scanner will return an error message
- No Stripe keys configured — billing upgrade buttons show "Billing not configured"
- These accounts are seeded with **fixed UUIDs** so the SQL is idempotent (safe to re-run)
