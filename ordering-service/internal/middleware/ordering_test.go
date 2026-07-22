package middleware

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mofe-menu/ordering-service/internal/models"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func setupOrderingTestDB(t *testing.T) (*sql.DB, func()) {
	t.Helper()
	db, err := sql.Open("pgx", "postgres://mofe:mofe@localhost:5432/mofe_test")
	if err != nil {
		t.Skipf("Test database not available: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Skipf("Test database not reachable: %v", err)
	}

	clean := func() {
		db.Exec(`DELETE FROM "Subscription"`)
		db.Exec(`DELETE FROM "Venue"`)
		db.Exec(`DELETE FROM "Plan"`)
		db.Close()
	}

	return db, clean
}

func seedOrderingTestPlans(t *testing.T, db *sql.DB) {
	t.Helper()
	plans := []struct {
		slug            string
		orderingEnabled bool
	}{
		{"basic", false},
		{"pro", true},
		{"premium", true},
	}
	for _, p := range plans {
		_, err := db.Exec(`
			INSERT INTO "Plan" (id, slug, "nameFa", "nameEn", "priceToman", "trialDays", "sortOrder", purchasable, "maxMenuItems", "maxTables", "customDomain", "orderingEnabled", "createdAt", "updatedAt")
			VALUES (gen_random_uuid()::text, $1, $2, $2, 0, 0, 0, false, -1, -1, false, $3, NOW(), NOW())
			ON CONFLICT (slug) DO UPDATE SET "orderingEnabled" = $3
		`, p.slug, p.slug, p.orderingEnabled)
		if err != nil {
			t.Fatalf("failed to seed plan %s: %v", p.slug, err)
		}
	}
}

func seedOrderingTestVenue(t *testing.T, db *sql.DB, venueID string) {
	t.Helper()
	_, err := db.Exec(`
		INSERT INTO "Venue" (id, "nameFa", slug, "publicStatus", timezone, "createdAt", "updatedAt")
		VALUES ($1, $1, $1, 'draft', 'Asia/Tehran', NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`, venueID)
	if err != nil {
		t.Fatalf("failed to seed venue %s: %v", venueID, err)
	}
}

func seedOrderingTestSubscription(t *testing.T, db *sql.DB, venueID, planSlug string) {
	t.Helper()
	seedOrderingTestVenue(t, db, venueID)
	_, err := db.Exec(`
		INSERT INTO "Subscription" (id, "venueId", "planId", status, "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
		SELECT gen_random_uuid()::text, $1, p.id, 'active', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW()
		FROM "Plan" p WHERE p.slug = $2
		ON CONFLICT ("venueId") DO UPDATE SET "planId" = (SELECT id FROM "Plan" WHERE slug = $2)
	`, venueID, planSlug)
	if err != nil {
		t.Fatalf("failed to seed subscription: %v", err)
	}
}

func TestRequireOrderingEnabled_NoSession(t *testing.T) {
	db, clean := setupOrderingTestDB(t)
	defer clean()

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := RequireOrderingEnabled(db)(handler)
	req := httptest.NewRequest("POST", "/api/orders", nil)
	w := httptest.NewRecorder()
	mw.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestRequireOrderingEnabled_NoSubscription(t *testing.T) {
	db, clean := setupOrderingTestDB(t)
	defer clean()

	seedOrderingTestPlans(t, db)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := RequireOrderingEnabled(db)(handler)
	req := httptest.NewRequest("POST", "/api/orders", nil)
	req = req.WithContext(context.WithValue(req.Context(),
		SessionContextKey,
		&models.Session{UserID: "test-user", VenueID: "test-venue-no-sub", Role: "OWNER"},
	))
	w := httptest.NewRecorder()
	mw.ServeHTTP(w, req)

	if w.Code != http.StatusPaymentRequired {
		t.Errorf("expected 402, got %d", w.Code)
	}
}

func TestRequireOrderingEnabled_OrderingDisabled(t *testing.T) {
	db, clean := setupOrderingTestDB(t)
	defer clean()

	seedOrderingTestPlans(t, db)

	venueID := "test-venue-disabled"
	seedOrderingTestSubscription(t, db, venueID, "basic")

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := RequireOrderingEnabled(db)(handler)
	req := httptest.NewRequest("POST", "/api/orders", nil)
	req = req.WithContext(context.WithValue(req.Context(),
		SessionContextKey,
		&models.Session{UserID: "test-user", VenueID: venueID, Role: "OWNER"},
	))
	w := httptest.NewRecorder()
	mw.ServeHTTP(w, req)

	if w.Code != http.StatusPaymentRequired {
		t.Errorf("expected 402, got %d", w.Code)
	}

	var resp models.ErrorResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Code != "ORDERING_DISABLED" {
		t.Errorf("expected ORDERING_DISABLED code, got %s", resp.Code)
	}
}

func TestRequireOrderingEnabled_OrderingEnabled(t *testing.T) {
	db, clean := setupOrderingTestDB(t)
	defer clean()

	seedOrderingTestPlans(t, db)

	venueID := "test-venue-enabled"
	seedOrderingTestSubscription(t, db, venueID, "pro")

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mw := RequireOrderingEnabled(db)(handler)
	req := httptest.NewRequest("POST", "/api/orders", nil)
	req = req.WithContext(context.WithValue(req.Context(),
		SessionContextKey,
		&models.Session{UserID: "test-user", VenueID: venueID, Role: "OWNER"},
	))
	w := httptest.NewRecorder()
	mw.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}
