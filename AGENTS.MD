# AGENTS.MD — Agentic Development Guide for mofé

## Project Overview

Persian-first cafe menu management service. Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Prisma v7 + SQLite (dev). Two surfaces: admin web app + static public QR menus. Paper-and-ink design language (#f5f0e6 / #111111).

## Development Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build (verify after every change)
npm test             # Vitest run (82 tests)
npm run test:watch   # Watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run db:push      # Push schema to DB (after prisma changes)
npm run db:seed      # Seed demo data
npm run db:reset     # Full reset + migrate + seed
npm run db:studio    # Prisma Studio
```
- for internet access, use proxy at 172.25.144.1:10808

## Must-Do After Every Change

1. `npm run build` — verify compilation succeeds
2. `npm run typecheck` — TypeScript checks pass
3. `npm test` — all 82 tests pass
4. `npm run lint` — ESLint clean

## Critical Context & Gotchas

### Next.js 16
- **Proxy export:** `src/proxy.ts` must export `proxy` (NOT `middleware`). Matcher in proxy config: `["/((?!_next/static|_next/image|favicon.ico).*)"]`
- **Route params:** All route handler `params` must be `Promise<{ param: string }>` and `await`ed
- **App Router conventions:** Server components by default, `"use client"` only when needed (hooks, browser APIs, state)

### Prisma v7 + SQLite
- **Custom output path:** Client generated at `src/generated/prisma` — import from `@/generated/prisma/client`
- **Adapter:** `prisma-adapter-sqlite` wraps `node:sqlite`
- **Query engine:** `library` mode set in Prisma config (no binary dependencies)
- **Singleton:** `src/lib/prisma.ts` uses global singleton for hot-reload safety
- **Schema changes:** After editing `prisma/schema.prisma`, run `npx prisma db push` (no migration files in dev)
- **Seed:** `prisma/seed.ts` uses upsert for idempotency

### Auth
- **Cookie name:** `mofe_session`
- **Token:** 32-byte random hex, SHA-256 hashed before DB storage
- **Session TTL:** 7 days
- **Password:** bcrypt with 12 rounds
- **Helpers exported:** `hashToken`, `generateToken`, `hashPassword`, `verifyPassword`, `createSession`, `getCurrentUser`, `destroySession`

### Permissions
- 3 roles: `owner`, `manager`, `staff`
- Helper functions: `requireVenueAccess`, `requireRole`, `canManageCategories`, `canManageItems`, `canPublish`
- Every API route verifies auth + venue membership

### Fonts (self-hosted — NO external CDN)
- 5 font files in `public/fonts/`
- Body: `"Parastoo", "Vazirmatn", "Tahoma", sans-serif`
- Headings: `"EB Garamond", "Parastoo", "Vazirmatn", "Times New Roman", serif`
- @font-face declarations in `src/app/globals.css` AND inline in `src/lib/public-menu/renderer.ts`
- NEVER add Google Fonts or external font URLs

### Tailwind CSS v4
- No `tailwind.config.js` — CSS-based config via `@theme inline {}` in `globals.css`
- Import: `@import "tailwindcss"`
- Custom colors: `bg-paper`, `text-ink`, `text-ink-strong`, `text-ink-muted`, `border-line`, `bg-surface`
- Custom font: `font-serif` for EB Garamond headings

### Design Tokens (CSS vars in `:root`)
```
--paper: #f5f0e6;       --ink: #111111;
--ink-strong: #000000;  --ink-muted: #5f5a52;
--line: #d8d1c4;        --surface: rgba(255,255,255,0.28);
--radius-panel: 28px;   --radius-card: 24px;
--radius-control: 16px;
```

### Public Menu Renderer (`src/lib/public-menu/renderer.ts`)
- Pure functions: `renderPublicMenu(snapshot)` and `renderUnavailablePage(venueName)`
- Snapshot shape: `{ venue: { id, nameFa, nameEn, welcomeMessage, accentColor, slug, publicUrl }, categories: [{ id, nameFa, items: [{ id, nameFa, nameEn, description, priceToman, station, calories, soldOut }] }], generatedAt }`
- All user content HTML-escaped via `esc()` function
- Prices formatted with `toLocaleString("fa-IR")`
- Font @font-face repeated inline in rendered HTML
- RTL, mobile-first, inline CSS

### UI Components (`src/components/ui/`)
All use `forwardRef` where applicable. Variants:
- **Button:** `primary`/`secondary`/`tertiary`/`destructive`, sizes `sm`/`md`/`lg`
- **Toggle:** `role="switch"`, props: `on`, `onChange`, `disabled`
- **Input:** `label`, `error`, `helperText`
- **Badge:** `default`/`soldOut`/`hidden`, `muted` boolean
- **Modal:** `open`, `onClose`, `onConfirm`, `title`, `confirmLabel`, `confirmVariant`, `loading`
- **Panel:** `title`, `subtitle`, children
- **QRCodeExport:** client-side QR with canvas PNG + print PDF

### Testing
- **Framework:** Vitest v4
- **Config:** `vitest.config.ts` — `@/` path alias, `environment: "node"`, `globals: true`
- **Global setup:** `src/__tests__/global-setup.ts` — creates `test.db` with `prisma db push --accept-data-loss` before all tests, cleans up after
- **Per-file setup:** `src/__tests__/setup.ts` — sets `NODE_ENV=test`
- **Helpers:** `cleanTestData()` truncates all tables, `seedTestData()` creates test user + venue + 3 categories + 3 items
- **Integration tests:** Use dynamic `import()` for prisma to avoid hoisting issues
- Run: `npm test` (non-interactive) or `npm run test:watch` (watch mode)

### Key File Locations

| What | Path |
| --- | --- |
| Prisma schema | `prisma/schema.prisma` |
| Seed data | `prisma/seed.ts` |
| DB singleton | `src/lib/prisma.ts` |
| Auth functions | `src/lib/auth.ts` |
| Permissions | `src/lib/permissions.ts` |
| HTML renderer | `src/lib/public-menu/renderer.ts` |
| Auth proxy | `src/proxy.ts` |
| Design tokens + fonts | `src/app/globals.css` |
| UI components | `src/components/ui/` |
| Tests | `src/__tests__/` |
| Font files | `public/fonts/` |
| Prisma client | `src/generated/prisma/` |
| DB file (dev) | `dev.db` (project root) |
| DB file (test) | `test.db` (project root) |

## Common Development Patterns

### Adding a new API route
1. Create `src/app/api/venues/[venueId]/your-entity/route.ts`
2. Import `getCurrentUser` from `@/lib/auth` and `requireVenueAccess`/`requireRole` from `@/lib/permissions`
3. Await params: `const { venueId } = await params`
4. Return `NextResponse.json(...)` with appropriate status
5. Add tests in `src/__tests__/api/integration.test.ts`
6. Build + typecheck + test

### Adding a new admin page
1. Create `src/app/admin/[venueId]/your-page/page.tsx` (server component)
2. Fetch data using `getCurrentUser()` + `requireVenueAccess()` + `prisma`
3. Create `YourPageClient.tsx` (client component) for interactivity
4. Add nav link in `src/app/admin/[venueId]/layout.tsx`
5. Build + typecheck + test

### Adding a new UI component
1. Create file in `src/components/ui/`
2. Use `"use client"` if it uses hooks
3. Use design tokens (bg-paper, text-ink, border-line, etc.)
4. Follow existing patterns (forwardRef, variant props)
5. Build + typecheck

### Modifying the database schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma db push` (dev) — this updates the SQLite schema
3. Update seed data in `prisma/seed.ts` if needed
4. Run `npx prisma db seed`
5. Update test helpers in `src/__tests__/helpers.ts`
6. Run `npm test` (global-setup will recreate test.db)
7. Build + typecheck

## Environment

```env
DATABASE_URL="file:./dev.db"
```

Single env var. Test suite overrides with `file:./test.db` in global-setup.

## Demo Credentials

```
Email:    admin@nahal-cafe.ir
Password: demo1234
Role:     Owner of "کافه ناهال"
```
