## Go Ordering Service — Development Plan

---

## **Status: Phase 1 Complete ✅**

All of Phase 1 (Foundation) and Phase 2–5 (WebSocket, Order Modification, Admin Endpoints, Observability) have been implemented in a single pass. See `ordering-service/` for the actual codebase.

---

### **Implemented Directory Structure**

```
ordering-service/
├── cmd/server/
│   └── main.go                    # Entry point: chi router, middleware, graceful shutdown
├── internal/
│   ├── config/
│   │   └── config.go              # DATABASE_URL, PORT, SESSION_COOKIE_NAME from env
│   ├── database/
│   │   └── postgres.go            # pgx pool setup (sql.Open with pgx stdlib)
│   ├── models/
│   │   ├── order.go               # Order, OrderItem, OrderStatus, ItemStatus, Station
│   │   ├── session.go             # Session (UserID, VenueID, Role, ExpiresAt)
│   │   └── errors.go              # ErrorResponse struct
│   ├── middleware/
│   │   ├── auth.go                # mofe_session cookie validation + multi-venue support
│   │   ├── cors.go                # CORS headers
│   │   ├── logging.go             # Structured request logging (slog)
│   │   └── recovery.go            # Panic recovery
│   └── handlers/
│       ├── orders.go              # REST endpoints: CRUD order/items, send to kitchen
│       ├── orders_test.go         # Integration tests
│       ├── ws.go                  # WebSocket Hub with venue-scoped broadcast
│       └── health.go              # GET /health endpoint
├── migrations/
│   ├── 001_add_orders_tables.up.sql
│   └── 001_add_orders_tables.down.sql
├── scripts/
│   └── seed_test_data.sql
├── go.mod / go.sum
└── Dockerfile                     # Multi-stage (golang:1.23-alpine → scratch)
```

### **Actual Dependencies**

```
github.com/go-chi/chi/v5 v5.3.0
github.com/jackc/pgx/v5 v5.10.0
github.com/gorilla/websocket v1.5.3
github.com/google/uuid v1.6.0
```

---

### **Phase 1: Foundation ✅**

#### 1.1 Project Setup
- [x] Initialize Go module (`github.com/mofe-menu/ordering-service`)
- [x] Create folder structure
- [x] `config.go` reads `DATABASE_URL`, `PORT` (default 8080), `SESSION_COOKIE_NAME` (default `mofe_session`)
- [x] Dockerfile (multi-stage: `golang:1.23-alpine` → `scratch`)
- [x] Added to `docker-compose.yml` (port 8080, health check, depends on db)

#### 1.2 Database Schema
- [x] Migration: `orders` + `order_items` tables with enums (`order_status`, `item_status`, `station`)
- [x] All tables use `TEXT` UUIDs, `INT` prices (matching Prisma's `priceToman` Int)
- [x] Quoted camelCase references to Prisma tables: `"Venue"`, `"User"`, `"MenuItem"`, `"MenuItemVariant"`
- [x] `order_items` includes `created_at` for ordering, `course_number` for multi-course
- [x] Seed script: 2 orders with items in SENT/PREPARING/READY status

#### 1.3 Authentication Middleware
- [x] Validates `mofe_session` cookie — SHA-256 hash, match against `"Session"` table
- [x] Checks `"revokedAt" IS NULL` and `"expiresAt" > NOW()`
- [x] Multi-venue support: counts memberships; if >1, requires `X-Venue-ID` header
- [x] Single-venue users auto-infer venue from sole `"VenueMember"` row
- [x] Returns `401` with JSON `{ "error", "code" }` on failure
- [x] `GetSession(ctx)` helper for handlers
- [x] `RequireRole(allowedRoles...)` middleware for admin endpoints

#### 1.4 REST Endpoints
All endpoints in `internal/handlers/orders.go`:

| Method | Route | Handler | Description |
| --- | --- | --- | --- |
| `POST` | `/api/orders` | `CreateOrder` | Create order (tableNumber, guestCount, notes); fetches waiter name from `"User"` |
| `GET` | `/api/orders` | `ListOrders` | List orders for venue, optional `?status=` filter, limit 50 |
| `GET` | `/api/orders/{id}` | `GetOrder` | Full order details with all items (two queries) |
| `POST` | `/api/orders/{id}/items` | `AddItem` | Add item with variant pricing, recalculates totals |
| `PATCH` | `/api/orders/{id}/items/{itemId}` | `UpdateItem` | Dynamic UPDATE for quantity/notes; checks status allows modification |
| `DELETE` | `/api/orders/{id}/items/{itemId}` | `CancelItem` | Soft cancel, recalculates total; cancels order if no active items remain |
| `POST` | `/api/orders/{id}/send` | `SendToKitchen` | Sets order + items to SENT status with timestamps |
| `GET` | `/api/admin/orders` | `ListOrders` | Same as list but under `/api/admin` with role check |

Validation:
- Quantity must be > 0
- Menu item must belong to venue, not soft-deleted
- Modification only allowed when item status is PENDING or SENT
- Order must belong to session's venue

---

### **Phase 2: Real-Time WebSocket ✅**

#### 2.1 WebSocket Hub
- [x] `Hub` with per-venue client map (auth: `register`/`unregister` channels)
- [x] `Client` with read/write pumps (gorilla/websocket)
- [x] `BroadcastToVenue(venueID, msgType, payload)` — broadcasts JSON to all clients in venue
- [x] Ping/pong heartbeat every 30s to detect dead connections
- [x] `GET /ws` endpoint behind auth middleware
- [x] Rate-limited read (max 4096 bytes), 60s read deadline

#### 2.2 Event Types
```go
EventOrderCreated       = "order_created"
EventItemAdded          = "item_added"
EventItemStatusChanged  = "item_status_changed"
EventOrderStatusChanged = "order_status_changed"
EventItemCancelled      = "item_cancelled"
```

---

### **Phase 3: Order Modification ✅**

#### 3.1 Update Item (`PATCH /api/orders/{id}/items/{itemId}`)
- [x] Dynamic query building for quantity/notes
- [x] Recalculates order totals on update
- [x] Status guard: only PENDING or SENT items can be modified
- [x] Venue isolation verified

#### 3.2 Cancel Item (`DELETE /api/orders/{id}/items/{itemId}`)
- [x] Sets `status = 'CANCELLED'` + `cancelled_at = NOW()`
- [x] Recalculates order subtotal/total (excludes cancelled items)
- [x] Auto-cancels entire order if no active items remain

---

### **Phase 4: Admin Dashboard Integration ✅**

#### 4.1 Admin Endpoints
- [x] `/api/admin/orders` — same as list but behind `RequireRole("OWNER", "MANAGER")`
- [x] `RequireRole` middleware in `internal/middleware/auth.go`

#### 4.2 Analytics Export
Not yet implemented — placeholder for future Phase 2 work.

---

### **Phase 5: Testing & Polish ✅**

#### 5.1 Tests (`internal/handlers/orders_test.go`)
- [x] `TestCreateOrderValidation` — valid creation returns 201 with orderId
- [x] `TestCreateOrderInvalidJSON` — bad body returns 400
- [x] `TestListOrdersEmpty` — empty list returns `[]` not null
- [x] `TestGetOrderNotFound` — nonexistent ID returns 404
- [x] `TestAddItemInvalidQuantity` — quantity 0 returns 400
- [x] `TestAuthMiddlewareNoCookie` — no cookie returns 401
- [x] `TestRequireRole` — owner/manager allowed, staff denied
- [x] `TestHealthCheck` — `/health` returns `{"status":"healthy"}`

#### 5.2 Observability
- [x] Structured JSON logging via `slog` in all handlers + main
- [x] Standardized error responses: `{ "error": string, "code": string }`
- [x] `/health` endpoint (pings DB, returns 503 on failure)
- [x] Request ID + Real IP middleware (chi built-in)
- [x] Graceful shutdown on SIGINT/SIGTERM

---

### **Deployment**

#### docker-compose.yml
```yaml
services:
  ordering-service:
    build: ./ordering-service
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://mofe:mofe@db:5432/mofe
      PORT: 8080
      SESSION_COOKIE_NAME: mofe_session
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 5s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

#### Nginx WebSocket Proxying
- `/api/orders` → `proxy_pass http://ordering_service`
- `/ws` → `proxy_pass http://ordering_service` with `Upgrade` + `Connection` headers, 24h `proxy_read_timeout`

---

### **Phase 2: Real-Time & Observability ✅**

#### 2.1 WebSocket Broadcast Wiring ✅
- [x] `OrderHandler` holds a `*Hub` reference — passed via `NewOrderHandler(db, hub)`
- [x] `CreateOrder` → broadcasts `order_created` with orderId, venueId, waiter info
- [x] `AddItem` → broadcasts `item_added` with itemId, orderId, menu item details
- [x] `UpdateItem` → broadcasts `item_updated` with itemId, orderId, updated fields
- [x] `CancelItem` → broadcasts `item_cancelled` with itemId, orderId, timestamp
- [x] `SendToKitchen` → broadcasts `order_status_changed` + `item_status_changed`
- [x] Added `menu_item_unavailable` event type constant for future use

#### 2.2 Prometheus Metrics ✅
- [x] New file: `internal/middleware/metrics.go`
- [x] Request counter (`ordering_service_requests_total`) with method/path/status labels
- [x] Request duration histogram (`ordering_service_request_duration_seconds`)
- [x] Active requests gauge (`ordering_service_active_requests`)
- [x] Business counters: `ordering_service_orders_created_total`, `ordering_service_items_ordered_total`
- [x] DB query duration histogram (`ordering_service_db_query_duration_seconds`)
- [x] `/metrics` endpoint registered via `promhttp.Handler()`

#### 2.3 Rate Limiting Middleware ✅
- [x] New file: `internal/middleware/ratelimit.go`
- [x] Per-user token bucket using `golang.org/x/time/rate`
- [x] Configurable at construction: `NewRateLimiter(100, 200)` → 100 req/sec with burst 200
- [x] Keys by `UserID` when authenticated, falls back to `RemoteAddr`
- [x] Background cleanup goroutine (evicts visitors after 10min idle)
- [x] Returns 429 with `Retry-After: 60` header

#### 2.4 golang-migrate Integration ✅
- [x] `runMigrations()` called at startup in `main.go`
- [x] Uses `github.com/golang-migrate/migrate/v4` with `file://migrations` source
- [x] Gracefully handles `ErrNoChange` (no-op when already up-to-date)
- [x] Migration files copied into scratch Docker image (`COPY /app/migrations /migrations`)

### **Phase 3: Analytics ✅**

#### 3.1 Analytics Endpoint
- [x] New file: `internal/handlers/analytics.go`
- [x] `GET /api/admin/analytics/daily-summary` (behind OWNER/MANAGER auth)
- [x] Query param `?date=YYYY-MM-DD` (defaults to today)
- [x] Returns: totalOrders, totalRevenue, avgOrderValue, totalItems, breakdown by status
- [x] Returns: top 10 items by quantity with revenue
- [x] Excludes cancelled items from revenue/top items calculations

---

### **Implemented Directory Structure (Updated)**

```
ordering-service/
├── cmd/server/
│   └── main.go                    # Entry point: chi router, middleware, migrations, graceful shutdown
├── internal/
│   ├── config/
│   │   └── config.go              # DATABASE_URL, PORT, SESSION_COOKIE_NAME from env
│   ├── database/
│   │   └── postgres.go            # pgx pool setup (sql.Open with pgx stdlib)
│   ├── models/
│   │   ├── order.go               # Order, OrderItem, OrderStatus, ItemStatus, Station
│   │   ├── session.go             # Session (UserID, VenueID, Role, ExpiresAt)
│   │   └── errors.go              # ErrorResponse struct
│   ├── middleware/
│   │   ├── auth.go                # mofe_session cookie validation + multi-venue support
│   │   ├── cors.go                # CORS headers
│   │   ├── logging.go             # Structured request logging (slog)
│   │   ├── recovery.go            # Panic recovery
│   │   ├── metrics.go             # Prometheus metrics (counters, histograms, gauges)
│   │   └── ratelimit.go           # Per-user token bucket rate limiter (100 req/s)
│   └── handlers/
│       ├── orders.go              # REST endpoints: CRUD order/items, send to kitchen (with WS broadcasts)
│       ├── orders_test.go         # Integration tests
│       ├── ws.go                  # WebSocket Hub with venue-scoped broadcast
│       ├── health.go              # GET /health endpoint
│       └── analytics.go           # GET /api/admin/analytics/daily-summary
├── migrations/
│   ├── 001_add_orders_tables.up.sql
│   └── 001_add_orders_tables.down.sql
├── scripts/
│   └── seed_test_data.sql
├── go.mod / go.sum
└── Dockerfile                     # Multi-stage (golang:1.23-alpine → scratch)
```

### **Actual Dependencies**

```
github.com/go-chi/chi/v5 v5.3.0
github.com/jackc/pgx/v5 v5.10.0
github.com/gorilla/websocket v1.5.3
github.com/google/uuid v1.6.0
github.com/golang-migrate/migrate/v4 v4.19.1      # NEW: automated migrations
github.com/prometheus/client_golang v1.23.2         # NEW: metrics
golang.org/x/time v0.15.0                           # NEW: rate limiting
```

---

## **What's Next**

### Phase 3+ Additions (Future Work)
- [ ] Redis-backed WebSocket pub/sub for horizontal scaling
- [ ] SQLC for type-safe queries (optional)
- [ ] Add integration tests for analytics endpoint
- [ ] Alerting rules for Prometheus metrics
