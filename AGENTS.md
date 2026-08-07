# AGENTS.md — Agentic Development Guide for mofé

**Always run after every change:** `npm run build && npm run typecheck && npm test && npm run lint`

## Critical Gotchas

| # | Rule |
|---|------|
| ⚠ | **DATABASE_URL:** `prisma.config.ts` reads `process.env.DATABASE_URL` directly and no `.env` file ships in the repo — export it in the shell before any prisma command. |
| ⚠ | **Proxy export:** `src/proxy.ts` must export `proxy` (NOT `middleware`) |
| ⚠ | **Route params:** All `params` are `Promise<{ ... }>` — must `await` |
| ⚠ | **Prisma schema changes:** After editing schema, run `npx prisma db push && npx prisma generate`, then **restart the dev server** (`kill $(lsof -ti:3000)` then `npm run dev`) |
| ⚠ | **No external fonts/CDN:** All 5 font files self-hosted in `public/fonts/`. Never add Google Fonts. |
| ⚠ | **Prisma client** is at `src/generated/prisma` — import from `@/generated/prisma/client` |

## Commands

```bash
npm run dev              # Dev server
npm run build            # Production build
npm test                 # Vitest (fileParallelism: false is set in vitest.config.ts)
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npm run db:push          # one-time legacy schema_migrations drop + npx prisma db push
npx prisma db seed       # Seed demo data (runs src/lib/demo.ts via prisma/seed.ts)
```

## Conventions

- **Next.js 16:** Server components by default. `"use client"` only for hooks/browser APIs/state.
- **Tailwind v4:** CSS-based config via `@theme inline {}` in `globals.css`. No `tailwind.config.js`.
- **Design tokens:** `--paper: #f5f0e6`, `--ink: #111111`, `--ink-muted: #5f5a52`, `--line: #d8d1c4`, `--surface: rgba(255, 255, 255, 0.28)`
- **Auth cookie:** `mofe_session` — SHA-256 token hash, 7-day TTL. Route helpers: `requireAuth()` / `errorResponse()` from `@/lib/api-helpers`.
- **Permissions:** Single owner per venue — `Venue.ownerId`. Dashboard API routes call `requireAuth()`; venue-scoped routes then call `requireVenueAccess()` from `@/lib/permissions`. `/api/auth/*` and `/api/health` are public.
- **Rate limiting:** DB-backed via `RateLimitEntry` — `await rateLimit(key, maxAttempts=5, windowMs=60000)`
- **CSRF:** 64-char hex tokens. Cookie `mofe_csrf` + header `X-CSRF-Token`; `validateCsrf()` called in all mutation routes.
- **Public menu renderer (`src/lib/public-menu/renderer.ts`):** Pure functions. All user content goes through `esc()` (HTML-escape + strip bidi controls). `accentColor` uses `sanitizeCssColor()`.
- **Fonts:** Body: `"Parastoo", "Vazirmatn", "Tahoma", sans-serif`. Headings: `"EB Garamond", "Parastoo", "Vazirmatn", "Times New Roman", serif`.
- **Photo upload:** Sharp → WebP ≤50KB, max 500px, binary search for quality. Fallback: reduce dimension in 100px steps to 200px.
- **CSV:** Formula injection sanitized — cells starting with `=`, `+`, `-`, `@`, `\t` get `'` prefix. Template download at `GET /api/venues/[venueId]/items/csv-template` returns headers + example row.
- **Signup (`POST /api/auth/signup`):** Creates User + Venue(owner) in atomic transaction. Rate-limited 3/IP/day (prod only). Auto-generates slug from Persian name (falls back to `cafe`).

## Environment

```env
DATABASE_URL="postgresql://mofe:mofe@localhost:5432/mofe"
```

Test suite uses `TEST_DATABASE_URL` (falls back to `postgresql://mofe:mofe@localhost:5432/mofe_test`).

## Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@noghteh` | `demo1234` | Owner of "کافه نقطه" |

## Key File Map

| What | Path |
|------|------|
| Prisma schema | `prisma/schema.prisma` (8 models) |
| DB singleton | `src/lib/prisma.ts` |
| Auth functions | `src/lib/auth.ts` |
| API helpers | `src/lib/api-helpers.ts` |
| Permissions | `src/lib/permissions.ts` |
| CSRF | `src/lib/csrf.ts` |
| Rate limiter | `src/lib/rate-limit.ts` |
| Public menu renderer | `src/lib/public-menu/renderer.ts` |
| Public snapshot builder | `src/lib/public-menu/publication.ts` |
| Auth proxy | `src/proxy.ts` |
| Image compression | `src/lib/compress-image.ts` |
| Local file storage | `src/lib/storage.ts` |
| Demo data (seed) | `src/lib/demo.ts` + `prisma/seed.ts` |
| UI components | `src/components/ui/` |
| CSV export API | `src/app/api/venues/[venueId]/items/export-csv/route.ts` |
| CSV import API | `src/app/api/venues/[venueId]/items/import-csv/route.ts` |
| CSV template API | `src/app/api/venues/[venueId]/items/csv-template/route.ts` |
| Tests | `src/__tests__/` |
| Test helpers | `src/__tests__/helpers.ts` |
| Design tokens + fonts | `src/app/globals.css` |
