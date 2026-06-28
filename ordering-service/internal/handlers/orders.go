package handlers

import (
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

type OrderHandler struct {
	db *sql.DB
}

func NewOrderHandler(db *sql.DB) *OrderHandler {
	return &OrderHandler{db: db}
}

func (h *OrderHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())

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

	var waiterName string
	err := h.db.QueryRowContext(r.Context(),
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

	_, err = h.db.ExecContext(r.Context(), `
		INSERT INTO orders (
			id, venue_id, waiter_id, table_number,
			guest_count, notes, created_by_name
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, orderID, session.VenueID, session.UserID,
		tableNumber, guestCount, notes, waiterName)

	if err != nil {
		slog.Error("Failed to create order",
			"error", err,
			"venueId", session.VenueID,
			"userId", session.UserID,
		)
		models.WriteError(w, http.StatusInternalServerError, "Failed to create order", "CREATE_FAILED")
		return
	}

	slog.Info("Order created",
		"orderId", orderID,
		"venueId", session.VenueID,
		"waiter", waiterName,
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"orderId": orderID})
}

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

	var venueID string
	var currentStatus string
	err := h.db.QueryRowContext(r.Context(),
		`SELECT venue_id, status FROM orders WHERE id = $1`, orderID,
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

	if currentStatus != "DRAFT" && currentStatus != "PENDING" && currentStatus != "SENT" {
		models.WriteError(w, http.StatusBadRequest, "Cannot modify order in status: "+currentStatus, "INVALID_STATUS")
		return
	}

	var itemName string
	var station string
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

	err = h.db.QueryRowContext(r.Context(), query,
		req.MenuItemID, req.VariantID, session.VenueID,
	).Scan(&itemName, &station, &unitPrice, &variantName)

	if err != nil {
		if err == sql.ErrNoRows {
			models.WriteError(w, http.StatusNotFound, "Menu item not found", "ITEM_NOT_FOUND")
		} else {
			models.WriteError(w, http.StatusInternalServerError, "Database error", "DB_ERROR")
		}
		return
	}

	itemID := uuid.New().String()
	totalPrice := req.Quantity * unitPrice

	var notes *string
	if req.Notes != "" {
		notes = &req.Notes
	}

	_, err = h.db.ExecContext(r.Context(), `
		INSERT INTO order_items (
			id, order_id, menu_item_id, menu_item_name,
			variant_id, variant_name, quantity, unit_price,
			total_price, station, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, itemID, orderID, req.MenuItemID, itemName,
		req.VariantID, variantName, req.Quantity, unitPrice,
		totalPrice, station, notes)

	if err != nil {
		slog.Error("Failed to add item",
			"error", err,
			"orderId", orderID,
			"menuItemId", req.MenuItemID,
		)
		models.WriteError(w, http.StatusInternalServerError, "Failed to add item", "ADD_ITEM_FAILED")
		return
	}

	_, err = h.db.ExecContext(r.Context(), `
		UPDATE orders
		SET subtotal = (
			SELECT COALESCE(SUM(total_price), 0)
			FROM order_items
			WHERE order_id = $1
		),
		total = subtotal
		WHERE id = $1
	`, orderID)

	if err != nil {
		slog.Error("Failed to update order totals", "error", err, "orderId", orderID)
	}

	slog.Info("Item added to order",
		"itemId", itemID,
		"orderId", orderID,
		"quantity", req.Quantity,
		"totalPrice", totalPrice,
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"itemId": itemID})
}

func (h *OrderHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	status := r.URL.Query().Get("status")

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
			continue
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

	if orders == nil {
		orders = []map[string]interface{}{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	orderID := chi.URLParam(r, "id")

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
		CreatedByName   string
	}

	var o OrderRow
	err := h.db.QueryRowContext(r.Context(), `
		SELECT id, venue_id, waiter_id, table_number, guest_count,
		       status, subtotal, total, notes, created_at,
		       sent_to_kitchen_at, ready_at, delivered_at, cancelled_at,
		       created_by_name
		FROM orders
		WHERE id = $1
	`, orderID).Scan(
		&o.ID, &o.VenueID, &o.WaiterID, &o.TableNumber, &o.GuestCount,
		&o.Status, &o.Subtotal, &o.Total, &o.Notes, &o.CreatedAt,
		&o.SentToKitchenAt, &o.ReadyAt, &o.DeliveredAt, &o.CancelledAt,
		&o.CreatedByName,
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

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT id, order_id, menu_item_id, menu_item_name,
		       variant_id, variant_name, quantity, unit_price,
		       total_price, station, status, notes,
		       sent_at, preparing_at, ready_at, delivered_at, cancelled_at,
		       course_number
		FROM order_items
		WHERE order_id = $1
		ORDER BY course_number, created_at
	`, orderID)
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
		"createdBy":   o.CreatedByName,
		"items":       items,
	}

	if o.TableNumber.String == "" {
		delete(order, "tableNumber")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}

func (h *OrderHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	orderID := chi.URLParam(r, "id")
	itemID := chi.URLParam(r, "itemId")

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

	var foundOrderID, venueID, currentStatus string
	err := h.db.QueryRowContext(r.Context(), `
		SELECT oi.order_id, o.venue_id, oi.status
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		WHERE oi.id = $1
	`, itemID).Scan(&foundOrderID, &venueID, &currentStatus)

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

	_, err = h.db.ExecContext(r.Context(), query, args...)
	if err != nil {
		slog.Error("Failed to update item", "error", err, "itemId", itemID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to update item", "UPDATE_FAILED")
		return
	}

	_, err = h.db.ExecContext(r.Context(), `
		UPDATE orders
		SET subtotal = (
			SELECT COALESCE(SUM(total_price), 0)
			FROM order_items
			WHERE order_id = $1
		),
		total = subtotal
		WHERE id = $1
	`, orderID)
	if err != nil {
		slog.Error("Failed to recalculate order total", "error", err, "orderId", orderID)
	}

	slog.Info("Item updated",
		"itemId", itemID,
		"orderId", orderID,
		"venueId", session.VenueID,
	)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func (h *OrderHandler) CancelItem(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	orderID := chi.URLParam(r, "id")
	itemID := chi.URLParam(r, "itemId")

	var foundOrderID, venueID string
	err := h.db.QueryRowContext(r.Context(), `
		SELECT oi.order_id, o.venue_id
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		WHERE oi.id = $1
	`, itemID).Scan(&foundOrderID, &venueID)

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

	_, err = h.db.ExecContext(r.Context(), `
		UPDATE order_items
		SET status = 'CANCELLED', cancelled_at = NOW()
		WHERE id = $1 AND status != 'CANCELLED'
	`, itemID)
	if err != nil {
		slog.Error("Failed to cancel item", "error", err, "itemId", itemID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to cancel item", "CANCEL_FAILED")
		return
	}

	_, err = h.db.ExecContext(r.Context(), `
		UPDATE orders
		SET subtotal = (
			SELECT COALESCE(SUM(total_price), 0)
			FROM order_items
			WHERE order_id = $1 AND status != 'CANCELLED'
		),
		total = subtotal
		WHERE id = $1
	`, orderID)
	if err != nil {
		slog.Error("Failed to recalculate after cancel", "error", err, "orderId", orderID)
	}

	var activeItems int
	h.db.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM order_items
		WHERE order_id = $1 AND status != 'CANCELLED'
	`, orderID).Scan(&activeItems)

	if activeItems == 0 {
		h.db.ExecContext(r.Context(), `
			UPDATE orders SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = $1
		`, orderID)
		slog.Info("Order cancelled (all items cancelled)", "orderId", orderID)
	}

	slog.Info("Item cancelled",
		"itemId", itemID,
		"orderId", orderID,
		"venueId", session.VenueID,
	)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "cancelled"})
}

func (h *OrderHandler) SendToKitchen(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())
	orderID := chi.URLParam(r, "id")

	var venueID, currentStatus string
	err := h.db.QueryRowContext(r.Context(),
		`SELECT venue_id, status FROM orders WHERE id = $1`, orderID,
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

	if currentStatus != "DRAFT" && currentStatus != "PENDING" {
		models.WriteError(w, http.StatusBadRequest, "Order already sent or in invalid status: "+currentStatus, "INVALID_STATUS")
		return
	}

	_, err = h.db.ExecContext(r.Context(), `
		UPDATE orders SET status = 'SENT', sent_to_kitchen_at = NOW()
		WHERE id = $1
	`, orderID)
	if err != nil {
		slog.Error("Failed to send order to kitchen", "error", err, "orderId", orderID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to send order", "SEND_FAILED")
		return
	}

	_, err = h.db.ExecContext(r.Context(), `
		UPDATE order_items SET status = 'SENT', sent_at = NOW()
		WHERE order_id = $1 AND status = 'PENDING'
	`, orderID)
	if err != nil {
		slog.Error("Failed to update item statuses", "error", err, "orderId", orderID)
	}

	slog.Info("Order sent to kitchen",
		"orderId", orderID,
		"venueId", session.VenueID,
	)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "sent"})
}

