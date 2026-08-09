#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
  DOCKER="sudo docker"
fi

git pull --ff-only
$DOCKER compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
$DOCKER compose -f docker-compose.yml -f docker-compose.prod.yml ps