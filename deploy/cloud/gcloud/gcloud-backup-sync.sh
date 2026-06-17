#!/usr/bin/env bash
# =============================================================
# dir — GCloud Backup Sync
# Syncs /opt/dir/backups to a GCS bucket for off-VM storage
#
# Free tier: 5GB GCS Standard storage in US regions
#
# Usage:
#   BUCKET=gs://my-dir-backups ./gcloud-backup-sync.sh
# =============================================================
set -euo pipefail

BUCKET="${BUCKET:-gs://dir-backups-$(hostname -s)}"
BACKUP_DIR="/opt/dir/backups"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Syncing backups to $BUCKET..."

# Create bucket if not exists
gsutil mb -l us-central1 "$BUCKET" 2>/dev/null || true

# Sync latest backup
LATEST=$(ls -1t "$BACKUP_DIR" | head -1)
if [[ -n "$LATEST" ]]; then
  gsutil -m cp -r "$BACKUP_DIR/$LATEST" "$BUCKET/"
  echo "  Synced: $LATEST → $BUCKET"
else
  echo "  No backups found in $BACKUP_DIR"
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Sync complete"
