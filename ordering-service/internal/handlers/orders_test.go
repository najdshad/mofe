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
