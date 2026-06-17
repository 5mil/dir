#!/usr/bin/env bash
# =============================================================
# dir Upgrade Script
# Backup → pull latest NocoBase → force-recreate → prune
# Usage: sudo ./upgrade.sh
# =============================================================
set -euo pipefail

COMPOSE="/opt/dir/deploy/self-hosted/docker-compose.yml"
ENV_FILE="/opt/dir/deploy/self-hosted/.env"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] === dir Upgrade ==="

echo "  Backing up first..."
bash /opt/dir/deploy/self-hosted/backup.sh

echo "  Pulling latest images..."
docker compose -f "$COMPOSE" --env-file "$ENV_FILE" pull

echo "  Restarting with new image..."
docker compose -f "$COMPOSE" --env-file "$ENV_FILE" up -d --force-recreate app

docker image prune -f

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Upgrade complete"
docker compose -f "$COMPOSE" ps
