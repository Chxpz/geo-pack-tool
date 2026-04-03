# Quick Start Guide

Get AgenticRev running locally in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- npm installed
- A Supabase account (free tier works)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

### Create Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Name it `agenticrev-dev`
4. Generate a strong database password
5. Choose your region
6. Wait ~2 minutes for project creation

### Get Credentials
1. Go to **Settings** → **API**
2. Copy:
   - Project URL
   - anon/public key
   - service_role key

### Update Environment Variables
Edit `.env.local`:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## Step 3: Apply Database Migrations

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# Link project (get ref from dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

## Step 4: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 5: Create Your First Account

1. Go to [http://localhost:3000/signup](http://localhost:3000/signup)
2. Fill in:
   - Full Name: Your Name
   - Email: your@email.com
   - Password: (8+ characters)
3. Click "Create account"
4. You'll be redirected to the dashboard!

## Verify Everything Works

### Check Health Endpoint
Visit [http://localhost:3000/api/health](http://localhost:3000/api/health)

Should return:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-03-03T..."
}
```

### Check Database
In Supabase dashboard:
1. Go to **Table Editor**
2. Click **users** table
3. You should see your account!

## What's Next?

You now have:
- ✅ Authentication working
- ✅ User can sign up and log in
- ✅ Dashboard accessible
- ✅ Database connected

**Next steps** (Day 3-4):
1. Connect Shopify store
2. Sync products
3. Run AI visibility scans

## Troubleshooting

### "Database not configured" error
- Make sure `.env.local` has all three Supabase variables
- Restart dev server: `Ctrl+C` then `npm run dev`

### "Failed to create account"
- Check migrations applied: `supabase db push`
- Check Supabase project is active (not paused)

### Build fails
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

## Need More Help?

- **Detailed setup**: See `scripts/setup-supabase.md`
- **Development guide**: See `DEVELOPMENT.md`
- **Architecture docs**: See `docs/technical/`

---

**Ready to build?** Check `PROJECT-STATUS.md` for the full 10-day roadmap.
