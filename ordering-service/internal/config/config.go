package config

import (
	"log/slog"
	"os"
	"strconv"
)

type Config struct {
	DatabaseURL       string
	Port              int
	SessionCookieName string
	RedisURL          string
}

func Load() *Config {
	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		if v, err := strconv.Atoi(p); err == nil {
			port = v
		}
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		slog.Error("DATABASE_URL is required")
		os.Exit(1)
	}

	return &Config{
		DatabaseURL:       databaseURL,
		Port:              port,
		SessionCookieName: getEnv("SESSION_COOKIE_NAME", "mofe_session"),
		RedisURL:          getEnv("REDIS_URL", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
