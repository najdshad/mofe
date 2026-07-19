#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# mofé — Initial production deploy script for ArvanCloud VM
# Run ONCE on a fresh Ubuntu 24.04 VM after SSH'ing in.
# ─────────────────────────────────────────────────────────
set -euo pipefail

echo "=== 1. System update & Docker install ==="
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin certbot git
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
echo "→ Log out and back in for group change, or run: newgrp docker"

echo "=== 2. Clone repository ==="
cd /opt
sudo mkdir -p mofe
sudo chown "$USER:docker" mofe
git clone https://github.com/najdshad/mofe-menu.git mofe
cd mofe

echo "=== 3. Create .env file ==="
echo "→ Place your .env file at /opt/mofe/.env with all secrets"
echo "  (DATABASE_URL, S3_*, ZARINPAL_*, SMTP_*, etc.)"
echo "  See .env.production.example for the full list."

echo "=== 4. Obtain SSL certificates ==="
echo "→ STOP any process on port 80 first, then run:"
echo "  sudo certbot certonly --standalone -d mofe.ir -d www.mofe.ir"
echo "  sudo certbot certonly --standalone -d app.mofe.ir"
echo "  sudo certbot certonly --standalone -d menu.mofe.ir"

echo "=== 5. Copy certs for Docker volume mount ==="
echo "  sudo mkdir -p /opt/mofe/letsencrypt"
echo "  sudo cp -rL /etc/letsencrypt/* /opt/mofe/letsencrypt/"
echo "  sudo chown -R $USER:docker /opt/mofe/letsencrypt"

echo "=== 6. Build & start services ==="
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml build"
echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"

echo "=== 7. Verify ==="
echo "  curl http://localhost:3000/api/health"
echo "  curl http://localhost:8080/health"
echo "  curl https://mofe.ir/health"

echo "=== 8. Set up auto-renewal ==="
echo "  crontab -e → add:"
echo "  0 3 * * * /usr/bin/certbot renew --quiet && docker compose -f /opt/mofe/docker-compose.yml -f /opt/mofe/docker-compose.prod.yml restart nginx"

echo "=== 9. PostgreSQL backup cron ==="
echo "  0 2 * * * docker exec mofe-db-1 pg_dump -U mofe mofe | gzip > /backups/mofe-\$(date +\%Y\%m\%d).sql.gz"

echo ""
echo "✅ Done! Follow steps 3-9 manually."
