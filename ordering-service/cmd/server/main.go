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

	hub := handlers.NewHub()
	go hub.Run()

	orderHandler := handlers.NewOrderHandler(db)

	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.CORS)

	r.Get("/health", handlers.HealthCheck(db))

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
