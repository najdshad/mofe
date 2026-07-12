package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	requestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "ordering_service_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	requestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "ordering_service_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	activeRequests = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "ordering_service_active_requests",
			Help: "Number of active HTTP requests",
		},
	)

	ordersCreated = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "ordering_service_orders_created_total",
			Help: "Total number of orders created",
		},
	)

	itemsOrdered = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "ordering_service_items_ordered_total",
			Help: "Total number of items ordered",
		},
	)

	dbQueryDuration = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "ordering_service_db_query_duration_seconds",
			Help:    "Database query duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
	)
)

func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		activeRequests.Inc()
		defer activeRequests.Dec()

		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rw, r)

		routeCtx := chi.RouteContext(r.Context())
		path := r.URL.Path
		if routeCtx != nil && routeCtx.RoutePattern() != "" {
			path = routeCtx.RoutePattern()
		}

		status := strconv.Itoa(rw.statusCode)
		requestsTotal.WithLabelValues(r.Method, path, status).Inc()
		requestDuration.WithLabelValues(r.Method, path).Observe(time.Since(start).Seconds())
	})
}

func MetricsHandler() http.Handler {
	return promhttp.Handler()
}

func RecordOrderCreated() {
	ordersCreated.Inc()
}

func RecordItemsOrdered(count int) {
	itemsOrdered.Add(float64(count))
}

func ObserveDBQuery(duration time.Duration) {
	dbQueryDuration.Observe(duration.Seconds())
}
