#!/usr/bin/env bash
# =============================================================
# dir Restore Script
# Usage: sudo ./restore.sh /opt/dir/backups/2026-06-17_14-40-00
# =============================================================
set -euo pipefail

BACKUP_PATH="${1:-}"
[[ -z "$BACKUP_PATH" || ! -d "$BACKUP_PATH" ]] && \
  echo "Usage: $0 <backup_dir>" && exit 1

ENV_FILE="/opt/dir/deploy/self-hosted/.env"
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

COMPOSE="/opt/dir/deploy/self-hosted/docker-compose.yml"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Restoring from: $BACKUP_PATH"

docker compose -f "$COMPOSE" stop app

if [[ -f "$BACKUP_PATH/postgres.sql.gz" ]]; then
  echo "  Restoring PostgreSQL..."
  gunzip -c "$BACKUP_PATH/postgres.sql.gz" \
    | docker exec -i dir-postgres psql -U "${DB_USER:-dir}"
fi

if [[ -f "$BACKUP_PATH/storage.tar.gz" ]]; then
  echo "  Restoring storage..."
  docker run --rm \
    --volumes-from dir-app \
    -v "$BACKUP_PATH":/backup \
    alpine tar xzf /backup/storage.tar.gz -C /
fi

docker compose -f "$COMPOSE" start app
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Restore complete"
