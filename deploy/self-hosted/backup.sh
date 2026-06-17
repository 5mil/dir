#!/usr/bin/env bash
# =============================================================
# dir Backup Script
# pg_dumpall + storage tar → $BACKUP_DIR/YYYY-MM-DD_HH-MM-SS/
# Auto-prunes backups older than $BACKUP_RETAIN_DAYS days
#
# Usage: sudo ./backup.sh  (or via systemd timer)
# =============================================================
set -euo pipefail

ENV_FILE="/opt/dir/deploy/self-hosted/.env"
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

BACKUP_DIR="${BACKUP_DIR:-/opt/dir/backups}"
RETAIN="${BACKUP_RETAIN_DAYS:-30}"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"

mkdir -p "$BACKUP_PATH"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting backup → $BACKUP_PATH"

# 1. PostgreSQL
echo "  Dumping PostgreSQL..."
docker exec dir-postgres pg_dumpall -U "${DB_USER:-dir}" \
  | gzip > "$BACKUP_PATH/postgres.sql.gz"
echo "  DB: postgres.sql.gz"

# 2. App storage
echo "  Archiving storage..."
docker run --rm \
  --volumes-from dir-app \
  -v "$BACKUP_PATH":/backup \
  alpine tar czf /backup/storage.tar.gz /app/nocobase/storage 2>/dev/null || true
echo "  Storage: storage.tar.gz"

# 3. .env snapshot
cp "$ENV_FILE" "$BACKUP_PATH/.env.bak" 2>/dev/null || true

# 4. Prune old
echo "  Pruning backups older than ${RETAIN} days..."
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +"$RETAIN" -exec rm -rf {} + 2>/dev/null || true

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup complete"
