# Ordering Section — Development Plan

## Overview

Add a full ordering system to the mofé admin UI. Staff can view a grid of tables, create/manage orders, send items to the kitchen, mark items as delivered, and finalize payment. Orders are persisted via the Go ordering service (PostgreSQL), and real-time sync across clients is provided by WebSocket.

Two surfaces:
- **Admin** (`/admin/[venueId]/orders`) — full ordering + table management (owner/manager)
- **Staff** (`/staff/[venueId]/orders`) — ordering only (all roles)

---

## Architecture

```
Browser (React)  ←→  Next.js API Routes (proxy)  ←→  Go Ordering Service (:8080)
                         ↕
                     Prisma (tables, auth)

WebSocket: Browser ←→ Go Service (:8080/ws) — direct connection (not proxied)
```

- **Order data** lives in Go-managed PostgreSQL tables (`orders`, `order_items`) — created by `ordering-service/migrations/001_add_orders_tables.up.sql`
- **Table data** lives in Prisma-managed tables (`VenueTable`) — queried directly by Next.js API routes
- **Auth** checked at both layers: Next.js API routes call `requireAuth()` + `requireVenueAccess()`, then forward the `mofe_session` cookie + `X-Venue-ID` header to Go, which re-validates
- **Real-time sync** via Go WebSocket hub (supports Redis pub/sub for multi-instance scaling)

---

## Phase 1: Database Changes

### 1a. Prisma — add `VenueTable` model

File: `prisma/schema.prisma`

```prisma
model VenueTable {
  id        String   @id @default(uuid())
  venueId   String
  number    Int
  label     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  venue Venue @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@unique([venueId, number])
  @@index([venueId, isActive])
}
```

Then:
```bash
npx prisma db push
npx prisma generate
```

### 1b. Seed tables

Update `prisma/seed.ts` to create tables (1–10) for demo venues.

### 1c. Go migration — add `COMPLETED` order status

New file: `ordering-service/migrations/002_add_completed_status.up.sql`

```sql
ALTER TYPE order_status ADD VALUE 'COMPLETED' AFTER 'DELIVERED';
```

This allows `order.status = 'COMPLETED'` as the payment-finalized state.

---

## Phase 2: Go Ordering Service — new handler endpoints

### 2a. Add missing endpoints to `orders.go`

| Endpoint | Handler | Purpose |
|---|---|---|
| `PATCH /api/orders/{id}/items/{itemId}/status` | `UpdateItemStatus` | Change item status (→ PREPARING / READY / DELIVERED) |
| `POST /api/orders/{id}/complete` | `CompleteOrder` | Mark order COMPLETED after payment |

`UpdateItemStatus`:
- Accepts `{ status: "PREPARING" | "READY" | "DELIVERED" }`
- Validates transition is legal (PENDING → PREPARING → READY → DELIVERED)
- Recalculates order total if item was in non-cancelled state
- If all items are DELIVERED, auto-set order to COMPLETED? No — wait for explicit `POST /complete`.

`CompleteOrder`:
- Sets `order.status = 'COMPLETED'`, `completed_at = NOW()`
- Requires all items to be DELIVERED (or force-close allowed?)
- Broadcasts `EventOrderCompleted`

### 2b. Register routes in `main.go`

```go
r.Patch("/api/orders/{id}/items/{itemId}/status", orderHandler.UpdateItemStatus)
r.Post("/api/orders/{id}/complete", orderHandler.CompleteOrder)
```

### 2c. Add WebSocket event types

In `ws.go`, add:
```go
const EventItemStatusChanged = "item_status_changed"
const EventOrderCompleted = "order_completed"
```

New event: `EventOrderCompleted` — broadcast when order is completed.

### 2d. Build & verify

```bash
cd ordering-service
go build ./cmd/server
go vet ./...
go test ./...
```

---

## Phase 3: Next.js API Proxy Routes

All under `src/app/api/venues/[venueId]/`.

### 3a. Proxy helper

File: `src/lib/ordering-proxy.ts`

```typescript
const ORDERING_SERVICE_URL = process.env.ORDERING_SERVICE_URL || "http://localhost:8080";

export async function proxyToOrdering(
  path: string,
  options: { method?: string; body?: unknown; cookie?: string; venueId: string }
) {
  const res = await fetch(`${ORDERING_SERVICE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Venue-ID": options.venueId,
      Cookie: `mofe_session=${options.cookie}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

### 3b. Route files

| File | Methods | Proxies to Go |
|---|---|---|
| `orders/route.ts` | GET, POST | `GET /api/orders`, `POST /api/orders` |
| `orders/[orderId]/route.ts` | GET | `GET /api/orders/{id}` |
| `orders/[orderId]/items/route.ts` | POST | `POST /api/orders/{id}/items` |
| `orders/[orderId]/items/[itemId]/route.ts` | PATCH, DELETE | `PATCH /api/orders/{id}/items/{itemId}`, `DELETE ...` |
| `orders/[orderId]/items/[itemId]/status/route.ts` | PATCH | `PATCH /api/orders/{id}/items/{itemId}/status` |
| `orders/[orderId]/send/route.ts` | POST | `POST /api/orders/{id}/send` |
| `orders/[orderId]/complete/route.ts` | POST | `POST /api/orders/{id}/complete` |

Each route:
1. Calls `requireAuth()`
2. Calls `requireVenueAccess()` with user + venueId
3. Reads `mofe_session` cookie from request
4. Calls `proxyToOrdering(path, { method, body, cookie, venueId })`
5. Returns the proxied response

### 3c. Table CRUD routes (no Go proxy)

| File | Methods | Purpose |
|---|---|---|
| `tables/route.ts` | GET, POST | List venue tables, add table |
| `tables/[tableId]/route.ts` | PUT, DELETE | Update/remove table |

`POST/PUT/DELETE` tables: check `requireRole(user.id, venueId, ["owner", "manager"])`.

### 3d. Menu items endpoint (for order form)

Already exists at `.../items/route.ts` (GET). No changes needed.

---

## Phase 4: Fix Staff Navigation

### 4a. `src/app/venues/page.tsx`

Current: if user has one venue and is not staff → redirect to `/admin/{venueId}/menu`.

Change to:
- **Staff** with one venue → redirect to `/staff/{venueId}/orders`
- **Owner/Manager** with one venue → redirect to `/admin/{venueId}/menu` (unchanged)
- Multiple venues → show list; staff links go to `/staff/{venueId}/orders`, others to `/admin/{venueId}/menu`

### 4b. Login redirect

`LoginForm.tsx` already redirects to `/venues`. Staff will now flow through `/venues` → `/staff/{venueId}/orders`.

---

## Phase 5: Staff UI (`/staff/[venueId]/orders`)

### 5a. Layout

File: `src/app/staff/[venueId]/layout.tsx`

Minimal layout — just header bar with:
- Left: venue name + "سفارشات" heading
- Right: user name + logout button

No nav tabs. No role redirect. Any venue member (staff/owner/manager) can access.

### 5b. Server page

File: `src/app/staff/[venueId]/orders/page.tsx`

```tsx
// Check auth
// Check venue membership (any role)
// Fetch tables from /api/venues/{venueId}/tables
// Fetch menu items from /api/venues/{venueId}/items
// Pass to OrdersClient
```

### 5c. OrdersClient

File: `src/app/staff/[venueId]/orders/OrdersClient.tsx`

Main layout: two-panel split.
- **Left panel (65%)**: `TableGrid` — interactive grid of tables
- **Right panel (35%)**: `OrderPanel` — order detail for selected table

State machine:
1. No table selected → show brief instructions / "یک میز را انتخاب کنید"
2. Table selected, no active order → show "شروع سفارش" button, create order on click
3. Order active → show full order panel (items, totals, actions)

WebSocket connection on mount → subscribe to `venue.{venueId}` channel → update order state in real time.

### 5d. TableGrid Component

File: `src/components/orders/TableGrid.tsx`

Renders a grid of table buttons. Each button shows:
- Table number (large text)
- Status indicator dot: green (free/no order), amber (active order), blue (ready/items delivered, pending payment)

Data model: `{ tableNumber: number; tableId: string; status: "free" | "active" | "ready" }`

Props: `tables: TableInfo[], selectedTable: number | null, onSelectTable: (n: number) => void`

Layout: CSS grid, responsive, 4–5 columns.

### 5e. OrderPanel Component

File: `src/components/orders/OrderPanel.tsx`

When a table with an active order is selected, this panel shows:

1. **Header**: Table number + order status badge
2. **Items list** (scrollable):
   - Per item: name, variant, quantity, unit price, line total
   - Item status badge (SENT / PREPARING / READY / DELIVERED / CANCELLED)
   - Actions per item:
     - Change quantity (only if status is SENT or PREPARING)
     - Cancel item
     - Mark PREPARING → READY → DELIVERED (buttons for next status)
3. **Footer**: 
   - Subtotal (sum of non-cancelled items)
   - Total (subtotal)
   - Action buttons:
     - "افزودن آیتم" → opens MenuItemBrowser
     - "ارسال به آشپزخانه" (Send to kitchen) — visible when order has pending items
     - "تسویه حساب" (Finalize payment) — visible when all items delivered
     - "لغو سفارش" (Cancel order) — visible for active orders

### 5f. MenuItemBrowser Component

File: `src/components/orders/MenuItemBrowser.tsx`

Modal component for browsing and adding menu items:

- Category tabs at top
- Search input (filters by name)
- Grid of menu item cards: name, price, variants (if any)
- Click item → if variants exist, show variant selector → confirm → POST to add item
- Closes after adding

---

## Phase 6: Admin Order Page (`/admin/[venueId]/orders`)

### 6a. Server page

File: `src/app/admin/[venueId]/orders/page.tsx`

Same as staff page but for owner/manager role only.

### 6b. AdminOrdersClient

File: `src/app/admin/[venueId]/orders/AdminOrdersClient.tsx`

Extends OrdersClient with:

1. **Table management mode**: Toggle a switch to enter "edit tables" mode
2. **In edit mode**: Add table button, remove button on each table, change number/label
3. **Modal for add/edit**: Input fields for table number and optional label

### 6c. Add nav link

In `src/app/admin/[venueId]/layout.tsx`, add "سفارشات" link between "منو" and "انتشار و QR":

```tsx
<Link href={`/admin/${venueId}/orders`} ...>سفارشات</Link>
```

---

## Phase 7: WebSocket Integration

### 7a. WebSocket hook

File: `src/lib/useOrderWebSocket.ts`

```tsx
"use client";

import { useEffect, useRef, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

export function useOrderWebSocket(
  venueId: string,
  onEvent: (event: { type: string; payload: unknown }) => void
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Connection established; server knows venue from session
    };

    ws.onmessage = (msg) => {
      const event = JSON.parse(msg.data);
      onEvent(event);
    };

    ws.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(() => { /* reconnect logic */ }, 3000);
    };

    return () => ws.close();
  }, [venueId]);
}
```

### 7b. Event types handled

| Event | Action in UI |
|---|---|
| `order_created` | Add to active orders map |
| `item_added` | Update order's items list |
| `item_updated` | Update item qty/notes |
| `item_cancelled` | Remove item from list, recalc totals |
| `item_status_changed` | Update item status badge |
| `order_status_changed` | Update order status badge |
| `order_completed` | Remove from active orders, show success |

### 7c. Integrate into OrdersClient

On mount, connect WebSocket. On receiving any event:
- If it affects the currently selected order → update state immediately
- If it affects another table → update the table status indicator

---

## Phase 8: Testing

### 8a. Staff navigation

- Staff login → redirected to `/staff/{venueId}/orders`
- Staff cannot access `/admin/{venueId}/orders` or other admin pages

### 8b. Order lifecycle (e2e)

1. Open staff UI → see table grid (all green)
2. Click table 3 → see "شروع سفارش" button
3. Click it → order created (DRAFT), table turns amber
4. Add 2 items via MenuItemBrowser → items appear in panel
5. Click "ارسال به آشپزخانه" → items become SENT
6. Click item "آماده شد" → item becomes READY
7. Click item "تحویل شد" → item becomes DELIVERED
8. All items delivered → "تسویه حساب" appears
9. Click → order COMPLETED, table turns green

### 8c. Real-time sync test

- Open two browser tabs to same venue
- Create order in tab 1 → appears in tab 2 within 1 second
- Add item in tab 1 → appears in tab 2
- Complete order in tab 1 → table turns green in tab 2

### 8d. Table CRUD (admin)

- Admin can add table with number 11
- Admin can remove table 11
- Staff cannot see add/remove controls

---

## File Inventory

### New files to create

| # | File | Purpose |
|---|---|---|
| 1 | `ordering-service/migrations/002_add_completed_status.up.sql` | Go migration: add COMPLETED to order_status enum |
| 2 | `ordering-service/migrations/002_add_completed_status.down.sql` | (optional) revert migration |
| 3 | `src/lib/ordering-proxy.ts` | Proxy helper to forward requests to Go service |
| 4 | `src/app/api/venues/[venueId]/orders/route.ts` | API: list/create orders |
| 5 | `src/app/api/venues/[venueId]/orders/[orderId]/route.ts` | API: get single order |
| 6 | `src/app/api/venues/[venueId]/orders/[orderId]/items/route.ts` | API: add item |
| 7 | `src/app/api/venues/[venueId]/orders/[orderId]/items/[itemId]/route.ts` | API: update/cancel item |
| 8 | `src/app/api/venues/[venueId]/orders/[orderId]/items/[itemId]/status/route.ts` | API: update item status |
| 9 | `src/app/api/venues/[venueId]/orders/[orderId]/send/route.ts` | API: send to kitchen |
| 10 | `src/app/api/venues/[venueId]/orders/[orderId]/complete/route.ts` | API: complete order |
| 11 | `src/app/api/venues/[venueId]/tables/route.ts` | API: list/add tables |
| 12 | `src/app/api/venues/[venueId]/tables/[tableId]/route.ts` | API: update/delete table |
| 13 | `src/app/staff/[venueId]/layout.tsx` | Staff layout |
| 14 | `src/app/staff/[venueId]/orders/page.tsx` | Staff orders server page |
| 15 | `src/app/staff/[venueId]/orders/OrdersClient.tsx` | Staff orders client |
| 16 | `src/app/admin/[venueId]/orders/page.tsx` | Admin orders server page |
| 17 | `src/app/admin/[venueId]/orders/AdminOrdersClient.tsx` | Admin orders client |
| 18 | `src/components/orders/TableGrid.tsx` | Table grid component |
| 19 | `src/components/orders/OrderPanel.tsx` | Order panel component |
| 20 | `src/components/orders/MenuItemBrowser.tsx` | Menu item browser modal |
| 21 | `src/lib/useOrderWebSocket.ts` | WebSocket hook |

### Files to modify

| # | File | Change |
|---|---|---|
| 1 | `prisma/schema.prisma` | Add `VenueTable` model |
| 2 | `prisma/seed.ts` | Seed demo tables |
| 3 | `src/app/venues/page.tsx` | Fix staff redirect + staff venue links |
| 4 | `src/app/admin/[venueId]/layout.tsx` | Add "سفارشات" nav link |
| 5 | `ordering-service/internal/handlers/orders.go` | Add `UpdateItemStatus`, `CompleteOrder` handlers |
| 6 | `ordering-service/internal/handlers/ws.go` | Add `EventItemStatusChanged`, `EventOrderCompleted` event types |
| 7 | `ordering-service/cmd/server/main.go` | Register new routes |
| 8 | `ordering-service/internal/handlers/orders_test.go` | Add tests for new handlers |

---

## Order Status Lifecycle (Final)

```
         ┌─────────────────────────────────────────┐
         │  Staff creates order (table selected)    │
         │  → DRAFT                                 │
         └─────────────┬───────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────────────────┐
         │  Staff adds items                        │
         │  → DRAFT (after first item added)        │
         └─────────────┬───────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────────────────┐
         │  Staff clicks "ارسال به آشپزخانه"        │
         │  → SENT                                  │
         │  Items: PENDING → SENT                    │
         └─────────────┬───────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                        ▼
   ┌──────────────┐      ┌──────────────┐
   │ Item → PREPARING    │ Staff can    │
   │ Item → READY        │ add more     │
   │ Item → DELIVERED    │ items        │
   └──────┬───────┘      └──────┬───────┘
          │                     │
          └─────────┬───────────┘
                    ▼
         ┌─────────────────────────────────────────┐
         │  All items DELIVERED                     │
         │  Staff clicks "تسویه حساب"                │
         │  → COMPLETED                              │
         │  Table marked free                        │
         └─────────────────────────────────────────┘
```

Item status progression (staff-operated): SENT → PREPARING → READY → DELIVERED
Order auto-completes when all items delivered? No — explicit "تسویه حساب" click required.

---

## Go Service Route Table

| Method | Path | Handler | Auth | Role |
|---|---|---|---|---|
| GET | `/api/orders` | `ListOrders` | Session | Any |
| POST | `/api/orders` | `CreateOrder` | Session | Any |
| GET | `/api/orders/{id}` | `GetOrder` | Session | Any |
| POST | `/api/orders/{id}/items` | `AddItem` | Session | Any |
| PATCH | `/api/orders/{id}/items/{itemId}` | `UpdateItem` | Session | Any |
| DELETE | `/api/orders/{id}/items/{itemId}` | `CancelItem` | Session | Any |
| PATCH | `/api/orders/{id}/items/{itemId}/status` | `UpdateItemStatus` | Session | Any |
| POST | `/api/orders/{id}/send` | `SendToKitchen` | Session | Any |
| POST | `/api/orders/{id}/complete` | `CompleteOrder` | Session | Any |
| GET | `/api/admin/analytics/daily-summary` | `DailySummary` | Session | OWNER, MANAGER |
| WS | `/ws` | `HandleWebSocket` | Session | Any |
| GET | `/health` | `HealthCheck` | None | — |
| GET | `/metrics` | `MetricsHandler` | None | — |

---

## Implementation Order

1. **Database**: Prisma `VenueTable` → push → generate → seed
2. **Go service**: migration → handlers → routes → build → test
3. **Next.js proxy**: helper → order routes → table routes
4. **Staff navigation fix**: venues page + login flow
5. **Staff UI**: layout → server page → OrdersClient → TableGrid → OrderPanel → MenuItemBrowser
6. **Admin UI**: server page → AdminOrdersClient (extends OrdersClient with table management)
7. **WebSocket**: hook → integrate into OrdersClient
8. **Verification**: `npm run build` + `npm run typecheck` + `npm test` + `npm run lint`
