#!/bin/sh
set -e

if [ "$SKIP_PRISMA_INIT" != "1" ]; then
  echo "Running Prisma schema push..."
  npx prisma db push --accept-data-loss 2>&1

  echo "Running Prisma seed..."
  npx prisma db seed 2>&1 || echo "Seed skipped (no seed configured or already seeded)"
else
  echo "SKIP_PRISMA_INIT=1 — skipping Prisma initialization"
fi

echo "Starting Next.js..."
exec "$@"
