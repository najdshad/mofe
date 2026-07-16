package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/mofe-menu/ordering-service/internal/models"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func setupAnalyticsTest(t *testing.T) (*AnalyticsHandler, func()) {
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

	clean := func() {
		db.Exec("DELETE FROM order_items")
		db.Exec("DELETE FROM orders")
		db.Exec(`DELETE FROM "MenuItemVariant"`)
		db.Exec(`DELETE FROM "MenuItem"`)
		db.Exec(`DELETE FROM "AuditLog"`)
		db.Exec(`DELETE FROM "VenueMember"`)
		db.Exec(`DELETE FROM "Session"`)
		db.Exec(`DELETE FROM "Venue"`)
		db.Exec(`DELETE FROM "User"`)
		db.Close()
	}

	return NewAnalyticsHandler(db, 5*time.Second), clean
}

func ensureTestSchema(db *sql.DB) error {
	schema := `
	DO $$ BEGIN
		CREATE TYPE order_status AS ENUM ('DRAFT','PENDING','SENT','IN_PROGRESS','READY','DELIVERED','COMPLETED','CANCELLED');
	EXCEPTION WHEN duplicate_object THEN NULL;
	END $$;

	DO $$ BEGIN
		CREATE TYPE item_status AS ENUM ('PENDING','SENT','PREPARING','READY','DELIVERED','CANCELLED');
	EXCEPTION WHEN duplicate_object THEN NULL;
	END $$;

	DO $$ BEGIN
		CREATE TYPE station AS ENUM ('KITCHEN','BAR');
	EXCEPTION WHEN duplicate_object THEN NULL;
	END $$;

	CREATE TABLE IF NOT EXISTS orders (
		id TEXT PRIMARY KEY,
		venue_id TEXT NOT NULL,
		waiter_id TEXT NOT NULL,
		table_number TEXT,
		guest_count INT DEFAULT 1,
		status order_status DEFAULT 'PENDING',
		subtotal INT NOT NULL DEFAULT 0,
		total INT NOT NULL DEFAULT 0,
		notes TEXT,
		created_at TIMESTAMPTZ DEFAULT NOW(),
		sent_to_kitchen_at TIMESTAMPTZ,
		ready_at TIMESTAMPTZ,
		delivered_at TIMESTAMPTZ,
		cancelled_at TIMESTAMPTZ,
		created_by_name TEXT
	);

	ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

	CREATE TABLE IF NOT EXISTS order_items (
		id TEXT PRIMARY KEY,
		order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
		menu_item_id TEXT NOT NULL,
		menu_item_name TEXT NOT NULL,
		variant_id TEXT,
		variant_name TEXT,
		quantity INT NOT NULL CHECK (quantity > 0),
		unit_price INT NOT NULL,
		total_price INT NOT NULL,
		station station NOT NULL,
		status item_status DEFAULT 'PENDING',
		notes TEXT,
		sent_at TIMESTAMPTZ,
		preparing_at TIMESTAMPTZ,
		ready_at TIMESTAMPTZ,
		delivered_at TIMESTAMPTZ,
		cancelled_at TIMESTAMPTZ,
		course_number INT DEFAULT 1,
		created_at TIMESTAMPTZ DEFAULT NOW()
	);
	`
	_, err := db.Exec(schema)
	return err
}

func seedAnalyticsData(t *testing.T, db *sql.DB, session *models.Session) {
	t.Helper()

	venueID := session.VenueID
	userID := session.UserID

	_, err := db.Exec(`INSERT INTO "Venue" (id, "nameFa", "nameEn", slug, "publicStatus", "createdAt", "updatedAt")
		VALUES ($1, 'Test Venue', 'Test Venue', 'test-venue', 'draft', NOW(), NOW())
		ON CONFLICT (id) DO NOTHING`, venueID)
	if err != nil {
		t.Fatalf("failed to insert venue: %v", err)
	}

	_, err = db.Exec(`INSERT INTO "User" (id, email, name, "passwordHash", status, "createdAt", "updatedAt")
		VALUES ($1, 'test@test.ir', 'Test User', 'hash', 'active', NOW(), NOW())
		ON CONFLICT (id) DO NOTHING`, userID)
	if err != nil {
		t.Fatalf("failed to insert user: %v", err)
	}

	_, err = db.Exec(`INSERT INTO "VenueMember" (id, "venueId", "userId", role, "createdAt", "updatedAt")
		VALUES (gen_random_uuid()::text, $1, $2, 'owner', NOW(), NOW())
		ON CONFLICT ("venueId", "userId") DO NOTHING`, venueID, userID)
	if err != nil {
		t.Fatalf("failed to insert venue member: %v", err)
	}

	_, err = db.Exec(`INSERT INTO "Category" (id, "venueId", "nameFa", "displayOrder", active, "createdAt", "updatedAt")
		VALUES ($1, $2, 'Test Category', 1, true, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING`, "test-category", venueID)
	if err != nil {
		t.Fatalf("failed to insert category: %v", err)
	}

	_, err = db.Exec(`INSERT INTO "MenuItem" (id, "venueId", "categoryId", "nameFa", "priceToman", station, "displayOrder", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, 'Test Item', 50000, 'KITCHEN', 1, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING`,
		"test-menu-item", venueID, "test-category")
	if err != nil {
		t.Fatalf("failed to insert menu item: %v", err)
	}

	_, err = db.Exec(`INSERT INTO orders (id, venue_id, waiter_id, status, subtotal, total, created_by_name, created_at)
		VALUES ($1, $2, $3, 'SENT', 100000, 100000, 'Test Waiter', NOW())`,
		"test-order-1", venueID, userID)
	if err != nil {
		t.Fatalf("failed to insert order 1: %v", err)
	}

	_, err = db.Exec(`INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, station, status, created_at)
		VALUES ($1, $2, $3, 'Test Item', 2, 50000, 100000, 'KITCHEN', 'SENT', NOW())`,
		"test-item-1", "test-order-1", "test-menu-item")
	if err != nil {
		t.Fatalf("failed to insert item 1: %v", err)
	}

	_, err = db.Exec(`INSERT INTO orders (id, venue_id, waiter_id, status, subtotal, total, created_by_name, created_at)
		VALUES ($1, $2, $3, 'READY', 150000, 150000, 'Test Waiter', NOW())`,
		"test-order-2", venueID, userID)
	if err != nil {
		t.Fatalf("failed to insert order 2: %v", err)
	}

	_, err = db.Exec(`INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, station, status, created_at)
		VALUES ($1, $2, $3, 'Test Item', 3, 50000, 150000, 'KITCHEN', 'READY', NOW())`,
		"test-item-2", "test-order-2", "test-menu-item")
	if err != nil {
		t.Fatalf("failed to insert item 2: %v", err)
	}

	_, err = db.Exec(`INSERT INTO orders (id, venue_id, waiter_id, status, subtotal, total, created_by_name, created_at)
		VALUES ($1, $2, $3, 'CANCELLED', 0, 0, 'Test Waiter', NOW())`,
		"test-order-3", venueID, userID)
	if err != nil {
		t.Fatalf("failed to insert order 3: %v", err)
	}
}

func TestAnalyticsDailySummaryEmpty(t *testing.T) {
	handler, clean := setupAnalyticsTest(t)
	defer clean()

	req := httptest.NewRequest("GET", "/api/admin/analytics/daily-summary", nil)
	req = req.WithContext(contextWithSession(req.Context()))

	w := httptest.NewRecorder()
	handler.DailySummary(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	summary, ok := resp["summary"].(map[string]interface{})
	if !ok {
		t.Fatal("expected summary object")
	}

	if summary["totalOrders"].(float64) != 0 {
		t.Errorf("expected 0 totalOrders, got %v", summary["totalOrders"])
	}
	if summary["totalRevenue"].(float64) != 0 {
		t.Errorf("expected 0 totalRevenue, got %v", summary["totalRevenue"])
	}
	if summary["totalItems"].(float64) != 0 {
		t.Errorf("expected 0 totalItems, got %v", summary["totalItems"])
	}

	topItems, ok := resp["topItems"].([]interface{})
	if !ok {
		t.Fatal("expected topItems array")
	}
	if len(topItems) != 0 {
		t.Errorf("expected empty topItems, got %d items", len(topItems))
	}
}

func TestAnalyticsDailySummaryInvalidDate(t *testing.T) {
	handler, clean := setupAnalyticsTest(t)
	defer clean()

	req := httptest.NewRequest("GET", "/api/admin/analytics/daily-summary?date=not-a-date", nil)
	req = req.WithContext(contextWithSession(req.Context()))

	w := httptest.NewRecorder()
	handler.DailySummary(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}

	var errResp models.ErrorResponse
	json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Code != "INVALID_DATE" {
		t.Errorf("expected INVALID_DATE code, got %s", errResp.Code)
	}
}

func TestAnalyticsDailySummaryWithData(t *testing.T) {
	handler, clean := setupAnalyticsTest(t)
	defer clean()

	session := createTestSession()
	seedAnalyticsData(t, handler.db, session)

	req := httptest.NewRequest("GET", "/api/admin/analytics/daily-summary", nil)
	req = req.WithContext(contextWithSession(req.Context()))

	w := httptest.NewRecorder()
	handler.DailySummary(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	summary, ok := resp["summary"].(map[string]interface{})
	if !ok {
		t.Fatal("expected summary object")
	}

	if summary["totalOrders"].(float64) != 3 {
		t.Errorf("expected 3 totalOrders, got %v", summary["totalOrders"])
	}
	if summary["totalRevenue"].(float64) != 250000 {
		t.Errorf("expected 250000 totalRevenue, got %v", summary["totalRevenue"])
	}
	if summary["cancelledOrders"].(float64) != 1 {
		t.Errorf("expected 1 cancelledOrder, got %v", summary["cancelledOrders"])
	}
	if summary["sentOrders"].(float64) != 1 {
		t.Errorf("expected 1 sentOrder, got %v", summary["sentOrders"])
	}
	if summary["readyOrders"].(float64) != 1 {
		t.Errorf("expected 1 readyOrder, got %v", summary["readyOrders"])
	}

	topItems, ok := resp["topItems"].([]interface{})
	if !ok {
		t.Fatal("expected topItems array")
	}
	if len(topItems) == 0 {
		t.Fatal("expected non-empty topItems")
	}

	item := topItems[0].(map[string]interface{})
	if item["menuItemName"] != "Test Item" {
		t.Errorf("expected 'Test Item', got %v", item["menuItemName"])
	}
}

func TestAnalyticsDailySummaryDateParam(t *testing.T) {
	handler, clean := setupAnalyticsTest(t)
	defer clean()

	today := time.Now().Format("2006-01-02")
	req := httptest.NewRequest("GET", "/api/admin/analytics/daily-summary?date="+today, nil)
	req = req.WithContext(contextWithSession(req.Context()))

	w := httptest.NewRecorder()
	handler.DailySummary(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	req = httptest.NewRequest("GET", "/api/admin/analytics/daily-summary?date="+tomorrow, nil)
	req = req.WithContext(contextWithSession(req.Context()))

	w = httptest.NewRecorder()
	handler.DailySummary(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for future date, got %d", w.Code)
	}
}
