#!/bin/sh
set -e

if [ "$SKIP_PRISMA_INIT" != "1" ]; then
  echo "Running Prisma schema push..."
  # One-time cleanup of the legacy schema_migrations shim (empty junk, no consumers)
  psql "${DATABASE_URL}" -c "DROP TABLE IF EXISTS schema_migrations;"
  npx prisma db push

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
