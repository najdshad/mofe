package middleware

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"net/http"

	"github.com/mofe-menu/ordering-service/internal/models"
)

type contextKey string

const SessionContextKey contextKey = "session"

func AuthMiddleware(db *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("mofe_session")
			if err != nil {
				models.WriteError(w, http.StatusUnauthorized, "Unauthorized", "MISSING_SESSION")
				return
			}

			hash := sha256.Sum256([]byte(cookie.Value))
			hashedToken := hex.EncodeToString(hash[:])

			var session models.Session
			var venueCount int

			err = db.QueryRowContext(r.Context(), `
				SELECT
					s."userId",
					s."expiresAt",
					(SELECT COUNT(*) FROM "VenueMember" WHERE "userId" = s."userId") as venue_count
				FROM "Session" s
				WHERE s."tokenHash" = $1
				  AND s."expiresAt" > NOW()
				  AND s."revokedAt" IS NULL
				LIMIT 1
			`, hashedToken).Scan(&session.UserID, &session.ExpiresAt, &venueCount)

			if err != nil {
				if err == sql.ErrNoRows {
					models.WriteError(w, http.StatusUnauthorized, "Invalid session", "INVALID_SESSION")
				} else {
					models.WriteError(w, http.StatusInternalServerError, "Internal error", "DB_ERROR")
				}
				return
			}

			if venueCount == 0 {
				models.WriteError(w, http.StatusForbidden, "No venue membership", "NO_VENUE")
				return
			}

			var venueID, role string
			if venueCount > 1 {
				venueHeader := r.Header.Get("X-Venue-ID")
				if venueHeader == "" {
					models.WriteError(w, http.StatusBadRequest, "Multiple venues: specify X-Venue-ID header", "MULTI_VENUE")
					return
				}
				err = db.QueryRowContext(r.Context(), `
					SELECT "venueId", role FROM "VenueMember"
					WHERE "userId" = $1 AND "venueId" = $2
				`, session.UserID, venueHeader).Scan(&venueID, &role)
				if err != nil {
					models.WriteError(w, http.StatusForbidden, "Not a member of this venue", "VENUE_ACCESS_DENIED")
					return
				}
			} else {
				err = db.QueryRowContext(r.Context(), `
					SELECT "venueId", role FROM "VenueMember"
					WHERE "userId" = $1
				`, session.UserID).Scan(&venueID, &role)
				if err != nil {
					models.WriteError(w, http.StatusInternalServerError, "Failed to get venue", "DB_ERROR")
					return
				}
			}

			session.VenueID = venueID
			session.Role = role

			ctx := context.WithValue(r.Context(), SessionContextKey, &session)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetSession(ctx context.Context) *models.Session {
	session, _ := ctx.Value(SessionContextKey).(*models.Session)
	return session
}

func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			session := GetSession(r.Context())
			if session == nil {
				models.WriteError(w, http.StatusUnauthorized, "Unauthorized", "NO_SESSION")
				return
			}

			for _, role := range allowedRoles {
				if session.Role == role {
					next.ServeHTTP(w, r)
					return
				}
			}

			models.WriteError(w, http.StatusForbidden, "Forbidden", "INSUFFICIENT_ROLE")
		})
	}
}
