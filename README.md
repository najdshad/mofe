# mofé — کافه منو

A Persian-first cafe menu management service: menu management and publishing with QR codes, and a beautiful public menu — all in Persian, with a restrained paper-and-ink aesthetic.

Designed for cafe owners in Iran. Owners build and publish their menu, customers scan a QR code for a beautiful static menu — no app installs, no monthly SaaS fees from abroad.

## Features

### Menu Management
CRUD for categories and items with drag-and-drop reorder (@dnd-kit), Persian/English names, pricing, description, and calories. Variants with price modifiers, allergen badges (14 allergens), and sold-out toggles. CSV import with header alias detection and CSV export. Bulk delete, per-item sold-out toggles. Photo upload per item — auto-compressed to WebP ≤50KB via Sharp (max 500px).

### Public QR Menu
One-click publish stores a snapshot and serves a self-contained static HTML page at `/m/[slug]` — no API calls, and no JavaScript executes (the route serves a `script-src 'none'` CSP). RTL, mobile-first, Persian numerals, sold-out items with badges, sticky category navigation with scroll-based auto-highlight, allergen pills, variant badges. Served from an in-memory cache with 60s TTL. No app, no install — just a QR code.

### Auth & Venues
Session-based auth with signup and login. One owner per venue, with cross-venue isolation on every API route.

### Venue Management
Venue settings (name, welcome message) and appearance (accent color, logo upload with auto-compression).

### Security
Session-based auth with SHA-256 hashed tokens, 7-day TTL, 30-minute idle timeout, and bcrypt (12 rounds) password hashes. CSRF protection on all state-changing routes. DB-backed rate limiting (login, signup, uploads). Input validation, HTML escaping for the public menu, and SQL injection protection via Prisma ORM parameterized queries.

## Demo

| Email | Password | Role |
| --- | --- | --- |
| `admin@noghteh` | `demo1234` | Owner of "کافه نقطه" (seed venue) |

## Quick Start

```bash
export DATABASE_URL="postgresql://mofe:mofe@localhost:5432/mofe"   # prisma.config.ts reads this from the environment; no .env file ships in the repo
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production build |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run db:studio` | Prisma Studio |
| `npm run db:push` | db push + schema_migrations drop/recreate dance |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:reset` | Prisma migrate reset --force |
| `npx prisma db seed` | Seed demo data |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Web framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, custom paper-and-ink design tokens |
| Database | PostgreSQL, Prisma v7, @prisma/adapter-pg |
| Auth | Session-based, HTTP-only cookie, bcrypt + SHA-256 |
| Testing | Vitest |
| Infrastructure | systemd, nginx, PostgreSQL |

## Design

Paper-and-ink (#f5f0e6 / #111111). Self-hosted fonts (Parastoo, Vazirmatn, EB Garamond) — zero external CDN calls. RTL root layout.

See [`DESIGN-LANGUAGE.md`](./DESIGN-LANGUAGE.md) for the full system.

## Further Reading

| Document | What it covers |
| --- | --- |
| [`AGENTS.md`](./AGENTS.md) | AI-assisted development instructions, gotchas, testing |
| [`DESIGN-LANGUAGE.md`](./DESIGN-LANGUAGE.md) | Full design system specification |
| [`sample-csv.csv`](./sample-csv.csv) | CSV import template |
