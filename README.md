# mofé — Persian Cafe Menu Management

Persian-first cafe menu management: manage menu categories, items, appearance, and publish static QR menus — all in Persian, with a restrained paper-and-ink design language.

> **New to the project?** See [`NAVIGATION-GUIDE.md`](./NAVIGATION-GUIDE.md) for a deep dive into directory structure, conventions, architecture, and common development tasks.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16.2.9 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (CSS-based config via `@theme`) |
| ORM | Prisma v7 |
| Database | SQLite (dev), PostgreSQL (future) |
| DB Adapter | `prisma-adapter-sqlite` (query engine: `library`) |
| Auth | Session-based, HTTP-only cookie `mofe_session`, bcryptjs + SHA-256 |
| Roles | `user` / `internal` (User), `owner` / `manager` / `staff` (VenueMember) |
| DnD | @dnd-kit/core + @dnd-kit/sortable |
| QR | `qrcode` (client-side) |
| CSV | papaparse |
| Icons | lucide-react |
| Image Processing | sharp |
| Email | nodemailer (SMTP) |
| Storage | Local filesystem / S3-compatible (configurable) |
| Testing | Vitest v4 (138 tests) |
| Runtime | Node 22 |

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
| `npm test` | Run 138 tests (vitest run) |
| `npm run test:watch` | Tests in watch mode |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed demo data (upsert) |
| `npm run db:reset` | `prisma migrate reset --force` — full reset |
| `npm run download:menus` | Export all published menus as static HTML files |

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
| `/admin/[venueId]/qr-menu` | Dynamic | Publish/preview/QR editor with live mobile preview |
| `/admin/[venueId]/publications` | Dynamic | Publication history (last 50, Persian dates) |
| `/admin/[venueId]/settings` | Dynamic | Venue settings, logo upload, member management, station schedules, photo display toggle |
| `/internal` | Dynamic | Internal dashboard (mofé team) |
| `/internal/users` | Dynamic | Internal user management: list users, create accounts |
| `/internal/venues` | Dynamic | Internal venue management: list venues, create venues with owner |

### API Endpoints (29 routes)

**Health:** `GET /api/health`

**Internal (mofé team only):** `GET|POST /api/internal/users`, `GET|POST /api/internal/venues`

**Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`, `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`

**Venues:** `GET /api/venues`, `GET|PATCH /api/venues/[id]`

**Categories:** `GET|POST /api/venues/[id]/categories`, `PATCH|DELETE /api/venues/[id]/categories/[id]`, `POST .../categories/reorder`

**Items:** `GET|POST /api/venues/[id]/items`, `GET|PATCH|DELETE /api/venues/[id]/items/[id]`, `POST .../items/reorder`, `POST .../items/bulk-visibility`, `POST .../items/import-csv`, `GET .../items/export-csv`, `POST|DELETE .../items/[id]/photo`, `GET|POST .../items/[id]/variants`, `GET|POST .../items/[id]/allergens`

**Members:** `GET|POST /api/venues/[id]/members`, `PATCH|DELETE /api/venues/[id]/members/[memberId]`

**Publishing:** `GET /api/venues/[id]/public-preview`, `POST .../publish`, `POST .../unpublish`, `GET .../publications`

**Assets:** `POST|DELETE /api/venues/[id]/logo`

**Schedules:** `GET|POST /api/venues/[id]/schedules`

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

138 tests across 6 files with real SQLite test DB:

```
src/__tests__/api/integration.test.ts           — 54 tests (auth, CRUD, reorder, bulk visibility, publish workflow,
│                                                    permissions, CSV import, publication edge cases,
│                                                    cross-venue isolation)
src/__tests__/lib/public-menu/renderer.test.ts  — 48 tests (HTML structure, Persian formatting, escaping, edge cases)
src/__tests__/lib/api-helpers.test.ts           — 12 tests (ApiError, errorResponse, requireAuth)
src/__tests__/lib/auth.test.ts                  —  8 tests (hashToken, generateToken, hashPassword, verifyPassword)
src/__tests__/lib/config.test.ts                —  8 tests (getPublicMenuUrl)
src/__tests__/lib/rate-limit.test.ts            —  8 tests (rateLimit helper — DB-backed)
```

Run: `npm test` (creates fresh `test.db`, runs tests, cleans up).

## Documentation

| Document | Purpose |
| --- | --- |
| [`NAVIGATION-GUIDE.md`](./NAVIGATION-GUIDE.md) | Project orientation: directory layout, conventions, architecture, dev tasks |
| [`DESIGN-LANGUAGE.md`](./DESIGN-LANGUAGE.md) | Full design system specification (503 lines) |
| [`DEV_PLAN.md`](./DEV_PLAN.md) | Development plan, milestones, API design tables |
| [`PRD.md`](./PRD.md) | Product requirements, built vs. future features |
| [`AGENTS.md`](./AGENTS.md) | AI-assisted development instructions |

## Project Structure

```
mofe-menu/
├── prisma/                     # Schema, migrations, seed
│   ├── schema.prisma           # 15 models (User, Venue, VenueMember, Category,
│   │                           #   MenuItem, Asset, MenuPublication, Domain, AuditLog,
│   │                           #   Session, PasswordResetToken, StationSchedule,
│   │                           #   MenuItemVariant, MenuItemAllergen,
│   │                           #   RateLimitEntry)
│   └── seed.ts                 # Demo data seeder
├── public/
│   ├── fonts/                  # Self-hosted fonts (5 files)
│   └── uploads/                # Venue logo uploads
├── scripts/
│   └── download-menus.ts       # CLI tool: export published menus as HTML
├── src/
│   ├── __tests__/              # Vitest test suite
│   │   ├── api/                # Integration tests
│   │   ├── lib/                # Unit tests
│   │   ├── helpers.ts          # Test data helpers
│   │   ├── setup.ts            # Per-file setup
│   │   └── global-setup.ts     # DB creation/teardown
│   ├── app/
│   │   ├── admin/
│   │   │   ├── [venueId]/      # Admin pages (4 sections)
│   │   │   └── venues/new/     # (reserved)
│   │   ├── api/                # REST API routes (32 endpoints)  
│   │   │   ├── health/         # Health check endpoint
│   │   │   ├── internal/       # Internal mofé team endpoints
│   │   ├── login/              # Login page
│   │   ├── password-reset/     # Password reset flow (request + confirm pages)
│   │   ├── m/[slug]/           # Public menu route
│   │   ├── venues/             # Venue picker
│   │   ├── globals.css         # Tailwind v4 @theme + font-face + design tokens
│   │   ├── layout.tsx          # Root RTL layout
│   │   └── page.tsx            # Landing page
│   ├── components/ui/          # 8 reusable components
│   │   ├── Badge.tsx           # Pills: default, soldOut, muted (via variant prop)
│   │   ├── Button.tsx          # forwardRef, 4 variants, 3 sizes
│   │   ├── Icons.tsx           # SVG icon components (GripIcon, EditIcon, DeleteIcon)
│   │   ├── Input.tsx           # Label + error + helperText
│   │   ├── Modal.tsx           # Overlay + Escape + body scroll lock
│   │   ├── Panel.tsx           # Section container
│   │   ├── QRCodeExport.tsx    # QR generation, PNG download, PDF print
│   │   └── Toggle.tsx          # role="switch" pill
│   ├── generated/prisma/       # Prisma client (auto-generated, custom output)
│   ├── hooks/
│   │   └── useStatusMessage.ts # Shared hook: set message + auto-dismiss + router.refresh()
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
│   │   ├── mailer.ts           # Email delivery via SMTP (nodemailer)
│   │   ├── permissions.ts      # Role-based access (owner/manager/staff)
│   │   ├── prisma.ts           # Prisma singleton (PrismaSqlite adapter, WAL mode)
│   │   ├── rate-limit.ts       # DB-backed rate limiter (RateLimitEntry model)
│   │   └── storage.ts          # File storage abstraction (local/S3-compatible)
│   └── proxy.ts                # Auth proxy (export: proxy, not middleware)
├── AGENTS.md                   # AI development instructions
├── DESIGN-LANGUAGE.md           # Design system
├── DEV_PLAN.md                 # Development plan
├── NAVIGATION-GUIDE.md          # Project navigation guide
├── PRD.md                      # Product requirements
├── sample-csv.csv              # CSV import template (66 items)
├── docker-compose.yml          # App + nginx services
├── Dockerfile                  # Multi-stage build
├── nginx.conf                  # 3 virtual hosts
├── eslint.config.mjs           # ESLint (Next.js config)
├── next.config.ts              # Security headers, standalone output
├── postcss.config.mjs          # @tailwindcss/postcss
├── prisma.config.ts            # Prisma config (auto-generated)
├── tsconfig.json               # Path alias @/ -> src/
└── vitest.config.ts            # Vitest config
```

## Important Notes

- **Proxy export:** `src/proxy.ts` exports `proxy` (not `middleware`) — Next.js 16.2.9 convention
- **Route params:** `params` is `Promise<{...}>` — must `await` per Next.js 16
- **Route auth:** Use `requireAuth()` from `lib/api-helpers` instead of inline `getCurrentUser()` + 401 check
- **Prisma client:** Generated at `src/generated/prisma` (custom output path)
- **Fonts:** All self-hosted at `/fonts/`, no Google Fonts or external CDN — 5 files; `@font-face` declarations live in a shared `FONT_FACE_DECLARATIONS` constant in `renderer.ts`
- **Tailwind v4:** No config file — CSS-based via `@theme inline {}` in `globals.css`
- **Query engine:** `library` mode (no binary dependencies)
- **SQLite WAL mode:** Enabled at startup (`PRAGMA journal_mode=WAL`, `busy_timeout=5000`)
- **Rate limiting:** DB-backed via `RateLimitEntry` model — survives restarts
- **Email:** Configurable SMTP via `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` env vars; logs to console when unconfigured
- **Storage:** Local filesystem by default; set `S3_*` env vars to use S3-compatible object storage
- **CSV import:** Formula injection sanitized — cells starting with `=`, `+`, `-`, `@`, `\t` are prefixed with `'`
- **Boot guard:** Production startup warns if `admin@mofe.ir` still uses default password
- **Design tokens:** CSS vars `--paper`, `--ink`, `--ink-strong`, `--ink-muted`, `--line`, `--surface`
- **Radii:** Panel 28px, Card 24px, Control 16px (CSS vars)
