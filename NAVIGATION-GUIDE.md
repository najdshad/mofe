# mofé Navigation Guide

An orientation for developers working on this project. Covers directory layout, conventions, key patterns, and how the pieces connect.

## Quick Links

| Document | Purpose |
| --- | --- |
| `README.md` | Quick start, routes, features, design tokens |
| `DEV_PLAN.MD` | Development plan, milestones, API design |
| `PRD.MD` | Product requirements, built vs. future features |
| `DESIGN-LANGUAGE.md` | Full design system specification |
| `AGENTS.MD` | Agentic development instructions (for AI coding tools) |

---

## Directory Structure

```
mofe-menu/
├── prisma/
│   ├── schema.prisma      # 9 models (User, Venue, VenueMember, Category, MenuItem,
│   │                      #   Asset, MenuPublication, Domain, AuditLog, Session)
│   ├── migrations/         # Prisma migration history
│   └── seed.ts            # Demo data seeder (uses src/lib/demo.ts helpers)
├── public/
│   └── fonts/             # 5 self-hosted font files (Parastoo, Vazirmatn, EB Garamond)
├── scripts/
│   └── download-menus.ts  # CLI tool to export published menus as HTML files
├── src/
│   ├── __tests__/
│   │   ├── api/            # Integration tests (27 tests)
│   │   ├── lib/            # Unit tests — auth (8) + renderer (48)
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
│   │   │   │   └── settings/      # Venue settings + member management (Server + SettingsClient)
│   │   │   └── venues/
│   │   │       └── new/           # (empty, reserved for venue creation)
│   │   ├── api/
│   │   │   ├── auth/              # login, logout
│   │   │   ├── me/                # current user
│   │   │   └── venues/
│   │   │       └── [venueId]/
│   │   │           ├── categories/    # CRUD + reorder
│   │   │           ├── items/         # CRUD + reorder + bulk-visibility + import-csv
│   │   │           ├── members/       # List + create members
│   │   │           ├── publications/  # List publications
│   │   │           ├── publish/       # Publish venue menu
│   │   │           ├── unpublish/     # Unpublish venue menu
│   │   │           ├── public-preview/ # Draft data for live preview
│   │   │           └── logo/          # Upload/delete venue logo
│   │   ├── login/            # Login page (LoginForm client component)
│   │   ├── m/[slug]/         # Static public menu route (server-rendered HTML)
│   │   ├── venues/           # Venue picker page
│   │   ├── globals.css       # Tailwind v4 @theme + font-face declarations + tokens
│   │   ├── layout.tsx        # Root RTL layout (lang=fa, dir=rtl)
│   │   └── page.tsx          # Full landing page with hero, nav, features, how-it-works, benefits, contact form, footer
│   ├── components/ui/        # 8 reusable components
│   │   ├── Badge.tsx         # Inline pill (default, soldOut, muted via variant prop)
│   │   ├── Button.tsx        # forwardRef, 4 variants (primary/secondary/tertiary/destructive), 3 sizes
│   │   ├── Icons.tsx         # SVG icon components (GripIcon, EditIcon, DeleteIcon)
│   │   ├── Input.tsx         # Text input with label, error, helperText; auto-id from label
│   │   ├── Modal.tsx         # "use client" modal with overlay, Escape, body scroll lock
│   │   ├── Panel.tsx         # Section container with title/subtitle
│   │   ├── QRCodeExport.tsx  # Client-side QR generation, PNG download, PDF print
│   │   └── Toggle.tsx        # role="switch" toggle pill
│   ├── generated/prisma/     # Auto-generated Prisma client (custom output path)
│   ├── hooks/
│   │   └── useStatusMessage.ts  # Shared hook: set message + auto-dismiss + router.refresh()
│   ├── lib/
│   │   ├── api-helpers.ts    # requireAuth(), errorResponse() — reduce route auth boilerplate
│   │   ├── auth.ts           # Session management (createSession, getCurrentUser, destroySession)
│   │   │                     #   Cookie: mofe_session, SHA-256 token hash, 7-day TTL
│   │   │                     #   Password: bcryptjs, 12 rounds
│   │   ├── config.ts         # Domain config (rootDomain, appDomain, menuDomain)
│   │   ├── constants.ts      # TIMEZONE_LABELS, ROLE_LABELS, STATION_LABELS, STATUS_LABELS
│   │   ├── demo.ts           # Demo data helpers (ensureDemoData)
│   │   ├── fetch-api.ts      # fetchApi() — typed fetch wrapper with error handling
│   │   ├── permissions.ts    # Role-based access (owner/manager/staff)
│   │   ├── prisma.ts         # Prisma singleton (PrismaSqlite adapter)
│   │   ├── public-menu/
│   │   │   ├── publication.ts   # buildPublicSnapshot, publishVenueMenu, unpublishVenueMenu
│   │   │   └── renderer.ts      # renderPublicMenu (~10KB static HTML), renderUnavailablePage
│   │   │                        #   Exports: FONT_FACE_DECLARATIONS, formatPrice
│   │   └── rate-limit.ts    # In-memory rate limiter with periodic stale-entry cleanup
│   └── proxy.ts             # Next.js 16 auth proxy (export name: proxy, not middleware)
├── AGENTS.MD               # AI-assisted development instructions
├── DESIGN-LANGUAGE.md       # Full design system
├── DEV_PLAN.MD             # Development plan, milestones, API table
├── PRD.MD                  # Product requirements
├── sample-csv.csv          # CSV import template (66 sample items)
├── docker-compose.yml      # App + nginx services
├── Dockerfile              # Multi-stage standalone build
├── nginx.conf              # 3 virtual hosts (root, app.*, menu.*)
├── next.config.ts           # Security headers, standalone output
├── prisma.config.ts         # Prisma config (schema, seed, datasource)
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
                                  Prisma ORM → SQLite/PostgreSQL
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

### Permissions

3 roles: `owner > manager > staff`
- `owner` — full access
- `manager` — CRUD categories/items, publish/unpublish
- `staff` — only toggle visibility and sold-out

Enforced via `requireRole(userId, venueId, allowedRoles)` or `canManageCategories()`, `canManageItems()`, `canPublish()` helpers.

### Styling

- Tailwind CSS v4 (CSS-based config via `@theme inline {}` in `globals.css`)
- Design tokens as CSS variables: `--paper`, `--ink`, `--ink-strong`, `--ink-muted`, `--line`, `--surface`
- Custom CSS variables for radii: `--radius-panel`, `--radius-card`, `--radius-control`
- All fonts self-hosted (zero external CDN calls)
- Body: `"Parastoo", "Vazirmatn", "Tahoma", sans-serif`
- Headings (`.font-serif`): `"EB Garamond", "Parastoo", "Vazirmatn", "Times New Roman", serif`

### Database

- SQLite (dev) via `prisma-adapter-sqlite` with `library` query engine (no binary deps)
- Generated client at `src/generated/prisma` (custom output)
- UUID primary keys, soft-delete on `Category` and `MenuItem` (`deletedAt`)
- Money stored as integer Toman

### Testing

- Vitest v4 with `singleFork` pool
- `global-setup.ts` creates fresh `test.db` via `prisma db push`
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
npm test                # Run all 83 tests
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
| `DATABASE_URL` | `file:./data.db` | SQLite DB path |
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
- nginx reverse-proxies 3 virtual hosts: `mofe.ir` (landing), `app.mofe.ir` (admin), `menu.mofe.ir` (public menus)
- Persistent volumes: `mofe-data` (SQLite DB), `mofe-uploads` (logo images)

---

## Future Architecture Considerations

- **Photo upload pipeline**: Sharp is already a dependency; Milestone 5 adds item photo support
- **Custom domains**: Domain model exists in schema; subdomain + CNAME flows not yet built
- **CDN upload**: Static menu HTML could be uploaded to CDN instead of rendered from DB
- **PostgreSQL**: Schema is SQLite-compatible; swap `prisma-adapter-sqlite` for `@prisma/adapter-pg`
- **Audit logging**: AuditLog model exists; recording logic not yet wired in
