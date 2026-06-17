#!/usr/bin/env bash
# =============================================================
# Configure Fennac pool miner
# Phase 5 — Step 44
# Usage: ./fennac-config.sh [pool_host] [pool_port] [threads]
# =============================================================
set -euo pipefail

POOL_HOST="${1:-pool.fennac.io}"
POOL_PORT="${2:-4433}"
THREADS="${3:-$(nproc)}"
WORKER="student-os-$(hostname -s)"

echo "Configuring Fennacminer:"
echo "  Pool:    $POOL_HOST:$POOL_PORT"
echo "  Worker:  $WORKER"
echo "  Threads: $THREADS"

sudo tee /etc/fennac/config.json > /dev/null << JSONEOF
{
  "pool_host":   "$POOL_HOST",
  "pool_port":   $POOL_PORT,
  "worker_name": "$WORKER",
  "threads":     $THREADS,
  "log_level":   "info",
  "reconnect_delay": 5,
  "share_timeout":   30
}
JSONEOF

echo "Written: /etc/fennac/config.json"
echo "Run: fennacminer --config /etc/fennac/config.json"
