# Development Guide

## Getting Started

### 1. Clone and Install

```bash
cd agenticrevops
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project credentials:
   - Project URL
   - Anon/Public Key
   - Service Role Key (keep secret!)

3. Apply database migrations:

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# Link your project (get ref from Supabase dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase (from dashboard)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# NextAuth (generate secret)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# For MVP, you can leave other keys empty initially
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
agenticrevops/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes (serverless functions)
│   │   └── health/         # Health check endpoint
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   └── globals.css         # Global styles
│
├── lib/                     # Shared utilities
│   ├── supabase.ts         # Supabase client
│   └── types.ts            # TypeScript types
│
├── components/              # React components (to be added)
│
├── supabase/
│   └── migrations/         # Database migrations
│       └── 001_initial_schema.sql
│
├── docs/                    # Complete documentation
│   ├── product/            # Product requirements
│   ├── technical/          # Technical architecture
│   └── operational/        # Roadmap & deployment
│
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── vercel.json             # Vercel Cron Jobs config
└── package.json            # Dependencies
```

---

## Development Workflow

### Adding a New Feature

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement the feature**
   - Add types to `lib/types.ts`
   - Create API routes in `app/api/`
   - Create UI components in `components/`
   - Add pages in `app/`

3. **Test locally**
   ```bash
   npm run typecheck  # Check TypeScript
   npm run lint       # Check code style
   npm run build      # Test production build
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   git push origin feature/your-feature-name
   ```

### Database Changes

1. **Create a new migration**
   ```bash
   supabase migration new your_migration_name
   ```

2. **Edit the migration file** in `supabase/migrations/`

3. **Apply locally**
   ```bash
   supabase db push
   ```

4. **Test the changes** in your app

5. **Commit the migration file** to Git

---

## Common Tasks

### Adding a New API Endpoint

Create a new file in `app/api/your-endpoint/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from('your_table')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json();
  // Handle POST request
}
```

### Adding a New Page

Create a new file in `app/your-page/page.tsx`:

```typescript
export default function YourPage() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Your Page</h1>
    </div>
  );
}
```

### Querying the Database

```typescript
import { supabase } from '@/lib/supabase';

// Select
const { data, error } = await supabase
  .from('products')
  .select('*')
  .eq('user_id', userId);

// Insert
const { data, error } = await supabase
  .from('products')
  .insert({ name: 'Product', price: 29.99 });

// Update
const { data, error } = await supabase
  .from('products')
  .update({ price: 24.99 })
  .eq('id', productId);

// Delete
const { data, error } = await supabase
  .from('products')
  .delete()
  .eq('id', productId);
```

---

## Testing

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

### Running Tests (to be added)

```bash
npm test              # Unit tests
npm run test:e2e      # E2E tests
```

---

## Debugging

### Check Database Connection

Visit [http://localhost:3000/api/health](http://localhost:3000/api/health)

Should return:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-03-03T..."
}
```

### View Supabase Logs

```bash
supabase logs
```

### Check Environment Variables

```bash
# In your code
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
```

---

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import project in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables
   - Deploy

3. **Automatic deployments**
   - Every push to `main` → Production
   - Every PR → Preview deployment

### Environment Variables in Vercel

Add these in Vercel Dashboard → Settings → Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_URL` (your production URL)
- `NEXTAUTH_SECRET`
- All API keys (Shopify, OpenAI, Stripe, etc.)

---

## Troubleshooting

### "supabaseUrl is required" Error

Make sure `.env.local` exists and has valid Supabase credentials.

### Build Fails

1. Check TypeScript errors: `npm run typecheck`
2. Check for missing dependencies: `npm install`
3. Clear Next.js cache: `rm -rf .next`

### Database Connection Issues

1. Check Supabase project is running
2. Verify credentials in `.env.local`
3. Check RLS policies aren't blocking queries

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

## Need Help?

- Check `/docs` folder for complete documentation
- Review `PROJECT-STATUS.md` for current progress
- Read `README.md` for quick start guide
