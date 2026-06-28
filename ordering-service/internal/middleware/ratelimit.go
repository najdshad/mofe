package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/mofe-menu/ordering-service/internal/models"
	"golang.org/x/time/rate"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
}

func NewRateLimiter(rps int, burst int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate.Limit(rps),
		burst:    burst,
	}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) getVisitor(key string) *rate.Limiter {
	rl.mu.RLock()
	v, exists := rl.visitors[key]
	rl.mu.RUnlock()

	if exists {
		rl.mu.Lock()
		v.lastSeen = time.Now()
		rl.mu.Unlock()
		return v.limiter
	}

	limiter := rate.NewLimiter(rl.rate, rl.burst)
	rl.mu.Lock()
	rl.visitors[key] = &visitor{limiter: limiter, lastSeen: time.Now()}
	rl.mu.Unlock()
	return limiter
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		for key, v := range rl.visitors {
			if time.Since(v.lastSeen) > 10*time.Minute {
				delete(rl.visitors, key)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := r.RemoteAddr
		if session := GetSession(r.Context()); session != nil {
			key = session.UserID
		}

		limiter := rl.getVisitor(key)
		if !limiter.Allow() {
			w.Header().Set("Retry-After", "60")
			models.WriteError(w, http.StatusTooManyRequests, "Rate limit exceeded", "RATE_LIMITED")
			return
		}

		next.ServeHTTP(w, r)
	})
}
