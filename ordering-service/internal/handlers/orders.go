package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/mofe-menu/ordering-service/internal/middleware"
	"github.com/mofe-menu/ordering-service/internal/models"
)

const (
	maxNotesLength       = 500
	maxTableNumberLength = 20
)

type OrderHandler struct {
	db  *sql.DB
	hub *Hub
}

func NewOrderHandler(db *sql.DB, hub *Hub) *OrderHandler {
	return &OrderHandler{db: db, hub: hub}
}

func (h *OrderHandler) execContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	start := time.Now()
	result, err := h.db.ExecContext(ctx, query, args...)
	middleware.ObserveDBQuery(time.Since(start))
	return result, err
}

func (h *OrderHandler) queryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	start := time.Now()
	rows, err := h.db.QueryContext(ctx, query, args...)
	middleware.ObserveDBQuery(time.Since(start))
	return rows, err
}

func (h *OrderHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())

	r.Body = http.MaxBytesReader(w, r.Body, 4096)

	var req struct {
		TableNumber string `json:"tableNumber"`
		GuestCount  int    `json:"guestCount"`
		Notes       string `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.WriteError(w, http.StatusBadRequest, "Invalid request body", "INVALID_JSON")
		return
	}

	if req.GuestCount < 1 {
		req.GuestCount = 1
	}

	if len(req.Notes) > maxNotesLength {
		models.WriteError(w, http.StatusBadRequest, "Notes too long", "NOTES_TOO_LONG")
		return
	}
	if len(req.TableNumber) > maxTableNumberLength {
		models.WriteError(w, http.StatusBadRequest, "Table number too long", "TABLE_NUMBER_TOO_LONG")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		return
	}
	defer tx.Rollback()

	var waiterName string
	err = tx.QueryRowContext(ctx,
		`SELECT name FROM "User" WHERE id = $1`, session.UserID,
	).Scan(&waiterName)
	if err != nil {
		slog.Error("Failed to get waiter name", "error", err, "userId", session.UserID)
		waiterName = "Unknown"
	}

	orderID := uuid.New().String()
	guestCount := req.GuestCount
	var notes *string
	if req.Notes != "" {
		notes = &req.Notes
	}
	var tableNumber *string
	if req.TableNumber != "" {
		tableNumber = &req.TableNumber
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO orders (
			id, venue_id, waiter_id, table_number,
			guest_count, notes, status, subtotal, total, created_by_name
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, orderID, session.VenueID, session.UserID,
		tableNumber, guestCount, notes, "PENDING", 0, 0, waiterName)

	if err != nil {
		slog.Error("Failed to create order",
			"error", err,
			"venueId", session.VenueID,
			"userId", session.UserID,
		)
		models.WriteError(w, http.StatusInternalServerError, "Failed to create order", "CREATE_FAILED")
		return
	}

	if err := tx.Commit(); err != nil {
		slog.Error("Failed to commit transaction", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to commit", "DB_ERROR")
		return
	}

	middleware.RecordOrderCreated()

	slog.Info("Order created",
		"orderId", orderID,
		"venueId", session.VenueID,
		"waiter", waiterName,
	)

	h.hub.BroadcastToVenue(session.VenueID, EventOrderCreated, map[string]interface{}{
		"orderId":    orderID,
		"venueId":    session.VenueID,
		"waiterId":   session.UserID,
		"waiterName": waiterName,
		"tableNumber": tableNumber,
		"guestCount": guestCount,
		"notes":      notes,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"orderId": orderID})
}

func (h *OrderHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	orderID := chi.URLParam(r, "id")

	r.Body = http.MaxBytesReader(w, r.Body, 4096)

	var req struct {
		MenuItemID string  `json:"menuItemId"`
		VariantID  *string `json:"variantId"`
		Quantity   int     `json:"quantity"`
		Notes      string  `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.WriteError(w, http.StatusBadRequest, "Invalid request body", "INVALID_JSON")
		return
	}

	if req.Quantity <= 0 {
		models.WriteError(w, http.StatusBadRequest, "Quantity must be positive", "INVALID_QUANTITY")
		return
	}

	if req.MenuItemID == "" {
		models.WriteError(w, http.StatusBadRequest, "menuItemId is required", "MISSING_FIELD")
		return
	}

	if len(req.Notes) > maxNotesLength {
		models.WriteError(w, http.StatusBadRequest, "Notes too long", "NOTES_TOO_LONG")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		return
	}
	defer tx.Rollback()

	var venueID string
	var currentStatus string
	err = tx.QueryRowContext(ctx,
		`SELECT venue_id, status FROM orders WHERE id = $1 FOR UPDATE`, orderID,
	).Scan(&venueID, &currentStatus)

	if err != nil {
		if err == sql.ErrNoRows {
			models.WriteError(w, http.StatusNotFound, "Order not found", "NOT_FOUND")
		} else {
			models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		}
		return
	}

	if venueID != session.VenueID {
		models.WriteError(w, http.StatusNotFound, "Order not found", "NOT_FOUND")
		return
	}

	if currentStatus != "PENDING" && currentStatus != "SENT" {
		models.WriteError(w, http.StatusBadRequest, "Cannot modify order in status: "+currentStatus, "INVALID_STATUS")
		return
	}

	var itemName string
	var stationRaw string
	var unitPrice int
	var variantName sql.NullString

	query := `
		SELECT
			mi."nameFa",
			mi."station",
			mi."priceToman" + COALESCE(miv."priceModifier", 0) as price,
			miv."nameFa" as variant_name
		FROM "MenuItem" mi
		LEFT JOIN "MenuItemVariant" miv ON miv.id = $2 AND miv."menuItemId" = mi.id
		WHERE mi.id = $1 AND mi."venueId" = $3 AND mi."deletedAt" IS NULL
	`

	err = tx.QueryRowContext(ctx, query,
		req.MenuItemID, req.VariantID, session.VenueID,
	).Scan(&itemName, &stationRaw, &unitPrice, &variantName)

	if err != nil {
		if err == sql.ErrNoRows {
			models.WriteError(w, http.StatusNotFound, "Menu item not found", "ITEM_NOT_FOUND")
		} else {
			models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		}
		return
	}

	station := strings.ToUpper(stationRaw)

	itemID := uuid.New().String()
	totalPrice := req.Quantity * unitPrice

	var notes *string
	if req.Notes != "" {
		notes = &req.Notes
	}

	start := time.Now()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO order_items (
			id, order_id, menu_item_id, menu_item_name,
			variant_id, variant_name, quantity, unit_price,
			total_price, station, status, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`, itemID, orderID, req.MenuItemID, itemName,
		req.VariantID, variantName, req.Quantity, unitPrice,
		totalPrice, station, "PENDING", notes)
	middleware.ObserveDBQuery(time.Since(start))

	if err != nil {
		slog.Error("Failed to add item",
			"error", err,
			"orderId", orderID,
			"menuItemId", req.MenuItemID,
		)
		models.WriteError(w, http.StatusInternalServerError, "Failed to add item", "ADD_ITEM_FAILED")
		return
	}

	middleware.RecordItemsOrdered(req.Quantity)

	start = time.Now()
	_, err = tx.ExecContext(ctx, `
		UPDATE orders
		SET subtotal = t.val, total = t.val
		FROM (SELECT COALESCE(SUM(total_price), 0) AS val FROM order_items WHERE order_id = $1) t
		WHERE id = $1
	`, orderID)
	middleware.ObserveDBQuery(time.Since(start))

	if err != nil {
		slog.Error("Failed to update order totals", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to update order totals", "DB_ERROR")
		return
	}

	if err := tx.Commit(); err != nil {
		slog.Error("Failed to commit transaction", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to commit", "DB_ERROR")
		return
	}

	slog.Info("Item added to order",
		"itemId", itemID,
		"orderId", orderID,
		"quantity", req.Quantity,
		"totalPrice", totalPrice,
	)

	h.hub.BroadcastToVenue(session.VenueID, EventItemAdded, map[string]interface{}{
		"itemId":     itemID,
		"orderId":    orderID,
		"menuItemId": req.MenuItemID,
		"menuItemName": itemName,
		"variantId":  req.VariantID,
		"variantName": variantName.String,
		"quantity":   req.Quantity,
		"unitPrice":  unitPrice,
		"totalPrice": totalPrice,
		"station":    station,
		"notes":      req.Notes,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"itemId": itemID})
}

func (h *OrderHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	status := r.URL.Query().Get("status")

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

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

	start := time.Now()
	rows, err := h.db.QueryContext(ctx, query, args...)
	middleware.ObserveDBQuery(time.Since(start))
	if err != nil {
		slog.Error("Failed to fetch orders", "error", err, "venueId", session.VenueID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to fetch orders", "DB_ERROR")
		return
	}
	defer rows.Close()

	type OrderRow struct {
		ID            string
		TableNumber   sql.NullString
		Status        string
		Total         int
		CreatedAt     time.Time
		CreatedByName string
	}

	var orders []map[string]interface{}
	for rows.Next() {
		var o OrderRow
		if err := rows.Scan(&o.ID, &o.TableNumber, &o.Status, &o.Total, &o.CreatedAt, &o.CreatedByName); err != nil {
			slog.Error("Failed to scan order row", "error", err)
			models.WriteError(w, http.StatusInternalServerError, "Failed to read orders", "DB_ERROR")
			return
		}

		orders = append(orders, map[string]interface{}{
			"id":          o.ID,
			"tableNumber": o.TableNumber.String,
			"status":      o.Status,
			"total":       o.Total,
			"createdAt":   o.CreatedAt,
			"createdBy":   o.CreatedByName,
		})
	}

	if err := rows.Err(); err != nil {
		slog.Error("Error iterating order rows", "error", err, "venueId", session.VenueID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to fetch orders", "DB_ERROR")
		return
	}

	if orders == nil {
		orders = []map[string]interface{}{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	orderID := chi.URLParam(r, "id")

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	type OrderRow struct {
		ID              string
		VenueID         string
		WaiterID        string
		TableNumber     sql.NullString
		GuestCount      int
		Status          string
		Subtotal        int
		Total           int
		Notes           sql.NullString
		CreatedAt       time.Time
		SentToKitchenAt sql.NullTime
		ReadyAt         sql.NullTime
		DeliveredAt     sql.NullTime
		CancelledAt     sql.NullTime
		CompletedAt     sql.NullTime
		CreatedByName   string
	}

	var o OrderRow
	err := h.db.QueryRowContext(ctx, `
		SELECT id, venue_id, waiter_id, table_number, guest_count,
		       status, subtotal, total, notes, created_at,
		       sent_to_kitchen_at, ready_at, delivered_at, cancelled_at,
		       completed_at, created_by_name
		FROM orders
		WHERE id = $1
	`, orderID).Scan(
		&o.ID, &o.VenueID, &o.WaiterID, &o.TableNumber, &o.GuestCount,
		&o.Status, &o.Subtotal, &o.Total, &o.Notes, &o.CreatedAt,
		&o.SentToKitchenAt, &o.ReadyAt, &o.DeliveredAt, &o.CancelledAt,
		&o.CompletedAt, &o.CreatedByName,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			models.WriteError(w, http.StatusNotFound, "Order not found", "NOT_FOUND")
		} else {
			models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		}
		return
	}

	if o.VenueID != session.VenueID {
		models.WriteError(w, http.StatusNotFound, "Order not found", "NOT_FOUND")
		return
	}

	start := time.Now()
	rows, err := h.db.QueryContext(ctx, `
		SELECT id, order_id, menu_item_id, menu_item_name,
		       variant_id, variant_name, quantity, unit_price,
		       total_price, station, status, notes,
		       sent_at, preparing_at, ready_at, delivered_at, cancelled_at,
		       course_number
		FROM order_items
		WHERE order_id = $1
		ORDER BY course_number, created_at
	`, orderID)
	middleware.ObserveDBQuery(time.Since(start))
	if err != nil {
		models.WriteError(w, http.StatusInternalServerError, "Failed to fetch items", "DB_ERROR")
		return
	}
	defer rows.Close()

	type ItemRow struct {
		ID           string
		OrderID      string
		MenuItemID   string
		MenuItemName string
		VariantID    sql.NullString
		VariantName  sql.NullString
		Quantity     int
		UnitPrice    int
		TotalPrice   int
		Station      string
		Status       string
		Notes        sql.NullString
		SentAt       sql.NullTime
		PreparingAt  sql.NullTime
		ReadyAt      sql.NullTime
		DeliveredAt  sql.NullTime
		CancelledAt  sql.NullTime
		CourseNumber int
	}

	var items []map[string]interface{}
	for rows.Next() {
		var i ItemRow
		if err := rows.Scan(
			&i.ID, &i.OrderID, &i.MenuItemID, &i.MenuItemName,
			&i.VariantID, &i.VariantName, &i.Quantity, &i.UnitPrice,
			&i.TotalPrice, &i.Station, &i.Status, &i.Notes,
			&i.SentAt, &i.PreparingAt, &i.ReadyAt, &i.DeliveredAt, &i.CancelledAt,
			&i.CourseNumber,
		); err != nil {
			slog.Error("Failed to scan item row", "error", err)
			continue
		}

		item := map[string]interface{}{
			"id":           i.ID,
			"orderId":      i.OrderID,
			"menuItemId":   i.MenuItemID,
			"menuItemName": i.MenuItemName,
			"variantId":    i.VariantID.String,
			"variantName":  i.VariantName.String,
			"quantity":     i.Quantity,
			"unitPrice":    i.UnitPrice,
			"totalPrice":   i.TotalPrice,
			"station":      i.Station,
			"status":       i.Status,
			"notes":        i.Notes.String,
			"sentAt":       i.SentAt.Time,
			"preparingAt":  i.PreparingAt.Time,
			"readyAt":      i.ReadyAt.Time,
			"deliveredAt":  i.DeliveredAt.Time,
			"cancelledAt":  i.CancelledAt.Time,
			"courseNumber": i.CourseNumber,
		}
		if i.VariantID.String == "" {
			delete(item, "variantId")
			delete(item, "variantName")
		}
		if i.Notes.String == "" {
			delete(item, "notes")
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		slog.Error("Error iterating item rows", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to fetch items", "DB_ERROR")
		return
	}

	if items == nil {
		items = []map[string]interface{}{}
	}

	var notes *string
	if o.Notes.Valid {
		notes = &o.Notes.String
	}

	order := map[string]interface{}{
		"id":          o.ID,
		"venueId":     o.VenueID,
		"waiterId":    o.WaiterID,
		"tableNumber": o.TableNumber.String,
		"guestCount":  o.GuestCount,
		"status":      o.Status,
		"subtotal":    o.Subtotal,
		"total":       o.Total,
		"notes":       notes,
		"createdAt":   o.CreatedAt,
		"sentToKitchenAt": o.SentToKitchenAt.Time,
		"readyAt":     o.ReadyAt.Time,
		"deliveredAt": o.DeliveredAt.Time,
		"cancelledAt": o.CancelledAt.Time,
		"completedAt": o.CompletedAt.Time,
		"createdBy":   o.CreatedByName,
		"items":       items,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}

func (h *OrderHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	orderID := chi.URLParam(r, "id")
	itemID := chi.URLParam(r, "itemId")

	r.Body = http.MaxBytesReader(w, r.Body, 4096)

	var req struct {
		Quantity *int    `json:"quantity"`
		Notes    *string `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.WriteError(w, http.StatusBadRequest, "Invalid request body", "INVALID_JSON")
		return
	}

	if req.Quantity != nil && *req.Quantity <= 0 {
		models.WriteError(w, http.StatusBadRequest, "Quantity must be positive", "INVALID_QUANTITY")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		return
	}
	defer tx.Rollback()

	var foundOrderID, venueID, currentStatus string
	err = tx.QueryRowContext(ctx, `
		SELECT oi.order_id, o.venue_id, oi.status
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id AND o.id = $2
		WHERE oi.id = $1
		FOR UPDATE OF o
	`, itemID, orderID).Scan(&foundOrderID, &venueID, &currentStatus)

	if err != nil {
		if err == sql.ErrNoRows {
			models.WriteError(w, http.StatusNotFound, "Item not found", "NOT_FOUND")
		} else {
			models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		}
		return
	}

	if venueID != session.VenueID || foundOrderID != orderID {
		models.WriteError(w, http.StatusNotFound, "Item not found", "NOT_FOUND")
		return
	}

	if currentStatus != "PENDING" && currentStatus != "SENT" {
		models.WriteError(w, http.StatusBadRequest, "Cannot modify item in status: "+currentStatus, "INVALID_STATUS")
		return
	}

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
		models.WriteError(w, http.StatusBadRequest, "No fields to update", "NO_FIELDS")
		return
	}

	query := fmt.Sprintf(`
		UPDATE order_items
		SET %s
		WHERE id = $%d
	`, strings.Join(updates, ", "), argCount)
	args = append(args, itemID)

	start := time.Now()
	_, err = tx.ExecContext(ctx, query, args...)
	middleware.ObserveDBQuery(time.Since(start))
	if err != nil {
		slog.Error("Failed to update item", "error", err, "itemId", itemID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to update item", "UPDATE_FAILED")
		return
	}

	start = time.Now()
	_, err = tx.ExecContext(ctx, `
		UPDATE orders
		SET subtotal = t.val, total = t.val
		FROM (SELECT COALESCE(SUM(total_price), 0) AS val FROM order_items WHERE order_id = $1) t
		WHERE id = $1
	`, orderID)
	middleware.ObserveDBQuery(time.Since(start))
	if err != nil {
		slog.Error("Failed to recalculate order total", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to recalculate order total", "DB_ERROR")
		return
	}

	if err := tx.Commit(); err != nil {
		slog.Error("Failed to commit transaction", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to commit", "DB_ERROR")
		return
	}

	slog.Info("Item updated",
		"itemId", itemID,
		"orderId", orderID,
		"venueId", session.VenueID,
	)

	h.hub.BroadcastToVenue(session.VenueID, EventItemUpdated, map[string]interface{}{
		"itemId":    itemID,
		"orderId":   orderID,
		"quantity":  req.Quantity,
		"notes":     req.Notes,
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func (h *OrderHandler) CancelItem(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	orderID := chi.URLParam(r, "id")
	itemID := chi.URLParam(r, "itemId")

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		return
	}
	defer tx.Rollback()

	var foundOrderID, venueID, currentStatus string
	err = tx.QueryRowContext(ctx, `
		SELECT oi.order_id, o.venue_id, oi.status
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id AND o.id = $2
		WHERE oi.id = $1
		FOR UPDATE OF o
	`, itemID, orderID).Scan(&foundOrderID, &venueID, &currentStatus)

	if err != nil {
		if err == sql.ErrNoRows {
			models.WriteError(w, http.StatusNotFound, "Item not found", "NOT_FOUND")
		} else {
			models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		}
		return
	}

	if venueID != session.VenueID || foundOrderID != orderID {
		models.WriteError(w, http.StatusNotFound, "Item not found", "NOT_FOUND")
		return
	}

	if currentStatus != "PENDING" && currentStatus != "SENT" && currentStatus != "PREPARING" {
		models.WriteError(w, http.StatusBadRequest, "Cannot cancel item in status: "+currentStatus, "INVALID_STATUS")
		return
	}

	start := time.Now()
	_, err = tx.ExecContext(ctx, `
		UPDATE order_items
		SET status = 'CANCELLED', cancelled_at = NOW()
		WHERE id = $1 AND status != 'CANCELLED'
	`, itemID)
	middleware.ObserveDBQuery(time.Since(start))
	if err != nil {
		slog.Error("Failed to cancel item", "error", err, "itemId", itemID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to cancel item", "CANCEL_FAILED")
		return
	}

	start = time.Now()
	_, err = tx.ExecContext(ctx, `
		UPDATE orders
		SET subtotal = t.val, total = t.val
		FROM (SELECT COALESCE(SUM(total_price), 0) AS val FROM order_items WHERE order_id = $1 AND status != 'CANCELLED') t
		WHERE id = $1
	`, orderID)
	middleware.ObserveDBQuery(time.Since(start))
	if err != nil {
		slog.Error("Failed to recalculate after cancel", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to recalculate order total", "DB_ERROR")
		return
	}

	var activeItems int
	err = tx.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM order_items
		WHERE order_id = $1 AND status != 'CANCELLED'
	`, orderID).Scan(&activeItems)
	if err != nil {
		slog.Error("Failed to count active items", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to count active items", "DB_ERROR")
		return
	}

	if activeItems == 0 {
		start = time.Now()
		_, err = tx.ExecContext(ctx, `
			UPDATE orders SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = $1
		`, orderID)
		middleware.ObserveDBQuery(time.Since(start))
		if err != nil {
			slog.Error("Failed to cancel order", "error", err, "orderId", orderID)
			models.WriteError(w, http.StatusInternalServerError, "Failed to cancel order", "DB_ERROR")
			return
		}
		slog.Info("Order cancelled (all items cancelled)", "orderId", orderID)
	}

	if err := tx.Commit(); err != nil {
		slog.Error("Failed to commit transaction", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to commit", "DB_ERROR")
		return
	}

	slog.Info("Item cancelled",
		"itemId", itemID,
		"orderId", orderID,
		"venueId", session.VenueID,
	)

	h.hub.BroadcastToVenue(session.VenueID, EventItemCancelled, map[string]interface{}{
		"itemId":    itemID,
		"orderId":   orderID,
		"cancelledAt": time.Now(),
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "cancelled"})
}

func (h *OrderHandler) SendToKitchen(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	orderID := chi.URLParam(r, "id")

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		return
	}
	defer tx.Rollback()

	var venueID, currentStatus string
	err = tx.QueryRowContext(ctx,
		`SELECT venue_id, status FROM orders WHERE id = $1 FOR UPDATE`, orderID,
	).Scan(&venueID, &currentStatus)

	if err != nil {
		if err == sql.ErrNoRows {
			models.WriteError(w, http.StatusNotFound, "Order not found", "NOT_FOUND")
		} else {
			models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		}
		return
	}

	if venueID != session.VenueID {
		models.WriteError(w, http.StatusNotFound, "Order not found", "NOT_FOUND")
		return
	}

	if currentStatus != "PENDING" && currentStatus != "SENT" && currentStatus != "IN_PROGRESS" && currentStatus != "READY" {
		models.WriteError(w, http.StatusBadRequest, "Cannot send in status: "+currentStatus, "INVALID_STATUS")
		return
	}

	if currentStatus == "PENDING" {
		var pendingCount int
		err = tx.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM order_items
			WHERE order_id = $1 AND status = 'PENDING'
		`, orderID).Scan(&pendingCount)
		if err != nil {
			slog.Error("Failed to count pending items", "error", err, "orderId", orderID)
			models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
			return
		}

		if pendingCount == 0 {
			models.WriteError(w, http.StatusBadRequest,
				"Order has no items to send",
				"NO_ITEMS")
			return
		}

		start := time.Now()
		_, err = tx.ExecContext(ctx, `
			UPDATE orders SET status = 'SENT', sent_to_kitchen_at = NOW()
			WHERE id = $1
		`, orderID)
		middleware.ObserveDBQuery(time.Since(start))
		if err != nil {
			slog.Error("Failed to send order to kitchen", "error", err, "orderId", orderID)
			models.WriteError(w, http.StatusInternalServerError, "Failed to send order", "SEND_FAILED")
			return
		}
	}

	start := time.Now()
	_, err = tx.ExecContext(ctx, `
		UPDATE order_items SET status = 'SENT', sent_at = NOW()
		WHERE order_id = $1 AND status = 'PENDING'
	`, orderID)
	middleware.ObserveDBQuery(time.Since(start))
	if err != nil {
		slog.Error("Failed to update item statuses", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to send items to kitchen", "DB_ERROR")
		return
	}

	start = time.Now()
	_, err = tx.ExecContext(ctx, `
		UPDATE orders
		SET subtotal = t.val, total = t.val
		FROM (SELECT COALESCE(SUM(total_price), 0) AS val FROM order_items WHERE order_id = $1 AND status != 'CANCELLED') t
		WHERE id = $1
	`, orderID)
	middleware.ObserveDBQuery(time.Since(start))
	if err != nil {
		slog.Error("Failed to recalculate order total on send", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to recalculate order total", "DB_ERROR")
		return
	}

	if err := tx.Commit(); err != nil {
		slog.Error("Failed to commit transaction", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to commit", "DB_ERROR")
		return
	}

	slog.Info("Order sent to kitchen",
		"orderId", orderID,
		"venueId", session.VenueID,
	)

	h.hub.BroadcastToVenue(session.VenueID, EventOrderStatusChanged, map[string]interface{}{
		"orderId": orderID,
		"status":  "SENT",
		"sentToKitchenAt": time.Now(),
	})

	h.hub.BroadcastToVenue(session.VenueID, EventItemStatusChanged, map[string]interface{}{
		"orderId": orderID,
		"status":  "SENT",
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "sent"})
}

func (h *OrderHandler) UpdateItemStatus(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	orderID := chi.URLParam(r, "id")
	itemID := chi.URLParam(r, "itemId")

	r.Body = http.MaxBytesReader(w, r.Body, 256)

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		models.WriteError(w, http.StatusBadRequest, "Invalid request body", "INVALID_JSON")
		return
	}

	validStatuses := map[string]bool{
		"PREPARING": true,
		"READY":     true,
		"DELIVERED": true,
	}
	if !validStatuses[req.Status] {
		models.WriteError(w, http.StatusBadRequest, "Invalid status: must be PREPARING, READY, or DELIVERED", "INVALID_STATUS")
		return
	}

	legalTransitions := map[string]string{
		"SENT":      "PREPARING",
		"PREPARING": "READY",
		"READY":     "DELIVERED",
	}

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		return
	}
	defer tx.Rollback()

	var venueID, currentStatus string
	err = tx.QueryRowContext(ctx, `
		SELECT o.venue_id, oi.status
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		WHERE oi.id = $1 AND oi.order_id = $2
		FOR UPDATE OF oi, o
	`, itemID, orderID).Scan(&venueID, &currentStatus)

	if err != nil {
		if err == sql.ErrNoRows {
			models.WriteError(w, http.StatusNotFound, "Item not found", "NOT_FOUND")
		} else {
			models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		}
		return
	}

	if venueID != session.VenueID {
		models.WriteError(w, http.StatusNotFound, "Item not found", "NOT_FOUND")
		return
	}

	expected, ok := legalTransitions[currentStatus]
	if !ok || expected != req.Status {
		models.WriteError(w, http.StatusBadRequest,
			fmt.Sprintf("Cannot transition from %s to %s", currentStatus, req.Status),
			"INVALID_TRANSITION")
		return
	}

	timeField := ""
	switch req.Status {
	case "PREPARING":
		timeField = "preparing_at = NOW()"
	case "READY":
		timeField = "ready_at = NOW()"
	case "DELIVERED":
		timeField = "delivered_at = NOW()"
	}

	start := time.Now()
	res, err := tx.ExecContext(ctx, fmt.Sprintf(`
		UPDATE order_items
		SET status = $1, %s
		WHERE id = $2 AND status = $3
	`, timeField), req.Status, itemID, currentStatus)
	middleware.ObserveDBQuery(time.Since(start))

	if err != nil {
		slog.Error("Failed to update item status", "error", err, "itemId", itemID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to update status", "UPDATE_FAILED")
		return
	}

	rows, err := res.RowsAffected()
	if err != nil {
		slog.Error("Failed to get rows affected", "error", err, "itemId", itemID)
		models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		return
	}
	if rows == 0 {
		models.WriteError(w, http.StatusConflict,
			"Item status was changed by another request, please refresh",
			"CONCURRENT_UPDATE")
		return
	}

	var undelivered int
	err = tx.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM order_items
		WHERE order_id = $1
		  AND status != 'CANCELLED'
		  AND status != 'DELIVERED'
	`, orderID).Scan(&undelivered)
	if err != nil {
		slog.Error("Failed to count undelivered items", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to count undelivered items", "DB_ERROR")
		return
	}

	if undelivered == 0 {
		start = time.Now()
		_, err = tx.ExecContext(ctx, `
			UPDATE orders SET status = 'DELIVERED', delivered_at = NOW()
			WHERE id = $1
		`, orderID)
		middleware.ObserveDBQuery(time.Since(start))
		if err != nil {
			slog.Error("Failed to promote order to DELIVERED", "error", err, "orderId", orderID)
			models.WriteError(w, http.StatusInternalServerError, "Failed to promote order", "DB_ERROR")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		slog.Error("Failed to commit transaction", "error", err, "itemId", itemID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to commit", "DB_ERROR")
		return
	}

	h.hub.BroadcastToVenue(session.VenueID, EventItemStatusChanged, map[string]interface{}{
		"orderId": orderID,
		"itemId":  itemID,
		"status":  req.Status,
	})

	slog.Info("Item status updated",
		"itemId", itemID,
		"orderId", orderID,
		"status", req.Status,
		"venueId", session.VenueID,
	)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func (h *OrderHandler) CompleteOrder(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	orderID := chi.URLParam(r, "id")

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		return
	}
	defer tx.Rollback()

	var venueID, currentStatus string
	var tableNumber sql.NullString
	err = tx.QueryRowContext(ctx,
		`SELECT venue_id, status, table_number FROM orders WHERE id = $1 FOR UPDATE`, orderID,
	).Scan(&venueID, &currentStatus, &tableNumber)

	if err != nil {
		if err == sql.ErrNoRows {
			models.WriteError(w, http.StatusNotFound, "Order not found", "NOT_FOUND")
		} else {
			models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		}
		return
	}

	if venueID != session.VenueID {
		models.WriteError(w, http.StatusNotFound, "Order not found", "NOT_FOUND")
		return
	}

	if currentStatus == "CANCELLED" {
		models.WriteError(w, http.StatusBadRequest,
			"Cannot complete a cancelled order", "INVALID_STATUS")
		return
	}

	if currentStatus == "COMPLETED" {
		models.WriteError(w, http.StatusBadRequest,
			"Order is already completed", "INVALID_STATUS")
		return
	}

	var undeliveredCount int
	err = tx.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM order_items
		WHERE order_id = $1
		  AND status != 'CANCELLED'
		  AND status != 'DELIVERED'
	`, orderID).Scan(&undeliveredCount)

	if err != nil {
		slog.Error("Failed to check undelivered items", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		return
	}

	if undeliveredCount > 0 {
		models.WriteError(w, http.StatusBadRequest,
			"Cannot complete order: undelivered items remaining",
			"UNDELIVERED_ITEMS")
		return
	}

	start := time.Now()
	_, err = tx.ExecContext(ctx, `
		UPDATE orders
		SET status = 'COMPLETED', completed_at = NOW()
		WHERE id = $1
	`, orderID)
	middleware.ObserveDBQuery(time.Since(start))

	if err != nil {
		slog.Error("Failed to complete order", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to complete order", "COMPLETE_FAILED")
		return
	}

	start = time.Now()
	var orderTotal int
	var itemCount int
	err = tx.QueryRowContext(ctx, `
		SELECT o.total, COUNT(oi.id)
		FROM orders o
		JOIN order_items oi ON oi.order_id = o.id
		WHERE o.id = $1 AND oi.status != 'CANCELLED'
		GROUP BY o.id
	`, orderID).Scan(&orderTotal, &itemCount)
	middleware.ObserveDBQuery(time.Since(start))

	if err != nil {
		slog.Error("Failed to read order for sale record", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to read order totals", "DB_ERROR")
		return
	}

	start = time.Now()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO "Sale" (id, venue_id, order_id, total, item_count, completed_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (order_id) DO NOTHING
	`, uuid.New().String(), session.VenueID, orderID, orderTotal, itemCount)
	middleware.ObserveDBQuery(time.Since(start))
	if err != nil {
		slog.Error("Failed to insert sale record", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to record sale", "DB_ERROR")
		return
	}

	if err := tx.Commit(); err != nil {
		slog.Error("Failed to commit transaction", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to commit", "DB_ERROR")
		return
	}

	var tn *string
	if tableNumber.Valid {
		tn = &tableNumber.String
	}
	go h.hub.BroadcastToVenue(session.VenueID, EventOrderCompleted, map[string]interface{}{
		"orderId":     orderID,
		"venueId":     session.VenueID,
		"tableNumber": tn,
		"completedAt": time.Now(),
	})

	slog.Info("Order completed",
		"orderId", orderID,
		"venueId", session.VenueID,
	)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "completed"})
}

func (h *OrderHandler) ReleaseTable(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	tableNumber := chi.URLParam(r, "tableNumber")

	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	var activeCount int
	err := h.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM orders
		WHERE venue_id = $1 AND table_number = $2 AND status NOT IN ('COMPLETED', 'CANCELLED')
	`, session.VenueID, tableNumber).Scan(&activeCount)
	if err != nil {
		slog.Error("Failed to check active orders for table", "error", err, "tableNumber", tableNumber)
		models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		return
	}
	if activeCount > 0 {
		models.WriteError(w, http.StatusBadRequest, "Table has active orders", "TABLE_HAS_ACTIVE_ORDERS")
		return
	}

	h.hub.BroadcastToVenue(session.VenueID, EventTableReleased, map[string]interface{}{
		"venueId":     session.VenueID,
		"tableNumber": tableNumber,
	})

	slog.Info("Table released",
		"tableNumber", tableNumber,
		"venueId", session.VenueID,
	)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "released"})
}

