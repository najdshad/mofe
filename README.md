# mofé — کافه منو

A Persian-first cafe and restaurant management service: menu management, real-time ordering, sales analytics, QR menus, billing, and team collaboration — all in Persian, with a restrained paper-and-ink aesthetic.

Designed for cafe owners in Iran. Staff take orders on tablets, the kitchen sees them in real time, customers scan a QR code for a beautiful static menu, and the owner gets sales reports — no app installs, no monthly SaaS fees from abroad.

## Features

### Menu Management
CRUD for categories and items with drag-and-drop reorder, Persian/English names, pricing, description, station assignment, and calories. Variants (single/double/etc.) with price modifiers, allergen badges, and sold-out toggles. CSV import with smart header detection and CSV export. Bulk visibility and delete operations. Photo upload per item — auto-compressed to WebP ≤50KB via Sharp.

### Real-Time Ordering System
A separate Go service (chi v5, WebSocket) powers live order management. Staff create orders on a table grid, add items with variant/quantity/notes, send to the kitchen, and track item status (SENT → PREPARING → READY → DELIVERED). All mutations broadcast to venue-scoped WebSocket clients. Optional Redis pub/sub for horizontal scaling. Offline queue replays operations when connectivity resumes.

### Sales Dashboard
Aggregated revenue and order data with Shamsi (Persian) date charts via Recharts. Daily/weekly/monthly/yearly/custom ranges. Summary cards (total orders, revenue, average order value). Item-level breakdown: top items, hourly revenue distribution, category breakdown. CSV export with formula injection protection.

### Public QR Menu
One-click publish produces a self-contained static HTML page (~10KB, zero JavaScript, no API calls) accessible at `/m/[slug]`. RTL, mobile-first, Persian numerals, sold-out items with badges, sticky category navigation with IntersectionObserver auto-highlight, allergen pills, variant badges, and an optional photo mode. Served from an in-memory cache with 60s TTL. No app, no install — just a QR code.

### Staff & Permissions
Three venue roles: owner, manager, staff. Owners manage everything, managers handle operations, staff take orders. Role-based enforcement on all API routes. Multi-venue support with cross-venue isolation. Staff member login via `username@venue.slug` email scheme.

### Billing & Subscriptions
Three plans (Basic/Pro/Premium) with tiered item and table limits. Free trials (14 days for Basic, 7 for Pro/Premium). Prorated plan upgrades, downgrades deferred to period end. Coupon discounts with usage limits and expiry. Zarinpal sandbox integration for payment processing.

### Venue Management
Venue settings (name, timezone, welcome message, accent color). Logo upload with auto-compression. Member management with add/remove/role change. Station schedules — per-day, per-station (kitchen/bar) operating hours. Photo display toggle for the public menu.

### Internal Admin Tool
Role-gated (`role === "internal"`) panel for the mofé team. User management (list/create accounts) and venue management (list/create venues with owner assignment).

### Security
Session-based auth with SHA-256 hashed tokens, 7-day TTL, idle timeout. CSRF protection on all state-changing routes (Next.js and Go). DB-backed rate limiting (login, password reset). Input validation, HTML sanitization for the public menu, and SQL injection protection via parameterized queries.

### Audit Logging
All mutations (categories, items, members, publish/unpublish) logged to the AuditLog table with actor, action, entity, and metadata. Fire-and-forget — never fails the primary operation.

## Demo

| Email | Password | Role |
| --- | --- | --- |
| `admin@noghteh` | `demo1234` | Owner of "کافه نقطه" (seed venue) |
| `admin@mofe.ir` | `admin1234` | Internal (mofé team) |

## Quick Start

```bash
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For the ordering service (Go):
```bash
cd ordering-service && go run ./cmd/server
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Run 475 tests (24 files) |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed demo data |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Web framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS v4, custom paper-and-ink design tokens |
| Database | PostgreSQL, Prisma v7, @prisma/adapter-pg |
| Auth | Session-based, HTTP-only cookie, bcrypt + SHA-256 |
| Real-time | Go 1.23, chi v5, gorilla/websocket |
| Queue | localStorage-based offline queue (client-side) |
| Testing | Vitest (475 tests), Go tests |
| Infrastructure | Docker, nginx, optional Redis |

## Design

Paper-and-ink (#f5f0e6 / #111111). Self-hosted fonts (Parastoo, Vazirmatn, EB Garamond) — zero external CDN calls. RTL root layout.

See [`DESIGN-LANGUAGE.md`](./DESIGN-LANGUAGE.md) for the full system.

## Development Status

> 🚧 This project is in active development and has not been deployed to production. Zarinpal runs in sandbox/mock mode. The subscription billing system is implemented but untested with real payments.

## Further Reading

| Document | What it covers |
| --- | --- |
| [`NAVIGATION-GUIDE.md`](./NAVIGATION-GUIDE.md) | Directory structure, conventions, architecture, dev tasks |
| [`AGENTS.md`](./AGENTS.md) | AI-assisted development instructions, gotchas, testing |
| [`PRD.md`](./PRD.md) | Product requirements |
| [`DESIGN-LANGUAGE.md`](./DESIGN-LANGUAGE.md) | Full design system specification |
| [`sample-csv.csv`](./sample-csv.csv) | CSV import template (66 items) |
