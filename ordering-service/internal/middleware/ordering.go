package middleware

import (
	"database/sql"
	"net/http"

	"github.com/mofe-menu/ordering-service/internal/models"
)

func RequireOrderingEnabled(db *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			session := GetSession(r.Context())
			if session == nil {
				models.WriteError(w, http.StatusUnauthorized, "Unauthorized", "NO_SESSION")
				return
			}

			var orderingEnabled bool
			err := db.QueryRowContext(r.Context(), `
				SELECT p."orderingEnabled"
				FROM "Subscription" s
				JOIN "Plan" p ON p.id = s."planId"
				WHERE s."venueId" = $1
				  AND s.status IN ('trial', 'active', 'past_due')
			`, session.VenueID).Scan(&orderingEnabled)

			if err != nil {
				if err == sql.ErrNoRows {
					models.WriteError(w, http.StatusPaymentRequired,
						"برای استفاده از این بخش باید اشتراک فعال داشته باشید",
						"NO_ACTIVE_SUBSCRIPTION")
				} else {
					models.WriteError(w, http.StatusInternalServerError, "Internal error", "DB_ERROR")
				}
				return
			}

			if !orderingEnabled {
				models.WriteError(w, http.StatusPaymentRequired,
					"مدیریت سفارش در طرح اشتراکی شما فعال نیست",
					"ORDERING_DISABLED")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
