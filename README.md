# mofé — Persian Cafe Menu Management

Persian-first cafe menu management: manage menu categories, items, appearance, and publish static QR menus — all in Persian, with a restrained paper-and-ink design language.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| ORM | Prisma v7 |
| Database | SQLite (dev), PostgreSQL (future) |
| DB Adapter | `prisma-adapter-sqlite` (query engine: `library`) |
| Auth | Session-based, HTTP-only cookie, bcryptjs + SHA-256 |
| DnD | @dnd-kit/core + @dnd-kit/sortable |
| QR | `qrcode` (client-side) |
| Testing | Vitest v4 (82 tests) |

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
| `admin@nahal-cafe.ir` | `demo1234` | Owner of "کافه ناهال" |

### Seed Venue

Venue "کافه ناهال" with 4 categories and 9 items including hidden, sold-out, and public items.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build (22 routes, 1 proxy) |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run 82 tests (vitest run) |
| `npm run test:watch` | Tests in watch mode |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed demo data (upsert) |
| `npm run db:reset` | `prisma migrate reset --force` — full reset |

## Routes

### App Pages

| Route | Type | Purpose |
| --- | --- | --- |
| `/` | Static | Landing page |
| `/login` | Static | Login |
| `/venues` | Dynamic | Venue picker |
| `/m/[slug]` | Dynamic | Static public menu |
| `/admin/[venueId]/menu` | Dynamic | Menu management |
| `/admin/[venueId]/qr-menu` | Dynamic | Publish/preview/QR |
| `/admin/[venueId]/publications` | Dynamic | Publication history |
| `/admin/[venueId]/settings` | Dynamic | Venue settings |

### API Endpoints

**Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`

**Venues:** `GET /api/venues`, `GET|PATCH /api/venues/[id]`

**Categories:** `GET|POST /api/venues/[id]/categories`, `PATCH|DELETE /api/venues/[id]/categories/[id]`, `POST .../categories/reorder`

**Items:** `GET|POST /api/venues/[id]/items`, `GET|PATCH|DELETE /api/venues/[id]/items/[id]`, `POST .../items/reorder`, `POST .../items/bulk-visibility`

**Publishing:** `GET /api/venues/[id]/public-preview`, `POST .../publish`, `POST .../unpublish`, `GET .../publications`

## Features

### Menu Management
- CRUD for categories (Persian names, drag-and-drop reorder, active toggle)
- CRUD for items (nameFa, nameEn, price, description, station, calories)
- Search by name, filter by category/station/visibility/sold-out
- Inline visibility and sold-out toggles
- Bulk visibility toggle (by IDs or station)
- Soft-delete with transaction safety

### QR Menu Editor
- Appearance settings (name, welcome message, accent color)
- Live mobile preview from draft data
- Publish/unpublish with confirmation modals
- Publication history table
- Unpublished changes indicator
- QR export: PNG canvas (ink-on-paper) + PDF print page

### Static Public Menu (`/m/{slug}`)
- Pre-generated RTL mobile-first HTML from publication snapshot
- Sold-out items visible with "ناموجود" badge
- Hidden items and inactive categories omitted
- Unpublished venues show unavailable page
- No client JS or API calls — pure static HTML

### Auth & Permissions
- 3 roles: owner, manager, staff
- Role-based enforcement on all API routes
- Multi-venue support with membership verification

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

## Testing

82 tests across 3 files with real SQLite test DB:

```
src/__tests__/lib/public-menu/renderer.test.ts  — 48 tests (HTML rendering)
src/__tests__/lib/auth.test.ts                  —  8 tests (auth functions)
src/__tests__/api/integration.test.ts           — 26 tests (API integration)
```

Run: `npm test` (creates fresh `test.db`, runs tests, cleans up).

## Project Structure

```
mofe-menu/
├── prisma/                     # Schema, migrations, seed
│   └── schema.prisma           # 9 models
├── public/fonts/               # Self-hosted fonts (5 files)
├── src/
│   ├── __tests__/              # Vitest test suite
│   │   ├── api/                # Integration tests
│   │   ├── lib/                # Unit tests
│   │   ├── helpers.ts          # Test data helpers
│   │   ├── setup.ts            # Per-file setup
│   │   └── global-setup.ts     # DB creation/teardown
│   ├── app/
│   │   ├── admin/[venueId]/    # Admin pages (4 sections)
│   │   ├── api/                # REST API routes (16+)
│   │   ├── login/              # Login page
│   │   ├── m/[slug]/           # Public menu route
│   │   ├── venues/             # Venue picker
│   │   ├── globals.css         # Design tokens + fonts
│   │   ├── layout.tsx          # Root RTL layout
│   │   └── page.tsx            # Landing page
│   ├── components/ui/          # 7 reusable components
│   ├── generated/prisma/       # Prisma client (auto-generated)
│   ├── lib/
│   │   ├── public-menu/        # HTML renderer
│   │   ├── auth.ts             # Session auth
│   │   ├── permissions.ts      # Role-based access
│   │   └── prisma.ts           # Prisma singleton
│   └── proxy.ts                # Auth proxy (Next.js 16 convention)
├── DESIGN-LANGUAGE.md
├── DEV_PLAN.MD
└── PRD.MD
```

## Important Notes

- **Proxy export:** `src/proxy.ts` exports `proxy` (not `middleware`) — Next.js 16.2.9 convention
- **Prisma client:** Generated at `src/generated/prisma` (custom output path)
- **Fonts:** All self-hosted at `/fonts/`, no Google Fonts or external CDN
- **Tailwind v4:** No config file — CSS-based via `@theme inline {}` in `globals.css`
- **Query engine:** `library` mode (no binary dependencies)
