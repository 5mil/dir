#!/usr/bin/env bash
# =============================================================
# Configure DigiByte Skein miner
# Usage: ./dgb-config.sh [wallet_address] [pool_host] [pool_port]
# =============================================================
set -euo pipefail

WALLET="${1:-DGBWalletAddressHere}"
POOL_HOST="${2:-dgb-skein.mining-dutch.nl}"
POOL_PORT="${3:-5000}"
WORKER="${4:-$(hostname -s)}"
THREADS="${5:-$(nproc)}"

echo "Configuring DigiByte Skein miner:"
echo "  Wallet:  ${WALLET:0:10}..."
echo "  Pool:    $POOL_HOST:$POOL_PORT"
echo "  Worker:  $WORKER"
echo "  Threads: $THREADS"

sudo mkdir -p /etc/dgb-skein

sudo tee /etc/dgb-skein/config.json > /dev/null << JSONEOF
{
  "wallet":   "$WALLET",
  "worker":   "$WORKER",
  "threads":  $THREADS,
  "password": "x",
  "pool_host":"$POOL_HOST",
  "pool_port": $POOL_PORT,
  "log_level":"info"
}
JSONEOF

echo "Written: /etc/dgb-skein/config.json"
echo "Run: python3 skein-miner.py"
