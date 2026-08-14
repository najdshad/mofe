#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Updating system"
sudo apt-get update
sudo apt-get upgrade -y

echo "==> Installing base tools"
sudo apt-get install -y curl ca-certificates gnupg lsb-release

echo "Init complete."
