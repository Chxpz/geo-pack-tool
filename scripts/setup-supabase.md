# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: agenticrev-dev (or agenticrev-prod for production)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you (e.g., US East)
4. Click "Create new project" (takes ~2 minutes)

## Step 2: Get Your Credentials

Once the project is created:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long JWT token)
   - **service_role key**: `eyJhbGc...` (different JWT token - keep secret!)

## Step 3: Update .env.local

Edit `.env.local` and add your credentials:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## Step 4: Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

## Step 5: Login to Supabase CLI

```bash
supabase login
```

This will open a browser window to authenticate.

## Step 6: Link Your Project

```bash
# Get your project ref from the Supabase dashboard URL
# Example: https://supabase.com/dashboard/project/abcdefghijklmnop
# The ref is: abcdefghijklmnop

supabase link --project-ref YOUR_PROJECT_REF
```

## Step 7: Apply Database Migrations

```bash
# This will create all tables, indexes, and RLS policies
supabase db push
```

You should see output like:
```
Applying migration 001_initial_schema.sql...
✓ Migration applied successfully
```

## Step 8: Verify Database Setup

```bash
# Check that tables were created
supabase db dump --schema public
```

You should see all 8 tables:
- users
- stores
- subscriptions
- products
- ai_platforms
- ai_mentions
- truth_engine_errors
- (and more)

## Step 9: Test the Connection

Start the dev server:

```bash
npm run dev
```

Visit [http://localhost:3000/api/health](http://localhost:3000/api/health)

You should see:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-03-03T..."
}
```

## Step 10: Create Your First User

1. Go to [http://localhost:3000/signup](http://localhost:3000/signup)
2. Fill in the form:
   - Full Name: Your Name
   - Email: your@email.com
   - Password: (at least 8 characters)
3. Click "Create account"
4. You should be redirected to the dashboard!

## Troubleshooting

### "Database not configured" error

- Make sure `.env.local` has all three Supabase variables
- Restart the dev server after adding env vars

### "Failed to create account" error

- Check Supabase dashboard → Table Editor → users
- Make sure the table exists
- Check RLS policies are enabled

### Migration fails

```bash
# Reset the database (WARNING: deletes all data)
supabase db reset

# Then reapply migrations
supabase db push
```

### Can't connect to Supabase

- Check your internet connection
- Verify project is not paused (free tier pauses after 7 days of inactivity)
- Check Supabase status: https://status.supabase.com

## Next Steps

Once Supabase is set up:

1. ✅ Authentication works
2. ✅ Users can sign up and log in
3. ✅ Dashboard loads
4. 🔜 Connect Shopify store (Day 3-4)
5. 🔜 Sync products (Day 3-4)
6. 🔜 Run AI visibility scans (Day 5-6)

---

**Need help?** Check the [Supabase documentation](https://supabase.com/docs) or the project's DEVELOPMENT.md file.
