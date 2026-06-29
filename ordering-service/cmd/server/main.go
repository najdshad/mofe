package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/mofe-menu/ordering-service/internal/config"
	"github.com/mofe-menu/ordering-service/internal/database"
	"github.com/mofe-menu/ordering-service/internal/handlers"
	"github.com/mofe-menu/ordering-service/internal/middleware"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.NewPostgresPool(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	slog.Info("Database connected")

	// Run migrations
	if err := runMigrations(cfg.DatabaseURL); err != nil {
		slog.Error("Failed to run migrations", "error", err)
		os.Exit(1)
	}
	slog.Info("Migrations applied")

	var hub *handlers.Hub
	if cfg.RedisURL != "" {
		rps, err := handlers.NewRedisPubSub(cfg.RedisURL)
		if err != nil {
			slog.Error("Failed to connect to Redis", "error", err)
			os.Exit(1)
		}
		defer rps.Close()
		hub = handlers.NewHubWithRedis(rps)
		slog.Info("Redis pub/sub enabled for WebSocket scaling")
	} else {
		hub = handlers.NewHub()
		slog.Info("Redis not configured, using local WebSocket hub only")
	}
	go hub.Run()

	orderHandler := handlers.NewOrderHandler(db, hub)
	analyticsHandler := handlers.NewAnalyticsHandler(db)

	rl := middleware.NewRateLimiter(100, 200)

	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.CORS)
	r.Use(middleware.MetricsMiddleware)
	r.Use(middleware.CSRF)
	r.Use(rl.Middleware)

	r.Get("/health", handlers.HealthCheck(db))
	r.Handle("/metrics", middleware.MetricsHandler())

	r.Route("/api/orders", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(db))

		r.Post("/", orderHandler.CreateOrder)
		r.Get("/", orderHandler.ListOrders)
		r.Get("/{id}", orderHandler.GetOrder)
		r.Post("/{id}/items", orderHandler.AddItem)
		r.Patch("/{id}/items/{itemId}", orderHandler.UpdateItem)
		r.Post("/{id}/send", orderHandler.SendToKitchen)
		r.Delete("/{id}/items/{itemId}", orderHandler.CancelItem)
	})

	r.Route("/api/admin", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(db))
		r.Use(middleware.RequireRole("OWNER", "MANAGER"))

		r.Get("/orders", orderHandler.ListOrders)
		r.Get("/analytics/daily-summary", analyticsHandler.DailySummary)
	})

	r.Get("/ws", func(w http.ResponseWriter, r *http.Request) {
		middleware.AuthMiddleware(db)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			hub.HandleWebSocket(w, r)
		})).ServeHTTP(w, r)
	})

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("Server starting", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server failed", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("Shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Server forced shutdown", "error", err)
		os.Exit(1)
	}

	slog.Info("Server stopped")
}

func runMigrations(databaseURL string) error {
	m, err := migrate.New("file://migrations", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}
