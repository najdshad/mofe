# AGENTS.MD — Agentic Development Guide for mofé

## Project Overview

Persian-first cafe menu management service. Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Prisma v7 + PostgreSQL. Two surfaces: admin web app + static public QR menus. Paper-and-ink design language (#f5f0e6 / #111111).

## Development Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build (verify after every change)
npm test             # Vitest run (138 tests)
npm run test:watch   # Watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run db:push      # Push schema to DB (after prisma changes)
npm run db:seed      # Seed demo data
npm run db:reset     # Full reset + migrate + seed
npm run db:studio    # Prisma Studio
```
- for internet access, use proxy at 172.25.144.1:10808
- after each successful implementation, commit to git

### Internal Auth
- `requireInternalAuth()` from `@/lib/api-helpers` — checks `user.role === "internal"` in internal API routes
- Internal pages use `user.role !== "internal"` check in server component layout
- Internal users are mofé team members; they are NOT venue members

### Internal Tool (`/internal`)
- Routes: `/internal` (dashboard), `/internal/users` (create/list users), `/internal/venues` (create/list venues)
- API: `GET|POST /api/internal/users`, `GET|POST /api/internal/venues`
- Auth: every handler calls `requireInternalAuth()`; page layout checks `role === "internal"`
- Seed: `admin@mofe.ir` / `admin1234`

### Menu Photo Display Toggle
- `menuPhotoMode` boolean on Venue model (default: `false`)
- Toggle in venue settings page: "نمایش عکس آیتم‌ها در منوی عمومی"
- When enabled: snapshot captures `photoUrl` per item; renderer uses photo card layout
- When disabled: current text-only theme unchanged
- Requires re-publish after toggling

## Must-Do After Every Change

1. `npm run build` — verify compilation succeeds
2. `npm run typecheck` — TypeScript checks pass
3. `npm test` — all 138 tests pass
4. `npm run lint` — ESLint clean

## Critical Context & Gotchas

### Next.js 16
- **Proxy export:** `src/proxy.ts` must export `proxy` (NOT `middleware`). Matcher in proxy config: `["/((?!_next/static|_next/image|favicon.ico).*)"]`
- **Route params:** All route handler `params` must be `Promise<{ param: string }>` and `await`ed
- **App Router conventions:** Server components by default, `"use client"` only when needed (hooks, browser APIs, state)

### Prisma v7 + PostgreSQL
- **Custom output path:** Client generated at `src/generated/prisma` — import from `@/generated/prisma/client`
- **Adapter:** `@prisma/adapter-pg` wraps `pg` connection pool
- **Singleton:** `src/lib/prisma.ts` uses global singleton for hot-reload safety
- **Schema changes:** After editing `prisma/schema.prisma`, run `npx prisma db push`
- **Seed:** `prisma/seed.ts` uses upsert for idempotency

### Auth
- **Cookie name:** `mofe_session`
- **Token:** 32-byte random hex, SHA-256 hashed before DB storage
- **Session TTL:** 7 days
- **Password:** bcrypt with 12 rounds
- **Auth helpers exported:** `hashToken`, `generateToken`, `hashPassword`, `verifyPassword`, `createSession`, `getCurrentUser`, `destroySession`, `createPasswordResetToken`, `validatePasswordResetToken`, `consumePasswordResetToken`
- **Route auth helper:** `requireAuth()` from `@/lib/api-helpers` — used in every API route handler (throws `ApiError` on failure)
- **Error formatting:** `errorResponse(e)` from `@/lib/api-helpers` — wrap all route handlers in try/catch
- **Rate limiting:** DB-backed via `RateLimitEntry` model — `await rateLimit(key, maxAttempts=5, windowMs=60000)`

### Permissions
- 3 roles: `owner`, `manager`, `staff`
- Helper functions: `requireVenueAccess`, `requireRole`, `canManage`
- Every API route verifies auth (`requireAuth`) + venue membership (`requireVenueAccess`/`requireRole`)

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
- Snapshot shape: `{ venue: { id, nameFa, nameEn, welcomeMessage, accentColor, slug, publicUrl }, categories: [{ id, nameFa, items: [{ id, nameFa, nameEn, description, priceToman, station, calories, soldOut, variants: [{ nameFa, nameEn, priceModifier }], allergenCodes: string[] }] }], generatedAt }`
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
- **Global setup:** `src/__tests__/global-setup.ts` — pushes schema with `prisma db push --accept-data-loss` before all tests
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
| Audit helper | `src/lib/audit.ts` |
| Allergen constants | `src/lib/allergens.ts` |
| Route auth helpers | `src/lib/api-helpers.ts` |
| Permissions | `src/lib/permissions.ts` |
| HTML renderer | `src/lib/public-menu/renderer.ts` |
| Publication helpers | `src/lib/public-menu/publication.ts` |
| Auth proxy | `src/proxy.ts` |
| Rate limiter | `src/lib/rate-limit.ts` |
| Mailer | `src/lib/mailer.ts` |
| Storage | `src/lib/storage.ts` |
| Design tokens + fonts | `src/app/globals.css` |
| UI components | `src/components/ui/` |
| Tests | `src/__tests__/` |
| Font files | `public/fonts/` |
| Prisma client | `src/generated/prisma/` |
| Database (dev) | PostgreSQL via `DATABASE_URL` |
| Database (test) | PostgreSQL via `TEST_DATABASE_URL` |

## Common Development Patterns

### Adding a new API route
1. Create `src/app/api/venues/[venueId]/your-entity/route.ts`
2. Import `requireAuth`, `errorResponse` from `@/lib/api-helpers` and `requireVenueAccess`/`requireRole` from `@/lib/permissions`
3. Await params: `const { venueId } = await params`
4. Wrap handler body in `try { ... } catch (e) { return errorResponse(e); }`
5. Use `const user = await requireAuth()` for auth, then permission helpers for access control
6. Return `NextResponse.json(...)` with appropriate status
7. Add tests in `src/__tests__/api/integration.test.ts`
8. Build + typecheck + test

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
2. Run `npx prisma db push` (dev) — this updates the PostgreSQL schema
3. Update seed data in `prisma/seed.ts` if needed
4. Run `npx prisma db seed`
5. Update test helpers in `src/__tests__/helpers.ts`
6. Run `npm test` (global-setup will recreate the test database)
7. Build + typecheck

## Environment

```env
DATABASE_URL="postgresql://mofe:mofe@localhost:5432/mofe"

# Email (optional — logs to console when unset)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@mofe.ir"

# S3-compatible storage (optional — uses local filesystem when unset)
S3_BUCKET=""
S3_REGION=""
S3_ENDPOINT=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
```

Core: `DATABASE_URL`. Test suite uses `TEST_DATABASE_URL` (or falls back to `postgresql://localhost:5432/mofe_test`) in global-setup.

## Demo Credentials

```
Email:    admin@noghteh
Password: demo1234
Role:     Owner of "کافه نقطه"

Email:    admin@mofe.ir
Password: admin1234
Role:     Internal (mofé team)
```
