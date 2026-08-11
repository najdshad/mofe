#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "No .env — run scripts/deploy.sh first."; exit 1; }
set -a; . ./.env; set +a

git pull --ff-only

echo "==> Syncing nginx config"
sed 's/server app:3000;/server 127.0.0.1:3000;/' nginx.conf | sudo tee /etc/nginx/sites-available/mofe >/dev/null
sudo nginx -t && sudo systemctl reload nginx

npm ci --no-audit --no-fund
npx prisma generate
npm run db:push
npm run build

sudo systemctl restart mofe

echo "==> Health check"
sleep 3
curl -fsS http://localhost:3000/api/health || { sudo journalctl -u mofe --no-pager -n 50; exit 1; }
echo "Update complete."