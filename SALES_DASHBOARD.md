# Sales Dashboard — Development Plan

## Overview

Add a sales tracking and visualization dashboard to the admin panel. Sales are derived from **COMPLETED orders** (no explicit payment step). A new `Sale` table in Prisma stores denormalized records written by the Go ordering service upon order completion. A new `/admin/{venueId}/sales` page displays Recharts-based graphs with daily/weekly/monthly/yearly/custom range views.

---

## 1. New Prisma Model: `Sale`

### Schema (`prisma/schema.prisma`)

```prisma
model Sale {
  id          String   @id @default(uuid())
  venueId     String
  orderId     String   @unique
  total       Int                // tomans
  itemCount   Int                // number of non-cancelled items
  completedAt DateTime           // matches orders.completed_at
  createdAt   DateTime @default(now())

  venue Venue @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@index([venueId, completedAt])
}
```

- `orderId` is `@unique` to prevent double-recording the same order
- `completedAt` is the order's actual completion timestamp (not `createdAt`), so historical backfill works correctly
- `total` is `Int` tomans (matching existing price conventions)
- `itemCount` is the count of non-cancelled order items

### Migration

Create `ordering-service/migrations/003_add_sales_table.up.sql`:

```sql
CREATE TABLE "Sale" (
    id           TEXT PRIMARY KEY,
    venue_id     TEXT NOT NULL REFERENCES "Venue"(id) ON DELETE CASCADE,
    order_id     TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    total        INT NOT NULL CHECK (total >= 0),
    item_count   INT NOT NULL CHECK (item_count >= 0),
    completed_at TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_venue_completed ON "Sale"(venue_id, completed_at DESC);
```

And corresponding `003_add_sales_table.down.sql`:

```sql
DROP TABLE IF EXISTS "Sale";
```

### Run

After schema + migration files are created:
- `npx prisma db push` to sync Prisma's shadow database
- `npx prisma generate` to regenerate client
- Restart the Go ordering service (migrations run automatically at startup)

---

## 2. Go Ordering Service — Write Sale on Order Completion

### File: `ordering-service/internal/handlers/orders.go`

Modify `CompleteOrder` handler (around line 985) to insert a `Sale` record **in the same transaction** as the order status update.

**Code change in `CompleteOrder` (after line 995, before the broadcast):**

```go
// Record sale
var orderTotal int
var itemCount int
err = h.db.QueryRowContext(r.Context(), `
    SELECT total, COUNT(*) FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = $1 AND oi.status != 'CANCELLED'
    GROUP BY o.id
`, orderID).Scan(&orderTotal, &itemCount)

if err != nil {
    slog.Error("Failed to read order for sale record", "error", err, "orderId", orderID)
} else {
    _, err = h.execContext(r.Context(), `
        INSERT INTO "Sale" (id, venue_id, order_id, total, item_count, completed_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (order_id) DO NOTHING
    `, uuid.New().String(), session.VenueID, orderID, orderTotal, itemCount)
    if err != nil {
        slog.Error("Failed to insert sale record", "error", err, "orderId", orderID)
    }
}
```

**Key points:**
- `ON CONFLICT (order_id) DO NOTHING` makes the handler idempotent (safe if `CompleteOrder` is called again)
- Item count counts only non-cancelled items (matching the existing business logic)
- Logged errors do not fail the request (sale recording is secondary)
- Uses the `execContext` helper for metrics tracking

---

## 3. Next.js API Route — Sales Data

### New file: `src/app/api/venues/[venueId]/sales/route.ts`

**GET handler** that returns aggregated sales data for a given range.

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `range` | `"daily" | "weekly" | "monthly" | "yearly" | "custom"` | `"daily"` | Aggregation bucket |
| `start` | `YYYY-MM-DD` | 30 days ago | Start date (used for custom range, or as offset for preset ranges) |
| `end` | `YYYY-MM-DD` | today | End date |

**Aggregation logic by range:**

Range determines the SQL `date_trunc` bucket:

| Range | date_trunc | Series length |
|-------|-----------|---------------|
| daily | `'day'` | last 30 days |
| weekly | `'week'` | last 12 weeks |
| monthly | `'month'` | last 12 months |
| yearly | `'year'` | last 5 years |
| custom | `'day'` | start → end |

**SQL query pattern (via Prisma `$queryRaw`):**

```sql
SELECT
  date_trunc($1, completed_at) AS bucket,
  COUNT(*) AS order_count,
  SUM(total) AS revenue,
  ROUND(AVG(total)) AS avg_order_value
FROM "Sale"
WHERE venue_id = $2
  AND completed_at >= $3
  AND completed_at < $4
GROUP BY bucket
ORDER BY bucket ASC
```

**Response shape:**

```json
{
  "venueId": "uuid",
  "range": "daily",
  "start": "2026-06-06",
  "end": "2026-07-06",
  "data": [
    { "date": "2026-06-06", "orders": 12, "revenue": 1840000, "avgOrderValue": 153333 },
    ...
  ],
  "summary": {
    "totalOrders": 180,
    "totalRevenue": 28500000,
    "avgOrderValue": 158333
  }
}
```

**Implementation details:**
- Use `requireAuth()` for auth, `requireVenueAccess()` for membership
- Use Prisma's `$queryRaw` with parameterized query for the date_trunc aggregation
- Wrap in try/catch with `errorResponse(e)`
- Await params: `const { venueId } = await params`

---

## 4. New Admin Page: Sales Dashboard

### 4.1 Install Recharts

```bash
npm install recharts
```

### 4.2 Server Component: `src/app/admin/[venueId]/sales/page.tsx`

Follows the existing pattern:

```tsx
import { getCurrentUser } from "@/lib/auth";
import { requireVenueAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { SalesClient } from "./SalesClient";

export default async function SalesPage({ params }: { params: Promise<{ venueId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { venueId } = await params;
  const membership = await requireVenueAccess(user.id, venueId);

  return <SalesClient venueId={venueId} currentUserRole={membership.role} />;
}
```

### 4.3 Client Component: `src/app/admin/[venueId]/sales/SalesClient.tsx`

`"use client"` component that manages:

**State:**
- `range`: `"daily" | "weekly" | "monthly" | "yearly" | "custom"`
- `startDate`, `endDate`: for custom range picker
- `data`: array of chart data points
- `summary`: summary stats
- `loading`: boolean

**Layout:**

```
┌──────────────────────────────────────────────────┐
│  [روز] [هفته] [ماه] [سال] [دلخواه]               │  ← Range tabs
├──────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────────────────────┐   │
│  │ ۱۲۰   │  │ ۱۸٫۵M│  │ ۱۵۴K                 │   │  ← Summary cards
│  │ سفارش │  │ درآمد │  │ میانگین هر سفارش     │   │
│  └──────┘  └──────┘  └──────────────────────┘   │
├──────────────────────────────────────────────────┤
│  📊 Bar/Line Chart (Recharts)                     │
│  X-axis: dates/weeks/months                      │
│  Y-axis: revenue (tomans)                        │
│  Interactive tooltips                            │
├──────────────────────────────────────────────────┤
│  📋 Data table                                   │
│  تاریخ | تعداد | درآمد | میانگین                 │
└──────────────────────────────────────────────────┘
```

**Range selector:** Button group styled to match existing admin nav patterns (border-bottom style).

**Chart:**
- `<BarChart>` as primary chart type
- Revenue bars in ink color (`#111111`) with paper background (`#f5f0e6`)
- X-axis labels formatted based on range
- Responsive container: `<ResponsiveContainer width="100%" height={320}>`
- Tooltip showing formatted numbers with `toLocaleString("fa-IR")`

**Summary cards:** Using existing `<Panel>` or styled divs matching the paper aesthetic.

**Custom date range:** Two `<input type="date">` fields + a "نمایش" button.

**Data fetching:**

```tsx
const fetchSales = async (range: string, start?: string, end?: string) => {
  const params = new URLSearchParams({ range });
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const res = await fetch(`/api/venues/${venueId}/sales?${params}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};
```

Call on mount (defaults to daily/last 30 days) and on range change.

### 4.4 Add Nav Link in Admin Layout

**File:** `src/app/admin/[venueId]/layout.tsx`

Add a new `Link` after the "سفارشات" link:

```tsx
<Link
  href={`/admin/${venueId}/sales`}
  className="border-b-2 border-transparent px-1 py-2.5 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
>
  فروش
</Link>
```

---

## 5. Tests

### 5.1 Integration Tests (`src/__tests__/api/integration.test.ts`)

- Test authenticated users with owner/manager role can fetch sales data
- Test unauthenticated requests return 401
- Test staff role returns 403
- Test data seeding: insert test Sale records, verify aggregation endpoint returns correct counts per range

### 5.2 Test Helpers (`src/__tests__/helpers.ts`)

- Add `seedTestSale(venueId, overrides?)` to create test Sale records
- Update `cleanTestData()` to truncate the `Sale` table

### 5.3 Go Tests (`ordering-service/internal/handlers/orders_test.go`)

- Add test for `CompleteOrder` handler verifying that a `Sale` record is created

---

## 6. Future Considerations (not in v1)

- Persian/Shamsi dates on chart axis
- Excel/CSV export
- Period-over-period comparison
- Staff performance per waiter
- Category/POP revenue breakdown
- Payment method tracking (requires explicit payment step)
- Nightly aggregation job for cached stats at scale

---

## Implementation Order

1. Prisma schema + generate + db push
2. Go migration file + Go service change
3. Next.js API route (sales aggregation)
4. Admin page: server component + client component + nav link
5. Install recharts
6. Tests
7. Build + typecheck + lint + test verification
