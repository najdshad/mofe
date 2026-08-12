#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

APP_DIR="$PWD"
SERVICE=mofe.service

echo "==> Installing system packages (Node 22, nginx, certbot)"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
fi
sudo apt-get install -y nodejs git nginx certbot openssl build-essential python3

echo "==> Ensuring swap space (2G for low-RAM VPS)"
if ! swapon --show | grep -q .; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> Writing .env"
if [ ! -f .env ]; then
  umask 077
  printf 'RUN_SEED=1\n' > .env
  echo "Created .env with RUN_SEED=1 (demo data)."
fi
set -a; . ./.env; set +a

echo "==> Issuing TLS certificate (first run only)"
if [ ! -f /etc/letsencrypt/live/mofe.ir/fullchain.pem ]; then
  sudo systemctl stop nginx
  sudo certbot certonly --standalone --non-interactive --agree-tos \
    ${CERTBOT_EMAIL:+--email "$CERTBOT_EMAIL"} \
    ${CERTBOT_EMAIL:---register-unsafely-without-email} \
    -d mofe.ir -d www.mofe.ir
  sudo systemctl start nginx
fi

echo "==> Installing nginx site"
sed 's/server app:3000;/server 127.0.0.1:3000;/' nginx.conf | sudo tee /etc/nginx/sites-available/mofe >/dev/null
sudo ln -sf /etc/nginx/sites-available/mofe /etc/nginx/sites-enabled/mofe
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx

echo "==> Installing dependencies and building"
npm ci --no-audit --no-fund
npx prisma generate
npm run db:push
if [ "${RUN_SEED:-0}" = "1" ]; then
  echo "Running Prisma seed..."
  npx prisma db seed 2>&1 | tail -n 5 || echo "Seed failed"
fi
npm run build

echo "==> Installing systemd unit"
sudo tee /etc/systemd/system/$SERVICE >/dev/null <<EOF
[Unit]
Description=mofé menu
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
Environment=NODE_ENV=production
ExecStart=$(command -v npm) run start
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now $SERVICE

echo "==> Health check"
sleep 3
curl -fsS http://localhost:3000/api/health || { sudo journalctl -u $SERVICE --no-pager -n 50; exit 1; }
echo "Deploy complete."