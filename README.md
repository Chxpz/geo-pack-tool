# AgenticRev ICP Pivot - AI Visibility Platform

A comprehensive platform for monitoring and managing your business visibility in AI search results (ChatGPT, Google AI Overviews, Perplexity, Claude, and more). Track mentions, analyze competitors, manage citations, and optimize your presence across AI-powered discovery channels.

## Overview

AgenticRev transforms how businesses understand and control their visibility in the AI-driven search landscape. Monitor real-time mentions, benchmark against competitors, and execute data-driven SEO strategies optimized for AI systems.

**Core capabilities:**
- AI visibility scoring and trend analysis
- Platform breakdown (ChatGPT, Google AI, Perplexity, Claude, Bing)
- Query performance tracking
- Competitor benchmarking
- Citation management and source quality analysis
- Automated data refresh via cron jobs
- Plan-based data retention policies
- Admin panel for operator management

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS 3
- **Type Safety:** TypeScript 5 (strict mode)
- **Forms:** Zod + React Hook Form
- **Charts:** Recharts
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js (Vercel Serverless Functions)
- **Auth:** NextAuth.js v5
- **Database:** PostgreSQL (Supabase)
- **Storage:** Supabase Storage
- **Scheduled Tasks:** Vercel Cron

### Infrastructure
- **Hosting:** Vercel
- **Database:** Supabase (PostgreSQL)
- **Payments:** Stripe
- **Deployment:** GitHub → Vercel (auto-deploy)

## Project Structure

```
agenticrevops/
├── app/
│   ├── api/                          # API routes
│   │   ├── admin/                    # Admin panel endpoints
│   │   ├── auth/                     # Authentication routes
│   │   ├── businesses/               # Business CRUD
│   │   ├── citations/                # Citation management
│   │   ├── competitors/              # Competitor data
│   │   ├── cron/                     # Scheduled jobs
│   │   │   ├── data-retention/       # Delete old data
│   │   │   ├── scanner/              # Run visibility scans
│   │   │   ├── seo-refresh/          # Refresh SEO metrics
│   │   │   └── weekly-digest/        # Email summaries
│   │   └── visibility/               # Visibility score endpoints
│   ├── dashboard/                    # Dashboard pages
│   │   ├── page.tsx                  # Main dashboard
│   │   ├── loading.tsx               # Skeleton loaders
│   │   └── error.tsx                 # Error boundary
│   ├── admin/                        # Admin panel pages
│   ├── signup/                       # Signup page
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Landing page
├── components/
│   ├── dashboard/                    # Dashboard components
│   ├── admin/                        # Admin panel components
│   ├── shared/                       # Shared utilities
│   │   └── SectionErrorBoundary.tsx  # Error boundary
│   └── auth/                         # Auth components
├── lib/
│   ├── supabase.ts                   # Supabase client
│   ├── stripe.ts                     # Stripe utilities
│   ├── auth.ts                       # NextAuth config
│   ├── types.ts                      # TypeScript types
│   └── utils.ts                      # Helper functions
├── supabase/
│   ├── migrations/                   # Database migrations
│   └── seed.sql                      # Development seed data
├── tests/
│   ├── e2e/                          # Playwright E2E tests
│   └── performance/                  # Performance testing
├── docs/                             # Project documentation
│   ├── SECURITY-REVIEW.md            # Security checklist
│   ├── OPERATOR-SOP.md               # Operator procedures
│   ├── product/                      # Product docs
│   ├── technical/                    # Technical docs
│   └── operational/                  # Deployment & roadmap
└── deprecated/                       # Legacy files (archived)
```

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Next.js & Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-32-chars>

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cron Security
CRON_SECRET=<random-32-chars>

# Optional: AI APIs for scanning (if self-hosted scanner)
OPENAI_API_KEY=sk-...
```

See `.env.example` for complete list.

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Stripe account (test keys for development)

### Local Development

```bash
# Clone repository
git clone https://github.com/your-org/agenticrevops.git
cd agenticrevops

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your keys

# Run database migrations
npm run migrate

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Database Setup

```bash
# Using Supabase CLI
npm install -g supabase
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# Or via psql directly
psql $SUPABASE_CONNECTION_STRING < supabase/migrations/000-initial.sql
```

## API Routes Summary

### Public Routes
- `GET /` - Landing page
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - Email/password login
- `GET /api/auth/[...nextauth]` - NextAuth callbacks

### Protected Routes (Authenticated Users)
- `GET /api/visibility/score` - Get visibility metrics
- `GET /api/citations` - List citations
- `POST /api/citations` - Create citation note
- `GET /api/competitors` - List competitors
- `POST /api/competitors` - Add competitor
- `GET /api/businesses` - List user's businesses

### Operator Routes (Admin Panel)
- `POST /api/admin/tasks` - Create scan tasks
- `GET /api/admin/tasks` - List all tasks
- `POST /api/admin/imports` - Bulk import data
- `GET /api/admin/imports` - View import history

### Cron Routes (Vercel Cron - Requires CRON_SECRET)
- `GET /api/cron/scanner` - Run visibility scans
- `GET /api/cron/data-retention` - Delete expired data
- `GET /api/cron/seo-refresh` - Refresh SEO metrics
- `GET /api/cron/weekly-digest` - Send email summaries

## Architecture Overview

### Data Flow

```
Landing Page
    ↓
[Sign Up / Login] ← NextAuth + Supabase Auth
    ↓
Dashboard
    ├→ API: GET /visibility/score
    ├→ API: GET /citations
    ├→ API: GET /competitors
    └→ Cron: /api/cron/scanner (daily)
        └→ External scanner (Otterly)
            └→ Fetches AI mention data
```

### Authentication Flow
1. User enters email/password
2. NextAuth validates credentials against Supabase
3. Session token created and stored in secure cookie
4. Protected routes verify session on each request
5. User role (`user`, `operator`, `admin`) checked for authorization

### Database Architecture
- PostgreSQL with Row-Level Security (RLS)
- All tables filter by `user_id` or `business_id`
- Prevent cross-customer data leakage
- Automated data retention per subscription plan

### Cron Jobs
- **Scanner** (daily): Fetch new AI mentions from external scanner
- **Data Retention** (daily): Delete old mentions/citations per plan
- **SEO Refresh** (weekly): Update search rankings
- **Weekly Digest** (weekly): Send email summaries to users

## Development

### Scripts

```bash
# Development
npm run dev              # Start dev server on :3000
npm run typecheck       # TypeScript type checking
npm run lint            # ESLint checks
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run migrate         # Apply pending migrations
npm run migrate:create  # Create new migration
npm run seed            # Seed development data

# Testing
npm run test:e2e        # Run Playwright E2E tests
npm run test:perf       # Run performance tests
```

### Code Style

- TypeScript strict mode enabled
- ESLint for linting
- Prettier for formatting (configured in .prettierrc)
- Use `@/` import alias for cleaner imports

## Testing

### E2E Tests
```bash
npm run test:e2e
# Tests the full onboarding flow and main user journeys
```

### Performance Testing
```bash
npm run test:perf
# Validate dashboard loads < 3 seconds
# Run Lighthouse audit
```

See `tests/performance/README.md` for detailed testing guide.

## Security

All sensitive endpoints are protected by:
- NextAuth session validation
- Row-level security (RLS) policies in database
- Input validation with Zod
- Rate limiting on sensitive routes
- CRON_SECRET verification on scheduled jobs

See `docs/SECURITY-REVIEW.md` for complete security checklist.

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect GitHub repo directly to Vercel dashboard.

### Environment Variables in Production
Set in Vercel Dashboard > Settings > Environment Variables:
- NEXTAUTH_URL (production domain)
- NEXTAUTH_SECRET (strong random value)
- SUPABASE_URL, SUPABASE_ANON_KEY
- STRIPE_SECRET_KEY
- CRON_SECRET (strong random value)

### Monitoring
- Vercel Analytics built-in
- Sentry for error tracking
- Database logs via Supabase dashboard

## Documentation

- **Operator SOP:** `docs/OPERATOR-SOP.md` - Step-by-step Otterly import workflow
- **Security:** `docs/SECURITY-REVIEW.md` - Pre-deployment security checklist
- **Performance:** `tests/performance/README.md` - Performance targets and testing
- **Product:** `docs/product/` - Feature specifications and roadmap
- **Technical:** `docs/technical/` - Architecture and database schema

## Common Tasks

### Add a New Dashboard Metric
1. Create API route: `app/api/metrics/[metric-name]/route.ts`
2. Protect with auth middleware
3. Add Zod validation
4. Create component: `components/dashboard/[MetricName].tsx`
5. Add skeleton: `components/dashboard/[MetricName]Skeleton.tsx`
6. Import in dashboard and wrap with SectionErrorBoundary

### Create a Cron Job
1. Create route: `app/api/cron/[job-name]/route.ts`
2. Verify CRON_SECRET in header
3. Add to `vercel.json` with schedule
4. Add to monitoring dashboard

### Update Database Schema
1. Create migration: `npm run migrate:create`
2. Write SQL in `supabase/migrations/`
3. Test locally: `npm run migrate`
4. Commit and deploy

## Performance Targets

- Dashboard load: < 3 seconds
- API responses: < 500ms
- Lighthouse score: 75+
- Core Web Vitals: green

## Support & Contributing

This is a private/internal project. For questions:
- Check documentation in `docs/` folder
- Review security checklist before deployment
- Follow operator SOP for data imports

## License

Proprietary - All rights reserved
# geo-pack-tool
