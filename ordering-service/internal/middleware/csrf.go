package middleware

import (
	"net/http"
	"strings"

	"github.com/mofe-menu/ordering-service/internal/models"
)

var allowedCSRFOrigins = map[string]bool{
	"https://admin.mofe.ir":    true,
	"http://localhost:3000":    true,
	"https://admin.noghteh.ir": true,
}

func isAllowedReferer(referer string) bool {
	for origin := range allowedCSRFOrigins {
		if strings.HasPrefix(referer, origin+"/") {
			return true
		}
	}
	return false
}

func CSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" || r.Method == "HEAD" || r.Method == "OPTIONS" {
			next.ServeHTTP(w, r)
			return
		}

		origin := r.Header.Get("Origin")
		referer := r.Header.Get("Referer")

		if origin == "" && referer == "" {
			models.WriteError(w, http.StatusForbidden, "CSRF check failed", "CSRF_MISSING_HEADER")
			return
		}

		if origin != "" && !allowedCSRFOrigins[origin] {
			models.WriteError(w, http.StatusForbidden, "CSRF check failed", "CSRF_INVALID_ORIGIN")
			return
		}

		if origin == "" && referer != "" && !isAllowedReferer(referer) {
			models.WriteError(w, http.StatusForbidden, "CSRF check failed", "CSRF_INVALID_REFERER")
			return
		}

		next.ServeHTTP(w, r)
	})
}
