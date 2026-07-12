#!/bin/sh
set -e

if [ "$SKIP_PRISMA_INIT" != "1" ]; then
  echo "Running Prisma schema push..."

  # Safe push — avoid --accept-data-loss which destroys Go-managed tables
  psql "${DATABASE_URL}" -c "DROP TABLE IF EXISTS schema_migrations;"
  npx prisma db push
  psql "${DATABASE_URL}" -c "CREATE TABLE IF NOT EXISTS schema_migrations (version bigint PRIMARY KEY, dirty boolean NOT NULL); INSERT INTO schema_migrations (version, dirty) VALUES (4, false) ON CONFLICT (version) DO NOTHING;"

  if [ "$RUN_SEED" = "1" ]; then
    echo "Running Prisma seed..."
    npx prisma db seed 2>&1 || echo "Seed failed"
  else
    echo "RUN_SEED not set — skipping seed"
  fi
else
  echo "SKIP_PRISMA_INIT=1 — skipping Prisma initialization"
fi

echo "Starting Next.js..."
exec "$@"
