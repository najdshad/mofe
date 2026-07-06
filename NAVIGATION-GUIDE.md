# mofé Navigation Guide

An orientation for developers working on this project. Covers directory layout, conventions, key patterns, and how the pieces connect.

## Quick Links

| Document | Purpose |
| --- | --- |
| `README.md` | Quick start, routes, features, design tokens |
| `PRD.md` | Product requirements, built vs. future features |
| `DESIGN-LANGUAGE.md` | Full design system specification |
| `AGENTS.md` | Agentic development instructions (for AI coding tools) |

---

## Directory Structure

```
mofe-menu/
├── prisma/
│   ├── schema.prisma      # 17 models (User, Venue, VenueMember, Category, MenuItem,
│   │                      #   Asset, MenuPublication, Domain, AuditLog, Session,
│   │                      #   PasswordResetToken, StationSchedule, MenuItemVariant,
│   │                      #   MenuItemAllergen, RateLimitEntry, VenueTable, MenuItemPhoto)
│   ├── migrations/         # Prisma migration history
│   └── seed.ts            # Demo data seeder (uses src/lib/demo.ts helpers)
├── public/
│   └── fonts/             # 5 self-hosted font files (Parastoo, Vazirmatn, EB Garamond)
├── scripts/
│   └── download-menus.ts  # CLI tool to export published menus as HTML files
├── src/
│   ├── __tests__/
│   │   ├── api/            # Integration tests (72 tests — auth, CRUD, publish, permissions, table CRUD, table status)
│   │   ├── lib/            # Unit tests — auth (8) + renderer (48) + rate-limit (8) + ordering-proxy (12)
│   │   ├── proxy/          # Proxy routing tests (9 tests)
│   │   ├── global-setup.ts # Creates test DB before all tests, cleans up after
│   │   ├── setup.ts        # Per-file setup (NODE_ENV=test)
│   │   └── helpers.ts      # cleanTestData() + seedTestData()
│   ├── app/
│   │   ├── admin/
│   │   │   ├── [venueId]/
│   │   │   │   ├── layout.tsx     # Admin shell (header, nav, auth check)
│   │   │   │   ├── menu/          # Menu management (Server + MenuClient)
│   │   │   │   ├── qr-menu/      # QR/publish editor (Server + QRMenuClient)
│   │   │   │   ├── publications/  # Publication history (Server + PublicationsClient)
│   │   │   │   ├── settings/      # Venue settings + member management (Server + SettingsClient)
│   │   │   │   └── orders/       # Admin order management (Server + AdminOrdersClient)
│   │   │   └── venues/
│   │   │       └── new/           # (empty, reserved for venue creation)
│   │   ├── internal/              # Internal mofé team tool
│   │   │   ├── layout.tsx         # Role guard (role === "internal")
│   │   │   ├── page.tsx           # Dashboard
│   │   │   ├── users/             # User management
│   │   │   └── venues/            # Venue management
│   │   ├── api/
│   │   │   ├── health/             # Health check endpoint
│   │   │   ├── auth/               # signup, login, logout, password-reset
│   │   │   ├── me/                 # current user
│   │   │   ├── internal/           # Internal API endpoints
│   │   │   │   ├── users/          # GET|POST — list/create users
│   │   │   │   └── venues/         # GET|POST — list/create venues
│   │   │   └── venues/
│   │   │       └── [venueId]/
│   │   │           ├── categories/     # CRUD + reorder
│   │   │           ├── items/          # CRUD + reorder + bulk-visibility + import/export CSV + photo + variants + allergens
│   │   │           ├── members/        # List + create/delete members
│   │   │           ├── publications/   # List publications
│   │   │           ├── publish/        # Publish venue menu
│   │   │           ├── unpublish/      # Unpublish venue menu
│   │   │           ├── public-preview/ # Draft data for live preview
│   │   │           ├── logo/           # Upload/delete venue logo
│   │   │           ├── schedules/      # Station schedules CRUD
│   │   │           ├── orders/         # Order proxy routes (list, create, get, items, send, complete, release-table)
│   │   │           └── tables/         # Table CRUD
│   │   ├── staff/
│   │   │   └── [venueId]/
│   │   │       └── orders/    # Staff ordering page (Server + OrdersClient)
│   │   ├── login/            # Login page (LoginForm client component)
│   │   ├── m/[slug]/         # Static public menu route (server-rendered HTML)
│   │   ├── venues/           # Venue picker page
│   │   ├── globals.css       # Tailwind v4 @theme + font-face declarations + tokens
│   │   ├── layout.tsx        # Root RTL layout (lang=fa, dir=rtl)
│   │   └── page.tsx          # Full landing page with hero, nav, features, how-it-works, benefits, contact form, footer
│   ├── components/ui/        # 8 reusable UI components
│   │   ├── Badge.tsx         # Inline pill (default, soldOut, muted via variant prop)
│   │   ├── Button.tsx        # forwardRef, 4 variants (primary/secondary/tertiary/destructive), 3 sizes
│   │   ├── Icons.tsx         # SVG icon components (GripIcon, EditIcon, DeleteIcon)
│   │   ├── Input.tsx         # Text input with label, error, helperText; auto-id from label
│   │   ├── Modal.tsx         # "use client" modal with overlay, Escape, body scroll lock
│   │   ├── Panel.tsx         # Section container with title/subtitle
│   │   ├── QRCodeExport.tsx  # Client-side QR generation, PNG download, PDF print
│   │   └── Toggle.tsx        # role="switch" toggle pill
│   ├── components/orders/    # 3 ordering components
│   │   ├── TableGrid.tsx     # Interactive table grid
│   │   ├── OrderPanel.tsx    # Order detail + item actions
│   │   └── MenuItemBrowser.tsx # Modal item browser for adding to order
│   ├── generated/prisma/     # Auto-generated Prisma client (custom output path)
│   ├── hooks/
│   │   ├── useStatusMessage.ts  # Shared hook: set message + auto-dismiss + router.refresh()
│   │   └── useOrderWebSocket.ts # WebSocket hook for real-time order updates
│   ├── lib/
│   │   ├── api-helpers.ts    # requireAuth(), errorResponse() — reduce route auth boilerplate
│   │   ├── auth.ts           # Session management (createSession, getCurrentUser, destroySession)
│   │   │                     #   Cookie: mofe_session, SHA-256 token hash, 7-day TTL
│   │   │                     #   Password: bcryptjs, 12 rounds
│   │   ├── config.ts         # Domain config (rootDomain, appDomain, menuDomain)
│   │   ├── constants.ts      # TIMEZONE_LABELS, ROLE_LABELS, STATION_LABELS, STATUS_LABELS, DAY_LABELS
│   │   ├── demo.ts           # Demo data helpers (ensureDemoData)
│   │   ├── fetch-api.ts      # fetchApi() — typed fetch wrapper with error handling
│   │   ├── ordering-proxy.ts # Proxy helper: forward requests to Go ordering service
│   │   ├── permissions.ts    # Role-based access (owner/manager/staff)
│   │   ├── prisma.ts         # Prisma singleton (PrismaPg adapter)
│   │   ├── public-menu/
│   │   │   ├── publication.ts   # buildPublicSnapshot, publishVenueMenu, unpublishVenueMenu
│   │   │   └── renderer.ts      # renderPublicMenu (~10KB static HTML), renderUnavailablePage
│   │   │                        #   formatPrice re-exported from @/lib/format
│   │   ├── rate-limit.ts    # DB-backed rate limiter (RateLimitEntry model), survives restarts
│   │   ├── audit.ts         # Audit log helper
│   │   ├── allergens.ts     # Allergen code constants and Persian labels
│   │   ├── mailer.ts        # Email delivery via SMTP (nodemailer)
│   │   ├── storage.ts       # File storage abstraction (local/S3-compatible)
│   │   └── format.ts        # formatPrice() — Persian numeral formatting
│   └── proxy.ts             # Next.js 16 auth proxy (export name: proxy, not middleware)
├── ordering-service/        # Go ordering service (port 8080)
│   ├── cmd/server/         # Entry point (chi router, middleware, migrations, graceful shutdown)
│   ├── internal/
│   │   ├── config/         # Env-based config (DB, port, Redis)
│   │   ├── database/       # pgx connection pool
│   │   ├── models/         # Domain types (Order, Session, ErrorResponse)
│   │   ├── middleware/     # Auth, CORS, logging, recovery, metrics, ratelimit
│   │   └── handlers/       # REST endpoints + WebSocket hub + analytics + Redis pub/sub
│   │       ├── orders.go      # CRUD order/items, send/complete/release-table
│   │       ├── orders_test.go # Integration tests (37+ pass, 6 pre-existing failures)
│   │       ├── ws.go          # WebSocket Hub with venue-scoped broadcast
│   │       ├── redis.go       # Redis pub/sub for horizontal WS scaling (optional)
│   │       ├── analytics.go   # Daily summary analytics endpoint
│   │       ├── analytics_test.go # Analytics integration tests
│   │       └── health.go      # GET /health endpoint
│   ├── migrations/         # SQL migrations (golang-migrate, quoted camelCase for Prisma compat)
│   ├── scripts/            # Seed test data
│   ├── go.mod / go.sum
│   └── Dockerfile          # Multi-stage (golang:1.23-alpine → scratch)
├── AGENTS.md               # AI-assisted development instructions
├── PRD.md                  # Product requirements
├── sample-csv.csv          # CSV import template (66 sample items)
├── docker-compose.yml      # App + ordering-service + redis + nginx services
├── Dockerfile              # Multi-stage standalone build
├── nginx.conf              # 3 virtual hosts (root, app.*, menu.*)
├── next.config.ts           # Security headers, standalone output
├── prisma.config.ts         # Prisma config (auto-generated, schema, seed, datasource)
├── tsconfig.json            # Path alias @/ -> src/
├── vitest.config.ts         # Vitest config (globalSetup, aliases)
└── package.json
```

---

## Architecture Overview

### Data Flow

```
User Browser → Next.js App Router → Server Components (data fetching)
                                     ↓
                                  Client Components (interactivity)
                                     ↓
                                  API Routes (REST)
                                     ↓
                                   Prisma ORM → PostgreSQL
```

### Ordering Service Flow (Go, port 8080)

```
Admin UI → REST API /api/orders (auth via mofe_session cookie)
                             ↓
                     chi router → rate limiter → auth middleware → metrics
                             ↓
                     OrderHandler → PostgreSQL (orders + order_items tables)
                             ↓
                     WebSocket hub → real-time broadcast to venue clients
                                    ↓ (optional)
                              Redis pub/sub → cross-instance relay
```

Middleware stack: `RequestID → RealIP → Logger → Recoverer → CORS → MetricsMiddleware → RateLimiter → AuthMiddleware (per-route)`

### Internal Tool Flow

```
Cafe owner contacts mofé → Mofé team logs in via /login
                               ↓
                          /internal/users → creates user account
                               ↓
                          /internal/venues → creates venue + assigns owner
                               ↓
                          Cafe owner logs in, manages their venue
```

### Public Menu Flow

```
Admin publishes → publication snapshot (JSON) stored in MenuPublication model
                                        ↓
                   GET /m/{slug} reads latest "published" snapshot
                                        ↓
                   renderPublicMenu(snapshot) → static HTML (~10KB)
                                        ↓
                   Response (no client JS, no API calls)
```

---

## Key Conventions

### Server/Client Component Pattern

Every admin page follows this pattern:

- **`page.tsx`** — Server component: fetches data, transforms for client, returns `<ClientComponent {...props} />`
- **`*Client.tsx`** — `"use client"` component: receives data as props, handles interactivity (forms, drag-and-drop, modals)

### Routing

- Next.js 16 App Router with `params: Promise<{ ... }>` (async `await params`)
- Auth proxy at `src/proxy.ts` — exported as `proxy` (not `middleware`), per Next.js 16.2.9 convention
- No `layout.tsx` extensions beyond root and admin

### Auth

- `mofe_session` HTTP-only cookie
- 32-byte random token → SHA-256 hash stored in DB
- 7-day TTL, revocable
- Password hashing: bcryptjs, 12 rounds
- In-memory rate limiter on login (5 attempts/min)
- Route handler auth: `requireAuth()` from `@/lib/api-helpers` — all API routes use this pattern
- Error handling: wrap handlers in try/catch with `errorResponse(e)` for consistent JSON errors

### Internal Role

- `User.role === "internal"` — mofé team members (NOT venue members)
- `requireInternalAuth()` in API routes
- `/internal` layout checks `role === "internal"` and redirects otherwise
- Seed user: `admin@mofe.ir` / `admin1234`

### Venue Permissions

3 roles: `owner > manager > staff`
- `owner` — full access (admin + orders)
- `manager` — CRUD categories/items, publish/unpublish, orders
- `staff` — only toggle visibility and sold-out, orders (via `/staff/` route, any role)

Enforced via `requireRole(userId, venueId, allowedRoles)` or `canManageCategories()`, `canManageItems()`, `canPublish()` helpers.

### Styling

- Tailwind CSS v4 (CSS-based config via `@theme inline {}` in `globals.css`)
- Design tokens as CSS variables: `--paper`, `--ink`, `--ink-strong`, `--ink-muted`, `--line`, `--surface`
- Custom CSS variables for radii: `--radius-panel`, `--radius-card`, `--radius-control`
- All fonts self-hosted (zero external CDN calls)
- Body: `"Parastoo", "Vazirmatn", "Tahoma", sans-serif`
- Headings (`.font-serif`): `"EB Garamond", "Parastoo", "Vazirmatn", "Times New Roman", serif`

### Database

- PostgreSQL via `@prisma/adapter-pg` with `pg` connection pool
- Generated client at `src/generated/prisma` (custom output)
- UUID primary keys, soft-delete on `Category` and `MenuItem` (`deletedAt`)
- Money stored as integer Toman

### Testing

- Vitest v4 with `singleFork` pool
- `global-setup.ts` pushes schema to PostgreSQL test DB via `prisma db push`
- `helpers.ts` provides `cleanTestData()` + `seedTestData()`
- Run: `npm test` (vitest run), `npm run test:watch`

### Public Menu Renderer

- `renderPublicMenu(snapshot)` produces pure static HTML with:
  - Inline critical CSS, self-hosted font-face declarations
  - RTL, mobile-first, max-width 510px
  - Sticky category navigation pills with IntersectionObserver
  - Sold-out items rendered with "ناموجود" badge, visible but subdued
  - Price formatted with Persian numerals (`toLocaleString("fa-IR")`)
  - Print styles, compact layout for <380px screens
  - ~10KB uncompressed

---

## Common Development Tasks

### Adding an internal page
1. Create directory under `src/app/internal/`
2. Create `page.tsx` (server component, fetches data, checks `user.role === "internal"`)
3. Create `*Client.tsx` (client component, receives props) if interactivity is needed
4. Nav links are in `src/app/internal/layout.tsx`

### Adding an internal API endpoint
1. Create route file in `src/app/api/internal/`
2. Use `requireInternalAuth()` from `@/lib/api-helpers` for auth
3. Wrap in try/catch with `errorResponse(e)`

### Adding a new admin page
1. Create directory under `src/app/admin/[venueId]/`
2. Create `page.tsx` (server component, fetches data)
3. Create `*Client.tsx` (client component, receives props)
4. Add nav link in `src/app/admin/[venueId]/layout.tsx`
5. Add API endpoints as needed

### Adding a new API endpoint
1. Create route file in `src/app/api/venues/[venueId]/`
2. Use `requireAuth()` from `lib/api-helpers` and `requireVenueAccess()` / `requireRole()` for auth
3. Wrap in try/catch with `errorResponse(e)` for consistent error formatting
4. Return `NextResponse.json(...)` with appropriate status

### Adding a migration
```bash
npm run db:migrate
# or manually:
npx prisma migrate dev --name describe_change
```

### Running tests
```bash
npm test                # Run all 177 tests
npm run test:watch      # Watch mode
```

### Full validation before commit
```bash
npm run build
npm run typecheck
npm test
npm run lint
```

### Exporting all published menus as static HTML
```bash
npm run download:menus
```
Output goes to `downloads/` directory.

---

## Environment Variables

See `.env.example`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://mofe:mofe@localhost:5432/mofe` | PostgreSQL connection |
| `NODE_ENV` | `development` | Environment |
| `ROOT_DOMAIN` | `mofe.ir` | Root domain (production) |
| `APP_DOMAIN` | `app.mofe.ir` | Admin app subdomain |
| `MENU_DOMAIN` | `menu.mofe.ir` | Public menu subdomain |

---

## Deployment

Production uses Docker:

```bash
docker compose up -d
```

- App runs as standalone Next.js on port 3000
- Ordering service runs on port 8080 (Go, chi v5)
- nginx reverse-proxies 3 virtual hosts: `mofe.ir` (landing), `app.mofe.ir` (admin), `menu.mofe.ir` (public menus)
- WebSocket endpoint `/ws` upgraded via nginx with 24h proxy timeout
- Prometheus metrics at `/metrics` on the ordering service
- Rate limiting (100 req/s per user) applied globally
- Automated migrations via golang-migrate at startup
- Persistent volumes: `mofe-db` (PostgreSQL data), `mofe-uploads` (logo images)
- Optional Redis 7 for WebSocket horizontal scaling across multiple instances

---

## Future Architecture Considerations

- **Custom domains**: Domain model exists in schema; subdomain + CNAME flows not yet built
- **CDN upload**: Static menu HTML could be uploaded to CDN instead of rendered from DB
- **PostgreSQL**: Migrated — uses `@prisma/adapter-pg` via `pg` connection pool
