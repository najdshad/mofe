package middleware

import "net/http"

var allowedCORSOrigins = map[string]bool{
	"https://admin.mofe.ir":    true,
	"http://localhost:3000":    true,
	"https://admin.noghteh.ir": true,
}

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowed := ""
		if allowedCORSOrigins[origin] {
			allowed = origin
		}

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
