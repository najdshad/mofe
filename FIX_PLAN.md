# Fix Plan — mofé Menu

Priority levels: **P0** (crash/security — must fix now) → **P3** (nice to have).

---

## P0 — Critical Bugs

### 1. Fix `PrismaPg` adapter — wrong constructor argument

**File:** `src/lib/prisma.ts`

`PrismaPg` expects a `pg.Pool` instance, not a connection string.

```typescript
// Current (broken):
const adapter = new PrismaPg(
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/mofe"
);

// Fix:
import { Pool } from "pg";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/mofe",
});
const adapter = new PrismaPg(pool);
```

**Validation:** App starts without crash; `npm test` passes.

---

### 2. Fix photo/logo URL resolution in snapshot builder

**File:** `src/lib/public-menu/publication.ts`

Both `venue.logoAssetId` and `item.photoAssetId` store raw asset UUIDs, not URLs. The snapshot must resolve to `Asset.publicUrl`.

- For `logoUrl`: look up the `Asset` record by `venue.logoAssetId` and use `publicUrl`
- For `photoUrl` (items): look up the `Asset` record by `item.photoAssetId` and use `publicUrl`
- Add a batch resolution helper to avoid N+1 queries

**Validation:** Test that `buildPublicSnapshot` with assets returns correct `publicUrl` values; renderer test verifies `<img src="...">` is valid.

---

### 3. Fix mass assignment vulnerability on venue PATCH

**File:** `src/app/api/venues/[venueId]/route.ts`

Current code passes entire request body to `prisma.venue.update()`. Whitelist allowed fields:

```typescript
const ALLOWED_FIELDS = [
  "nameFa", "nameEn", "timezone", "accentColor",
  "welcomeMessage", "menuPhotoMode",
] as const;

const body = await request.json();
const data: Record<string, unknown> = {};
for (const field of ALLOWED_FIELDS) {
  if (field in body) data[field] = body[field];
}
```

**Validation:** PATCH with `{ "slug": "hacked", "plan": "enterprise" }` is silently ignored.

---

## P1 — High Severity

### 4. Add `Content-Security-Policy` header

**File:** `next.config.ts`

Replace deprecated `X-XSS-Protection` with a CSP header:

```typescript
{
  key: "Content-Security-Policy",
  value: "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; script-src 'self'",
},
```

Also remove `X-XSS-Protection`.

**Validation:** `npm run build`; curl response headers show CSP.

---

### 5. Make CSV import transactional (rollback on failure)

**File:** `src/app/api/venues/[venueId]/items/import-csv/route.ts`

Wrap the destructive soft-delete + re-import in a Prisma interactive transaction. If any row fails, the entire import rolls back.

```typescript
const result = await prisma.$transaction(async (tx) => {
  // soft-delete existing
  await tx.menuItem.updateMany(...);
  await tx.category.updateMany(...);
  // ... create new data
});
```

Also add `logAudit` call for CSV imports (currently missing).

**Validation:** Import CSV with a bad row mid-file → no data loss; existing items remain.

---

### 6. Fix rate limiter race condition

**File:** `src/lib/rate-limit.ts`

Use atomic upsert with conditional check via a single Prisma query, or use a `$transaction` to eliminate the read-then-write window. Replace the current read-then-increment pattern with:

```typescript
// Option: use raw SQL for atomic conditional increment
// Or: move the comparison into a transaction with serializable isolation
```

Simpler fix: use a transaction:

```typescript
return await prisma.$transaction(async (tx) => {
  const entry = await tx.rateLimitEntry.findUnique({ where: { key } });
  // ... logic
});
```

**Validation:** Concurrent requests to the same key stay within limits.

---

### 7. Validate `as Role` cast in permission functions

**File:** `src/lib/permissions.ts`

Add a runtime check before accepting the role:

```typescript
const VALID_ROLES: Role[] = ["owner", "manager", "staff"];

function ensureValidRole(role: string): Role {
  if (!VALID_ROLES.includes(role as Role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  return role as Role;
}
```

**Validation:** `requireRole` throws on invalid DB data instead of silently accepting it.

---

## P2 — Medium Severity

### 8. Add React error boundaries to admin pages

**Files:** `src/app/admin/[venueId]/*/`

Add `error.tsx` files alongside admin page groups. Also add a root-level `error.tsx` for each venue segment.

**Validation:** Force a component error → graceful error UI shown, not white screen.

---

### 9. Type-safe Prisma where clause builders

**Files:** `src/app/api/venues/[venueId]/items/route.ts`, `src/app/api/venues/[venueId]/items/bulk-visibility/route.ts`

Replace `Record<string, unknown>` with strongly typed `Prisma.MenuItemWhereInput`.

**Validation:** `npm run typecheck` passes.

---

### 10. Consolidate three identical `canManage*` functions

**File:** `src/lib/permissions.ts`

Replace `canManageCategories`, `canManageItems`, `canPublish` with a single `canManage(userId, venueId)` function. Update all imports.

Also update AGENTS.md and tests.

**Validation:** `npm test` passes; all admin routes still enforce correctly.

---

### 11. Add try/catch around `JSON.parse` in public menu route

**File:** `src/app/m/[slug]/route.ts`

```typescript
let snapshot;
try {
  snapshot = JSON.parse(publication.snapshot);
} catch {
  const html = renderUnavailablePage(venue.nameFa);
  return new Response(html, { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
```

**Validation:** Corrupt snapshot in DB returns unavailable page, not crash.

---

### 12. Add database indexes on `AuditLog`

**File:** `prisma/schema.prisma`

```prisma
@@index([venueId])
@@index([actorUserId])
@@index([createdAt])
```

Run `npx prisma db push` after change.

**Validation:** `npx prisma db push` succeeds.

---

## P3 — Lower Severity / DX

### 13. Add HTTP-level integration tests

**File:** `src/__tests__/api/integration.test.ts`

Add tests that call actual route handlers via `fetch()`:
- `POST /api/auth/login` with valid/invalid credentials
- `GET /api/venues/[venueId]/items` with/without session
- `POST /api/venues/[venueId]/items` with owner vs staff
- `PATCH /api/venues/[venueId]` with mass assignment attempt

**Validation:** `npm test` passes with new tests.

---

### 14. Fix `fetchApi` header override bug

**File:** `src/lib/fetch-api.ts`

```typescript
const res = await fetch(url, {
  ...options,
  headers: { "Content-Type": "application/json", ...options?.headers },
});
```

**Validation:** Caller-supplied `Authorization` header does not remove `Content-Type`.

---

### 15. Add auth flow integration test

**File:** `src/__tests__/api/integration.test.ts`

Test the full session lifecycle end-to-end:
1. `createSession` → cookie set
2. `getCurrentUser` → returns user
3. `destroySession` → user is null
4. Expired session → user is null
5. Revoked session → user is null

**Validation:** `npm test` passes.

---

### 16. Separate `router.refresh()` from `useStatusMessage`

**File:** `src/hooks/useStatusMessage.ts`

Remove `router.refresh()` from `showStatus`. Let callers decide when to refresh. This removes the unexpected side effect.

Update all callers that relied on the refresh to call `router.refresh()` explicitly after their API call.

**Validation:** `npm run build` passes; status messages appear without page refresh.

---

### 17. Refactor `SettingsClient.tsx` into smaller components

**File:** `src/app/admin/[venueId]/settings/SettingsClient.tsx`

Split into:
- `VenueInfoSection.tsx` — name, timezone, accent color, welcome message, logo
- `MembersSection.tsx` — member list, add/edit/remove modals
- `ScheduleSection.tsx` — station schedule grid

**Validation:** `npm run build` passes; settings page functionality unchanged.

---

### 18. Add session cleanup mechanism

**File:** `prisma/schema.prisma` + new scheduled job or middleware

Add a TTL index or a periodic cleanup call:

```prisma
model Session {
  // ...
  @@index([expiresAt])
}
```

Create a utility `cleanupExpiredSessions()` that deletes sessions where `expiresAt < now()` and `revokedAt IS NOT NULL`. Call it periodically or on app startup in production.

**Validation:** Sessions table doesn't grow unbounded.

---

### 19. Add proxy tests

**File:** `src/__tests__/proxy/proxy.test.ts`

Unit test `proxy()` with mocked `NextRequest`:
- `app.subdomain` + `/admin` path with/without cookie
- `menu.subdomain` → always passes through
- Root domain → redirects to `app.` for dashboard paths
- `/api/auth` bypasses auth check
- Duplicate auth check removal (refactor first)

**Validation:** `npm test` passes.

---

### 20. Extract `VALID_STATIONS` constant

**Files:** `src/app/api/venues/[venueId]/items/route.ts`, `import-csv/route.ts`

Create `src/lib/constants.ts`:

```typescript
export const VALID_STATIONS = ["kitchen", "bar"] as const;
export type Station = (typeof VALID_STATIONS)[number];
```

Replace all `["kitchen", "bar"]` literals with `VALID_STATIONS`.

**Validation:** `npm run build` passes.

---

## Execution Order

| Phase | Items | Rationale |
|-------|-------|-----------|
| **Phase 1** | #1, #2, #3 | Critical bugs — production crashes / data corruption |
| **Phase 2** | #4, #5, #6, #7 | High security + correctness |
| **Phase 3** | #8, #9, #10, #11, #12 | Medium severity — robustness |
| **Phase 4** | #13, #14, #15 | Testing gaps — blocking quality confidence |
| **Phase 5** | #16, #17, #18, #19, #20 | DX and maintainability |

After each fix: `npm run build && npm run typecheck && npm test && npm run lint`
