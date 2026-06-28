package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/mofe-menu/ordering-service/internal/models"
)

func Recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("panic recovered",
					"error", rec,
					"stack", string(debug.Stack()),
				)
				models.WriteError(w, http.StatusInternalServerError, "Internal server error", "PANIC")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
