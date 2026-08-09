#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Installing Docker..."
    sudo apt-get update -y
    sudo apt-get install -y docker.io docker-compose-v2 git
    sudo systemctl enable --now docker
  fi
  DOCKER="sudo docker"
fi

if [ ! -f .env ]; then
  umask 077
  printf 'RUN_SEED=1\n' > .env
  echo "Created .env with RUN_SEED=1 (demo data)."
fi

if [ ! -f letsencrypt/live/mofe.ir/fullchain.pem ]; then
  echo "Issuing TLS certificate for mofe.ir..."
  $DOCKER compose -f docker-compose.yml -f docker-compose.prod.yml stop nginx 2>/dev/null || true
  sudo certbot certonly --non-interactive --agree-tos --standalone \
    ${CERTBOT_EMAIL:+--email "$CERTBOT_EMAIL"} \
    ${CERTBOT_EMAIL:---register-unsafely-without-email} \
    --config-dir "$PWD/letsencrypt" \
    --work-dir "$PWD/letsencrypt-work" \
    --logs-dir "$PWD/letsencrypt-logs" \
    -d mofe.ir -d www.mofe.ir
fi

$DOCKER compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
$DOCKER compose -f docker-compose.yml -f docker-compose.prod.yml ps