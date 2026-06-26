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

### 4.0 Internal Role

- **Internal** — mofé team member with `role === "internal"` on User model (NOT a VenueMember)
- Has access to `/internal` tool for creating user accounts and venues
- Authenticated via same session cookie; authorization checked via `requireInternalAuth()`

### 4.1 Venue Roles

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

14 models: User, Venue, VenueMember, Category, MenuItem, Asset, MenuPublication, Domain, AuditLog, Session, PasswordResetToken, StationSchedule, MenuItemVariant, MenuItemAllergen.

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
| POST | `/api/auth/password-reset/request` | ✅ Request reset (rate-limited, returns link) |
| POST | `/api/auth/password-reset/confirm` | ✅ Confirm reset (new password, revokes sessions) |

### 17.2 Internal (mofé team)

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/internal/users` | ✅ List all users |
| POST | `/api/internal/users` | ✅ Create user account |
| GET | `/api/internal/venues` | ✅ List all venues |
| POST | `/api/internal/venues` | ✅ Create venue with owner |

### 17.3 Venues

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues` | ✅ List accessible venues |
| GET | `/api/venues/:venueId` | ✅ Get venue |
| PATCH | `/api/venues/:venueId` | ✅ Update venue |

### 17.4 Categories

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues/:venueId/categories` | ✅ List categories |
| POST | `/api/venues/:venueId/categories` | ✅ Create category |
| PATCH | `/api/venues/:venueId/categories/:id` | ✅ Update category |
| DELETE | `/api/venues/:venueId/categories/:id` | ✅ Soft-delete (blocked if items exist) |
| POST | `/api/venues/:venueId/categories/reorder` | ✅ Batch reorder |

### 17.5 Items

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues/:venueId/items` | ✅ List with filters |
| POST | `/api/venues/:venueId/items` | ✅ Create item |
| GET | `/api/venues/:venueId/items/:id` | ✅ Get item |
| PATCH | `/api/venues/:venueId/items/:id` | ✅ Update item |
| DELETE | `/api/venues/:venueId/items/:id` | ✅ Soft-delete |
| POST | `/api/venues/:venueId/items/bulk-visibility` | ✅ Bulk update |
| POST | `/api/venues/:venueId/items/reorder` | ✅ Batch reorder |
| POST | `/api/venues/:venueId/items/:id/photo` | ✅ Upload item photo (sharp resize + WebP) |
| DELETE | `/api/venues/:venueId/items/:id/photo` | ✅ Delete item photo |
| GET | `/api/venues/:venueId/items/export-csv` | ✅ Export items as CSV |
| GET | `/api/venues/:venueId/items/:id/variants` | ✅ List item variants |
| POST | `/api/venues/:venueId/items/:id/variants` | ✅ Bulk-replace item variants |
| GET | `/api/venues/:venueId/items/:id/allergens` | ✅ List item allergen codes |
| POST | `/api/venues/:venueId/items/:id/allergens` | ✅ Bulk-replace item allergens |

### 17.6 Members

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues/:venueId/members` | ✅ List members |
| POST | `/api/venues/:venueId/members` | ✅ Add member (creates user + membership) |
| PATCH | `/api/venues/:venueId/members/:memberId` | ✅ Update member role/name/password |
| DELETE | `/api/venues/:venueId/members/:memberId` | ✅ Remove member |

### 17.7 Assets

| Method | Endpoint | Status |
| --- | --- | --- |
| POST | `/api/venues/:venueId/logo` | ✅ Upload venue logo (sharp resize + WebP) |
| DELETE | `/api/venues/:venueId/logo` | ✅ Delete venue logo |

### 17.8 CSV Import

| Method | Endpoint | Status |
| --- | --- | --- |
| POST | `/api/venues/:venueId/items/import-csv` | ✅ Import items from CSV (smart header detection, batch creation) |

### 17.9 Publishing and QR

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues/:venueId/public-preview` | ✅ Draft preview payload |
| POST | `/api/venues/:venueId/publish` | ✅ Publish (creates snapshot) |
| POST | `/api/venues/:venueId/unpublish` | ✅ Unpublish |
| GET | `/api/venues/:venueId/publications` | ✅ List last 20 |
| POST | `/api/venues/:venueId/publications/:id/retry` | ❌ Future |

### 17.10 Schedules

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues/:venueId/schedules` | ✅ List station schedules |
| POST | `/api/venues/:venueId/schedules` | ✅ Bulk-replace station schedules |

### 17.11 Domains

| Method | Endpoint | Status |
| --- | --- | --- |
| GET | `/api/venues/:venueId/domain` | ❌ Future |
| POST | `/api/venues/:venueId/domain` | ❌ Future |
| POST | `/api/venues/:venueId/domain/verify` | ❌ Future |
| DELETE | `/api/venues/:venueId/domain/:id` | ❌ Future |

## 18. Testing

**Framework:** Vitest v4, default pool.

**Test files:** 130 tests across 6 files
- `src/__tests__/lib/public-menu/renderer.test.ts` — 48 tests (HTML structure, Persian formatting, escaping, edge cases)
- `src/__tests__/api/integration.test.ts` — 46 tests (auth, categories/items CRUD, reorder, bulk visibility, publish workflow, permissions, CSV import, publication edge cases, public menu rendering)
- `src/__tests__/lib/api-helpers.test.ts` — 12 tests (ApiError, errorResponse, requireAuth, getCurrentUser edge cases)
- `src/__tests__/lib/auth.test.ts` — 8 tests (hashToken, generateToken, hashPassword, verifyPassword)
- `src/__tests__/lib/config.test.ts` — 8 tests (getPublicMenuUrl)
- `src/__tests__/lib/rate-limit.test.ts` — 8 tests (rateLimit helper)

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

### ✅ Milestone 5 — Media Uploads
- Photo upload endpoint and UI for items (sharp resize 500px + WebP ≤50KB)
- Same pattern as logo upload, stores to local filesystem

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

### ✅ Milestone 9 — Feature Completeness
- Password reset flow (request + confirm endpoints, UI)
- Audit log wiring across all mutation handlers
- CSV export endpoint
- Item photo upload + UI
- Station schedule management (schema + settings UI)
- Menu item variants/sizes (schema + UI + public menu renderer)
- Allergen badges (schema + UI + public menu renderer)

### ✅ Milestone 10 — Internal Admin Tool
- Internal user role (`User.role`: `"user"` / `"internal"`)
- Internal auth check: `requireInternalAuth()` in API routes
- `/internal` layout with role guard
- User management page: list all users, create accounts (name, email, password)
- Venue management page: list all venues, create venues with owner assignment
- Seed: `admin@mofe.ir` / `admin1234`

### ✅ Milestone 11 — Menu Photo Display
- `menuPhotoMode` boolean on Venue model (default `false`)
- Toggle in settings page: "نمایش عکس آیتم‌ها در منوی عمومی"
- Snapshot captures `photoUrl` per item when enabled
- Public menu renderer: photo card layout (vertical card with top image)
- Non-photo mode: current text-only theme unchanged

### ⏳ Milestone 12 — Domains and Plans (Not started)

### ⏳ Milestone 13 — Hardening and Launch (Partially started)
- Completed: Vitest test suite with 130 tests, 6 test files

## 20. Current Build

```
npm run build → 40 routes
├ ○ /                                    (static)
├ ○ /_not-found
├ ƒ /admin/[venueId]/menu
├ ƒ /admin/[venueId]/publications
├ ƒ /admin/[venueId]/qr-menu
├ ƒ /admin/[venueId]/settings
├ ƒ /api/auth/login
├ ƒ /api/auth/logout
├ ƒ /api/auth/password-reset/confirm
├ ƒ /api/auth/password-reset/request
├ ƒ /api/internal/users
├ ƒ /api/internal/venues
├ ƒ /api/me
├ ƒ /api/venues
├ ƒ /api/venues/[venueId]
├ ƒ /api/venues/[venueId]/categories
├ ƒ /api/venues/[venueId]/categories/[categoryId]
├ ƒ /api/venues/[venueId]/categories/reorder
├ ƒ /api/venues/[venueId]/items
├ ƒ /api/venues/[venueId]/items/[itemId]
├ ƒ /api/venues/[venueId]/items/[itemId]/allergens
├ ƒ /api/venues/[venueId]/items/[itemId]/photo
├ ƒ /api/venues/[venueId]/items/[itemId]/variants
├ ƒ /api/venues/[venueId]/items/bulk-delete
├ ƒ /api/venues/[venueId]/items/bulk-visibility
├ ƒ /api/venues/[venueId]/items/export-csv
├ ƒ /api/venues/[venueId]/items/import-csv
├ ƒ /api/venues/[venueId]/items/reorder
├ ƒ /api/venues/[venueId]/logo
├ ƒ /api/venues/[venueId]/members
├ ƒ /api/venues/[venueId]/members/[memberId]
├ ƒ /api/venues/[venueId]/public-preview
├ ƒ /api/venues/[venueId]/publications
├ ƒ /api/venues/[venueId]/publish
├ ƒ /api/venues/[venueId]/schedules
├ ƒ /api/venues/[venueId]/unpublish
├ ƒ /internal
├ ƒ /internal/users
├ ƒ /internal/venues
├ ○ /login                               (static)
├ ƒ /m/[slug]
├ ○ /password-reset                      (static)
├ ƒ /password-reset/[token]
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

## 23. Prioritized Roadmap

Ordered by value, dependencies, and effort. Tasks with existing models/infra come first.

### ✅ Priority 1 — Password Reset Flow
- `POST /api/auth/password-reset/request` and `POST /api/auth/password-reset/confirm` endpoints
- Reset token generation, expiry, confirmation
- UI: request form + reset form + confirmation
- Invalidates all existing sessions on password change

### ✅ Priority 2 — Audit Log Wiring
- `AuditLog` model wired into all mutation handlers (categories CUD, items CUD, publish/unpublish, member management)
- Records actor, action, entity type/id, and metadata

### ✅ Priority 3 — CSV Export
- `GET /api/venues/:venueId/items/export-csv` endpoint
- UTF-8 BOM CSV with proper escaping
- Client button updated to use server endpoint

### ✅ Priority 4 — Photo Upload for Items (Milestone 5)
- `POST|DELETE /api/venues/:venueId/items/:id/photo` endpoints
- Sharp-based resize (500px) + WebP compression (≤50KB)
- Photo preview, upload, and delete in item edit modal

### ✅ Priority 5 — Scheduled Visibility by Station
- `StationSchedule` model with day-of-week + time ranges
- `GET|POST /api/venues/:venueId/schedules` (bulk replace)
- Schedule editor UI in settings page (per-day toggles with time pickers)

### ✅ Priority 6 — Menu Item Variants / Sizes
- `MenuItemVariant` model (nameFa, nameEn, priceModifier, displayOrder)
- `GET|POST /api/venues/:venueId/items/:id/variants` (bulk replace)
- Variant editor in item modal (add/remove/edit name + price modifier)
- Public menu renderer: variant pills with price display

### ✅ Priority 7 — Allergen Badges
- `MenuItemAllergen` model with allergen codes
- `src/lib/allergens.ts` with 14 allergen codes and Persian labels
- `GET|POST /api/venues/:venueId/items/:id/allergens` (bulk replace)
- Toggle-chip UI in item modal
- Public menu renderer: allergen badges with Persian labels

### ✅ Priority 8 — Internal Admin Tool
- User role (`"internal"`) for mofé team
- `/internal` page group with role guard
- Create/list users and venues via internal API + UI
- Seed: `admin@mofe.ir` / `admin1234`

### ✅ Priority 9 — Menu Photo Display Toggle
- `menuPhotoMode` field on Venue (default `false`)
- Toggle in venue settings
- New photo card theme in public menu renderer
- Snapshot captures `photoUrl` when enabled

### Priority 10 — Custom Domains
- `Domain` model exists, subdomain + CNAME flows not built
- `GET|POST /api/venues/:venueId/domain`, `POST .../verify`, `DELETE .../:id`
- DNS verification, routing, SSL
- High value for multi-venue pro plans but complex implementation

### Priority 11 — CDN Upload of Static Menu HTML
- Needs CDN infrastructure in place
- Upload publication snapshots on publish
- Serve from CDN instead of DB on public route

### Priority 12 — Analytics for QR Menu Views
- Tracking pixel or server-side view logging
- Dashboard for view counts
- Needs tracking infra; nice-to-have

### Infrastructure — PostgreSQL Migration
- Prerequisite for production launch
- Requires adapter swap, connection pooling, migration workflow
