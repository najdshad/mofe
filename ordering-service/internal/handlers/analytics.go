package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/mofe-menu/ordering-service/internal/middleware"
	"github.com/mofe-menu/ordering-service/internal/models"
)

type AnalyticsHandler struct {
	db *sql.DB
}

func NewAnalyticsHandler(db *sql.DB) *AnalyticsHandler {
	return &AnalyticsHandler{db: db}
}

func (h *AnalyticsHandler) queryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	start := time.Now()
	rows, err := h.db.QueryContext(ctx, query, args...)
	middleware.ObserveDBQuery(time.Since(start))
	return rows, err
}

func (h *AnalyticsHandler) queryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row {
	start := time.Now()
	row := h.db.QueryRowContext(ctx, query, args...)
	middleware.ObserveDBQuery(time.Since(start))
	return row
}

type DailySummary struct {
	Date            string `json:"date"`
	TotalOrders     int    `json:"totalOrders"`
	TotalRevenue    int    `json:"totalRevenue"`
	AvgOrderValue   int    `json:"avgOrderValue"`
	TotalItems      int    `json:"totalItems"`
	CancelledOrders int    `json:"cancelledOrders"`
	SentOrders      int    `json:"sentOrders"`
	ReadyOrders     int    `json:"readyOrders"`
	DeliveredOrders int    `json:"deliveredOrders"`
}

type TopItem struct {
	MenuItemID   string `json:"menuItemId"`
	MenuItemName string `json:"menuItemName"`
	Quantity     int    `json:"quantity"`
	Revenue      int    `json:"revenue"`
}

func (h *AnalyticsHandler) DailySummary(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetSession(r.Context())

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	dateStr := r.URL.Query().Get("date")
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		models.WriteError(w, http.StatusBadRequest, "Invalid date format (use YYYY-MM-DD)", "INVALID_DATE")
		return
	}

	nextDate := date.AddDate(0, 0, 1)

	var summary DailySummary
	summary.Date = dateStr

	err = h.queryRowContext(ctx, `
		SELECT
			COUNT(*) AS total_orders,
			COALESCE(SUM(total), 0) AS total_revenue,
			COALESCE(ROUND(AVG(total)), 0) AS avg_order_value,
			COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_orders,
			COUNT(*) FILTER (WHERE status = 'SENT') AS sent_orders,
			COUNT(*) FILTER (WHERE status = 'READY') AS ready_orders,
			COUNT(*) FILTER (WHERE status = 'DELIVERED') AS delivered_orders
		FROM orders
		WHERE venue_id = $1
		  AND created_at >= $2
		  AND created_at < $3
	`, session.VenueID, date, nextDate).Scan(
		&summary.TotalOrders,
		&summary.TotalRevenue,
		&summary.AvgOrderValue,
		&summary.CancelledOrders,
		&summary.SentOrders,
		&summary.ReadyOrders,
		&summary.DeliveredOrders,
	)

	if err != nil {
		slog.Error("Failed to query daily summary", "error", err, "venueId", session.VenueID)
		models.WriteError(w, http.StatusInternalServerError, "Failed to fetch summary", "DB_ERROR")
		return
	}

	err = h.queryRowContext(ctx, `
		SELECT COALESCE(SUM(quantity), 0)
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		WHERE o.venue_id = $1
		  AND o.created_at >= $2
		  AND o.created_at < $3
		  AND oi.status != 'CANCELLED'
	`, session.VenueID, date, nextDate).Scan(&summary.TotalItems)

	if err != nil {
		slog.Error("Failed to query total items", "error", err)
		models.WriteError(w, http.StatusInternalServerError, "Failed to fetch analytics", "DB_ERROR")
		return
	}

	var topItems []TopItem
	rows, err := h.queryContext(ctx, `
		SELECT
			oi.menu_item_id,
			oi.menu_item_name,
			SUM(oi.quantity) AS total_quantity,
			SUM(oi.total_price) AS total_revenue
		FROM order_items oi
		JOIN orders o ON oi.order_id = o.id
		WHERE o.venue_id = $1
		  AND o.created_at >= $2
		  AND o.created_at < $3
		  AND oi.status != 'CANCELLED'
		GROUP BY oi.menu_item_id, oi.menu_item_name
		ORDER BY total_quantity DESC
		LIMIT 10
	`, session.VenueID, date, nextDate)

	if err != nil {
		slog.Error("Failed to query top items", "error", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var item TopItem
			if err := rows.Scan(&item.MenuItemID, &item.MenuItemName, &item.Quantity, &item.Revenue); err != nil {
				slog.Error("Failed to scan top item row", "error", err)
				continue
			}
			topItems = append(topItems, item)
		}
		if err := rows.Err(); err != nil {
			slog.Error("Error iterating top item rows", "error", err)
		}
	}

	if topItems == nil {
		topItems = []TopItem{}
	}

	result := map[string]interface{}{
		"summary":   summary,
		"topItems":  topItems,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
