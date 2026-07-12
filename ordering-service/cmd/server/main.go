package main

import (
	"context"
	"database/sql"
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

	// Verify essential tables exist — Prisma db push may have silently dropped them
	if err := verifyTables(db); err != nil {
		slog.Error("Failed to verify tables", "error", err)
		os.Exit(1)
	}
	// Always ensure order_items FK exists (Prisma may have dropped it)
	if _, err := db.Exec(`
		DO $$ BEGIN
			ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey
			FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
		EXCEPTION WHEN duplicate_object THEN NULL;
		END $$;
	`); err != nil {
		slog.Warn("failed to recreate order_items FK", "error", err)
	}

	redisCtx, redisCancel := context.WithCancel(context.Background())
	defer redisCancel()

	var hub *handlers.Hub
	if cfg.RedisURL != "" {
		rps, err := handlers.NewRedisPubSub(redisCtx, cfg.RedisURL)
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

	r.Get("/health", handlers.HealthCheck(db))
	r.Head("/health", handlers.HealthCheck(db))
	r.Handle("/metrics", middleware.MetricsHandler())

	r.Route("/api/orders", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(db))
		r.Use(rl.Middleware)

		r.Post("/", orderHandler.CreateOrder)
		r.Get("/", orderHandler.ListOrders)
		r.Get("/{id}", orderHandler.GetOrder)
		r.Post("/{id}/items", orderHandler.AddItem)
		r.Patch("/{id}/items/{itemId}", orderHandler.UpdateItem)
		r.Post("/{id}/send", orderHandler.SendToKitchen)
		r.Patch("/{id}/items/{itemId}/status", orderHandler.UpdateItemStatus)
		r.Post("/{id}/complete", orderHandler.CompleteOrder)
		r.Delete("/{id}/items/{itemId}", orderHandler.CancelItem)
		r.Post("/release-table/{tableNumber}", orderHandler.ReleaseTable)
	})

	r.Route("/api/admin", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(db))
		r.Use(rl.Middleware)
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
		Addr:           fmt.Sprintf(":%d", cfg.Port),
		Handler:        r,
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   15 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 65536,
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

func verifyTables(db *sql.DB) error {
	var tableExists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'orders'
		)
	`).Scan(&tableExists)
	if err != nil {
		return fmt.Errorf("failed to check orders table: %w", err)
	}
	if !tableExists {
		slog.Warn("orders table missing — recreating (likely dropped by prisma db push)")
		if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS orders (
			id TEXT PRIMARY KEY,
			venue_id TEXT NOT NULL REFERENCES "Venue"(id) ON DELETE CASCADE,
			waiter_id TEXT NOT NULL REFERENCES "User"(id),
			table_number TEXT,
			guest_count INT DEFAULT 1,
			status TEXT DEFAULT 'PENDING',
			subtotal INT NOT NULL DEFAULT 0,
			total INT NOT NULL DEFAULT 0,
			notes TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			sent_to_kitchen_at TIMESTAMPTZ,
			ready_at TIMESTAMPTZ,
			delivered_at TIMESTAMPTZ,
			cancelled_at TIMESTAMPTZ,
			completed_at TIMESTAMPTZ,
			created_by_name TEXT,
			CONSTRAINT valid_totals CHECK (total >= 0 AND subtotal >= 0)
		)`); err != nil {
			return fmt.Errorf("failed to recreate orders table: %w", err)
		}
		if _, err := db.Exec("CREATE INDEX IF NOT EXISTS idx_orders_venue_status ON orders(venue_id, status, created_at DESC)"); err != nil {
			slog.Warn("failed to create idx_orders_venue_status", "error", err)
		}
		if _, err := db.Exec("CREATE INDEX IF NOT EXISTS idx_orders_waiter ON orders(waiter_id, created_at DESC)"); err != nil {
			slog.Warn("failed to create idx_orders_waiter", "error", err)
		}
	}
	return nil
}

func runMigrations(databaseURL string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to open DB for migration lock: %w", err)
	}
	defer db.Close()

	// Acquire PostgreSQL advisory lock to prevent concurrent migrations
	if _, err := db.Exec("SELECT pg_advisory_lock(19890714)"); err != nil {
		return fmt.Errorf("failed to acquire migration lock: %w", err)
	}
	defer db.Exec("SELECT pg_advisory_unlock(19890714)")

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
