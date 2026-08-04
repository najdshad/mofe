# mofé Navigation Guide

An orientation for developers working on this project. Covers directory layout, conventions, key patterns, and how the pieces connect.

## Quick Links

| Document | Purpose |
| --- | --- |
| `README.md` | Quick start, features, demo credentials, tech stack, design |
| `DESIGN-LANGUAGE.md` | Full design system specification |
| `AGENTS.md` | Agentic development instructions (for AI coding tools) |

---

## Directory Structure

```
mofe-menu/
├── prisma/
│   ├── schema.prisma      # 14 Prisma-managed models:
│   │                      #   User, Venue, VenueMember, Category, MenuItem, Asset,
│   │                      #   MenuPublication, MenuItemVariant, MenuItemPrice,
│   │                      #   MenuItemAllergen, AuditLog, PasswordResetToken,
│   │                      #   RateLimitEntry, Session
│   ├── migrations/         # Only migration_lock.toml — schema is managed via `db push`
│   └── seed.ts            # Demo data seeder (uses src/lib/demo.ts helpers)
├── public/
│   ├── fonts/             # 5 self-hosted font files (Parastoo×2 woff2, Vazirmatn, EB Garamond×2)
│   └── uploads/           # Local file storage for logos/photos (mofe-uploads volume)
├── scripts/
│   ├── download-menus.ts  # CLI tool to export published menus as HTML files → downloads/
│   ├── import-csv.ts      # CLI tool to import items from CSV
│   └── deploy.sh          # One-time prod deploy script (ArvanCloud VM, Ubuntu 24.04)
├── proposals/             # Design proposals (landing-page.md, product-catalogue.md)
├── src/
│   ├── __tests__/           # 15 files, 257 tests
│   │   ├── api/            # Integration tests (auth, categories, concurrent, integration, items, menu-slug, photo)
│   │   ├── lib/            # Unit tests — api-helpers, auth, config, csrf, rate-limit + public-menu (publication, renderer)
│   │   ├── proxy/          # Proxy routing tests (9 tests)
│   │   ├── global-setup.ts # Creates test DB before all tests, cleans up after
│   │   ├── setup.ts        # Per-file setup (NODE_ENV=test)
│   │   └── helpers.ts      # cleanTestData() + seedTestData()
│   ├── app/
│   │   ├── _components/RegistrationForm.tsx # Shared signup form (used by /signup)
│   │   ├── admin/
│   │   │   └── [venueId]/
│   │   │       ├── layout.tsx     # Admin shell (header, venue name, QR button, logout)
│   │   │       ├── NavClient.tsx  # "use client" nav tabs (menu, settings)
│   │   │       ├── QRIconButton.tsx # Header QR/download button
│   │   │       ├── error.tsx / loading.tsx / not-found.tsx
│   │   │       ├── menu/          # Menu management + QR/publish editor (Server + MenuClient)
│   │   │       ├── publications/  # Publication history (Server + PublicationsClient)
│   │   │       └── settings/      # Venue settings + members (SettingsClient, VenueInfoSection, MembersSection)
│   │   ├── api/
│   │   │   ├── health/             # Health check endpoint
│   │   │   ├── auth/               # signup, login, logout, password-reset/{request,confirm}
│   │   │   ├── me/                 # current user + accessible venues
│   │   │   └── venues/
│   │   │       ├── route.ts            # List accessible venues
│   │   │       └── [venueId]/
│   │   │           ├── route.ts            # Get venue / update settings (PATCH)
│   │   │           ├── categories/         # CRUD + reorder (route.ts, [categoryId]/route.ts, reorder/route.ts)
│   │   │           ├── items/              # 11 route files (see below)
│   │   │           ├── members/            # List + create/delete members (owner/manager)
│   │   │           ├── publications/       # List publications (last 5)
│   │   │           ├── publish/            # Publish venue menu (owner/manager)
│   │   │           ├── unpublish/          # Unpublish venue menu (owner/manager)
│   │   │           ├── public-preview/     # Draft snapshot data for live preview
│   │   │           └── logo/               # Upload/delete venue logo (Sharp-compressed)
│   │   ├── catalogue/        # Public product-catalogue marketing page (lucide icons)
│   │   ├── login/            # Login page (LoginForm client component)
│   │   ├── signup/           # Self-registration page (RegistrationForm)
│   │   ├── password-reset/   # Reset request page + [token]/ page
│   │   ├── m/[slug]/route.ts # Public menu route: latest published snapshot → static HTML
│   │   ├── venues/           # Venue picker page
│   │   ├── error.tsx / loading.tsx / not-found.tsx / favicon.ico
│   │   ├── globals.css       # Tailwind v4 @theme inline + font-face declarations + tokens
│   │   ├── layout.tsx        # Root RTL layout (lang=fa, dir=rtl)
│   │   └── page.tsx          # Landing page (hero, nav, features, how-it-works, benefits, contact, footer)
│   ├── components/ui/        # 8 reusable UI components
│   │   ├── Badge.tsx         # Inline pill; variants: default / muted / soldOut / hidden
│   │   ├── Button.tsx        # forwardRef, variants (primary/secondary/tertiary/destructive/none), 3 sizes
│   │   ├── Icons.tsx         # SVG icon components (GripIcon, EditIcon, DeleteIcon)
│   │   ├── Input.tsx         # Text input with label, error, helperText; auto-id from useId
│   │   ├── Modal.tsx         # "use client" modal with overlay, Escape, body scroll lock
│   │   ├── Panel.tsx         # Section container with title/subtitle
│   │   ├── QRCodeExport.tsx  # Client-side QR generation, PNG download, print window
│   │   └── Toggle.tsx        # role="switch" toggle pill
│   ├── generated/prisma/     # Auto-generated Prisma client (custom output path)
│   ├── hooks/
│   │   └── useStatusMessage.ts  # statusMessage + showStatus; auto-dismiss after 3s
│   ├── lib/
│   │   ├── api-helpers.ts    # requireAuth(), errorResponse(), ApiError — reduce route auth boilerplate
│   │   ├── auth.ts           # Session management (createSession, getCurrentUser, destroySession)
│   │   │                     #   Cookie: mofe_session, SHA-256 token hash, 7-day TTL,
│   │   │                     #   max 10 sessions, 30-min idle timeout, revocable
│   │   │                     #   Password: bcryptjs, 12 rounds; reset tokens (1h TTL)
│   │   ├── config.ts         # Domain config (rootDomain, appDomain, menuDomain) + getPublicMenuUrl()
│   │   ├── constants.ts      # TIMEZONE_LABELS, ROLE_LABELS, VALID_STATIONS, Station type
│   │   ├── csrf.ts           # CSRF tokens (64-hex), cookie mofe_csrf + header X-CSRF-Token, validateCsrf()
│   │   ├── compress-image.ts # Sharp → WebP ≤50KB, max 500px, binary search + dimension fallback
│   │   ├── demo.ts           # Demo data helpers (ensureDemoData; admin@noghteh / demo1234)
│   │   ├── fetch-api.ts      # fetchApi() + FetchError — typed fetch wrapper with error handling
│   │   ├── permissions.ts    # Role-based access (owner/manager): requireVenueAccess, requireRole, canManage
│   │   ├── prisma.ts         # Prisma singleton (PrismaPg adapter, pg Pool, max 20 connections)
│   │   ├── public-menu/
│   │   │   ├── publication.ts   # buildPublicSnapshot, publishVenueMenu, unpublishVenueMenu
│   │   │   │                    #   publish also renders HTML → storage (S3 or local), trims to last 5
│   │   │   └── renderer.ts      # renderPublicMenu() static HTML, renderUnavailablePage
│   │   │                        #   formatPrice re-exported from @/lib/format
│   │   ├── menu-cache.ts    # In-memory public menu cache (60s TTL), clearMenuCache(slug)
│   │   ├── rate-limit.ts    # DB-backed rate limiter (RateLimitEntry model), survives restarts
│   │   ├── audit.ts         # logAudit() — fire-and-forget AuditLog writes
│   │   ├── allergens.ts     # ALLERGEN_LABELS / ALLERGEN_CODES (14 allergens, Persian labels)
│   │   ├── mailer.ts        # Email delivery via SMTP (nodemailer); no-op log when unconfigured
│   │   ├── storage.ts       # File storage abstraction: local public/uploads + optional S3-compatible
│   │   └── format.ts        # formatPrice() — Persian numeral formatting (fa-IR)
│   └── proxy.ts             # Next.js 16 auth proxy (export name: proxy, not middleware)
├── AGENTS.md               # AI-assisted development instructions
├── sample-csv.csv          # CSV import template (header + 66 sample items)
├── docker-compose.yml / docker-compose.prod.yml
├── docker-entrypoint.sh    # Container entry: prisma db push dance + optional seed, then start app
├── Dockerfile              # Multi-stage standalone build (node:22-slim)
├── nginx.conf / nginx.dev.conf  # 3 virtual hosts (mofe.ir, app.*, menu.*)
├── next.config.ts           # Security headers, standalone output
├── prisma.config.ts         # Prisma config (schema, seed, datasource from DATABASE_URL)
├── tsconfig.json            # Path alias @/ -> src/
├── vitest.config.ts         # Vitest config (globalSetup, aliases, fileParallelism: false)
├── eslint.config.mjs / postcss.config.mjs
└── package.json
```

### `src/app/api/venues/[venueId]/items/` — 11 route files

| Route | Purpose |
| --- | --- |
| `route.ts` | List/create items |
| `[itemId]/route.ts` | Get/update/delete one item |
| `[itemId]/photo/route.ts` | Upload/delete item photo (Sharp-compressed) |
| `[itemId]/variants/route.ts` | Item variants CRUD (price modifiers) |
| `[itemId]/prices/route.ts` | Item multi-price CRUD |
| `[itemId]/allergens/route.ts` | Item allergen toggles |
| `reorder/route.ts` | Drag-and-drop ordering |
| `bulk-delete/route.ts` | Bulk delete |
| `import-csv/route.ts` | CSV import (papaparse, header alias detection) |
| `export-csv/route.ts` | CSV export (formula-injection sanitized) |
| `csv-template/route.ts` | Download CSV template (headers + example row) |

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

### Public Menu Flow

```
Admin publishes → publication snapshot (JSON) stored in MenuPublication model
                                        ↓
           GET /m/{slug} reads latest "published" snapshot (60s in-memory cache)
                                        ↓
           renderPublicMenu(snapshot) → static HTML (no client JS: script-src 'none')
                                        ↓
           Response (RTL, Persian numerals, CSP-blocked inline script)
           If staticAssetUrl is http → 302 redirect to the uploaded HTML (S3/CDN)
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
- `proxy` guards `/admin` + `/api` (except `/api/auth` and `/api/health`), adds CSRF cookie + security headers, and host-based routing: `menu.*` and `app.*` subdomains, dashboard paths 301-redirected from the apex domain to `app.<host>`
- Layouts only at root and `admin/[venueId]`

### Auth

- `mofe_session` HTTP-only cookie (sameSite: strict)
- 32-byte random token → SHA-256 hash stored in DB
- 7-day TTL, revocable, max 10 active sessions, 30-minute idle timeout
- Password hashing: bcryptjs, 12 rounds
- DB-backed rate limiter on login and password reset (5 attempts/min), signup (3/IP/day, prod only)
- Route handler auth: `requireAuth()` from `@/lib/api-helpers` — all API routes use this pattern
- CSRF: 64-hex token in `mofe_csrf` cookie + `X-CSRF-Token` header; `validateCsrf()` in all mutation routes
- Error handling: wrap handlers in try/catch with `errorResponse(e)` for consistent JSON errors

### Venue Permissions

2 roles: `owner > manager`
- `owner` — full access (menu, settings, members, publish)
- `manager` — CRUD categories/items, publish/unpublish, settings (members list only)

Enforced via `requireVenueAccess()` / `requireRole(userId, venueId, allowedRoles)` / `canManage()` helpers in `@/lib/permissions`.

### Styling

- Tailwind CSS v4 (CSS-based config via `@theme inline {}` in `globals.css`)
- Design tokens as CSS variables: `--paper`, `--ink`, `--ink-strong`, `--ink-muted`, `--line`, `--surface`
- Custom CSS variables for radii: `--radius-panel`, `--radius-card`, `--radius-control`
- All fonts self-hosted (zero external CDN calls)
- Body: `"Parastoo", "Vazirmatn", "Tahoma", sans-serif`
- Headings (`.font-serif`): `"EB Garamond", "Parastoo", "Vazirmatn", "Times New Roman", serif`

### Database

- PostgreSQL via `@prisma/adapter-pg` with `pg` connection pool (max 20)
- Generated client at `src/generated/prisma` (custom output)
- UUID primary keys, soft-delete on `Category` and `MenuItem` (`deletedAt`)
- Money stored as integer Toman
- Schema is pushed with `db push` (no Prisma migrations; `migrations/` holds only `migration_lock.toml`)

### Testing

- Vitest v4, `fileParallelism: false` (files run sequentially)
- `global-setup.ts` pushes schema to PostgreSQL test DB via `prisma db push` + cleans all tables in teardown
- `helpers.ts` provides `cleanTestData()` + `seedTestData()`
- Run: `npm test` (vitest run — 257 tests, 15 files), `npm run test:watch`

### Public Menu Renderer

- `renderPublicMenu(snapshot)` produces pure static HTML with:
  - Inline critical CSS, self-hosted font-face declarations
  - RTL, mobile-first, max-width 510px
  - Sticky category navigation pills (CSS `position: sticky`); an inline script does scroll-based auto-highlight but the route's `script-src 'none'` CSP blocks all JS — the menu is fully static
  - Sold-out items rendered with "ناموجود" badge, visible but subdued
  - Price formatted with Persian numerals (`toLocaleString("fa-IR")` via `formatPrice`)
  - Print styles, compact layout for <380px screens
  - ~17KB HTML for a small menu (single-item snapshot measured 16.9KB uncompressed / 4KB gzipped)

---

## Common Development Tasks

### Adding a new admin page
1. Create directory under `src/app/admin/[venueId]/`
2. Create `page.tsx` (server component, fetches data)
3. Create `*Client.tsx` (client component, receives props)
4. Add nav link in `src/app/admin/[venueId]/NavClient.tsx`
5. Add API endpoints as needed

### Adding a new API endpoint
1. Create route file in `src/app/api/venues/[venueId]/`
2. Use `requireAuth()` from `lib/api-helpers` and `requireVenueAccess()` / `requireRole()` / `canManage()` for auth
3. Call `validateCsrf()` on mutations
4. Wrap in try/catch with `errorResponse(e)` for consistent error formatting
5. Return `NextResponse.json(...)` with appropriate status

### Adding a migration
```bash
npm run db:migrate
# or manually:
npx prisma db push        # needs DATABASE_URL in env; then restart the dev server
```

### Running tests
```bash
npm test                # Run all 257 tests (15 files)
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
Output goes to `downloads/` directory (override with `OUTPUT_DIR`).

---

## Environment Variables

See the Environment section in `AGENTS.md`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://mofe:mofe@localhost:5432/mofe` | PostgreSQL connection (no `.env` ships in repo) |
| `NODE_ENV` | `development` | Environment |
| `ROOT_DOMAIN` | `mofe.ir` | Root domain (production) |
| `APP_DOMAIN` | `app.mofe.ir` | Admin app subdomain |
| `MENU_DOMAIN` | `menu.mofe.ir` | Public menu subdomain |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | empty / `587` / empty / empty / `noreply@mofe.ir` | Email (src/lib/mailer.ts) |
| `S3_BUCKET` / `S3_REGION` / `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | empty | Optional S3-compatible storage; falls back to local `public/uploads` (src/lib/storage.ts) |

Domains are read via `process.env.X || "default"` in `src/lib/config.ts`; `DATABASE_URL` via `prisma.config.ts` (`prisma/client` code falls back to `postgresql://localhost:5432/mofe`). Tests use `TEST_DATABASE_URL` (falls back to `.../mofe_test`).

---

## Deployment

Production uses Docker:

```bash
docker compose up -d          # dev-ish stack: nginx on :80 with nginx.dev.conf
docker compose -f docker-compose.prod.yml up -d   # production overrides
```

- **db** — `postgres:16-alpine`, port 5432, volume `mofe-db`
- **app** — standalone Next.js (`output: standalone`), exposes port 3000, volume `mofe-uploads` at `/app/public/uploads`, `env_file: .env`; entrypoint runs `prisma db push` (+ optional seed with `RUN_SEED=1`)
- **nginx** — `nginx:alpine`; dev: port 80 + `nginx.dev.conf`; prod: ports 80/443 + `nginx.conf` + letsencrypt volume
- `nginx.conf` (prod): HTTP→HTTPS redirect + 3 TLS virtual hosts — `mofe.ir`/`www.mofe.ir` (landing), `app.mofe.ir` (admin), `menu.mofe.ir` (public menus) — all proxying to the app container

---

## Future Architecture Considerations

- **CDN upload — implemented**: on publish, `publishVenueMenu` renders the menu to HTML and uploads it via `src/lib/storage.ts` (S3-compatible when configured, else local `public/uploads`); the `/m/[slug]` route 302-redirects to `staticAssetUrl` when it's an http URL. Remaining future work would be always-on CDN serving with an edge cache and cache invalidation.
- **PostgreSQL — done**: migrated from the legacy ordering-service; uses `@prisma/adapter-pg` via `pg` connection pool (the old Go ordering service was removed from the repo).
