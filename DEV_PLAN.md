# mofé Persian Cafe Menu Management — Development Plan

## 1. Product Goal

Build a Persian-first cafe menu management service that lets venue operators manage menu categories, menu items, public QR menu appearance, publication status, QR exports, and static customer-facing menus.

The v1 product has two surfaces:

1. **Admin application** — authenticated web app for venue staff.
2. **Public QR menu** — pre-generated static HTML served from DB snapshot; read-only, RTL, mobile-first, and fast.

The customer phone must not hit the API in v1. Public menus are generated and served from publication snapshots.

## 2. Core Principles

- **Persian-first:** RTL layout, Persian labels, Parastoo typography, Toman pricing.
- **Paper and ink design:** off-white background, near-black text, minimal color, restrained borders, no decorative visual noise.
- **Operational speed:** management flows should be fast for cafe staff during service hours.
- **Static public delivery:** QR menus load quickly through minimal inline HTML (~10KB).
- **Safe publishing:** admin changes editable before public regeneration; publish/unpublish actions require clear confirmation.
- **No customer accounts/order flow in v1:** QR menu is read-only.

## 3. Implemented Stack

### 3.1 Application

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** SQLite (dev), PostgreSQL planned
- **ORM:** Prisma v7 with `prisma-adapter-sqlite`
- **Auth:** Session-based with HTTP-only cookies, bcryptjs + SHA-256
- **Drag and drop:** @dnd-kit/core + @dnd-kit/sortable
- **QR generation:** client-side `qrcode` library

### 3.2 Frontend

- **Admin UI:** React components (App Router client/server components)
- **Styling:** Tailwind CSS v4 (CSS-based config via `@theme inline {}`)
- **Components:** Button, Input, Toggle, Badge, Panel, Modal, QRCodeExport

### 3.3 Public Menu

- Static HTML generated server-side from publication snapshot
- Inline critical CSS, all fonts self-hosted
- No client framework bundle
- Served at `/m/{slug}` from DB (CDN upload is future)

## 4. User Roles and Permissions

### 4.1 Roles

- **Owner** — full venue access, manage settings
- **Manager** — categories, items, appearance, publish/unpublish
- **Staff** — update item availability and visibility only

### 4.2 Permission Matrix

| Feature | Owner | Manager | Staff |
| --- | --- | --- | --- |
| View admin menu | Yes | Yes | Yes |
| Create/edit categories | Yes | Yes | No |
| Reorder categories | Yes | Yes | No |
| Delete categories | Yes | Yes | No |
| Create/edit items | Yes | Yes | No |
| Delete items | Yes | Yes | No |
| Availability toggle | Yes | Yes | Yes |
| Visibility toggle | Yes | Yes | Yes |
| Bulk visibility | Yes | Yes | No |
| Appearance settings | Yes | Yes | No |
| Publish/unpublish | Yes | Yes | No |
| QR export | Yes | Yes | Yes |
| User management | Yes | No | No |

## 5. Database Schema

9 models: User, Venue, VenueMember, Category, MenuItem, Asset, MenuPublication, Domain, AuditLog, Session.

- UUID primary keys, soft-delete on categories and items
- Money stored as integer Toman
- Generated client at `src/generated/prisma`

Full schema in `prisma/schema.prisma`.

## 6-16. Design Specifications

See `DESIGN-LANGUAGE.md` for design system, `PRD.md` for feature details, and `src/lib/public-menu/renderer.ts` for the snapshot shape. The original DEV_PLAN sections 6–16 remain valid as forward-looking design guidance for future milestones.

## 17. API Design

REST endpoints. All mutations require authentication and venue authorization.

### 17.1 Auth

| Method | Endpoint | Status |
| --- | --- | --- |
| POST | `/api/auth/login` | ✅ |
| POST | `/api/auth/logout` | ✅ |
| GET | `/api/me` | ✅ |
| POST | `/api/auth/password-reset/request` | ❌ Future |
| POST | `/api/auth/password-reset/confirm` | ❌ Future |

### 17.2 Venues

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues` | ✅ List accessible venues |
| GET | `/api/venues/:venueId` | ✅ Get venue |
| PATCH | `/api/venues/:venueId` | ✅ Update venue |

### 17.3 Categories

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues/:venueId/categories` | ✅ List categories |
| POST | `/api/venues/:venueId/categories` | ✅ Create category |
| PATCH | `/api/venues/:venueId/categories/:id` | ✅ Update category |
| DELETE | `/api/venues/:venueId/categories/:id` | ✅ Soft-delete (blocked if items exist) |
| POST | `/api/venues/:venueId/categories/reorder` | ✅ Batch reorder |

### 17.4 Items

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues/:venueId/items` | ✅ List with filters |
| POST | `/api/venues/:venueId/items` | ✅ Create item |
| GET | `/api/venues/:venueId/items/:id` | ✅ Get item |
| PATCH | `/api/venues/:venueId/items/:id` | ✅ Update item |
| DELETE | `/api/venues/:venueId/items/:id` | ✅ Soft-delete |
| POST | `/api/venues/:venueId/items/bulk-visibility` | ✅ Bulk update |
| POST | `/api/venues/:venueId/items/reorder` | ✅ Batch reorder |
| POST | `/api/venues/:venueId/items/:id/photo` | ❌ Future |
| DELETE | `/api/venues/:venueId/items/:id/photo` | ❌ Future |

### 17.5 Members

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues/:venueId/members` | ✅ List members |
| POST | `/api/venues/:venueId/members` | ✅ Add member (creates user + membership) |
| PATCH | `/api/venues/:venueId/members/:memberId` | ✅ Update member role/name/password |
| DELETE | `/api/venues/:venueId/members/:memberId` | ✅ Remove member |

### 17.6 Assets

| Method | Endpoint | Status |
| --- | --- | --- |
| POST | `/api/venues/:venueId/logo` | ✅ Upload venue logo (sharp resize + WebP) |
| DELETE | `/api/venues/:venueId/logo` | ✅ Delete venue logo |

### 17.7 CSV Import

| Method | Endpoint | Status |
| --- | --- | --- |
| POST | `/api/venues/:venueId/items/import-csv` | ✅ Import items from CSV (smart header detection, batch creation) |

### 17.8 Publishing and QR

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues/:venueId/public-preview` | ✅ Draft preview payload |
| POST | `/api/venues/:venueId/publish` | ✅ Publish (creates snapshot) |
| POST | `/api/venues/:venueId/unpublish` | ✅ Unpublish |
| GET | `/api/venues/:venueId/publications` | ✅ List last 20 |
| POST | `/api/venues/:venueId/publications/:id/retry` | ❌ Future |

### 17.6 Domains

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues/:venueId/domain` | ❌ Future |
| POST | `/api/venues/:venueId/domain` | ❌ Future |
| POST | `/api/venues/:venueId/domain/verify` | ❌ Future |
| DELETE | `/api/venues/:venueId/domain/:id` | ❌ Future |

## 18. Testing

**Framework:** Vitest v4, `singleFork` pool for sequential DB access.

**Test files:** 83 tests total
- `src/__tests__/lib/public-menu/renderer.test.ts` — 48 tests (HTML structure, Persian formatting, escaping, edge cases)
- `src/__tests__/lib/auth.test.ts` — 8 tests (hashToken, generateToken, hashPassword, verifyPassword)
- `src/__tests__/api/integration.test.ts` — 27 tests (categories/items CRUD, reorder, bulk visibility, publish workflow, permissions, CSV import)

**Infrastructure:**
- `src/__tests__/global-setup.ts` — creates fresh `test.db` with `prisma db push` before all tests, cleans up after
- `src/__tests__/helpers.ts` — `cleanTestData()` and `seedTestData()` for integration tests
- Run with `npm test` (vitest run) or `npm run test:watch`

## 19. Implementation Milestones

### ✅ Milestone 1 — Foundation
- Next.js 16 with App Router, TypeScript, Tailwind CSS v4
- Design tokens (CSS variables for paper/ink/line/surface)
- Prisma ORM with SQLite
- Complete database schema with all 9 models
- Base UI components: Button, Input, Toggle, Badge, Panel, Modal

### ✅ Milestone 2 — Authentication and Venue Access
- Email/password login with bcrypt
- Session-based auth with HTTP-only cookies (SHA-256 token hashes)
- Session management (create/verify/destroy)
- Auth proxy (middleware equivalent) for protected routes
- Login page with Persian UI
- `/api/auth/login`, `/api/auth/logout`, `/api/me` endpoints
- Venue membership verification with role-based access helpers
- Venue picker page for multi-venue users
- Admin layout with venue context, navigation, and user info

### ✅ Milestone 3 — Category Management
- Category list in admin sidebar with active toggle
- Create/edit/delete API endpoints
- Soft-delete with item count validation (prevented if items exist)
- Reorder endpoint with atomic transaction
- Category filter in menu view

### ✅ Milestone 4 — Item Management
- Item list with category/station/visibility/sold-out filters
- Search by Persian/English name
- Inline visibility toggle
- Sold-out toggle (visible with badge)
- Full CRUD API endpoints
- Bulk visibility endpoint (by IDs or station)
- Input validation on POST routes

### ⏳ Milestone 5 — Media Uploads (Not started)
- Photo upload endpoint and UI (requires Arvan Object Storage or local fallback)

### ✅ Milestone 6 — QR Menu Editor
- Appearance settings form (name, welcome message, accent color)
- Live mobile preview pane (fetches draft data)
- Publish/unpublish with confirmation modals
- Publication history tracking
- Unpublished changes indicator

### ✅ Milestone 7 — Static Public Menu
- Static HTML renderer (`renderPublicMenu`) with inline CSS, Persian formatting, self-hosted fonts
- Unavailable page renderer (`renderUnavailablePage`)
- Public route `/m/{slug}` serves from publication snapshot
- Sold-out items shown with "ناموجود" badge and subdued opacity
- Hidden items and inactive categories omitted
- No API calls — pure HTML response (~10KB)

### ✅ Milestone 8 — QR Export
- Client-side QR generation using `qrcode` library
- PNG download: canvas-rendered card with ink-on-paper styling
- PDF download: print-ready page, triggers browser print dialog
- Warning banner when menu is unpublished

### ⏳ Milestone 9 — Domains and Plans (Not started)

### ⏳ Milestone 10 — Hardening and Launch (Not started)
- Completed: Vitest test suite with 83 tests

## 20. Current Build

```
npm run build → 28 routes
├ ○ /                                    (static)
├ ○ /_not-found
├ ƒ /admin/[venueId]/menu
├ ƒ /admin/[venueId]/publications
├ ƒ /admin/[venueId]/qr-menu
├ ƒ /admin/[venueId]/settings
├ ƒ /api/auth/login
├ ƒ /api/auth/logout
├ ƒ /api/me
├ ƒ /api/venues
├ ƒ /api/venues/[venueId]
├ ƒ /api/venues/[venueId]/categories
├ ƒ /api/venues/[venueId]/categories/[categoryId]
├ ƒ /api/venues/[venueId]/categories/reorder
├ ƒ /api/venues/[venueId]/items
├ ƒ /api/venues/[venueId]/items/[itemId]
├ ƒ /api/venues/[venueId]/items/bulk-visibility
├ ƒ /api/venues/[venueId]/items/reorder
├ ƒ /api/venues/[venueId]/items/import-csv
├ ƒ /api/venues/[venueId]/members
├ ƒ /api/venues/[venueId]/members/[memberId]
├ ƒ /api/venues/[venueId]/logo
├ ƒ /api/venues/[venueId]/public-preview
├ ƒ /api/venues/[venueId]/publications
├ ƒ /api/venues/[venueId]/publish
├ ƒ /api/venues/[venueId]/unpublish
├ ƒ /admin/venues/new
├ ○ /login                               (static)
├ ƒ /m/[slug]
└ ƒ /venues
ƒ Proxy (Middleware)
```

## 21. Key Decisions

- **Next.js 16 App Router** over Remix
- **Prisma v7** over Drizzle — explicit `prisma-adapter-sqlite`
- **Query engine type:** `library` (avoids binary dependencies in serverless)
- **SQLite** for initial dev, migrate to PostgreSQL later
- **Session-based auth** with HTTP-only cookie (`mofe_session`)
- **Generated Prisma client** at `src/generated/prisma` (custom output path)
- **proxy.ts export name** is `proxy` (not `middleware`) per Next.js 16.2.9 convention
- **Route params** are `Promise<{...}>` — must `await` (Next.js 16 convention)
- **Public menu** rendered on-the-fly from DB snapshot; CDN upload is future
- **Fonts:** all self-hosted — 5 files: Parastoo.woff2, Parastoo-Bold.woff2, Vazirmatn-VariableFont_wght.ttf, EBGaramond-VariableFont_wght.ttf, EBGaramond-Italic-VariableFont_wght.ttf
- **Bulk selection:** toggle mode (انتخاب چندتایی / پایان انتخاب) instead of persistent checkboxes
- **DnD:** two separate DndContexts (categories sidebar, items within category)
- **Filtered items sorted** by displayOrder after filter for DnD visual consistency
- **Test DB:** real SQLite `test.db`, global-setup creates fresh DB per run
- **Rate limiting:** in-memory `rateMap` on login (5 attempts/minute)
- **CSV import:** homegrown CSV parser with smart header detection, category auto-creation, import reporting
- **Logo upload:** sharp-based resize (500px) + WebP compression (≤50KB)
- **Member login scheme:** `username@venue.slug` email pattern

## 22. Documentation

- `NAVIGATION-GUIDE.md` — Project orientation guide
- `AGENTS.md` — AI-assisted development instructions

## 23. Next Steps

- Photo upload pipeline (Milestone 5 — Sharp is already a dependency, item photo UI not built)
- Photo management UI for items
- Custom domain flows (Milestone 9 — Domain model exists, subdomain + CNAME flows not built)
- CDN upload of static menu HTML
- Audit log recording on mutations (AuditLog model exists, wiring not done)
- Password reset flow
- CSV export functionality
- Analytics for QR menu views
- Scheduled visibility by station
- Menu item variants/sizes
- Allergen badges
- PostgreSQL migration path
