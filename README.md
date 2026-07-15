# mofé — Persian Cafe Menu Management

> **🚧 Development Status:** This project is in active development and has not been deployed to production yet. All features, including the subscription billing system, are under construction. Zarinpal integration uses sandbox/mock mode — set `ZARINPAL_MERCHANT_ID` for real payments.



Persian-first cafe menu management: manage menu categories, items, appearance, and publish static QR menus — all in Persian, with a restrained paper-and-ink design language.

> **New to the project?** See [`NAVIGATION-GUIDE.md`](./NAVIGATION-GUIDE.md) for a deep dive into directory structure, conventions, architecture, and common development tasks.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework (Web) | Next.js 16.2.9 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 (CSS-based config via `@theme`) |
| ORM | Prisma v7 |
| Database | PostgreSQL |
| DB Adapter | `@prisma/adapter-pg` (via `pg` connection pool) |
| Auth | Session-based, HTTP-only cookie `mofe_session`, bcryptjs + SHA-256 |
| Roles | `user` / `internal` (User), `owner` / `manager` / `staff` (VenueMember) |
| DnD | @dnd-kit/core + @dnd-kit/sortable |
| QR | `qrcode` (client-side) |
| CSV | papaparse |
| Icons | lucide-react |
| Image Processing | sharp |
| Email | nodemailer (SMTP) |
| Storage | Local filesystem / S3-compatible (configurable) |
| Testing | Vitest v4 (374 tests, 17 files) |
| Runtime | Node 22 |
| **Ordering Service** | |
| Framework | Go 1.23 (chi v5) |
| Real-time | WebSocket (gorilla/websocket) |
| DB Driver | pgx v5 |
| Migrations | golang-migrate |
| Port | 8080 |
| Caching | Redis 7 (optional, horizontal WS scaling) |

## Quick Start

```bash
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Login

| Email | Password | Role |
| --- | --- | --- |
| `admin@noghteh` | `demo1234` | Owner of "کافه نقطه" |
| `admin@mofe.ir` | `admin1234` | Internal (mofé team) |

### Seed Venue

Venue "کافه نقطه" with 4 categories (3 active, 1 inactive) and 9 items (including hidden, sold-out, and public items).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build (28 routes, 1 proxy) |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run 374 tests (vitest run) |
| `npm run test:watch` | Tests in watch mode |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed demo data (upsert) |
| `npm run db:reset` | `prisma migrate reset --force` — full reset |
| `npm run download:menus` | Export all published menus as static HTML files |

### Go Ordering Service

```bash
cd ordering-service
go build ./cmd/server       # Build binary
go test ./...               # Run tests
go vet ./...                # Static analysis
```

Managed via `docker compose` alongside the Next.js app (port 8080).

## Routes

### App Pages

| Route | Type | Purpose |
| --- | --- | --- |
| `/` | Static | Landing page (hero, features, how-it-works, benefits, contact form, footer) |
| `/login` | Static | Login page (`LoginForm` client component) |
| `/password-reset` | Static | Password reset request form |
| `/password-reset/[token]` | Dynamic | Password reset confirmation form |
| `/venues` | Dynamic | Venue picker (auto-redirects if 1 membership) |
| `/m/[slug]` | Dynamic | Static public menu (~10KB inline HTML, no client JS) |
| `/admin/[venueId]/menu` | Dynamic | Menu management (categories + items CRUD, drag-and-drop, filters) |
| `/admin/[venueId]/qr-menu` | Dynamic | Publish/preview/QR editor with live mobile preview (merged into `/menu`) |
| `/admin/[venueId]/publications` | Dynamic | Publication history (last 50, Persian dates) |
| `/admin/[venueId]/sales` | Dynamic | Sales dashboard: revenue chart (Shamsi dates), order history, summary stats |
| `/admin/[venueId]/settings` | Dynamic | Venue settings, logo upload, member management, station schedules, photo display toggle |
| `/internal` | Dynamic | Internal dashboard (mofé team) |
| `/internal/users` | Dynamic | Internal user management: list users, create accounts |
| `/internal/venues` | Dynamic | Internal venue management: list venues, create venues with owner |
| `/staff/[venueId]/orders` | Dynamic | Staff ordering page (table grid + order panel, all roles) |

### API Endpoints (29 routes)

**Health:** `GET /api/health`

**Internal (mofé team only):** `GET|POST /api/internal/users`, `GET|POST /api/internal/venues`

**Auth:** `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`, `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`

**Venues:** `GET /api/venues`, `GET|PATCH /api/venues/[id]`

**Categories:** `GET|POST /api/venues/[id]/categories`, `PATCH|DELETE /api/venues/[id]/categories/[id]`, `POST .../categories/reorder`

**Items:** `GET|POST /api/venues/[id]/items`, `GET|PATCH|DELETE /api/venues/[id]/items/[id]`, `POST .../items/reorder`, `POST .../items/bulk-visibility`, `POST .../items/import-csv`, `GET .../items/export-csv`, `POST|DELETE .../items/[id]/photo`, `GET|POST .../items/[id]/variants`, `GET|POST .../items/[id]/allergens`

**Members:** `GET|POST /api/venues/[id]/members`, `PATCH|DELETE /api/venues/[id]/members/[memberId]`

**Publishing:** `GET /api/venues/[id]/public-preview`, `POST .../publish`, `POST .../unpublish`, `GET .../publications`

**Assets:** `POST|DELETE /api/venues/[id]/logo`

**Sales:** `GET /api/venues/[venueId]/sales?range=7d|30d|90d&start=&end=`

**Schedules:** `GET|POST /api/venues/[id]/schedules`

**Ordering (proxy to Go service):**
`GET|POST /api/venues/[id]/orders`, `GET /api/venues/[id]/orders/[orderId]`,
`POST /api/venues/[id]/orders/[orderId]/items`,
`PATCH|DELETE /api/venues/[id]/orders/[orderId]/items/[itemId]`,
`PATCH /api/venues/[id]/orders/[orderId]/items/[itemId]/status`,
`POST /api/venues/[id]/orders/[orderId]/send`,
`POST /api/venues/[id]/orders/[orderId]/complete`,
`POST /api/venues/[id]/orders/release-table/[tableNumber]`

**Tables:** `GET|POST /api/venues/[id]/tables`, `PUT|DELETE /api/venues/[id]/tables/[tableId]`

### Go Ordering Service (port 8080)

**Endpoints:**

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check (DB ping) |
| `GET` | `/metrics` | Prometheus metrics |
| `POST` | `/api/orders` | Create order |
| `GET` | `/api/orders` | List orders (venue-scoped, `?status=` filter) |
| `GET` | `/api/orders/:id` | Get order with items |
| `POST` | `/api/orders/:id/items` | Add item to order |
| `PATCH` | `/api/orders/:id/items/:itemId` | Update item quantity/notes |
| `DELETE` | `/api/orders/:id/items/:itemId` | Cancel item |
| `PATCH` | `/api/orders/:id/items/:itemId/status` | Update item preparation status |
| `POST` | `/api/orders/:id/send` | Send order to kitchen |
| `POST` | `/api/orders/:id/complete` | Complete order (payment finalized) |
| `POST` | `/api/orders/release-table/:tableNumber` | Release table (broadcasts `table_released`) |
| `GET` | `/api/admin/orders` | Admin list all orders (OWNER/MANAGER) |
| `GET` | `/api/admin/analytics/daily-summary` | Daily analytics (OWNER/MANAGER) |
| `GET` | `/ws` | WebSocket (venue-scoped real-time updates) |

**WebSocket Events:**

| Event | Direction | Payload |
| --- | --- | --- |
| `order_created` | Server → Client | `{ orderId, venueId, waiterName, tableNumber, guestCount }` |
| `item_added` | Server → Client | `{ orderId, itemId, menuItemName, quantity, unitPrice, station }` |
| `item_updated` | Server → Client | `{ orderId, itemId, quantity, notes }` |
| `item_status_changed` | Server → Client | `{ orderId, itemId, status, timestamp }` |
| `order_status_changed` | Server → Client | `{ orderId, status, sentToKitchenAt }` |
| `item_cancelled` | Server → Client | `{ orderId, itemId, cancelledAt }` |
| `order_completed` | Server → Client | `{ orderId, venueId, tableNumber }` |
| `table_released` | Server → Client | `{ tableNumber, venueId }` |
| `menu_item_unavailable` | Server → Client | _(reserved)_ |

**Middleware:**
- Auth: `mofe_session` cookie (shared with Next.js). Multi-venue users must send `X-Venue-ID` header.
- Rate limiting: per-user token bucket (100 req/s, burst 200), returns 429 with `Retry-After`
- Metrics: Prometheus counters/histograms/gauges on all requests
- Migrations: automated via golang-migrate at startup (`file://migrations`)
- Observability: structured JSON logging (slog), request ID + Real IP, panic recovery

## Features

### Menu Management
- CRUD for categories (Persian names, drag-and-drop reorder, active toggle, soft-delete)
- CRUD for items (nameFa, nameEn, priceToman, description, station, calories)
- Search by name (Persian/English), filter by category/station/visibility/sold-out
- Inline visibility and sold-out toggles
- Bulk visibility toggle (by IDs or station)
- CSV import with smart header detection (papaparse) and batch creation
- CSV export via API endpoint
- Drag-and-drop reorder for categories and items (two separate `DndContext`s)
- **Variants/sizes:** multiple price modifiers per item, displayed as pill badges on public menu
- **Allergen badges:** visual chip toggles per item, displayed on public menu

### Internal Admin Tool (`/internal`)
- Accessible only to users with `role === "internal"` (mofé team)
- User management: list all users, create new accounts (name, email, password, role)
- Venue management: list all venues, create new venues with owner assignment
- Account creation is done by the mofé team when cafe owners contact through the landing page

### QR Menu Editor
- Appearance settings (venue name, welcome message, accent color)
- Live mobile preview from draft data (fetched via `/api/venues/[id]/public-preview`)
- Publish/unpublish with confirmation modals
- Publication history table (last 50 entries with Persian dates)
- Unpublished changes indicator (compares max `updatedAt` across venue + categories + items)
- QR export: PNG canvas download (ink-on-paper) + PDF print page

### Static Public Menu (`/m/{slug}`)
- Pre-generated RTL mobile-first HTML from publication snapshot (~10KB)
- Sold-out items visible with "ناموجود" badge and subdued opacity
- Hidden items and inactive categories omitted
- Sticky category navigation pills with IntersectionObserver auto-highlight
- Unpublished venues show "منو در حال حاضر در دسترس نیست." unavailable page
- Prices formatted with Persian numerals (`toLocaleString("fa-IR")`)
- **Variant pills:** display size/variant options with price modifiers
- **Allergen badges:** allergen labels displayed as subtle pills
- Photo theme: when `menuPhotoMode` is enabled, items with photos display a vertical card with top image
- Print styles, compact layout for <380px screens
- No client JS or API calls — pure static HTML response

### Auth & Permissions
- 3 roles: owner, manager, staff
- Role-based enforcement on all API routes via `requireRole()` / `canManage*()` helpers
- Multi-venue support with membership verification (tested cross-venue isolation)
- DB-backed rate limiting on login and password reset (5 attempts/minute window)
- Session-based auth: SHA-256 token hash, 7-day TTL, HTTP-only cookie (`sameSite: lax`), revocable

### Venue Management
- Settings: name (Fa/En), timezone, public status
- Logo upload (auto-resized to 500px, compressed to WebP ≤50KB via sharp)
- Member management: add/remove members with role assignment
- Member login via `username@venue.slug` email scheme
- **Station schedules:** configure operating hours per day for kitchen and bar
- **Photo display toggle:** enable/disable item photos on published public menu

### Audit Logging
- All mutations (categories, items, members, publish/unpublish) logged to `AuditLog` table
- Records actor, action, entity type/id, and metadata per operation

### Password Reset
- Self-service password reset flow: request + confirm endpoints
- Rate-limited token generation with 1-hour expiry
- Invalidates all existing sessions on password change
- Email delivery via configurable SMTP (nodemailer); logs to console when unconfigured

### CSV Import
- Smart column header detection (supports multiple naming conventions)
- Parsed via `papaparse` (reliable edge-case handling)
- Auto-creates categories from data rows
- Batch item creation with validation
- Detailed import report (created/skipped/errors per row)
- See `sample-csv.csv` for template

### Deployment
- Docker multi-stage build (standalone Next.js output)
- nginx reverse-proxy config with 3 virtual hosts
- See `docker-compose.yml`, `Dockerfile`, `nginx.conf`

## Design Language

Paper-and-ink system. All fonts self-hosted — zero external font/CDN calls.

| Token | Value | Usage |
| --- | --- | --- |
| paper | `#f5f0e6` | Background |
| ink | `#111111` | Primary text |
| ink-strong | `#000000` | Headings |
| ink-muted | `#5f5a52` | Secondary text |
| line | `#d8d1c4` | Borders |
| surface | `rgba(255,255,255,0.28)` | Light fills |

**Body font:** `"Parastoo", "Vazirmatn", "Tahoma", sans-serif`
**Heading font:** `"EB Garamond", "Parastoo", "Vazirmatn", "Times New Roman", serif`

Full design system in [`DESIGN-LANGUAGE.md`](./DESIGN-LANGUAGE.md).

## Testing

374 tests across 17 files with real PostgreSQL test DB (371 pass, 3 pre-existing billing/zarinpal failures):

```
src/__tests__/api/integration.test.ts              —  75 tests (auth, CRUD, reorder, bulk visibility, publish workflow,
│                                                       permissions, CSV import, publication edge cases,
│                                                       cross-venue isolation, table CRUD, table status validation,
│                                                       sales aggregation)
src/__tests__/api/sales.test.ts                    —  19 tests (sales auth, aggregation, isolation, response format)
src/__tests__/api/concurrent.test.ts               —  12 tests (concurrent request handling, race detection)
src/__tests__/api/menu-slug.test.ts                —   8 tests (slug generation, uniqueness)
src/__tests__/lib/public-menu/renderer.test.ts     —  48 tests (HTML structure, Persian formatting, escaping, edge cases)
src/__tests__/lib/public-menu/publication.test.ts  —  14 tests (snapshot building, publish/unpublish workflow)
src/__tests__/lib/auth.test.ts                     —   8 tests (hashToken, generateToken, hashPassword, verifyPassword)
src/__tests__/lib/api-helpers.test.ts              —  12 tests (ApiError, errorResponse, requireAuth)
src/__tests__/lib/config.test.ts                   —   8 tests (getPublicMenuUrl)
src/__tests__/lib/rate-limit.test.ts               —   8 tests (rateLimit helper — DB-backed)
src/__tests__/lib/ordering-proxy.test.ts           —  12 tests (proxy forwarding, release-table, error handling)
src/__tests__/lib/offline-queue.test.ts            --   6 tests (queue add/remove/replay)
src/__tests__/components/SalesClient.test.ts       --  10 tests (toPersianDate, formatCurrency helpers)
src/__tests__/proxy/proxy.test.ts                  --   9 tests (subdomain routing, auth guards, localhost bypass)
```

Run: `npm test` (pushes schema to test database, runs tests).

## Documentation

| Document | Purpose |
| --- | --- |
| [`NAVIGATION-GUIDE.md`](./NAVIGATION-GUIDE.md) | Project orientation: directory layout, conventions, architecture, dev tasks |
| [`DESIGN-LANGUAGE.md`](./DESIGN-LANGUAGE.md) | Full design system specification (503 lines) |
| [`PRD.md`](./PRD.md) | Product requirements, built vs. future features |
| [`AGENTS.md`](./AGENTS.md) | AI-assisted development instructions |
| [`SALES_DASHBOARD.md`](./SALES_DASHBOARD.md) | Sales dashboard development plan |

## Project Structure

```
mofe-menu/
├── prisma/                     # Schema, migrations, seed
│   ├── schema.prisma           # 20 models (18 Prisma-managed + 2 Go-managed @@ignore):
│   │                           #   User, Venue, VenueMember, Category, MenuItem,
│   │                           #   Asset, MenuPublication, Domain, StationSchedule,
│   │                           #   MenuItemVariant, MenuItemPrice, MenuItemAllergen,
│   │                           #   VenueTable, Sale, AuditLog, PasswordResetToken,
│   │                           #   RateLimitEntry, Session
│   └── seed.ts                 # Demo data seeder
├── public/
│   ├── fonts/                  # Self-hosted fonts (5 files)
│   └── uploads/                # Venue logo + item photo uploads
├── scripts/
│   ├── download-menus.ts       # CLI tool: export published menus as HTML
│   ├── import-csv.ts           # CLI tool: import items from CSV file
│   └── seed-sales.ts           # Seed 60 days of synthetic sales data
├── src/
│   ├── __tests__/              # Vitest test suite (17 files, 374 tests)
│   │   ├── api/                # Integration tests (114)
│   │   ├── lib/                # Unit tests (auth, renderer, publication, rate-limit, config, api-helpers, ordering-proxy, offline-queue)
│   │   ├── components/         # Component helper tests (SalesClient)
│   │   ├── proxy/              # Proxy routing tests (9)
│   │   ├── helpers.ts          # Test data helpers
│   │   ├── setup.ts            # Per-file setup
│   │   └── global-setup.ts     # DB creation/teardown
│   ├── app/
│   │   ├── admin/
│   │   │   ├── [venueId]/      # Admin pages (5 sections)
│   │   │   │   ├── menu/       # Menu management
│   │   │   │   ├── qr-menu/    # QR/publish editor
│   │   │   │   ├── publications/ # Publication history
│   │   │   │   ├── settings/   # Venue settings + members
│   │   │   │   ├── sales/      # Sales dashboard with revenue chart (Shamsi dates)
│   │   │   │   └── orders/     # Order management (admin order view + table management)
│   │   │   └── venues/new/     # (reserved)
│   │   ├── _components/         # Landing page registration form
│   │   ├── admin/
│   │   │   ├── [venueId]/
│   │   │   │   ├── menu/       # Menu management
│   │   │   │   ├── qr-menu/    # QR/publish editor
│   │   │   │   ├── publications/ # Publication history
│   │   │   │   ├── settings/   # Venue settings + members
│   │   │   │   └── orders/     # Order management (admin)
│   │   │   └── venues/new/     # (reserved)
│   │   ├── api/                # REST API routes (40+ endpoints)
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── auth/           # signup, login, logout, password-reset
│   │   │   ├── me/             # Current user
│   │   │   ├── internal/       # Internal mofé team endpoints
│   │   │   └── venues/[venueId]/
│   │   │       ├── categories/ # CRUD + reorder
│   │   │       ├── items/      # CRUD + reorder + bulk-visibility + import/export CSV + photo + variants + allergens
│   │   │       ├── members/    # List + create/delete members
│   │   │       ├── publications/ # List publications
│   │   │       ├── publish/    # Publish venue menu
│   │   │       ├── unpublish/  # Unpublish venue menu
│   │   │       ├── public-preview/ # Draft data for live preview
│   │   │       ├── logo/       # Upload/delete venue logo
│   │   │       ├── schedules/  # Station schedules CRUD
│   │   │       ├── sales/      # Sales aggregation API
│   │   │       ├── orders/     # Order proxy routes (list, create, get, items, send, complete, release-table)
│   │   │       └── tables/     # Table CRUD
│   │   ├── staff/
│   │   │   └── [venueId]/
│   │   │       └── orders/     # Staff ordering page (server + OrdersClient)
│   │   ├── login/              # Login page
│   │   ├── password-reset/     # Password reset flow (request + confirm pages)
│   │   ├── m/[slug]/           # Public menu route
│   │   ├── venues/             # Venue picker
│   │   ├── globals.css         # Tailwind v4 @theme + font-face + design tokens
│   │   ├── layout.tsx          # Root RTL layout
│   │   └── page.tsx            # Landing page
│   ├── components/ui/          # 9 reusable UI components
│   │   ├── Badge.tsx           # Pills: default, soldOut, muted (via variant prop)
│   │   ├── Button.tsx          # forwardRef, 4 variants, 3 sizes
│   │   ├── Icons.tsx           # SVG icon components (GripIcon, EditIcon, DeleteIcon)
│   │   ├── Input.tsx           # Label + error + helperText
│   │   ├── Modal.tsx           # Overlay + Escape + body scroll lock
│   │   ├── Panel.tsx           # Section container
│   │   ├── QRCodeExport.tsx    # QR generation, PNG download, PDF print
│   │   ├── TimePicker.tsx      # Time selection input
│   │   └── Toggle.tsx          # role="switch" pill
│   ├── components/orders/      # 3 ordering components
│   │   ├── TableGrid.tsx       # Interactive table grid
│   │   ├── OrderPanel.tsx      # Order detail + item actions
│   │   └── MenuItemBrowser.tsx # Modal item browser for adding to order
│   ├── generated/prisma/       # Prisma client (auto-generated, custom output)
│   ├── hooks/
│   │   ├── useStatusMessage.ts  # Shared hook: set message + auto-dismiss + router.refresh()
│   │   └── useOrderWebSocket.ts # WebSocket hook for real-time order updates
│   ├── lib/
│   │   ├── public-menu/        # HTML renderer + publication logic
│   │   ├── allergens.ts        # Allergen code constants and Persian labels
│   │   ├── api-helpers.ts      # requireAuth(), errorResponse() — reduce route boilerplate
│   │   ├── audit.ts            # Audit log helper
│   │   ├── auth.ts             # Session management + password reset tokens
│   │   ├── config.ts           # Domain configuration
│   │   ├── constants.ts        # TIMEZONE_LABELS, ROLE_LABELS, STATION_LABELS, STATUS_LABELS, DAY_LABELS
│   │   ├── demo.ts             # Demo data helpers
│   │   ├── fetch-api.ts        # fetchApi() — typed fetch wrapper with error handling
│   │   ├── format.ts           # formatPrice() — Persian numeral formatting
│   │   ├── mailer.ts           # Email delivery via SMTP (nodemailer)
│   │   ├── ordering-proxy.ts   # Proxy helper: forward requests to Go ordering service
│   │   ├── permissions.ts      # Role-based access (owner/manager/staff)
│   │   ├── prisma.ts           # Prisma singleton (PrismaPg adapter)
│   │   ├── tables.ts           # Table status management helpers
│   │   ├── rate-limit.ts       # DB-backed rate limiter (RateLimitEntry model)
│   │   └── storage.ts          # File storage abstraction (local/S3-compatible)
│   └── proxy.ts                # Auth proxy (export: proxy, not middleware)
├── ordering-service/            # Go ordering service
│   ├── cmd/server/main.go      # Entry point (router, middleware, migrations, graceful shutdown)
│   ├── internal/
│   │   ├── config/             # env-based config (DB, port, Redis)
│   │   ├── database/           # pgx pool setup
│   │   ├── models/             # domain types (Order, Session, ErrorResponse)
│   │   ├── middleware/         # auth, cors, logging, recovery, metrics, ratelimit
│   │   ├── handlers/
│   │   │   ├── orders.go      # REST endpoints: CRUD order/items, send/complete/release-table
│   │   │   ├── orders_test.go # Integration tests (37+ tests)
│   │   │   ├── ws.go          # WebSocket Hub with venue-scoped broadcast
│   │   │   ├── redis.go       # Redis pub/sub for horizontal WS scaling (optional)
│   │   │   ├── analytics.go   # Daily summary analytics endpoint
│   │   │   ├── analytics_test.go # Analytics integration tests
│   │   │   └── health.go      # GET /health endpoint
│   ├── migrations/             # SQL migrations (golang-migrate)
│   ├── scripts/                # Seed test data
│   ├── go.mod / go.sum
│   └── Dockerfile              # Multi-stage (golang:1.23-alpine → scratch)
├── AGENTS.md                   # AI development instructions
├── DESIGN-LANGUAGE.md           # Design system
├── NAVIGATION-GUIDE.md          # Project navigation guide
├── PRD.md                      # Product requirements
├── sample-csv.csv              # CSV import template (66 items)
├── docker-compose.yml          # App + nginx + ordering-service + redis
├── Dockerfile                  # Multi-stage build
├── nginx.conf                  # 3 virtual hosts
├── eslint.config.mjs           # ESLint (Next.js config)
├── next.config.ts              # Security headers, standalone output
├── postcss.config.mjs          # @tailwindcss/postcss
├── prisma.config.ts            # Prisma config (auto-generated)
├── tsconfig.json               # Path alias @/ -> src/
└── vitest.config.ts            # Vitest config
```

## Ordering Service (Go)

- **Auth:** Reuses the existing `mofe_session` cookie — SHA-256 hashed, matched against `"Session"` table. No separate auth system.
- **Venue isolation:** Service infers `venueId` from the session. Multi-venue users must send `X-Venue-ID` header.
- **Prices:** All price columns use `INT` (toman) to match Prisma's `MenuItem.priceToman`. No decimal types.
- **Migrations:** Automated via golang-migrate at startup (`file://migrations`). Tables reference Prisma's `"Venue"` and `"User"` with quoted camelCase identifiers.
- **WebSocket:** Venue-scoped hub broadcasts real-time order/item status changes. Optional Redis pub/sub for horizontal scaling across multiple instances.
- **WebSocket broadcasts:** All mutation handlers (`CreateOrder`, `AddItem`, `UpdateItem`, `CancelItem`, `SendToKitchen`) broadcast typed events to venue clients.
- **Prometheus metrics:** `/metrics` endpoint with request counters, duration histograms, active requests gauge, business counters (orders created, items ordered), DB query duration.
- **Rate limiting:** Per-user token bucket (100 req/s, burst 200) via `golang.org/x/time/rate`. Falls back to `RemoteAddr` for unauthenticated requests.
- **Analytics:** `GET /api/admin/analytics/daily-summary` returns daily order/revenue stats with top 10 items. Date query param, role-gated (OWNER/MANAGER).
- **Configuration:** `DATABASE_URL`, `PORT` (default 8080), `SESSION_COOKIE_NAME` (default `mofe_session`), `REDIS_URL` (optional, for WS horizontal scaling).

## Important Notes

- **Proxy export:** `src/proxy.ts` exports `proxy` (not `middleware`) — Next.js 16.2.9 convention
- **Route params:** `params` is `Promise<{...}>` — must `await` per Next.js 16
- **Route auth:** Use `requireAuth()` from `lib/api-helpers` instead of inline `getCurrentUser()` + 401 check
- **Prisma client:** Generated at `src/generated/prisma` (custom output path)
- **Fonts:** All self-hosted at `/fonts/`, no Google Fonts or external CDN — 5 files; `@font-face` declarations live in a shared `FONT_FACE_DECLARATIONS` constant in `renderer.ts`
- **Tailwind v4:** No config file — CSS-based via `@theme inline {}` in `globals.css`
- **Query engine:** `library` mode (no binary dependencies)
- **Database adapter:** `@prisma/adapter-pg` wraps `pg` connection pool
- **Rate limiting:** DB-backed via `RateLimitEntry` model — survives restarts
- **Email:** Configurable SMTP via `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` env vars; logs to console when unconfigured
- **Storage:** Local filesystem by default; set `S3_*` env vars to use S3-compatible object storage
- **CSV import:** Formula injection sanitized — cells starting with `=`, `+`, `-`, `@`, `\t` are prefixed with `'`
- **CSV export:** Formula injection sanitized — cells starting with `=`, `+`, `-`, `@`, `\t` are prefixed with `'`
- **Boot guard:** Production startup warns if `admin@mofe.ir` still uses default password
- **Design tokens:** CSS vars `--paper`, `--ink`, `--ink-strong`, `--ink-muted`, `--line`, `--surface`
- **Radii:** Panel 28px, Card 24px, Control 16px (CSS vars)
