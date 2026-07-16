package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/mofe-menu/ordering-service/internal/models"
)

func allowedCSRFOrigins() map[string]bool {
	origins := map[string]bool{
		"https://admin.mofe.ir":    true,
		"http://localhost:3000":    true,
		"https://admin.noghteh.ir": true,
	}
	if env := os.Getenv("CSRF_ALLOWED_ORIGINS"); env != "" {
		for _, o := range strings.Split(env, ",") {
			origins[strings.TrimSpace(o)] = true
		}
	}
	return origins
}

func isAllowedReferer(referer string, allowedOrigins map[string]bool) bool {
	for origin := range allowedOrigins {
		if strings.HasPrefix(referer, origin+"/") {
			return true
		}
	}
	return false
}

func CSRF(next http.Handler) http.Handler {
	allowedOrigins := allowedCSRFOrigins()

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

		if origin != "" && !allowedOrigins[origin] {
			models.WriteError(w, http.StatusForbidden, "CSRF check failed", "CSRF_INVALID_ORIGIN")
			return
		}

		if origin == "" && referer != "" && !isAllowedReferer(referer, allowedOrigins) {
			models.WriteError(w, http.StatusForbidden, "CSRF check failed", "CSRF_INVALID_REFERER")
			return
		}

		next.ServeHTTP(w, r)
	})
}
