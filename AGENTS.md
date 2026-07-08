# AGENTS.MD — Agentic Development Guide for mofé

## Project Overview

Persian-first cafe menu management service. Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Prisma v7 + PostgreSQL. Two surfaces: admin web app + static public QR menus. Paper-and-ink design language (#f5f0e6 / #111111).

## Development Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build (verify after every change)
npm test             # Vitest run (212 tests; use --no-file-parallelism for reliable runs)
npm run test:watch   # Watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run db:push      # Push schema to DB (after prisma changes)
npm run db:seed      # Seed demo data
npm run db:reset     # Full reset + migrate + seed
npm run db:studio    # Prisma Studio
cd ordering-service && DATABASE_URL="${DATABASE_URL}?sslmode=disable" go run ./cmd/server  # Start ordering service (required for orders)
```
- for internet access, use proxy at 172.25.144.1:10808
- after each successful implementation, commit to git

### Internal Auth
- `requireInternalAuth()` from `@/lib/api-helpers` — checks `user.role === "internal"` in internal API routes
- Internal pages use `user.role !== "internal"` check in server component layout
- Internal users are mofé team members; they are NOT venue members

### Internal Tool (`/internal`)
- Routes: `/internal` (dashboard), `/internal/users` (create/list users), `/internal/venues` (create/list venues)
- API: `GET|POST /api/internal/users`, `GET|POST /api/internal/venues`
- Auth: every handler calls `requireInternalAuth()`; page layout checks `role === "internal"`
- Seed: `admin@mofe.ir` / `admin1234`

### Sales Dashboard (`/admin/[venueId]/sales`)
- `Sale` model stores completed order data (venueId, orderId, total, itemCount, completedAt)
- Go ordering service inserts into `"Sale"` table on order completion
- API: `GET /api/venues/[venueId]/sales?range=daily|weekly|monthly|yearly|custom&start=&end=` — aggregates via `date_trunc`
- Returns `{ data: [{ date, orders, revenue, avgOrderValue }], summary: { totalOrders, totalRevenue, avgOrderValue } }`
- Sales page at `/admin/[venueId]/sales/` with revenue chart (Shamsi dates, recharts) + table
- Seed script: `scripts/seed-sales.ts` generates 60 days of synthetic data
- Tests: `src/__tests__/api/sales.test.ts` (19 tests covering auth, aggregation, isolation, response format)
- Client helpers: `toPersianDate()`, `formatCurrency()` exported from `SalesClient.tsx`, tested in `src/__tests__/components/SalesClient.test.ts`

### Menu Photo Display Toggle
- `menuPhotoMode` boolean on Venue model (default: `false`)
- Toggle in venue settings page: "نمایش عکس آیتم‌ها در منوی عمومی"
- When enabled: snapshot captures `photoUrl` per item; renderer uses photo card layout
- When disabled: current text-only theme unchanged
- Requires re-publish after toggling
- **Renderer:** Photo mode adds `.photo-mode` class to `<article class="item-card">`. The article gets `padding: 0; overflow: hidden` so the photo spans edge-to-edge with the article's `border-radius: 18px` clipping it at top. `.item-body` gets its own `padding: 12px 14px` for text content.

### Photo Upload (`POST /api/venues/[venueId]/items/[itemId]/photo`)
- Accepts multipart form with `photo` field (any image type)
- **Compression:** Sharp resizes to max 500px (`fit: inside`, no enlargement), encodes as **WebP**
- **Size target:** Binary search finds highest quality (30–95) that keeps output ≤50KB
- **Fallback:** If even quality 30 exceeds 50KB at 500px, dimension is reduced in 100px steps down to 200px
- **Storage:** Files saved to `public/uploads/item-{itemId}-{sha256hash}.webp`
- Deletes old photo file on re-upload (if exists)

## Must-Do After Every Change

1. `npm run build` — verify compilation succeeds
2. `npm run typecheck` — TypeScript checks pass
3. `npm test` — all 212 tests pass
4. `npm run lint` — ESLint clean

## Critical Context & Gotchas

### Next.js 16
- **Proxy export:** `src/proxy.ts` must export `proxy` (NOT `middleware`). Matcher in proxy config: `["/((?!_next/static|_next/image|favicon.ico).*)"]`
- **Proxy auth:** Uses `authGuard()` helper — checks `/admin` and `/api/` paths for session cookie, redirects to `/login` for HTML requests, returns 401 for API requests
- **Route params:** All route handler `params` must be `Promise<{ param: string }>` and `await`ed
- **App Router conventions:** Server components by default, `"use client"` only when needed (hooks, browser APIs, state)

### Prisma v7 + PostgreSQL
- **Custom output path:** Client generated at `src/generated/prisma` — import from `@/generated/prisma/client`
- **Adapter:** `@prisma/adapter-pg` wraps `pg` connection pool
- **Singleton:** `src/lib/prisma.ts` uses global singleton for hot-reload safety
- **Schema changes:** After editing `prisma/schema.prisma`, run `npx prisma db push` then `npx prisma generate`
- **⚠ Stale cache:** After Prisma schema changes, **restart the dev server** (`kill $(lsof -ti:3000)` then `npm run dev`). The running server caches the Prisma client and won't pick up new fields until restarted.
- **Seed:** `prisma/seed.ts` uses upsert for idempotency

### Auth
- **Cookie name:** `mofe_session`
- **Token:** 32-byte random hex, SHA-256 hashed before DB storage
- **Session TTL:** 7 days
- **Password:** bcrypt with 12 rounds
- **Auth helpers exported:** `hashToken`, `generateToken`, `hashPassword`, `verifyPassword`, `createSession`, `getCurrentUser`, `destroySession`, `createPasswordResetToken`, `validatePasswordResetToken`, `consumePasswordResetToken`
- **Route auth helper:** `requireAuth()` from `@/lib/api-helpers` — used in every API route handler (throws `ApiError` on failure)
- **Error formatting:** `errorResponse(e)` from `@/lib/api-helpers` — wrap all route handlers in try/catch
- **Rate limiting:** DB-backed via `RateLimitEntry` model — `await rateLimit(key, maxAttempts=5, windowMs=60000)`
- **Signup (`POST /api/auth/signup`):** Creates User + Venue + VenueMember(owner) in an atomic transaction. Accepts `{ name, email, password, cafeName, phone? }`. Auto-generates slug from cafe name (Persian→ASCII transliteration). Rate-limited to 3/IP/day in production only (bypassed in dev). Auto-logs in on success, returns `{ venueId }`. Redirect client to `/admin/{venueId}/menu`.
- **Self-registration:** Landing page (`src/app/page.tsx`) has a functional registration form at `src/app/_components/RegistrationForm.tsx` — client component with inline validation, loading state, and error display.

### Permissions
- 3 roles: `owner`, `manager`, `staff`
- Helper functions: `requireVenueAccess`, `requireRole`, `canManage`
- Every API route verifies auth (`requireAuth`) + venue membership (`requireVenueAccess`/`requireRole`)

### Fonts (self-hosted — NO external CDN)
- 5 font files in `public/fonts/`
- Body: `"Parastoo", "Vazirmatn", "Tahoma", sans-serif`
- Headings: `"EB Garamond", "Parastoo", "Vazirmatn", "Times New Roman", serif`
- @font-face declarations in `src/app/globals.css` AND inline in `src/lib/public-menu/renderer.ts`
- NEVER add Google Fonts or external font URLs

### Tailwind CSS v4
- No `tailwind.config.js` — CSS-based config via `@theme inline {}` in `globals.css`
- Import: `@import "tailwindcss"`
- Custom colors: `bg-paper`, `text-ink`, `text-ink-strong`, `text-ink-muted`, `border-line`, `bg-surface`
- Custom font: `font-serif` for EB Garamond headings

### Design Tokens (CSS vars in `:root`)
```
--paper: #f5f0e6;       --ink: #111111;
--ink-strong: #000000;  --ink-muted: #5f5a52;
--line: #d8d1c4;        --surface: rgba(255,255,255,0.28);
--radius-panel: 28px;   --radius-card: 24px;
--radius-control: 16px;
```

### Public Menu Renderer (`src/lib/public-menu/renderer.ts`)
- Pure functions: `renderPublicMenu(snapshot)` and `renderUnavailablePage(venueName)`
- Snapshot shape: `{ venue: { id, nameFa, nameEn, welcomeMessage, accentColor, slug, publicUrl }, categories: [{ id, nameFa, items: [{ id, nameFa, nameEn, description, priceToman, station, calories, soldOut, variants: [{ nameFa, nameEn, priceModifier }], allergenCodes: string[] }] }], generatedAt }`
- All user content HTML-escaped via `esc()` function
- Prices formatted with `toLocaleString("fa-IR")`
- Font @font-face repeated inline in rendered HTML
- RTL, mobile-first, inline CSS

### UI Components (`src/components/ui/`)
All use `forwardRef` where applicable. Variants:
- **Button:** `primary`/`secondary`/`tertiary`/`destructive`, sizes `sm`/`md`/`lg`
- **Toggle:** `role="switch"`, props: `on`, `onChange`, `disabled`
- **Input:** `label`, `error`, `helperText`
- **Badge:** `default`/`soldOut`/`hidden`, `muted` boolean
- **Modal:** `open`, `onClose`, `onConfirm`, `title`, `confirmLabel`, `confirmVariant`, `loading`
- **Panel:** `title`, `subtitle`, children
- **QRCodeExport:** client-side QR with canvas PNG + print PDF

### Testing
- **Framework:** Vitest v4
- **Config:** `vitest.config.ts` — `@/` path alias, `environment: "node"`, `globals: true`
- **Global setup:** `src/__tests__/global-setup.ts` — pushes schema with `prisma db push --accept-data-loss` before all tests
- **Per-file setup:** `src/__tests__/setup.ts` — sets `NODE_ENV=test`
- **Helpers:** `cleanTestData()` truncates all tables, `seedTestData()` creates test user + venue + 3 categories + 3 items, `seedTestSale()` creates a Sale record
- **Integration tests:** Use dynamic `import()` for prisma to avoid hoisting issues
- **API route tests:** Mock `requireAuth`/`requireVenueAccess` via `vi.mock`, call handlers directly with `new Request()`. See `src/__tests__/api/sales.test.ts`
- **Client helper tests:** Pure functions tested without DOM. See `src/__tests__/components/SalesClient.test.ts`
- Run: `npm test` (non-interactive) or `npm run test:watch` (watch mode)

## Go Ordering Service (`ordering-service/`)

### Development Commands

```bash
cd ordering-service
go build ./cmd/server   # Build binary
go test ./...           # Run tests (43 total: 37 pass, 6 pre-existing failures)
go vet ./...            # Static analysis
go mod tidy             # Sync dependencies
```

### Architecture

- **Port:** 8080 (chi v5 router)
- **Auth:** Reuses `mofe_session` cookie from Next.js. Middleware queries `"Session"` + `"VenueMember"` tables.
- **Multi-venue:** If user belongs to >1 venue, requires `X-Venue-ID` header. Single-venue users auto-infer.
- **Venue isolation:** Every handler checks `session.VenueID` against the order's `venue_id`.
- **WebSocket:** Hub per venue, broadcasts on order/item status changes. Ping/pong heartbeat every 30s. Optional Redis pub/sub for horizontal scaling across multiple instances.
- **Migrations:** Automated via golang-migrate at startup (`file://migrations`). Tables reference Prisma's camelCase tables with quoted identifiers.
- **Error format:** `{ "error": string, "code": string }` — compatible with Next.js `errorResponse()` format.
- **Metrics:** Prometheus `/metrics` endpoint with request counters, duration histograms, active requests gauge, business counters.
- **Rate limiting:** Per-user token bucket (100 req/s, burst 200) applied globally via middleware. Keys by `UserID` when authenticated, falls back to `RemoteAddr`.
- **WebSocket broadcasts:** All 5 mutation handlers broadcast typed events via the Hub. Redis pub/sub enabled when `REDIS_URL` is configured.
- **Analytics:** `GET /api/admin/analytics/daily-summary` returns daily stats (totalOrders, totalRevenue, avgOrderValue, top 10 items). Role-gated (OWNER/MANAGER).
- **Sale recording:** Order completion handler inserts a `Sale` record (venueId, orderId, total, itemCount).

### Key File Locations

| What | Path |
| --- | --- |
| Entry point | `ordering-service/cmd/server/main.go` |
| Config | `ordering-service/internal/config/config.go` |
| DB pool | `ordering-service/internal/database/postgres.go` |
| Auth middleware | `ordering-service/internal/middleware/auth.go` |
| Rate limiter | `ordering-service/internal/middleware/ratelimit.go` |
| Prometheus metrics | `ordering-service/internal/middleware/metrics.go` |
| Order handlers | `ordering-service/internal/handlers/orders.go` |
| WebSocket hub | `ordering-service/internal/handlers/ws.go` |
| Redis pub/sub | `ordering-service/internal/handlers/redis.go` |
| Analytics handler | `ordering-service/internal/handlers/analytics.go` |
| Domain types | `ordering-service/internal/models/` |
| Migration (up) | `ordering-service/migrations/001_add_orders_tables.up.sql` |
| Dockerfile | `ordering-service/Dockerfile` |
| Tests | `ordering-service/internal/handlers/orders_test.go` + `analytics_test.go` |

### Prisma Compatibility

- All quoted camelCase identifiers: `"Session"`, `"VenueMember"`, `"MenuItem"`, etc.
- Column names: `"tokenHash"`, `"userId"`, `"venueId"`, `"expiresAt"`, `"nameFa"`, `"priceToman"`.
- `station` lives on `MenuItem`, NOT on `Category`.
- `MenuItem.priceToman` and `MenuItemVariant.priceModifier` are both **Int** (integer tomans).
- See `prisma/schema.prisma` for authoritative field list.

### Common Development Patterns

#### Adding a new REST endpoint
1. Add handler method in `ordering-service/internal/handlers/orders.go`
2. Register route in `ordering-service/cmd/server/main.go`
3. Add tests in `ordering-service/internal/handlers/orders_test.go`
4. Build + vet

#### Adding a new middleware
1. Create file in `ordering-service/internal/middleware/`
2. Register in router chain in `cmd/server/main.go` (add to `r.Use(...)`)
3. Build + vet

#### Adding a new WebSocket event type
1. Add constant in `ordering-service/internal/handlers/ws.go` (e.g., `EventFoo = "foo"`)
2. Wire broadcast in the relevant handler via `h.hub.BroadcastToVenue(venueID, EventFoo, payload)`

#### Modifying the database schema
1. Edit `prisma/schema.prisma` for Prisma models
2. Add/edit migration in `ordering-service/migrations/`
3. Build + vet

#### Adding a new handler file (e.g., analytics.go)
1. Create file in `ordering-service/internal/handlers/`
2. Define handler struct (e.g., `type FooHandler struct { db *sql.DB }`)
3. Define constructor: `func NewFooHandler(db *sql.DB) *FooHandler`
4. Register routes in `cmd/server/main.go`
5. Build + vet + test

### Key File Locations

| What | Path |
| --- | --- |
| Prisma schema | `prisma/schema.prisma` |
| Seed data | `prisma/seed.ts` |
| DB singleton | `src/lib/prisma.ts` |
| Auth functions | `src/lib/auth.ts` |
| Signup API | `src/app/api/auth/signup/route.ts` |
| Registration form | `src/app/_components/RegistrationForm.tsx` |
| Audit helper | `src/lib/audit.ts` |
| Allergen constants | `src/lib/allergens.ts` |
| Price/number formatting | `src/lib/format.ts` |
| Route auth helpers | `src/lib/api-helpers.ts` |
| Permissions | `src/lib/permissions.ts` |
| HTML renderer | `src/lib/public-menu/renderer.ts` |
| Publication helpers | `src/lib/public-menu/publication.ts` |
| Auth proxy | `src/proxy.ts` |
| Rate limiter | `src/lib/rate-limit.ts` |
| Mailer | `src/lib/mailer.ts` |
| Sales API tests | `src/__tests__/api/sales.test.ts` |
| SalesClient helper tests | `src/__tests__/components/SalesClient.test.ts` |
| Photo upload API | `src/app/api/venues/[venueId]/items/[itemId]/photo/route.ts` |
| Storage | `src/lib/storage.ts` |
| Design tokens + fonts | `src/app/globals.css` |
| UI components | `src/components/ui/` |
| Tests | `src/__tests__/` |
| Font files | `public/fonts/` |
| Prisma client | `src/generated/prisma/` |
| Database (dev) | PostgreSQL via `DATABASE_URL` |
| Database (test) | PostgreSQL via `TEST_DATABASE_URL` |

## Common Development Patterns

### Adding a new API route
1. Create `src/app/api/venues/[venueId]/your-entity/route.ts`
2. Import `requireAuth`, `errorResponse` from `@/lib/api-helpers` and `requireVenueAccess`/`requireRole` from `@/lib/permissions`
3. Await params: `const { venueId } = await params`
4. Wrap handler body in `try { ... } catch (e) { return errorResponse(e); }`
5. Use `const user = await requireAuth()` for auth, then permission helpers for access control
6. Return `NextResponse.json(...)` with appropriate status
7. Add tests — data model tests in `src/__tests__/api/integration.test.ts`, API route tests in `src/__tests__/api/<entity>.test.ts` with mocked auth
8. Build + typecheck + test

### Adding a new admin page
1. Create `src/app/admin/[venueId]/your-page/page.tsx` (server component)
2. Fetch data using `getCurrentUser()` + `requireVenueAccess()` + `prisma`
3. Create `YourPageClient.tsx` (client component) for interactivity
4. Add nav link in `src/app/admin/[venueId]/layout.tsx`
5. Build + typecheck + test

### Adding a new UI component
1. Create file in `src/components/ui/`
2. Use `"use client"` if it uses hooks
3. Use design tokens (bg-paper, text-ink, border-line, etc.)
4. Follow existing patterns (forwardRef, variant props)
5. Build + typecheck

### Modifying the database schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` (dev) — this updates the PostgreSQL schema
3. Update seed data in `prisma/seed.ts` if needed
4. Run `npx prisma db seed`
5. Update test helpers in `src/__tests__/helpers.ts`
6. Run `npm test` (global-setup will recreate the test database)
7. Build + typecheck

## Environment

```env
DATABASE_URL="postgresql://mofe:mofe@localhost:5432/mofe"

# Email (optional — logs to console when unset)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@mofe.ir"

# Redis (optional — for ordering-service WebSocket scaling)
REDIS_URL=""

# S3-compatible storage (optional — uses local filesystem when unset)
S3_BUCKET=""
S3_REGION=""
S3_ENDPOINT=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
```

Core: `DATABASE_URL`. Test suite uses `TEST_DATABASE_URL` (or falls back to `postgresql://localhost:5432/mofe_test`) in global-setup.

## Demo Credentials

```
Email:    admin@noghteh
Password: demo1234
Role:     Owner of "کافه نقطه"

Email:    admin@mofe.ir
Password: admin1234
Role:     Internal (mofé team)
```
