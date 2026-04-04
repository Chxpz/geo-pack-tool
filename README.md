# AgenticRev

AgenticRev is an AI visibility monitoring and optimization platform. It tracks how AI assistants (ChatGPT, Perplexity, Gemini, Claude) mention, position, and cite businesses — then provides a 12-dimension GEO audit powered by the Stack3 Audit System to improve those results.

## Product Surface

- **AI Mention Monitoring** — Continuous scanning of ChatGPT, Perplexity, Gemini, and Claude for brand mentions, sentiment, position, and citations
- **Visibility Dashboard** — Share of voice, coverage rate, citation tracking, authority score, and competitor benchmarking
- **GEO Audit** — 12-dimension website audit via Stack3 Audit System API (crawlability, rendering, metadata, semantic structure, entity clarity, structured data, answer extraction, content quality, internal links, accessibility, brand trust, citation readiness)
- **SEO Snapshots** — SEMrush-powered domain authority, organic traffic, keywords, and AI overview presence
- **Reports** — HTML report generation and download
- **AI Concierge** — Enterprise-only RAG-powered chat with business context, Perplexity web search, and deep research
- **Billing** — Stripe-powered subscription tiers (Free / Pro / Business / Enterprise) with per-plan GEO audit limits

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS
- NextAuth v5
- Supabase / PostgreSQL
- Stripe, Resend, Pino
- Recharts, Zod, Zustand, SWR

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run lint         # ESLint (zero warnings)
npm run typecheck    # TypeScript compile check
npm run test         # Vitest unit tests
npm run build        # Production build
npm run ci           # lint + typecheck + test
npm run verify:release  # ci + build artifact verification
```

## Documentation

- [Docs Index](docs/README.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Development](docs/development.md)
- [Deployment](docs/deployment.md)

## Notes

- `deprecated/` contains archived legacy e-commerce and truth-engine code. Not part of the active product.
- Three AI platforms (Google AI Overviews, Google AI Mode, Microsoft Copilot) are marked `coming_soon` in the database and excluded from scans until Phase 2.
