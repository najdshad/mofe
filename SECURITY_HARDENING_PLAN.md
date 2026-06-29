# Security Hardening Plan — mofé

Comprehensive remediation plan organized by priority. See below for per-file
changes, test expectations, and effort estimates.

---

## Phase 1 — Immediate (Critical + High)

### 1.1 Fix WebSocket `CheckOrigin` — CRITICAL
**Files:** `ordering-service/internal/handlers/ws.go:16-18`

Replace `return true` with an origin allowlist. Malicious sites can otherwise
open WebSocket connections to receive live order data via the victim's session
cookie.

### 1.2 Fix `CancelItem` Status Validation — CRITICAL
**Files:** `ordering-service/internal/handlers/orders.go:598-677`

`CancelItem` does not check the item's current status before cancelling. An
attacker or staff can cancel DELIVERED items, enabling refund fraud. Add the
same status guard that `UpdateItem` uses (only `PENDING`/`SENT` can be
modified).

### 1.3 Fix CORS Misconfiguration — HIGH
**Files:** `ordering-service/internal/middleware/cors.go:7-10`

Wildcard `*` with `Access-Control-Allow-Credentials: true` violates the CORS
spec. Set the explicit allowed origin instead.

### 1.4 Fix Health Endpoint Info Leak — HIGH
**Files:** `ordering-service/internal/handlers/health.go:14-17`

Raw `err.Error()` from `db.PingContext` is serialised into the response body,
leaking database type, version, and connection-string fragments. Log the error
server-side; return a generic message.

### 1.5 Remove Demo Auto-Creation Backdoor — HIGH
**Files:**
- `src/app/api/auth/login/route.ts:45-48`
- `src/app/login/page.tsx:15-17`

Anyone who knows `admin@noghteh` can create an owner-level account in
production. Remove the `ensureDemoData` call from the login route (or gate
behind `NODE_ENV !== "production"`). Also remove demo credentials from the
login-page UI in production.

### 1.6 Fix Password-Reset Token Exposure & User Enumeration — HIGH
**Files:** `src/app/api/auth/password-reset/request/route.ts:28-43`

- Reset URL is returned in the JSON response body (should be email-only).
- Non-existent email returns a different HTTP status + message than an existing
  email, enabling user enumeration.
- Fix: return identical response for both cases; remove `resetUrl` from body.

### 1.7 Add CSRF Protection to Ordering Service — HIGH
**Files:** New file `ordering-service/internal/middleware/csrf.go`
**Registration:** `ordering-service/cmd/server/main.go`

All state-changing endpoints (POST/PATCH/DELETE) lack CSRF protection. Add
Origin/Referer validation middleware and register it in the router chain.

### 1.8 Add Input-Length Validation — HIGH
**Files:** `ordering-service/internal/handlers/orders.go`

`TableNumber`, `Notes`, and `MenuItemID` have no maximum length. Add
constants (`maxNotesLength`, `maxTableNumberLength`) and reject oversized
input with 400.

---

## Phase 2 — This Sprint (Medium/High)

### 2.1 Fix 6 Staff Privilege Escalation Routes
**Files:**
- `photo/route.ts:21,110`
- `prices/route.ts:34`
- `variants/route.ts:34`
- `allergens/route.ts:34`
- `schedules/route.ts:35`
- `logo/route.ts:20,88`

These mutation endpoints use `requireVenueAccess()` instead of `canManage()`,
allowing `staff` role to mutate data. Replace with `canManage()` check.

### 2.2 Fix Mass Assignment on Category/Item PATCH
**Files:**
- `categories/[categoryId]/route.ts:19`
- `items/[itemId]/route.ts:44`

Both pass `data: body` directly to Prisma with no field allowlist, enabling
over-posting of internal fields. Add a `const ALLOWED` whitelist for each.

### 2.3 Add Rate Limiting to Password-Reset Confirm
**Files:** `src/app/api/auth/password-reset/confirm/route.ts`

Add IP-based rate limiting (same pattern as login and password-reset request).

### 2.4 Raise Password Minimum to 8 Characters
**Files:**
- `src/app/api/auth/login/route.ts:36`
- `src/app/api/auth/password-reset/confirm/route.ts:18`
- `src/app/api/internal/users/route.ts:34`
- `prisma/seed.ts`
- `src/lib/demo.ts:5`

Change minimum from 6 to 8 characters. Update demo passwords accordingly.

### 2.5 Fix Rate-Limiter IP Spoofing
**Files:** `src/lib/rate-limit.ts`, `src/app/api/auth/login/route.ts:27`

`X-Forwarded-For` is trust-based and can be spoofed. Add a `getClientIP()`
helper that respects `X-Real-IP` from a trusted proxy and falls back to the
first `X-Forwarded-For` value.

### 2.6 Fix Fragile Error Classification
**Files:**
- `src/lib/permissions.ts:22,36`
- `src/lib/api-helpers.ts:30-36`

`requireVenueAccess` and `requireRole` throw plain `Error` with message
prefixes; `errorResponse` uses fragile string-matching to derive HTTP status
codes. Change both to throw `ApiError` with proper status codes.

### 2.7 Remove User Enumeration from Login
**Files:** `src/app/api/auth/login/route.ts:57-62`

Inactive accounts return 403 with a distinct message. Collapse the inactive
check into the generic wrong-credentials path so all failure cases are
indistinguishable.

---

## Phase 3 — Next Sprint (Medium/Low)

| # | Item | Key Files |
|---|------|-----------|
| 3.1 | Session limits + idle timeout | `src/lib/auth.ts`, `prisma/schema.prisma` |
| 3.2 | Add `expiresAt` index on `PasswordResetToken` | `prisma/schema.prisma` |
| 3.3 | Rate-limit entry cleanup job | `src/lib/rate-limit.ts` |
| 3.4 | Audit logging on login events | `src/app/api/auth/login/route.ts` |
| 3.5 | Account lockout mechanism | `prisma/schema.prisma`, `login/route.ts` |
| 3.6 | Recalculate total in `SendToKitchen` | `ordering-service/internal/handlers/orders.go` |
| 3.7 | Defence-in-depth role check in analytics handler | `ordering-service/internal/handlers/analytics.go` |
| 3.8 | Crash if `DATABASE_URL` is unset | `ordering-service/internal/config/config.go` |

---

## Verification

After each phase:

```bash
# Next.js
npm run build && npm run typecheck && npm test && npm run lint

# Ordering service
cd ordering-service && go vet ./... && go test ./...
```
