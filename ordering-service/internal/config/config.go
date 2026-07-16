package config

import (
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	DatabaseURL       string
	Port              int
	SessionCookieName string
	RedisURL          string

	DBMaxOpenConns    int
	DBMaxIdleConns    int
	DBConnMaxLifetime time.Duration
	DBConnMaxIdleTime time.Duration

	ServerReadTimeout  time.Duration
	ServerWriteTimeout time.Duration
	ServerIdleTimeout  time.Duration

	RateLimitRPS             int
	RateLimitBurst           int
	RateLimitMaxEntries      int
	RateLimitCleanupInterval time.Duration
	RateLimitVisitorTTL      time.Duration

	WSAllowedOrigins   []string
	CSRFAllowedOrigins []string

	HandlerTimeout         time.Duration
	HandlerCriticalTimeout time.Duration
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

		DBMaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 15),
		DBConnMaxLifetime: getEnvDuration("DB_CONN_MAX_LIFETIME", 30*time.Minute),
		DBConnMaxIdleTime: getEnvDuration("DB_CONN_MAX_IDLE_TIME", 30*time.Second),

		ServerReadTimeout:  getEnvDuration("SERVER_READ_TIMEOUT", 15*time.Second),
		ServerWriteTimeout: getEnvDuration("SERVER_WRITE_TIMEOUT", 15*time.Second),
		ServerIdleTimeout:  getEnvDuration("SERVER_IDLE_TIMEOUT", 60*time.Second),

		RateLimitRPS:             getEnvInt("RATE_LIMIT_RPS", 100),
		RateLimitBurst:           getEnvInt("RATE_LIMIT_BURST", 200),
		RateLimitMaxEntries:      getEnvInt("RATE_LIMIT_MAX_ENTRIES", 100000),
		RateLimitCleanupInterval: getEnvDuration("RATE_LIMIT_CLEANUP_INTERVAL", 5*time.Minute),
		RateLimitVisitorTTL:      getEnvDuration("RATE_LIMIT_VISITOR_TTL", 10*time.Minute),

		WSAllowedOrigins:   getEnvList("WS_ALLOWED_ORIGINS"),
		CSRFAllowedOrigins: getEnvList("CSRF_ALLOWED_ORIGINS"),

		HandlerTimeout:         getEnvDuration("HANDLER_TIMEOUT", 2*time.Second),
		HandlerCriticalTimeout: getEnvDuration("HANDLER_CRITICAL_TIMEOUT", 5*time.Second),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}

func getEnvList(key string) []string {
	if v := os.Getenv(key); v != "" {
		parts := strings.Split(v, ",")
		for i := range parts {
			parts[i] = strings.TrimSpace(parts[i])
		}
		return parts
	}
	return nil
}
