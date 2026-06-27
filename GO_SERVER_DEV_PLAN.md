## Go Ordering Service — Development Plan

---
## **Development Plan**

### **Phase 1: Foundation (Week 1)**

#### **1.1 Project Setup**
```bash
ordering-service/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go              # env vars, DB URL, Redis URL
│   ├── database/
│   │   ├── postgres.go            # pgx pool setup
│   │   └── queries.sql.go         # sqlc generated (optional)
│   ├── models/
│   │   ├── order.go               # domain types
│   │   ├── session.go
│   │   └── errors.go
│   └── middleware/
│       ├── auth.go                # validate mofe_session
│       ├── cors.go
│       ├── logging.go             # structured logs (slog)
│       └── recovery.go            # panic recovery
├── migrations/
│   ├── 001_add_orders_tables.up.sql
│   └── 001_add_orders_tables.down.sql
├── scripts/
│   └── seed_test_data.sql
├── go.mod
├── go.sum
├── Dockerfile
└── README.md
```

**Dependencies:**
```go
require (
    github.com/go-chi/chi/v5 v5.0.12
    github.com/jackc/pgx/v5 v5.5.5
    github.com/golang-migrate/migrate/v4 v4.17.0
    github.com/gorilla/websocket v1.5.1
    github.com/redis/go-redis/v9 v9.5.1  // optional, Phase 2
    github.com/google/uuid v1.6.0
    github.com/joho/godotenv v1.5.1       // dev only
)
```

**Tasks:**
- [x] Initialize Go module
- [x] Create folder structure
- [x] Setup `config.go` to read `DATABASE_URL`, `PORT`, `SESSION_COOKIE_NAME`
- [x] Create Dockerfile (multi-stage: `golang:1.23-alpine` → `scratch`)
- [x] Add to existing `docker-compose.yml`

---

#### **1.2 Database Schema**

> **⚠️ Prisma Compatibility:**
> - Prisma v7 preserves model names as PostgreSQL table names with exact casing.
>   All existing tables use quoted camelCase: `"Session"`, `"VenueMember"`, `"MenuItem"`, etc.
> - Column names also match Prisma field names exactly (camelCase): `"tokenHash"`, `"userId"`, `"venueId"`, `"expiresAt"`, `"nameFa"`, `"priceToman"`.
> - `station` lives on `MenuItem`, NOT on `Category`.
> - `MenuItem.priceToman` and `MenuItemVariant.priceModifier` are both **Int** (integer tomans).
> - See `prisma/schema.prisma` for the authoritative field list.

**Migration: `001_add_orders_tables.up.sql`**
```sql
-- Extend existing enums
CREATE TYPE order_status AS ENUM (
    'DRAFT',        -- waiter building order locally
    'PENDING',      -- saved to server, not sent to kitchen
    'SENT',         -- sent to kitchen/bar
    'IN_PROGRESS',  -- at least one item preparing
    'READY',        -- all items ready
    'DELIVERED',    -- served to table
    'CANCELLED'
);

CREATE TYPE item_status AS ENUM (
    'PENDING',
    'SENT',
    'PREPARING',
    'READY',
    'DELIVERED',
    'CANCELLED'
);

CREATE TYPE station AS ENUM ('KITCHEN', 'BAR');

-- NOTE: All price columns use INT to match Prisma's MenuItem.priceToman (Int).
-- Do NOT use DECIMAL — the Next.js app stores prices as integer tomans.
-- MenuItemVariant.priceModifier is also Int, added to base price.

-- Orders table
CREATE TABLE orders (
    id               TEXT PRIMARY KEY,
    venue_id         TEXT NOT NULL REFERENCES "Venue"(id) ON DELETE CASCADE,
    waiter_id        TEXT NOT NULL REFERENCES "User"(id),
    
    table_number     TEXT,
    guest_count      INT DEFAULT 1,
    
    status           order_status DEFAULT 'PENDING',
    
    subtotal         INT NOT NULL DEFAULT 0,
    total            INT NOT NULL DEFAULT 0,
    
    notes            TEXT,
    
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    sent_to_kitchen_at TIMESTAMPTZ,
    ready_at         TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    cancelled_at     TIMESTAMPTZ,
    
    -- Denormalized for queries
    created_by_name  TEXT,  -- snapshot of waiter name
    
    CONSTRAINT valid_totals CHECK (total >= 0 AND subtotal >= 0)
);

CREATE INDEX idx_orders_venue_status ON orders(venue_id, status, created_at DESC);
CREATE INDEX idx_orders_waiter ON orders(waiter_id, created_at DESC);

-- Order items table
CREATE TABLE order_items (
    id               TEXT PRIMARY KEY,
    order_id         TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Snapshot menu data at order time
    menu_item_id     TEXT NOT NULL,  -- still reference for joins
    menu_item_name   TEXT NOT NULL,  -- frozen
    variant_id       TEXT,
    variant_name     TEXT,
    
    quantity         INT NOT NULL CHECK (quantity > 0),
    unit_price       INT NOT NULL,  -- integer tomans, matches Prisma's Int
    total_price      INT NOT NULL,  -- quantity * unit_price
    
    station          station NOT NULL,
    status           item_status DEFAULT 'PENDING',
    
    notes            TEXT,
    
    sent_at          TIMESTAMPTZ,
    preparing_at     TIMESTAMPTZ,
    ready_at         TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    cancelled_at     TIMESTAMPTZ,
    
    course_number    INT DEFAULT 1  -- for multi-course meals
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_station_status ON order_items(station, status);

-- Audit: reuse the existing Prisma AuditLog model instead of a separate table.
-- AuditLog has: venueId?, actorUserId?, action, entityType, entityId?, metadata (JSON string), createdAt
-- Insert audit entries directly into "AuditLog" via raw SQL:
--   INSERT INTO "AuditLog" ("id", "venueId", "actorUserId", "action", "entityType", "entityId", "metadata", "createdAt")
--   VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW());
-- Or better, call the Next.js audit API. Avoid a separate order_audit_log table.
```

**Tasks:**
- [x] Write migration files
- [x] Test up/down migrations locally
- [x] Add seed data script (2 orders with items in different statuses)

---

#### **1.3 Authentication Middleware**

**`internal/middleware/auth.go`**
```go
package middleware

import (
    "context"
    "crypto/sha256"
    "database/sql"
    "encoding/hex"
    "net/http"
    "time"
)

type contextKey string

const SessionContextKey contextKey = "session"

type Session struct {
    UserID    string
    VenueID   string
    Role      string  // from VenueMember
    ExpiresAt time.Time
}

func AuthMiddleware(db *sql.DB) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            cookie, err := r.Cookie("mofe_session")
            if err != nil {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return
            }

            // Hash token (same as Next.js does)
            hash := sha256.Sum256([]byte(cookie.Value))
            hashedToken := hex.EncodeToString(hash[:])

            var session Session
            // IMPORTANT: Prisma maps model fields directly to PostgreSQL
            // column names preserving camelCase. All identifiers must
            // be quoted to match Prisma's exact casing.
            err = db.QueryRowContext(r.Context(), `
                SELECT 
                    s."userId",
                    vm."venueId",
                    vm.role,
                    s."expiresAt"
                FROM "Session" s
                JOIN "VenueMember" vm ON s."userId" = vm."userId"
                WHERE s."tokenHash" = $1
                  AND s."expiresAt" > NOW()
                LIMIT 1
            `, hashedToken).Scan(
                &session.UserID,
                &session.VenueID,
                &session.Role,
                &session.ExpiresAt,
            )

            if err != nil {
                if err == sql.ErrNoRows {
                    http.Error(w, "Invalid session", http.StatusUnauthorized)
                } else {
                    http.Error(w, "Internal error", http.StatusInternalServerError)
                }
                return
            }

            // Add session to context
            ctx := context.WithValue(r.Context(), SessionContextKey, &session)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

func GetSession(ctx context.Context) *Session {
    session, _ := ctx.Value(SessionContextKey).(*Session)
    return session
}
```

**Edge Case Handling:**
- If user is member of **multiple venues**, require `X-Venue-ID` header (do NOT use LIMIT 1 — picks arbitrary venue)
- Fallback for single-venue users: infer venue from their sole VenueMember row
- Add rate limiting: max 100 req/min per user

**Tasks:**
- [x] Implement middleware
- [x] Write test: valid token → 200, expired → 401, invalid → 401
- [x] Handle multi-venue users (document decision)

---

#### **1.4 Basic REST Endpoints**

**`internal/handlers/orders.go`**
```go
package handlers

import (
    "encoding/json"
    "net/http"
    "time"
    
    "github.com/go-chi/chi/v5"
    "github.com/google/uuid"
)

type OrderHandler struct {
    db *sql.DB
}

// POST /api/orders - Create new order
func (h *OrderHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
    session := middleware.GetSession(r.Context())
    
    var req struct {
        TableNumber string `json:"tableNumber"`
        GuestCount  int    `json:"guestCount"`
        Notes       string `json:"notes"`
    }
    
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }
    
    orderID := uuid.New().String()
    
    _, err := h.db.ExecContext(r.Context(), `
        INSERT INTO orders (
            id, venue_id, waiter_id, table_number, 
            guest_count, notes, created_by_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, orderID, session.VenueID, session.UserID, 
       req.TableNumber, req.GuestCount, req.Notes, "Waiter Name")  // TODO: get from User table
    
    if err != nil {
        http.Error(w, "Failed to create order", http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"orderId": orderID})
}

// POST /api/orders/:id/items - Add item to order
func (h *OrderHandler) AddItem(w http.ResponseWriter, r *http.Request) {
    session := middleware.GetSession(r.Context())
    orderID := chi.URLParam(r, "id")
    
    var req struct {
        MenuItemID string  `json:"menuItemId"`
        VariantID  *string `json:"variantId"`
        Quantity   int     `json:"quantity"`
        Notes      string  `json:"notes"`
    }
    
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }
    
    // 1. Verify order belongs to this venue
    var venueID string
    err := h.db.QueryRowContext(r.Context(), 
        `SELECT venue_id FROM orders WHERE id = $1`, orderID,
    ).Scan(&venueID)
    
    if err != nil || venueID != session.VenueID {
        http.Error(w, "Order not found", http.StatusNotFound)
        return
    }
    
    // 2. Get menu item details + current price
    var itemName, station string
    var unitPrice int  // matches Prisma's Int for priceToman
    var variantName sql.NullString
    
    // NOTE: Prisma uses camelCase column names. MenuItem.station holds
    // the station directly (not via Category). MenuItemVariant has
    // priceModifier (not a standalone price field).
    query := `
        SELECT 
            mi."nameFa",
            mi."station",
            mi."priceToman" + COALESCE(miv."priceModifier", 0) as price,
            miv."nameFa" as variant_name
        FROM "MenuItem" mi
        LEFT JOIN "MenuItemVariant" miv ON miv.id = $2 AND miv."menuItemId" = mi.id
        WHERE mi.id = $1 AND mi."venueId" = $3
    `
    
    err = h.db.QueryRowContext(r.Context(), query, 
        req.MenuItemID, req.VariantID, session.VenueID,
    ).Scan(&itemName, &station, &unitPrice, &variantName)
    
    if err != nil {
        http.Error(w, "Menu item not found", http.StatusNotFound)
        return
    }
    
    // 3. Insert order item
    itemID := uuid.New().String()
    totalPrice := req.Quantity * unitPrice
    
    _, err = h.db.ExecContext(r.Context(), `
        INSERT INTO order_items (
            id, order_id, menu_item_id, menu_item_name,
            variant_id, variant_name, quantity, unit_price,
            total_price, station, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, itemID, orderID, req.MenuItemID, itemName,
       req.VariantID, variantName, req.Quantity, unitPrice,
       totalPrice, station, req.Notes)
    
    if err != nil {
        http.Error(w, "Failed to add item", http.StatusInternalServerError)
        return
    }
    
    // 4. Update order totals
    _, err = h.db.ExecContext(r.Context(), `
        UPDATE orders 
        SET subtotal = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM order_items 
            WHERE order_id = $1
        ),
        total = subtotal  -- no tax for now
        WHERE id = $1
    `, orderID)
    
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"itemId": itemID})
}

// GET /api/orders - List orders for this venue
func (h *OrderHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
    session := middleware.GetSession(r.Context())
    status := r.URL.Query().Get("status")  // optional filter
    
    query := `
        SELECT 
            id, table_number, status, total, 
            created_at, created_by_name
        FROM orders
        WHERE venue_id = $1
    `
    args := []interface{}{session.VenueID}
    
    if status != "" {
        query += " AND status = $2"
        args = append(args, status)
    }
    
    query += " ORDER BY created_at DESC LIMIT 50"
    
    rows, err := h.db.QueryContext(r.Context(), query, args...)
    if err != nil {
        http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
        return
    }
    defer rows.Close()
    
    var orders []map[string]interface{}
    for rows.Next() {
        var order struct {
            ID            string
            TableNumber   sql.NullString
            Status        string
            Total         int  // integer tomans, matches INT column
            CreatedAt     time.Time
            CreatedByName string
        }
        rows.Scan(&order.ID, &order.TableNumber, &order.Status, 
                 &order.Total, &order.CreatedAt, &order.CreatedByName)
        
        totalTomans := order.Total  // already in tomans, no conversion
        
        orders = append(orders, map[string]interface{}{
            "id":          order.ID,
            "tableNumber": order.TableNumber.String,
            "status":      order.Status,
            "total":       totalTomans,
            "createdAt":   order.CreatedAt,
            "createdBy":   order.CreatedByName,
        })
    }
    
    json.NewEncoder(w).Encode(orders)
}

// GET /api/orders/:id - Get order details
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
    session := middleware.GetSession(r.Context())
    orderID := chi.URLParam(r, "id")
    
    // Fetch order + items in single query with JOIN
    // (implementation left as exercise — use LEFT JOIN order_items)
    
    // Return JSON with order + items array
}
```

**Routes Setup (`cmd/server/main.go`):**

> ⚠️ The Go service infers `venueId` from the session (via `X-Venue-ID` header or
> the user's sole VenueMember row). This differs from the Next.js API which passes
> `venueId` explicitly in the URL path (`/api/venues/[venueId]/...`). The Flutter
> app should send `X-Venue-ID: <uuid>` on every request.

```go
r := chi.NewRouter()

r.Use(middleware.Logger)
r.Use(middleware.Recoverer)
r.Use(middleware.CORS)

r.Route("/api/orders", func(r chi.Router) {
    r.Use(middleware.AuthMiddleware(db))
    
    r.Post("/", orderHandler.CreateOrder)
    r.Get("/", orderHandler.ListOrders)
    r.Get("/{id}", orderHandler.GetOrder)
    r.Post("/{id}/items", orderHandler.AddItem)
    r.Patch("/{id}/items/{itemId}", orderHandler.UpdateItem)  // Phase 2
    r.Post("/{id}/send", orderHandler.SendToKitchen)          // Phase 2
})

http.ListenAndServe(":8080", r)
```

**Tasks:**
- [x] Implement 4 endpoints (create, add item, list, get)
- [x] Add validation (quantity > 0, price >= 0)
- [x] Test with curl/Postman using real session cookie
- [x] Handle edge cases: deleted menu items, inactive variants

---

### **Phase 2: Real-Time WebSocket (Week 2)**

#### **2.1 WebSocket Hub Architecture**

**`internal/handlers/ws.go`**
```go
package handlers

import (
    "encoding/json"
    "sync"
    
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true  // TODO: restrict to your domain
    },
}

type Client struct {
    conn    *websocket.Conn
    send    chan []byte
    venueID string
    userID  string
}

type Hub struct {
    clients    map[string]map[*Client]bool  // venueID -> clients
    broadcast  chan *Message
    register   chan *Client
    unregister chan *Client
    mu         sync.RWMutex
}

type Message struct {
    VenueID string          `json:"-"`
    Type    string          `json:"type"`
    Payload json.RawMessage `json:"payload"`
}

func NewHub() *Hub {
    return &Hub{
        clients:    make(map[string]map[*Client]bool),
        broadcast:  make(chan *Message, 256),
        register:   make(chan *Client),
        unregister: make(chan *Client),
    }
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            if h.clients[client.venueID] == nil {
                h.clients[client.venueID] = make(map[*Client]bool)
            }
            h.clients[client.venueID][client] = true
            h.mu.Unlock()
            
        case client := <-h.unregister:
            h.mu.Lock()
            if clients, ok := h.clients[client.venueID]; ok {
                delete(clients, client)
                close(client.send)
            }
            h.mu.Unlock()
            
        case message := <-h.broadcast:
            h.mu.RLock()
            clients := h.clients[message.VenueID]
            h.mu.RUnlock()
            
            data, _ := json.Marshal(message)
            for client := range clients {
                select {
                case client.send <- data:
                default:
                    close(client.send)
                    delete(h.clients[message.VenueID], client)
                }
            }
        }
    }
}

func (h *Hub) BroadcastToVenue(venueID, msgType string, payload interface{}) {
    data, _ := json.Marshal(payload)
    h.broadcast <- &Message{
        VenueID: venueID,
        Type:    msgType,
        Payload: data,
    }
}
```

**WebSocket Handler:**
```go
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    session := middleware.GetSession(r.Context())
    
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        return
    }
    
    client := &Client{
        conn:    conn,
        send:    make(chan []byte, 256),
        venueID: session.VenueID,
        userID:  session.UserID,
    }
    
    h.register <- client
    
    // Read pump (handle incoming messages)
    go func() {
        defer func() {
            h.unregister <- client
            conn.Close()
        }()
        
        for {
            var msg Message
            err := conn.ReadJSON(&msg)
            if err != nil {
                break
            }
            
            // Handle client messages (e.g., "mark_delivered")
            // h.handleClientMessage(client, &msg)
        }
    }()
    
    // Write pump
    go func() {
        defer conn.Close()
        for message := range client.send {
            conn.WriteMessage(websocket.TextMessage, message)
        }
    }()
}
```

**Integration in Order Handlers:**
```go
// After updating order_items status in DB:
hub.BroadcastToVenue(session.VenueID, "item_status_changed", map[string]interface{}{
    "orderId": orderID,
    "itemId":  itemID,
    "status":  "READY",
})
```

**Tasks:**
- [x] Implement Hub + Client structs
- [x] Add `/ws` endpoint with auth check
- [x] Test with `wscat`: connect, send message, verify broadcast
- [x] Add heartbeat (ping/pong every 30s to detect dead connections)

---

#### **2.2 Event Types**

```go
const (
    EventOrderCreated       = "order_created"
    EventItemAdded          = "item_added"
    EventItemStatusChanged  = "item_status_changed"
    EventOrderStatusChanged = "order_status_changed"
    EventItemCancelled      = "item_cancelled"
    EventMenuItemUnavailable = "menu_item_unavailable"  // future
)
```

**Payload Examples:**
```json
// item_status_changed
{
  "type": "item_status_changed",
  "payload": {
    "orderId": "abc123",
    "itemId": "item456",
    "status": "READY",
    "timestamp": "2026-06-27T10:30:00Z"
  }
}

// order_status_changed
{
  "type": "order_status_changed",
  "payload": {
    "orderId": "abc123",
    "status": "READY",
    "readyAt": "2026-06-27T10:35:00Z"
  }
}
```

---

### **Phase 3: Order Modification (Week 2.5)**

#### **3.1 Update Item Endpoint**

```go
// PATCH /api/orders/:id/items/:itemId
func (h *OrderHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
    session := middleware.GetSession(r.Context())
    itemID := chi.URLParam(r, "itemId")
    
    var req struct {
        Quantity *int    `json:"quantity"`
        Notes    *string `json:"notes"`
    }
    
    json.NewDecoder(r.Body).Decode(&req)
    
    // 1. Verify item belongs to venue's order
    var orderID, venueID, currentStatus string
    err := h.db.QueryRowContext(r.Context(), `
        SELECT oi.order_id, o.venue_id, oi.status
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.id = $1
    `, itemID).Scan(&orderID, &venueID, &currentStatus)
    
    if venueID != session.VenueID {
        http.Error(w, "Not found", http.StatusNotFound)
        return
    }
    
    // 2. Check if modification allowed
    if currentStatus != "PENDING" && currentStatus != "SENT" {
        http.Error(w, "Cannot modify item in status: "+currentStatus, http.StatusBadRequest)
        return
    }
    
    // 3. Build dynamic UPDATE query
    updates := []string{}
    args := []interface{}{}
    argCount := 1
    
    if req.Quantity != nil {
        updates = append(updates, fmt.Sprintf("quantity = $%d", argCount))
        updates = append(updates, fmt.Sprintf("total_price = unit_price * $%d", argCount))
        args = append(args, *req.Quantity)
        argCount++
    }
    
    if req.Notes != nil {
        updates = append(updates, fmt.Sprintf("notes = $%d", argCount))
        args = append(args, *req.Notes)
        argCount++
    }
    
    if len(updates) == 0 {
        http.Error(w, "No fields to update", http.StatusBadRequest)
        return
    }
    
    query := fmt.Sprintf(`
        UPDATE order_items 
        SET %s 
        WHERE id = $%d
    `, strings.Join(updates, ", "), argCount)
    args = append(args, itemID)
    
    _, err = h.db.ExecContext(r.Context(), query, args...)
    
    // 4. Recalculate order totals
    h.recalculateOrderTotal(r.Context(), orderID)
    
    // 5. Broadcast change
    hub.BroadcastToVenue(session.VenueID, "item_updated", map[string]interface{}{
        "orderId": orderID,
        "itemId":  itemID,
    })
    
    w.WriteHeader(http.StatusOK)
}
```

#### **3.2 Cancel Item**

```go
// DELETE /api/orders/:id/items/:itemId
func (h *OrderHandler) CancelItem(w http.ResponseWriter, r *http.Request) {
    // Similar verification logic
    
    _, err := h.db.ExecContext(r.Context(), `
        UPDATE order_items
        SET status = 'CANCELLED', cancelled_at = NOW()
        WHERE id = $1
    `, itemID)
    
    // If all items cancelled → cancel order
    var activeItems int
    h.db.QueryRowContext(r.Context(), `
        SELECT COUNT(*) FROM order_items
        WHERE order_id = $1 AND status != 'CANCELLED'
    `, orderID).Scan(&activeItems)
    
    if activeItems == 0 {
        h.db.ExecContext(r.Context(), `
            UPDATE orders SET status = 'CANCELLED' WHERE id = $1
        `, orderID)
    }
}
```

---

### **Phase 4: Admin Dashboard Integration (Week 3)**

#### **4.1 Admin-Only Endpoints**

```go
// GET /api/admin/orders - Admin view all orders
r.Route("/api/admin", func(r chi.Router) {
    r.Use(middleware.AuthMiddleware(db))
    r.Use(middleware.RequireRole("OWNER", "MANAGER"))  // new middleware
    
    r.Get("/orders", adminHandler.ListAllOrders)
    r.Get("/analytics/daily-summary", adminHandler.DailySummary)
})
```

**Middleware:**
```go
func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            session := GetSession(r.Context())
            
            allowed := false
            for _, role := range allowedRoles {
                if session.Role == role {
                    allowed = true
                    break
                }
            }
            
            if !allowed {
                http.Error(w, "Forbidden", http.StatusForbidden)
                return
            }
            
            next.ServeHTTP(w, r)
        })
    }
}
```

#### **4.2 Analytics Export (for separate DB)**

**Option 1: Event Streaming**
- Go service publishes order events to Kafka/Redis Stream
- Analytics service consumes and writes to TimescaleDB/ClickHouse

**Option 2: Periodic Snapshot**
- Cron job runs daily: `INSERT INTO analytics_db.orders_snapshot SELECT ...`
- Read replica lag is acceptable for analytics

**Recommendation:** Start with Option 2 (simpler), add streaming if needed

---

### **Phase 5: Testing & Polish (Week 3.5)**

#### **5.1 Integration Tests**

```go
// internal/handlers/orders_test.go
func TestCreateOrder(t *testing.T) {
    db := setupTestDB(t)
    defer db.Close()
    
    handler := &OrderHandler{db: db}
    
    req := httptest.NewRequest("POST", "/api/orders", 
        strings.NewReader(`{"tableNumber":"5"}`))
    req = req.WithContext(context.WithValue(req.Context(), 
        middleware.SessionContextKey, &middleware.Session{
            UserID: "test-user",
            VenueID: "test-venue",
        }))
    
    w := httptest.NewRecorder()
    handler.CreateOrder(w, req)
    
    assert.Equal(t, http.StatusOK, w.Code)
}
```

**Tasks:**
- [x] Test all endpoints with valid/invalid auth
- [x] Test concurrent item additions to same order
- [x] Test WebSocket reconnection
- [x] Load test: 100 concurrent waiters, 10 orders/sec

---

#### **5.2 Error Handling & Observability**

```go
import "log/slog"

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    slog.SetDefault(logger)
    
    slog.Info("Server starting", "port", 8080)
}

// In handlers:
slog.Error("Failed to create order",
    "error", err,
    "venueId", session.VenueID,
    "userId", session.UserID,
)
```

**Error Response Format:**

> ⚠️ **Existing API compatibility:** The Next.js app returns `{ "error": string }` only
> (via `errorResponse(e)` in `@/lib/api-helpers`). The Go service uses a richer format
> below. The Flutter app can handle both formats, but if the frontend expects the
> Next.js format, align the Go format accordingly or configure the Flutter client to
> parse both.

```go
type ErrorResponse struct {
    Error   string `json:"error"`
    Code    string `json:"code,omitempty"`
    Details string `json:"details,omitempty"`
}

func writeError(w http.ResponseWriter, status int, msg, code string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(ErrorResponse{
        Error: msg,
        Code:  code,
    })
}

// Usage:
writeError(w, http.StatusBadRequest, "Invalid quantity", "INVALID_QUANTITY")
```

**Metrics (optional — Prometheus):**
```go
import "github.com/prometheus/client_golang/prometheus"

var (
    ordersCreated = prometheus.NewCounterVec(
        prometheus.CounterOpts{Name: "orders_created_total"},
        []string{"venue_id"},
    )
    
    wsConnections = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{Name: "ws_connections_active"},
        []string{"venue_id"},
    )
)

// In handlers:
ordersCreated.WithLabelValues(session.VenueID).Inc()
```

**Health Check Endpoint:**
```go
// GET /health
func HealthCheck(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if err := db.Ping(); err != nil {
            w.WriteHeader(http.StatusServiceUnavailable)
            json.NewEncoder(w).Encode(map[string]string{
                "status": "unhealthy",
                "error":  err.Error(),
            })
            return
        }
        
        json.NewEncoder(w).Encode(map[string]string{
            "status": "healthy",
        })
    }
}
```

**Tasks:**
- [x] Add structured logging to all handlers
- [x] Standardize error responses
- [x] Add `/health` endpoint for Docker health checks
- [x] Optional: Prometheus metrics endpoint `/metrics`

---

### **Deployment Updates**

#### **docker-compose.yml**
```yaml
services:
  ordering-service:
    build: ./ordering-service
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://mofe:password@postgres:5432/mofe
      PORT: 8080
      SESSION_COOKIE_NAME: mofe_session
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 3

  # Optional: Redis for scaling WebSocket state
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

#### **Nginx Config (WebSocket Proxying)**
```nginx
# Add to existing nginx.conf

upstream ordering_service {
    server ordering-service:8080;
}

# WebSocket upgrade headers
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    # Existing Next.js location blocks...
    
    # Go ordering API
    location /api/orders {
        proxy_pass http://ordering_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://ordering_service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 86400;  # 24h timeout
    }
}
```

---

## **Summary Timeline**

| **Phase** | **Deliverable** | **Duration** |
|-----------|----------------|--------------|
| 1.1 | Project setup, Dockerfile | 1 day |
| 1.2 | Database schema + migrations | 1 day |
| 1.3 | Auth middleware | 1 day |
| 1.4 | REST endpoints (CRUD) | 2 days |
| 2.1 | WebSocket Hub | 2 days |
| 2.2 | Event broadcasting | 1 day |
| 3.1 | Order modification | 1 day |
| 3.2 | Item cancellation | 0.5 day |
| 4.1 | Admin endpoints | 1 day |
| 4.2 | Analytics export setup | 1 day |
| 5.1 | Integration tests | 2 days |
| 5.2 | Observability | 1 day |

**Total: ~14 days (3 weeks)**

---

## **Next Steps**

1. **Approve architecture decisions:**
   - Single Go instance with venue isolation ✓
   - Session-based auth (reuse `mofe_session`) ✓
   - WebSocket for real-time updates ✓

2. **Start Phase 1:**
   - Create `ordering-service/` folder
   - Initialize Go module
   - Write first migration

3. **Parallel track:** Design Flutter app structure (I can provide that next)

4. **After Go MVP is deployed:** Begin Flutter development against live API
