package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/mofe-menu/ordering-service/internal/models"
	"golang.org/x/time/rate"
)

const maxRateLimiterEntries = 100000

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type RateLimiter struct {
	visitors   map[string]*visitor
	mu         sync.Mutex
	rate       rate.Limit
	burst      int
	stopCh     chan struct{}
	stopOnce   sync.Once
}

func NewRateLimiter(rps int, burst int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate.Limit(rps),
		burst:    burst,
		stopCh:   make(chan struct{}),
	}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) getVisitor(key string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[key]
	if exists {
		v.lastSeen = time.Now()
		return v.limiter
	}

	if len(rl.visitors) >= maxRateLimiterEntries {
		for k, evict := range rl.visitors {
			delete(rl.visitors, k)
			if len(rl.visitors) < maxRateLimiterEntries/2 {
				break
			}
			_ = evict
		}
	}

	limiter := rate.NewLimiter(rl.rate, rl.burst)
	rl.visitors[key] = &visitor{limiter: limiter, lastSeen: time.Now()}
	return limiter
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-rl.stopCh:
			return
		case <-ticker.C:
		}

		rl.mu.Lock()
		for key, v := range rl.visitors {
			if time.Since(v.lastSeen) > 10*time.Minute {
				delete(rl.visitors, key)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *RateLimiter) Stop() {
	rl.stopOnce.Do(func() { close(rl.stopCh) })
}

func getRealIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		parts := strings.SplitN(fwd, ",", 2)
		return strings.TrimSpace(parts[0])
	}
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return strings.TrimSpace(realIP)
	}
	return r.RemoteAddr
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := getRealIP(r)
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
