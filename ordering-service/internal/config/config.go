package config

import (
	"os"
	"strconv"
)

type Config struct {
	DatabaseURL       string
	Port              int
	SessionCookieName string
}

func Load() *Config {
	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		if v, err := strconv.Atoi(p); err == nil {
			port = v
		}
	}

	return &Config{
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://mofe:mofe@localhost:5432/mofe"),
		Port:              port,
		SessionCookieName: getEnv("SESSION_COOKIE_NAME", "mofe_session"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
