# AGENTS.md — Agentic Development Guide for mofé

> **🚧** Zarinpal is sandbox/mock only. Subscription system implemented but untested with real payments.

**Always run after every change:** `npm run build && npm run typecheck && npm test && npm run lint`

## Critical Gotchas

| # | Rule |
|---|------|
| ⚠ | **NEVER run `npx prisma db push --accept-data-loss`** — destroys Go-managed tables (`orders`, `order_items`). Use the safe workflow instead. |
| ⚠ | **Proxy export:** `src/proxy.ts` must export `proxy` (NOT `middleware`) |
| ⚠ | **Route params:** All `params` are `Promise<{ ... }>` — must `await` |
| ⚠ | **Prisma schema changes:** After editing schema, run `npx prisma db push && npx prisma generate`, then **restart the dev server** (`kill $(lsof -ti:3000)` then `npm run dev`) |
| ⚠ | **No external fonts/CDN:** All 5 font files self-hosted in `public/fonts/`. Never add Google Fonts. |
| ⚠ | **Prisma client** is at `src/generated/prisma` — import from `@/generated/prisma/client` |

## Safe `prisma db push`

```bash
psql "${DATABASE_URL}" -c "DROP TABLE IF EXISTS schema_migrations;" \
  && npx prisma db push \
  && psql "${DATABASE_URL}" -c "CREATE TABLE IF NOT EXISTS schema_migrations (version bigint PRIMARY KEY, dirty boolean NOT NULL); INSERT INTO schema_migrations (version, dirty) VALUES (4, false) ON CONFLICT (version) DO NOTHING;"
```

After push, the Go ordering service auto-recreates dropped indexes/FKs on startup.

## Commands

```bash
npm run dev              # Dev server
npm run build            # Production build
npm test                 # Vitest (--no-file-parallelism for reliability)
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npx prisma db push       # Schema → DB (after prisma changes)
npx prisma db seed       # Seed demo data
cd ordering-service && go run ./cmd/server  # Start Go ordering service
```

## Conventions

- **Next.js 16:** Server components by default. `"use client"` only for hooks/browser APIs/state.
- **Tailwind v4:** CSS-based config via `@theme inline {}` in `globals.css`. No `tailwind.config.js`.
- **Design tokens:** `--paper: #f5f0e6`, `--ink: #111111`, `--ink-muted: #5f5a52`, `--line: #d8d1c4`, `--surface: rgba(255,255,255,0.28)`
- **Auth cookie:** `mofe_session` — SHA-256 token hash, 7-day TTL. Route helpers: `requireAuth()` / `errorResponse()` from `@/lib/api-helpers`.
- **Permissions:** 3 roles — `owner`, `manager`, `staff`. Every API route calls `requireAuth()` + `requireVenueAccess()`/`requireRole()`.
- **Rate limiting:** DB-backed via `RateLimitEntry` — `await rateLimit(key, maxAttempts=5, windowMs=60000)`
- **CSRF:** 64-char hex tokens. Cookie `mofe_csrf` + header `X-CSRF-Token` on all mutations.
- **Internal auth:** `requireInternalAuth()` checks `user.role === "internal"`. Routes: `/internal`, `/internal/users`, `/internal/venues`.
- **Public menu renderer (`src/lib/public-menu/renderer.ts`):** Pure functions. All user content goes through `esc()` (HTML-escape + strip bidi controls). `accentColor` uses `sanitizeCssColor()`.
- **Fonts:** Body: `"Parastoo", "Vazirmatn", "Tahoma", sans-serif`. Headings: `"EB Garamond", "Parastoo", "Vazirmatn", "Times New Roman", serif`.
- **Offline queue:** `src/lib/offline-queue.ts` — localStorage under `mofe_offline_queue` key.
- **Photo upload:** Sharp → WebP ≤50KB, max 500px, binary search for quality. Fallback: reduce dimension in 100px steps to 200px.
- **CSV:** Formula injection sanitized — cells starting with `=`, `+`, `-`, `@`, `\t` get `'` prefix. Template download at `GET /api/venues/[venueId]/items/csv-template` returns headers + example row.
- **Signup (`POST /api/auth/signup`):** Creates User + Venue + VenueMember(owner) in atomic transaction. Rate-limited 3/IP/day (prod only). Auto-generates slug from Persian name.

## Go Ordering Service (`ordering-service/`)

| Aspect | Detail |
|--------|--------|
| Port | 8080, chi v5 router |
| Auth | Reuses `mofe_session` cookie — SHA-256 hash, joins `Session` + `VenueMember` |
| Multi-venue | Requires `X-Venue-ID` header; single-venue users auto-infer |
| WS | Hub per venue, 30s ping/pong, optional Redis pub/sub |
| Migrations | golang-migrate at startup (`file://migrations`) |
| Rate limit | Per-user token bucket, 100 req/s burst 200 |
| Prices | All `INT` (toman) — matches Prisma. Quoted camelCase identifiers. |
| Sale recording | Order completion inserts `Sale` + `SaleItem` records |

### Go commands

```bash
cd ordering-service
go build ./cmd/server   # Build binary
go test ./...           # Run tests
go vet ./...            # Static analysis
```

### Adding a new Go handler
1. Create file in `internal/handlers/`
2. Define struct + constructor: `type FooHandler struct { db *sql.DB }` / `func NewFooHandler(db *sql.DB) *FooHandler`
3. Register routes in `cmd/server/main.go`
4. Build + vet + test

## Environment

```env
DATABASE_URL="postgresql://mofe:mofe@localhost:5432/mofe"
SMTP_HOST="" SMTP_PORT="587" SMTP_USER="" SMTP_PASS="" SMTP_FROM="noreply@mofe.ir"
REDIS_URL=""                             # Optional — Go WS scaling
S3_BUCKET="" S3_REGION="" S3_ENDPOINT="" S3_ACCESS_KEY_ID="" S3_SECRET_ACCESS_KEY=""  # Optional — file storage
```

Test suite uses `TEST_DATABASE_URL` (falls back to `postgresql://localhost:5432/mofe_test`).

## Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@noghteh` | `demo1234` | Owner of "کافه نقطه" |
| `admin@mofe.ir` | `admin1234` | Internal (mofé team) |

## Key File Map

| What | Path |
|------|------|
| Prisma schema | `prisma/schema.prisma` |
| DB singleton | `src/lib/prisma.ts` |
| Auth functions | `src/lib/auth.ts` |
| API helpers | `src/lib/api-helpers.ts` |
| Permissions | `src/lib/permissions.ts` |
| CSRF | `src/lib/csrf.ts` |
| Rate limiter | `src/lib/rate-limit.ts` |
| Public menu renderer | `src/lib/public-menu/renderer.ts` |
| Publication helpers | `src/lib/public-menu/publication.ts` |
| Auth proxy | `src/proxy.ts` |
| Subscription helpers | `src/lib/subscription.ts` |
| Zarinpal | `src/lib/zarinpal.ts` |
| Image compression | `src/lib/compress-image.ts` |
| Offline queue | `src/lib/offline-queue.ts` |
| UI components | `src/components/ui/` |
| Order components | `src/components/orders/` |
| Schedule section | `src/app/admin/[venueId]/settings/ScheduleSection.tsx` |
| Schedule API | `src/app/api/venues/[venueId]/schedules/route.ts` |
| CSV export API | `src/app/api/venues/[venueId]/items/export-csv/route.ts` |
| CSV import API | `src/app/api/venues/[venueId]/items/import-csv/route.ts` |
| CSV template API | `src/app/api/venues/[venueId]/items/csv-template/route.ts` |
| Tests | `src/__tests__/` |
| Schedule tests | `src/__tests__/api/schedules.test.ts` |
| Test helpers | `src/__tests__/helpers.ts` |
| Design tokens + fonts | `src/app/globals.css` |
| Go entry point | `ordering-service/cmd/server/main.go` |
| Go handlers | `ordering-service/internal/handlers/orders.go` |
| Go WS hub | `ordering-service/internal/handlers/ws.go` |
| Go analytics | `ordering-service/internal/handlers/analytics.go` |
| Go auth middleware | `ordering-service/internal/middleware/auth.go` |
