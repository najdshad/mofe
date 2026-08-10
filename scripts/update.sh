#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "No .env — run scripts/deploy.sh first."; exit 1; }
set -a; . ./.env; set +a

git pull --ff-only
npm ci
npx prisma generate
npm run db:push
npm run build

sudo systemctl restart mofe

echo "==> Health check"
sleep 3
curl -fsS http://localhost:3000/api/health || { sudo journalctl -u mofe --no-pager -n 50; exit 1; }
echo "Update complete."