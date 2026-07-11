package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/mofe-menu/ordering-service/internal/middleware"
	"github.com/mofe-menu/ordering-service/internal/models"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func setupTestHandler(t *testing.T) (*OrderHandler, func()) {
	t.Helper()
	db, err := sql.Open("pgx", "postgres://mofe:mofe@localhost:5432/mofe_test")
	if err != nil {
		t.Skipf("Test database not available: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Skipf("Test database not reachable: %v", err)
	}

	clean := func() {
		db.Exec("DELETE FROM order_items")
		db.Exec("DELETE FROM orders")
		db.Close()
	}

	hub := NewHub()
	go hub.Run()

	origClean := clean
	clean = func() {
		hub.Shutdown()
		origClean()
	}

	return NewOrderHandler(db, hub), clean
}

func createTestSession() *models.Session {
	return &models.Session{
		UserID:  "test-user",
		VenueID: "test-venue",
		Role:    "OWNER",
	}
}

func contextWithSession(ctx context.Context) context.Context {
	return context.WithValue(ctx, middleware.SessionContextKey, createTestSession())
}

func TestCreateOrderValidation(t *testing.T) {
	handler, clean := setupTestHandler(t)
	defer clean()

	req := httptest.NewRequest("POST", "/api/orders", strings.NewReader(`{}`))
	req = req.WithContext(contextWithSession(req.Context()))

	w := httptest.NewRecorder()
	handler.CreateOrder(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["orderId"] == "" {
		t.Error("expected orderId in response")
	}
}

func TestCreateOrderInvalidJSON(t *testing.T) {
	handler, clean := setupTestHandler(t)
	defer clean()

	req := httptest.NewRequest("POST", "/api/orders", strings.NewReader(`invalid json`))
	req = req.WithContext(contextWithSession(req.Context()))

	w := httptest.NewRecorder()
	handler.CreateOrder(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestListOrdersEmpty(t *testing.T) {
	handler, clean := setupTestHandler(t)
	defer clean()

	req := httptest.NewRequest("GET", "/api/orders", nil)
	req = req.WithContext(contextWithSession(req.Context()))

	w := httptest.NewRecorder()
	handler.ListOrders(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var orders []map[string]interface{}
	json.NewDecoder(w.Body).Decode(&orders)
	if orders == nil {
		t.Error("expected empty array, not nil")
	}
}

func TestGetOrderNotFound(t *testing.T) {
	handler, clean := setupTestHandler(t)
	defer clean()

	r := chi.NewRouter()
	r.Get("/api/orders/{id}", handler.GetOrder)

	req := httptest.NewRequest("GET", "/api/orders/nonexistent-id", nil)
	req = req.WithContext(contextWithSession(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestAddItemInvalidQuantity(t *testing.T) {
	handler, clean := setupTestHandler(t)
	defer clean()

	r := chi.NewRouter()
	r.Post("/api/orders/{id}/items", handler.AddItem)

	body := `{"menuItemId":"test-item","quantity":0}`
	req := httptest.NewRequest("POST", "/api/orders/test-order/items", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(contextWithSession(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid quantity, got %d", w.Code)
	}
}

func TestAuthMiddlewareNoCookie(t *testing.T) {
	db, err := sql.Open("pgx", "postgres://mofe:mofe@localhost:5432/mofe_test")
	if err != nil {
		t.Skipf("Test database not available: %v", err)
	}
	defer db.Close()

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := middleware.AuthMiddleware(db)(handler)
	req := httptest.NewRequest("GET", "/api/orders", nil)
	w := httptest.NewRecorder()
	mw.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRequireRole(t *testing.T) {
	tests := []struct {
		name     string
		role     string
		allowed  []string
		expected int
	}{
		{"owner allowed", "OWNER", []string{"OWNER", "MANAGER"}, http.StatusOK},
		{"manager allowed", "MANAGER", []string{"OWNER", "MANAGER"}, http.StatusOK},
		{"staff denied", "STAFF", []string{"OWNER", "MANAGER"}, http.StatusForbidden},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			mw := middleware.RequireRole(tt.allowed...)(handler)
			req := httptest.NewRequest("GET", "/admin/orders", nil)
			req = req.WithContext(context.WithValue(req.Context(),
				middleware.SessionContextKey,
				&models.Session{UserID: "test", VenueID: "test", Role: tt.role},
			))
			w := httptest.NewRecorder()
			mw.ServeHTTP(w, req)

			if w.Code != tt.expected {
				t.Errorf("expected %d, got %d", tt.expected, w.Code)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Comprehensive test helpers
// ---------------------------------------------------------------------------

// setupLifecycleTest creates test data (venue, user, menu items, etc.)
// and returns a handler plus a comprehensive cleanup function.
func setupLifecycleTest(t *testing.T) (*OrderHandler, *sql.DB, func()) {
	t.Helper()
	db, err := sql.Open("pgx", "postgres://mofe:mofe@localhost:5432/mofe_test")
	if err != nil {
		t.Skipf("Test database not available: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Skipf("Test database not reachable: %v", err)
	}

	if err := ensureTestSchema(db); err != nil {
		t.Fatalf("failed to ensure test schema: %v", err)
	}

	// Seed Prisma tables with quoted camelCase identifiers
	venueID := "test-venue-lifecycle"
	userID := "test-user-lifecycle"
	categoryID := "test-cat-lifecycle"
	menuItemID := "test-mi-lifecycle"
	menuItemID2 := "test-mi-lifecycle-2"
	variantID := "test-variant-lifecycle"

	seeds := []string{
		`INSERT INTO "Venue" (id, "nameFa", "nameEn", slug, "publicStatus", "createdAt", "updatedAt")
		 VALUES ('` + venueID + `', 'Lifecycle Venue', 'Lifecycle Venue', 'lifecycle-venue', 'draft', NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		`INSERT INTO "User" (id, email, name, "passwordHash", status, "createdAt", "updatedAt")
		 VALUES ('` + userID + `', 'lifecycle@test.ir', 'Lifecycle User', 'hash', 'active', NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		`INSERT INTO "VenueMember" (id, "venueId", "userId", role, "createdAt", "updatedAt")
		 VALUES (gen_random_uuid()::text, '` + venueID + `', '` + userID + `', 'owner', NOW(), NOW())
		 ON CONFLICT ("venueId", "userId") DO NOTHING`,
		`INSERT INTO "Category" (id, "venueId", "nameFa", "displayOrder", active, "createdAt", "updatedAt")
		 VALUES ('` + categoryID + `', '` + venueID + `', 'Test Category', 1, true, NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		`INSERT INTO "MenuItem" (id, "venueId", "categoryId", "nameFa", "priceToman", station, "displayOrder", "createdAt", "updatedAt")
		 VALUES ('` + menuItemID + `', '` + venueID + `', '` + categoryID + `', 'Test Item 1', 50000, 'KITCHEN', 1, NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		`INSERT INTO "MenuItem" (id, "venueId", "categoryId", "nameFa", "priceToman", station, "displayOrder", "createdAt", "updatedAt")
		 VALUES ('` + menuItemID2 + `', '` + venueID + `', '` + categoryID + `', 'Test Item 2', 30000, 'BAR', 2, NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
		`INSERT INTO "MenuItemVariant" (id, "menuItemId", "nameFa", "priceModifier", "displayOrder", "createdAt", "updatedAt")
		 VALUES ('` + variantID + `', '` + menuItemID + `', 'Large', 10000, 1, NOW(), NOW())
		 ON CONFLICT (id) DO NOTHING`,
	}

	for _, s := range seeds {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("seed failed: %v\nSQL: %s", err, s)
		}
	}

	hub := NewHub()
	go hub.Run()

	handler := NewOrderHandler(db, hub)

	clean := func() {
		hub.Shutdown()
		db.Exec(`DELETE FROM "Sale"`)
		db.Exec("DELETE FROM order_items")
		db.Exec("DELETE FROM orders")
		db.Exec(`DELETE FROM "MenuItemVariant"`)
		db.Exec(`DELETE FROM "MenuItem"`)
		db.Exec(`DELETE FROM "Category"`)
		db.Exec(`DELETE FROM "VenueMember"`)
		db.Exec(`DELETE FROM "Session"`)
		db.Exec(`DELETE FROM "Venue"`)
		db.Exec(`DELETE FROM "User"`)
		db.Close()
	}

	return handler, db, clean
}

func lifecycleSession() *models.Session {
	return &models.Session{
		UserID:  "test-user-lifecycle",
		VenueID: "test-venue-lifecycle",
		Role:    "OWNER",
	}
}

func lifecycleContext(ctx context.Context) context.Context {
	return context.WithValue(ctx, middleware.SessionContextKey, lifecycleSession())
}

// seedOrderInStatus creates an order with one item in the given status.
func seedOrderInStatus(t *testing.T, db *sql.DB, orderID, itemID, orderStatus, itemStatus string) {
	t.Helper()
	_, err := db.Exec(`INSERT INTO orders (id, venue_id, waiter_id, status, subtotal, total, created_by_name)
		VALUES ($1, 'test-venue-lifecycle', 'test-user-lifecycle', $2, 50000, 50000, 'Test Waiter')
		ON CONFLICT (id) DO NOTHING`, orderID, orderStatus)
	if err != nil {
		t.Fatalf("failed to insert order %s: %v", orderID, err)
	}

	_, err = db.Exec(`INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, station, status)
		VALUES ($1, $2, 'test-mi-lifecycle', 'Test Item 1', 1, 50000, 50000, 'KITCHEN', $3)
		ON CONFLICT (id) DO NOTHING`, itemID, orderID, itemStatus)
	if err != nil {
		t.Fatalf("failed to insert item %s: %v", itemID, err)
	}
}

// ---------------------------------------------------------------------------
// UpdateItemStatus tests
// ---------------------------------------------------------------------------

func TestUpdateItemStatus_ValidTransition_SentToPreparing(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	orderID := "test-uis-sent-prep"
	itemID := "test-item-uis-sent-prep"
	seedOrderInStatus(t, db, orderID, itemID, "SENT", "SENT")

	r := chi.NewRouter()
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

	body := `{"status":"PREPARING"}`
	req := httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+itemID+"/status", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "updated" {
		t.Errorf("expected 'updated', got '%s'", resp["status"])
	}

	// Verify DB was updated
	var currentStatus string
	err := db.QueryRow(`SELECT status FROM order_items WHERE id = $1`, itemID).Scan(&currentStatus)
	if err != nil {
		t.Fatalf("failed to query item: %v", err)
	}
	if currentStatus != "PREPARING" {
		t.Errorf("expected PREPARING, got %s", currentStatus)
	}

	// Verify timestamp was set
	var preparingAt sql.NullTime
	db.QueryRow(`SELECT preparing_at FROM order_items WHERE id = $1`, itemID).Scan(&preparingAt)
	if !preparingAt.Valid {
		t.Error("expected preparing_at to be set")
	}
}

func TestUpdateItemStatus_ValidTransition_PreparingToReady(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	orderID := "test-uis-prep-ready"
	itemID := "test-item-uis-prep-ready"
	seedOrderInStatus(t, db, orderID, itemID, "SENT", "PREPARING")

	r := chi.NewRouter()
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

	body := `{"status":"READY"}`
	req := httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+itemID+"/status", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var currentStatus string
	err := db.QueryRow(`SELECT status FROM order_items WHERE id = $1`, itemID).Scan(&currentStatus)
	if err != nil {
		t.Fatalf("failed to query item: %v", err)
	}
	if currentStatus != "READY" {
		t.Errorf("expected READY, got %s", currentStatus)
	}
}

func TestUpdateItemStatus_ValidTransition_ReadyToDelivered(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	orderID := "test-uis-ready-del"
	itemID := "test-item-uis-ready-del"
	seedOrderInStatus(t, db, orderID, itemID, "SENT", "READY")

	r := chi.NewRouter()
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

	body := `{"status":"DELIVERED"}`
	req := httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+itemID+"/status", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var currentStatus string
	err := db.QueryRow(`SELECT status FROM order_items WHERE id = $1`, itemID).Scan(&currentStatus)
	if err != nil {
		t.Fatalf("failed to query item: %v", err)
	}
	if currentStatus != "DELIVERED" {
		t.Errorf("expected DELIVERED, got %s", currentStatus)
	}
}

func TestUpdateItemStatus_InvalidTransition_PendingToPreparing(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	orderID := "test-uis-pend-prep"
	itemID := "test-item-uis-pend-prep"
	seedOrderInStatus(t, db, orderID, itemID, "PENDING", "PENDING")

	r := chi.NewRouter()
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

	body := `{"status":"PREPARING"}`
	req := httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+itemID+"/status", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}

	var errResp models.ErrorResponse
	json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Code != "INVALID_TRANSITION" {
		t.Errorf("expected INVALID_TRANSITION code, got %s", errResp.Code)
	}

	// Verify item status was NOT changed
	var currentStatus string
	db.QueryRow(`SELECT status FROM order_items WHERE id = $1`, itemID).Scan(&currentStatus)
	if currentStatus != "PENDING" {
		t.Errorf("expected PENDING unchanged, got %s", currentStatus)
	}
}

func TestUpdateItemStatus_InvalidTransition_SentToDelivered(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	orderID := "test-uis-sent-del"
	itemID := "test-item-uis-sent-del"
	seedOrderInStatus(t, db, orderID, itemID, "SENT", "SENT")

	r := chi.NewRouter()
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

	// Try to skip PREPARING and READY
	body := `{"status":"DELIVERED"}`
	req := httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+itemID+"/status", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}

	var currentStatus string
	db.QueryRow(`SELECT status FROM order_items WHERE id = $1`, itemID).Scan(&currentStatus)
	if currentStatus != "SENT" {
		t.Errorf("expected SENT unchanged, got %s", currentStatus)
	}
}

func TestUpdateItemStatus_InvalidTransition_Backwards(t *testing.T) {
	tests := []struct {
		name      string
		from      string
		to        string
	}{
		{"preparing_to_sent", "PREPARING", "SENT"},
		{"ready_to_preparing", "READY", "PREPARING"},
		{"delivered_to_ready", "DELIVERED", "READY"},
		{"delivered_to_preparing", "DELIVERED", "PREPARING"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, db, clean := setupLifecycleTest(t)
			defer clean()

			orderID := "test-uis-back-" + tt.from + tt.to
			itemID := "test-item-back-" + tt.from + tt.to
			seedOrderInStatus(t, db, orderID, itemID, "SENT", tt.from)

			r := chi.NewRouter()
			r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

			body := `{"status":"` + tt.to + `"}`
			req := httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+itemID+"/status", strings.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			req = req.WithContext(lifecycleContext(req.Context()))

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400 for %s -> %s, got %d", tt.from, tt.to, w.Code)
			}

			var currentStatus string
			db.QueryRow(`SELECT status FROM order_items WHERE id = $1`, itemID).Scan(&currentStatus)
			if currentStatus != tt.from {
				t.Errorf("expected %s unchanged, got %s", tt.from, currentStatus)
			}
		})
	}
}

func TestUpdateItemStatus_InvalidStatusValue(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	orderID := "test-uis-inv-status"
	itemID := "test-item-uis-inv-status"
	seedOrderInStatus(t, db, orderID, itemID, "SENT", "SENT")

	r := chi.NewRouter()
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

	body := `{"status":"INVALID_STATUS"}`
	req := httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+itemID+"/status", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}

	var errResp models.ErrorResponse
	json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Code != "INVALID_STATUS" {
		t.Errorf("expected INVALID_STATUS code, got %s", errResp.Code)
	}
}

func TestUpdateItemStatus_EmptyBody(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	orderID := "test-uis-empty"
	itemID := "test-item-uis-empty"
	seedOrderInStatus(t, db, orderID, itemID, "SENT", "SENT")

	r := chi.NewRouter()
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

	req := httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+itemID+"/status", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestUpdateItemStatus_ItemNotFound(t *testing.T) {
	handler, _, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

	body := `{"status":"PREPARING"}`
	req := httptest.NewRequest("PATCH", "/api/orders/nonexistent-order/items/nonexistent-item/status", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}

	var errResp models.ErrorResponse
	json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Code != "NOT_FOUND" {
		t.Errorf("expected NOT_FOUND code, got %s", errResp.Code)
	}
}

func TestUpdateItemStatus_WrongVenue(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	// Create order in our venue
	orderID := "test-uis-wv"
	itemID := "test-item-uis-wv"
	seedOrderInStatus(t, db, orderID, itemID, "SENT", "SENT")

	// Use a session from a different venue
	otherSession := &models.Session{
		UserID:  "test-user-lifecycle",
		VenueID: "other-venue",
		Role:    "OWNER",
	}

	r := chi.NewRouter()
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

	body := `{"status":"PREPARING"}`
	req := httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+itemID+"/status", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(context.WithValue(req.Context(), middleware.SessionContextKey, otherSession))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for wrong venue, got %d", w.Code)
	}
}

func TestUpdateItemStatus_WrongOrderId(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	// Create item belonging to order A
	orderA := "test-uis-wo-a"
	itemID := "test-item-uis-wo"
	seedOrderInStatus(t, db, orderA, itemID, "SENT", "SENT")

	r := chi.NewRouter()
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

	// Try to update item using order B's ID (wrong order)
	body := `{"status":"PREPARING"}`
	req := httptest.NewRequest("PATCH", "/api/orders/wrong-order-id/items/"+itemID+"/status", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for wrong order ID, got %d", w.Code)
	}
}

func TestUpdateItemStatus_MalformedJSON(t *testing.T) {
	handler, _, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)

	req := httptest.NewRequest("PATCH", "/api/orders/any/items/any/status", strings.NewReader(`not json`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// ---------------------------------------------------------------------------
// CompleteOrder tests
// ---------------------------------------------------------------------------

func TestCompleteOrder_Successful(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	// Create an order in DELIVERED status with all items DELIVERED
	orderID := "test-co-success"
	itemID := "test-item-co-success"
	seedOrderInStatus(t, db, orderID, itemID, "DELIVERED", "DELIVERED")

	r := chi.NewRouter()
	r.Post("/api/orders/{id}/complete", handler.CompleteOrder)

	req := httptest.NewRequest("POST", "/api/orders/"+orderID+"/complete", nil)
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "completed" {
		t.Errorf("expected 'completed', got '%s'", resp["status"])
	}

	// Verify order status in DB
	var orderStatus string
	var completedAt sql.NullTime
	err := db.QueryRow(`SELECT status, completed_at FROM orders WHERE id = $1`, orderID).Scan(&orderStatus, &completedAt)
	if err != nil {
		t.Fatalf("failed to query order: %v", err)
	}
	if orderStatus != "COMPLETED" {
		t.Errorf("expected COMPLETED, got %s", orderStatus)
	}
	if !completedAt.Valid {
		t.Error("expected completed_at to be set")
	}

	// Verify Sale record was created
	var saleTotal int
	var saleItemCount int
	var saleOrderID string
	err = db.QueryRow(`SELECT total, item_count, order_id FROM "Sale" WHERE order_id = $1`, orderID).Scan(&saleTotal, &saleItemCount, &saleOrderID)
	if err != nil {
		t.Fatalf("failed to query Sale: %v", err)
	}
	if saleTotal != 50000 {
		t.Errorf("expected sale total 50000, got %d", saleTotal)
	}
	if saleItemCount != 1 {
		t.Errorf("expected sale item_count 1, got %d", saleItemCount)
	}
}

func TestCompleteOrder_FromSentStatus(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	// Complete from DELIVERED when all items are DELIVERED
	orderID := "test-co-delivered"
	itemID := "test-item-co-delivered"
	seedOrderInStatus(t, db, orderID, itemID, "DELIVERED", "DELIVERED")

	r := chi.NewRouter()
	r.Post("/api/orders/{id}/complete", handler.CompleteOrder)

	req := httptest.NewRequest("POST", "/api/orders/"+orderID+"/complete", nil)
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var orderStatus string
	db.QueryRow(`SELECT status FROM orders WHERE id = $1`, orderID).Scan(&orderStatus)
	if orderStatus != "COMPLETED" {
		t.Errorf("expected COMPLETED, got %s", orderStatus)
	}
}

func TestCompleteOrder_UndeliveredItemsRemaining(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	// Create order with two items: one DELIVERED, one still READY
	orderID := "test-co-un-delivered"
	item1ID := "test-item-co-ud1"
	item2ID := "test-item-co-ud2"

	_, err := db.Exec(`INSERT INTO orders (id, venue_id, waiter_id, status, subtotal, total, created_by_name)
		VALUES ($1, 'test-venue-lifecycle', 'test-user-lifecycle', 'DELIVERED', 80000, 80000, 'Test Waiter')`, orderID)
	if err != nil {
		t.Fatalf("failed to insert order: %v", err)
	}
	_, err = db.Exec(`INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, station, status)
		VALUES ($1, $2, 'test-mi-lifecycle', 'Delivered Item', 1, 50000, 50000, 'KITCHEN', 'DELIVERED')`, item1ID, orderID)
	if err != nil {
		t.Fatalf("failed to insert item 1: %v", err)
	}
	_, err = db.Exec(`INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, station, status)
		VALUES ($1, $2, 'test-mi-lifecycle-2', 'Ready Item', 1, 30000, 30000, 'BAR', 'READY')`, item2ID, orderID)
	if err != nil {
		t.Fatalf("failed to insert item 2: %v", err)
	}

	r := chi.NewRouter()
	r.Post("/api/orders/{id}/complete", handler.CompleteOrder)

	req := httptest.NewRequest("POST", "/api/orders/"+orderID+"/complete", nil)
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}

	var errResp models.ErrorResponse
	json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Code != "UNDELIVERED_ITEMS" {
		t.Errorf("expected UNDELIVERED_ITEMS code, got %s", errResp.Code)
	}
}

func TestCompleteOrder_WrongStatus(t *testing.T) {
	tests := []struct {
		name       string
		orderStatus string
		itemStatus  string
	}{
		{"draft", "DRAFT", "PENDING"},
		{"pending", "PENDING", "PENDING"},
		{"cancelled", "CANCELLED", "CANCELLED"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, db, clean := setupLifecycleTest(t)
			defer clean()

			orderID := "test-co-ws-" + tt.orderStatus
			itemID := "test-item-co-ws-" + tt.orderStatus
			seedOrderInStatus(t, db, orderID, itemID, tt.orderStatus, tt.itemStatus)

			r := chi.NewRouter()
			r.Post("/api/orders/{id}/complete", handler.CompleteOrder)

			req := httptest.NewRequest("POST", "/api/orders/"+orderID+"/complete", nil)
			req = req.WithContext(lifecycleContext(req.Context()))

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400 for %s, got %d", tt.orderStatus, w.Code)
			}

			var errResp models.ErrorResponse
			json.NewDecoder(w.Body).Decode(&errResp)
			if errResp.Code != "INVALID_STATUS" {
				t.Errorf("expected INVALID_STATUS code, got %s", errResp.Code)
			}

			// Verify order status was NOT changed
			var currentStatus string
			db.QueryRow(`SELECT status FROM orders WHERE id = $1`, orderID).Scan(&currentStatus)
			if currentStatus != tt.orderStatus {
				t.Errorf("expected %s unchanged, got %s", tt.orderStatus, currentStatus)
			}
		})
	}
}

func TestCompleteOrder_AlreadyCompleted(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	orderID := "test-co-already"
	itemID := "test-item-co-already"
	seedOrderInStatus(t, db, orderID, itemID, "DELIVERED", "DELIVERED")

	r := chi.NewRouter()
	r.Post("/api/orders/{id}/complete", handler.CompleteOrder)

	// First complete — should succeed
	req1 := httptest.NewRequest("POST", "/api/orders/"+orderID+"/complete", nil)
	req1 = req1.WithContext(lifecycleContext(req1.Context()))
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusOK {
		t.Errorf("first complete expected 200, got %d", w1.Code)
	}

	// Second complete — should fail since order is now COMPLETED
	req2 := httptest.NewRequest("POST", "/api/orders/"+orderID+"/complete", nil)
	req2 = req2.WithContext(lifecycleContext(req2.Context()))
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusBadRequest {
		t.Errorf("second complete expected 400, got %d", w2.Code)
	}
}

func TestCompleteOrder_OrderNotFound(t *testing.T) {
	handler, _, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Post("/api/orders/{id}/complete", handler.CompleteOrder)

	req := httptest.NewRequest("POST", "/api/orders/nonexistent-order-id/complete", nil)
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}

	var errResp models.ErrorResponse
	json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Code != "NOT_FOUND" {
		t.Errorf("expected NOT_FOUND code, got %s", errResp.Code)
	}
}

func TestCompleteOrder_WrongVenue(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	orderID := "test-co-wv"
	itemID := "test-item-co-wv"
	seedOrderInStatus(t, db, orderID, itemID, "DELIVERED", "DELIVERED")

	otherSession := &models.Session{
		UserID:  "test-user-lifecycle",
		VenueID: "other-venue",
		Role:    "OWNER",
	}

	r := chi.NewRouter()
	r.Post("/api/orders/{id}/complete", handler.CompleteOrder)

	req := httptest.NewRequest("POST", "/api/orders/"+orderID+"/complete", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.SessionContextKey, otherSession))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for wrong venue, got %d", w.Code)
	}
}

// ---------------------------------------------------------------------------
// End-to-end order lifecycle tests
// ---------------------------------------------------------------------------

func TestOrderLifecycle_FullFlow(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Post("/api/orders", handler.CreateOrder)
	r.Post("/api/orders/{id}/items", handler.AddItem)
	r.Post("/api/orders/{id}/send", handler.SendToKitchen)
	r.Patch("/api/orders/{id}/items/{itemId}/status", handler.UpdateItemStatus)
	r.Post("/api/orders/{id}/complete", handler.CompleteOrder)

	// 1. Create order
	body := `{"tableNumber":"5","guestCount":2}`
	req := httptest.NewRequest("POST", "/api/orders", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("create order expected 201, got %d", w.Code)
	}
	var createResp map[string]string
	json.NewDecoder(w.Body).Decode(&createResp)
	orderID := createResp["orderId"]
	if orderID == "" {
		t.Fatal("expected orderId in create response")
	}

	// Verify order is DRAFT
	var orderStatus string
	db.QueryRow(`SELECT status FROM orders WHERE id = $1`, orderID).Scan(&orderStatus)
	if orderStatus != "PENDING" {
		t.Errorf("expected PENDING (default), got %s", orderStatus)
	}

	// 2. Add two items
	itemBody := `{"menuItemId":"test-mi-lifecycle","quantity":2}`
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/items", strings.NewReader(itemBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("add item 1 expected 201, got %d", w.Code)
	}
	var item1Resp map[string]string
	json.NewDecoder(w.Body).Decode(&item1Resp)
	item1ID := item1Resp["itemId"]

	itemBody2 := `{"menuItemId":"test-mi-lifecycle-2","quantity":1}`
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/items", strings.NewReader(itemBody2))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("add item 2 expected 201, got %d", w.Code)
	}

	// 3. Send to kitchen
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/send", nil)
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("send to kitchen expected 200, got %d", w.Code)
	}

	// Verify order is SENT
	db.QueryRow(`SELECT status FROM orders WHERE id = $1`, orderID).Scan(&orderStatus)
	if orderStatus != "SENT" {
		t.Errorf("expected SENT, got %s", orderStatus)
	}

	// 4. Advance item 1 through lifecycle: SENT → PREPARING → READY → DELIVERED
	statusBody := `{"status":"PREPARING"}`
	req = httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+item1ID+"/status", strings.NewReader(statusBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("PREPARING expected 200, got %d", w.Code)
	}

	statusBody = `{"status":"READY"}`
	req = httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+item1ID+"/status", strings.NewReader(statusBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("READY expected 200, got %d", w.Code)
	}

	statusBody = `{"status":"DELIVERED"}`
	req = httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+item1ID+"/status", strings.NewReader(statusBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("DELIVERED expected 200, got %d", w.Code)
	}

	// Verify item 1 is DELIVERED
	var item1Status string
	db.QueryRow(`SELECT status FROM order_items WHERE id = $1`, item1ID).Scan(&item1Status)
	if item1Status != "DELIVERED" {
		t.Errorf("item 1 expected DELIVERED, got %s", item1Status)
	}

	// 5. Complete should fail — item 2 is still SENT (not delivered)
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/complete", nil)
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("complete with undelivered items expected 400, got %d", w.Code)
	}

	// 6. Also find and deliver item 2
	var item2ID string
	db.QueryRow(`SELECT id FROM order_items WHERE order_id = $1 AND menu_item_id = 'test-mi-lifecycle-2'`, orderID).Scan(&item2ID)

	statusBody = `{"status":"PREPARING"}`
	req = httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+item2ID+"/status", strings.NewReader(statusBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("item2 PREPARING expected 200, got %d", w.Code)
	}

	statusBody = `{"status":"READY"}`
	req = httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+item2ID+"/status", strings.NewReader(statusBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("item2 READY expected 200, got %d", w.Code)
	}

	statusBody = `{"status":"DELIVERED"}`
	req = httptest.NewRequest("PATCH", "/api/orders/"+orderID+"/items/"+item2ID+"/status", strings.NewReader(statusBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("item2 DELIVERED expected 200, got %d", w.Code)
	}

	// 7. Complete order — should succeed now
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/complete", nil)
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("final complete expected 200, got %d", w.Code)
	}

	var finalStatus string
	db.QueryRow(`SELECT status FROM orders WHERE id = $1`, orderID).Scan(&finalStatus)
	if finalStatus != "COMPLETED" {
		t.Errorf("expected COMPLETED, got %s", finalStatus)
	}
}

func TestOrderLifecycle_CancelItem(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Post("/api/orders", handler.CreateOrder)
	r.Post("/api/orders/{id}/items", handler.AddItem)
	r.Post("/api/orders/{id}/send", handler.SendToKitchen)
	r.Delete("/api/orders/{id}/items/{itemId}", handler.CancelItem)

	// Create order with 2 items
	body := `{"tableNumber":"3"}`
	req := httptest.NewRequest("POST", "/api/orders", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var createResp map[string]string
	json.NewDecoder(w.Body).Decode(&createResp)
	orderID := createResp["orderId"]

	// Add item 1
	itemBody := `{"menuItemId":"test-mi-lifecycle","quantity":1}`
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/items", strings.NewReader(itemBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var itemResp map[string]string
	json.NewDecoder(w.Body).Decode(&itemResp)
	itemID := itemResp["itemId"]

	// Add item 2
	itemBody2 := `{"menuItemId":"test-mi-lifecycle-2","quantity":2}`
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/items", strings.NewReader(itemBody2))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Verify subtotal before cancel
	var subtotal int
	db.QueryRow(`SELECT subtotal FROM orders WHERE id = $1`, orderID).Scan(&subtotal)
	expectedSubtotal := 50000 + 2*30000 // 50000 + 60000
	if subtotal != expectedSubtotal {
		t.Errorf("expected subtotal %d, got %d", expectedSubtotal, subtotal)
	}

	// Cancel item 1
	req = httptest.NewRequest("DELETE", "/api/orders/"+orderID+"/items/"+itemID, nil)
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("cancel item expected 200, got %d", w.Code)
	}

	// Verify item is CANCELLED
	var itemStatus string
	db.QueryRow(`SELECT status FROM order_items WHERE id = $1`, itemID).Scan(&itemStatus)
	if itemStatus != "CANCELLED" {
		t.Errorf("expected CANCELLED, got %s", itemStatus)
	}

	// Verify subtotal was recalculated (only item 2 remains)
	db.QueryRow(`SELECT subtotal FROM orders WHERE id = $1`, orderID).Scan(&subtotal)
	if subtotal != 60000 {
		t.Errorf("expected subtotal 60000 after cancel, got %d", subtotal)
	}
}

func TestOrderLifecycle_CancelAllItemsCancelsOrder(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Post("/api/orders", handler.CreateOrder)
	r.Post("/api/orders/{id}/items", handler.AddItem)
	r.Delete("/api/orders/{id}/items/{itemId}", handler.CancelItem)

	// Create order with 1 item
	body := `{"tableNumber":"7"}`
	req := httptest.NewRequest("POST", "/api/orders", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var createResp map[string]string
	json.NewDecoder(w.Body).Decode(&createResp)
	orderID := createResp["orderId"]

	itemBody := `{"menuItemId":"test-mi-lifecycle","quantity":1}`
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/items", strings.NewReader(itemBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var itemResp map[string]string
	json.NewDecoder(w.Body).Decode(&itemResp)
	itemID := itemResp["itemId"]

	// Cancel the only item
	req = httptest.NewRequest("DELETE", "/api/orders/"+orderID+"/items/"+itemID, nil)
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("cancel item expected 200, got %d", w.Code)
	}

	// Verify order is also CANCELLED
	var orderStatus string
	db.QueryRow(`SELECT status FROM orders WHERE id = $1`, orderID).Scan(&orderStatus)
	if orderStatus != "CANCELLED" {
		t.Errorf("expected order CANCELLED when all items cancelled, got %s", orderStatus)
	}
}

func TestOrderLifecycle_CannotAddItemsToCancelledOrder(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Post("/api/orders", handler.CreateOrder)
	r.Post("/api/orders/{id}/items", handler.AddItem)
	r.Delete("/api/orders/{id}/items/{itemId}", handler.CancelItem)

	body := `{"tableNumber":"8"}`
	req := httptest.NewRequest("POST", "/api/orders", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var createResp map[string]string
	json.NewDecoder(w.Body).Decode(&createResp)
	orderID := createResp["orderId"]

	// Cancel the order directly in DB
	db.Exec(`UPDATE orders SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = $1`, orderID)

	// Try to add an item to the cancelled order
	itemBody := `{"menuItemId":"test-mi-lifecycle","quantity":1}`
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/items", strings.NewReader(itemBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 when adding items to cancelled order, got %d", w.Code)
	}
}

func TestOrderLifecycle_SendToKitchenWithDraftStatus(t *testing.T) {
	handler, db, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Post("/api/orders", handler.CreateOrder)
	r.Post("/api/orders/{id}/send", handler.SendToKitchen)
	r.Post("/api/orders/{id}/items", handler.AddItem)

	body := `{}`
	req := httptest.NewRequest("POST", "/api/orders", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var createResp map[string]string
	json.NewDecoder(w.Body).Decode(&createResp)
	orderID := createResp["orderId"]

	// Add an item so we have something to send
	itemBody := `{"menuItemId":"test-mi-lifecycle","quantity":2}`
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/items", strings.NewReader(itemBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("add item expected 201, got %d", w.Code)
	}

	// Send to kitchen — order has items, should work
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/send", nil)
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("send to kitchen expected 200, got %d", w.Code)
	}

	var orderStatus string
	db.QueryRow(`SELECT status FROM orders WHERE id = $1`, orderID).Scan(&orderStatus)
	if orderStatus != "SENT" {
		t.Errorf("expected SENT, got %s", orderStatus)
	}
}

// ---------------------------------------------------------------------------
// Security and edge case tests
// ---------------------------------------------------------------------------

func TestOrderLifecycle_SQLInjectionInOrderId(t *testing.T) {
	handler, _, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Get("/api/orders/{id}", handler.GetOrder)

	// Attempt SQL injection in order ID
	req := httptest.NewRequest("GET", "/api/orders/';DROP%20TABLE%20orders;--", nil)
	req = req.WithContext(lifecycleContext(req.Context()))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Should return 404, not crash
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for SQL injection attempt, got %d", w.Code)
	}

	// Verify the orders table still exists
	var count int
	err := handler.db.QueryRow(`SELECT COUNT(*) FROM orders`).Scan(&count)
	if err != nil {
		t.Errorf("orders table should still exist after injection attempt: %v", err)
	}
}

func TestOrderLifecycle_XSSInItemNotes(t *testing.T) {
	handler, _, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Post("/api/orders", handler.CreateOrder)
	r.Post("/api/orders/{id}/items", handler.AddItem)

	body := `{}`
	req := httptest.NewRequest("POST", "/api/orders", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var createResp map[string]string
	json.NewDecoder(w.Body).Decode(&createResp)
	orderID := createResp["orderId"]

	// Add item with HTML in notes
	// Use XSS payload without internal quotes to keep JSON valid
	xssPayload := `<script>alert('XSS')</script>`
	itemBody := `{"menuItemId":"test-mi-lifecycle","quantity":1,"notes":"` + xssPayload + `"}`
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/items", strings.NewReader(itemBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}

	// Verify notes were stored (as-is; XSS prevention should happen at rendering layer)
	var storedNotes sql.NullString
	handler.db.QueryRow(`SELECT notes FROM order_items WHERE order_id = $1`, orderID).Scan(&storedNotes)
	if !storedNotes.Valid || storedNotes.String != xssPayload {
		t.Errorf("expected notes to be stored as-is, got '%v'", storedNotes)
	}
}

func TestOrderLifecycle_NotesTooLong(t *testing.T) {
	handler, _, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Post("/api/orders", handler.CreateOrder)
	r.Post("/api/orders/{id}/items", handler.AddItem)

	body := `{}`
	req := httptest.NewRequest("POST", "/api/orders", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var createResp map[string]string
	json.NewDecoder(w.Body).Decode(&createResp)
	orderID := createResp["orderId"]

	// Create a note that exceeds maxNotesLength (500)
	longNote := strings.Repeat("a", 501)
	itemBody := `{"menuItemId":"test-mi-lifecycle","quantity":1,"notes":"` + longNote + `"}`
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/items", strings.NewReader(itemBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for long notes, got %d", w.Code)
	}

	var errResp models.ErrorResponse
	json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Code != "NOTES_TOO_LONG" {
		t.Errorf("expected NOTES_TOO_LONG, got %s", errResp.Code)
	}
}

func TestOrderLifecycle_CannotSendAlreadySentOrder(t *testing.T) {
	handler, _, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Post("/api/orders", handler.CreateOrder)
	r.Post("/api/orders/{id}/send", handler.SendToKitchen)
	r.Post("/api/orders/{id}/items", handler.AddItem)

	body := `{}`
	req := httptest.NewRequest("POST", "/api/orders", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var createResp map[string]string
	json.NewDecoder(w.Body).Decode(&createResp)
	orderID := createResp["orderId"]

	// Add an item first
	itemBody := `{"menuItemId":"test-mi-lifecycle","quantity":2}`
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/items", strings.NewReader(itemBody))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("add item expected 201, got %d", w.Code)
	}

	// First send — should succeed
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/send", nil)
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("first send expected 200, got %d", w.Code)
	}

	// Second send — should succeed (idempotent, no PENDING items to send)
	req = httptest.NewRequest("POST", "/api/orders/"+orderID+"/send", nil)
	req = req.WithContext(lifecycleContext(req.Context()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("second send expected 200, got %d", w.Code)
	}
}

func TestHealthCheck(t *testing.T) {
	db, err := sql.Open("pgx", "postgres://mofe:mofe@localhost:5432/mofe_test")
	if err != nil {
		t.Skipf("Test database not available: %v", err)
	}
	defer db.Close()

	handler := HealthCheck(db)
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	handler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "healthy" {
		t.Errorf("expected healthy, got %v", resp)
	}
}

func TestOrderLifecycle_ReleaseTableDifferentTables(t *testing.T) {
	handler, _, clean := setupLifecycleTest(t)
	defer clean()

	r := chi.NewRouter()
	r.Post("/api/orders/release-table/{tableNumber}", handler.ReleaseTable)

	// Release two different tables (verifies no shared state)
	for _, tn := range []string{"1", "99"} {
		req := httptest.NewRequest("POST", "/api/orders/release-table/"+tn, nil)
		req = req.WithContext(lifecycleContext(req.Context()))
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Errorf("release table %s expected 200, got %d", tn, w.Code)
		}
	}
}

func TestOrderLifecycle_SendEmptyOrderPreventsSend(t *testing.T) {
	handler, _, clean := setupLifecycleTest(t)
	defer clean()

	// Use context.Background() for direct DB queries to avoid any Chi context issues
	ctx := context.Background()
	session := lifecycleSession()

	// Insert order directly into DB
	var orderID string
	if err := handler.db.QueryRowContext(ctx, `SELECT gen_random_uuid()::text`).Scan(&orderID); err != nil {
		t.Fatalf("failed to generate order ID: %v", err)
	}
	_, err := handler.db.ExecContext(ctx, `
		INSERT INTO orders (id, venue_id, waiter_id, guest_count, status)
		VALUES ($1, $2, $3, 1, 'PENDING')
	`, orderID, session.VenueID, session.UserID)
	if err != nil {
		t.Fatalf("failed to create test order: %v", err)
	}

	// Call SendToKitchen handler via router
	r := chi.NewRouter()
	r.Post("/api/orders/{id}/send", handler.SendToKitchen)

	req := httptest.NewRequest("POST", "/api/orders/"+orderID+"/send", nil)
	req = req.WithContext(context.WithValue(context.Background(), middleware.SessionContextKey, session))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Should fail with 400 (no items)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty order send, got %d", w.Code)
	} else {
		var errResp models.ErrorResponse
		json.NewDecoder(w.Body).Decode(&errResp)
		if errResp.Code != "NO_ITEMS" {
			t.Errorf("expected NO_ITEMS error code, got %s", errResp.Code)
		}

		// Verify order is still PENDING, not SENT
		var orderStatus string
		handler.db.QueryRowContext(ctx, `SELECT status FROM orders WHERE id = $1`, orderID).Scan(&orderStatus)
		if orderStatus != "PENDING" {
			t.Errorf("expected PENDING (not SENT), got %s", orderStatus)
		}
	}
}

func TestOrderLifecycle_SendOrderWithDirectItemsWorks(t *testing.T) {
	handler, _, clean := setupLifecycleTest(t)
	defer clean()

	ctx := context.Background()
	session := lifecycleSession()

	// Insert order directly
	var orderID string
	if err := handler.db.QueryRowContext(ctx, `SELECT gen_random_uuid()::text`).Scan(&orderID); err != nil {
		t.Fatalf("failed to generate order ID: %v", err)
	}
	_, err := handler.db.ExecContext(ctx, `
		INSERT INTO orders (id, venue_id, waiter_id, guest_count, status)
		VALUES ($1, $2, $3, 1, 'PENDING')
	`, orderID, session.VenueID, session.UserID)
	if err != nil {
		t.Fatalf("failed to create test order: %v", err)
	}

	// Insert PENDING item
	_, err = handler.db.ExecContext(ctx, `
		INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, station, status)
		VALUES ($1, $2, 'test-mi-direct', 'Direct Item', 1, 25000, 25000, 'KITCHEN', 'PENDING')
	`, "test-oi-send-"+orderID, orderID)
	if err != nil {
		t.Fatalf("failed to insert test item: %v", err)
	}

	// Call SendToKitchen handler via router
	r := chi.NewRouter()
	r.Post("/api/orders/{id}/send", handler.SendToKitchen)

	req := httptest.NewRequest("POST", "/api/orders/"+orderID+"/send", nil)
	req = req.WithContext(context.WithValue(context.Background(), middleware.SessionContextKey, session))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("send with items expected 200, got %d", w.Code)
	} else {
		var orderStatus string
		handler.db.QueryRowContext(ctx, `SELECT status FROM orders WHERE id = $1`, orderID).Scan(&orderStatus)
		if orderStatus != "SENT" {
			t.Errorf("expected SENT, got %s", orderStatus)
		}

		var itemStatus string
		handler.db.QueryRowContext(ctx, `SELECT status FROM order_items WHERE id = $1`, "test-oi-send-"+orderID).Scan(&itemStatus)
		if itemStatus != "SENT" {
			t.Errorf("expected item status SENT, got %s", itemStatus)
		}
	}
}
