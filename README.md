# mofé — Persian Cafe Menu Management

A Persian-first cafe menu management service. Manage menu categories, items, appearance, and publish static QR menus — all in Persian, with a restrained paper-and-ink design language.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| ORM | Prisma v7 |
| Database | SQLite (dev), PostgreSQL (future) |
| DB Adapter | `prisma-adapter-sqlite` |
| Auth | Session-based, HTTP-only cookies, bcryptjs + SHA-256 |
| DnD | @dnd-kit/core + @dnd-kit/sortable |
| QR | `qrcode` (client-side) |
| Testing | Vitest v4 |

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

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Run test suite |
| `npm run test:watch` | Tests in watch mode |
| `npm run db:studio` | Prisma Studio |
| `npm run db:migrate` | Run dev migration |
| `npm run db:seed` | Seed demo data |
| `npm run db:reset` | Reset DB + run migrations + seed |

## Routes

### App

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/login` | Login |
| `/venues` | Venue picker (multi-venue users) |
| `/m/[slug]` | Static public menu |
| `/admin/[venueId]/menu` | Menu management |
| `/admin/[venueId]/qr-menu` | Publish/preview/QR export |
| `/admin/[venueId]/publications` | Publication history |
| `/admin/[venueId]/settings` | Venue settings |

### API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/me` | Current user + memberships |
| GET/PATCH | `/api/venues/[venueId]` | Venue read/update |
| GET/POST | `/api/venues/[venueId]/categories` | List/create categories |
| PATCH/DELETE | `/api/venues/[venueId]/categories/[categoryId]` | Update/delete category |
| POST | `/api/venues/[venueId]/categories/reorder` | Reorder categories |
| GET/POST | `/api/venues/[venueId]/items` | List/create items |
| PATCH/DELETE | `/api/venues/[venueId]/items/[itemId]` | Update/delete item |
| POST | `/api/venues/[venueId]/items/reorder` | Reorder items |
| POST | `/api/venues/[venueId]/items/bulk-visibility` | Bulk visibility toggle |
| GET | `/api/venues/[venueId]/public-preview` | Draft preview payload |
| POST | `/api/venues/[venueId]/publish` | Publish static menu |
| POST | `/api/venues/[venueId]/unpublish` | Unpublish |
| GET | `/api/venues/[venueId]/publications` | Publication history |

## Features

### Menu Management
- CRUD for categories (Persian names, drag-and-drop reorder, active toggle)
- CRUD for items (name, price, description, station, calories, photo)
- Search by name, filter by category/station/visibility/sold-out
- Inline visibility and sold-out toggles
- Bulk visibility toggle (e.g., hide all bar items)
- Drag-and-drop reorder for categories and items

### QR Menu Editor
- Appearance settings (name, welcome message, accent color)
- Live mobile preview
- Publication history with status tracking
- Unpublished changes indicator
- QR code export (PNG/PDF with ink-on-paper styling)

### Static Public Menu
- Pre-generated RTL mobile-first HTML
- Published on `/m/[slug]`
- Sold-out items visible with "ناموجود" badge
- Hidden items and inactive categories omitted
- Unpublished venues show unavailable page
- No API calls, no client framework — pure static HTML

### Auth & Permissions
- Three roles: owner, manager, staff
- Session-based auth with HTTP-only cookies
- Role-based access enforcement on all API routes
- Multi-venue support

## Design Language

Paper-and-ink system with Persian-first typography.

- **Background:** `#f5f0e6` (paper)
- **Text:** `#111111` (ink)
- **Primary font:** Parastoo (Persian)
- **Heading font:** EB Garamond (English/serif)
- **Fallback:** Vazirmatn → Tahoma

All fonts are self-hosted — zero external font/CDN dependencies.

## Database

SQLite (file: `./dev.db`). 9 models: User, Venue, VenueMember, Category, MenuItem, Asset, MenuPublication, Domain, AuditLog, Session.

```bash
# Reset with demo data
npm run db:reset
```

## Testing

82 tests across 3 files (Vitest):

```
src/__tests__/lib/public-menu/renderer.test.ts   — 48 tests (HTML rendering)
src/__tests__/lib/auth.test.ts                   —  8 tests (auth functions)
src/__tests__/api/integration.test.ts            — 26 tests (API integration)
```

Uses a real SQLite test DB created fresh before each run.

## Project Structure

```
mofe-menu/
├── prisma/                    # Schema, migrations, seed
├── public/fonts/              # Self-hosted fonts
├── src/
│   ├── __tests__/             # Test suite
│   ├── app/                   # Next.js App Router pages & API
│   │   ├── admin/[venueId]/   # Admin pages
│   │   ├── api/               # REST API routes
│   │   ├── login/             # Login page
│   │   └── m/[slug]/          # Public menu
│   ├── components/ui/         # Reusable UI components
│   ├── generated/prisma/      # Prisma client (generated)
│   └── lib/                   # Auth, permissions, renderer, prisma
├── DESIGN-LANGUAGE.md
├── DEV_PLAN.MD
└── PRD.MD
```
