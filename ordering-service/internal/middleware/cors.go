package middleware

import (
	"net/http"
	"os"
	"strings"
)

func allowedCORSOrigins() map[string]bool {
	origins := map[string]bool{
		"https://admin.mofe.ir":    true,
		"http://localhost:3000":    true,
		"https://admin.noghteh.ir": true,
	}
	if env := os.Getenv("CORS_ALLOWED_ORIGINS"); env != "" {
		for _, o := range strings.Split(env, ",") {
			origins[strings.TrimSpace(o)] = true
		}
	}
	return origins
}

func CORS(next http.Handler) http.Handler {
	allowedOrigins := allowedCORSOrigins()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowed := ""
		if allowedOrigins[origin] {
			allowed = origin
		}

		w.Header().Add("Vary", "Origin")
		if allowed != "" {
			w.Header().Set("Access-Control-Allow-Origin", allowed)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Venue-ID")
		if allowed != "" {
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
