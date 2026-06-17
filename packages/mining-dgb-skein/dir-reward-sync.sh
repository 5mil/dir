#!/usr/bin/env bash
# =============================================================
# dir DGB Reward Sync
# Reads /var/lib/dgb-skein/stats.json and POSTs DGB mining
# stats to a dir instance as reputation events.
#
# Each accepted DGB Skein share grants +1 reputation in dir.
#
# Usage:
#   ./dir-reward-sync.sh [dir_api_url] [api_key] [interval_s]
# Example (daemon every 5 min):
#   ./dir-reward-sync.sh http://localhost:13000/api MY_KEY 300
# =============================================================
set -euo pipefail

DIR_API="${1:-http://localhost:13000/api}"
API_KEY="${2:-}"
INTERVAL="${3:-0}"
STATS="/var/lib/dgb-skein/stats.json"
WALLET_FILE="/etc/dgb-skein/wallet.json"

if [[ -z "$API_KEY" ]]; then
  echo "Usage: $0 [dir_api_url] [api_key] [interval_s]"
  exit 1
fi

if [[ ! -f "$STATS" ]]; then
  echo "ERROR: $STATS not found. Is share-tracker.py running?"
  exit 1
fi

sync_once() {
  WORKER=$(python3   -c "import json; print(json.load(open('$STATS'))['worker'])")
  ACCEPTED=$(python3 -c "import json; print(json.load(open('$STATS'))['accepted'])")
  HASHRATE=$(python3 -c "import json; print(json.load(open('$STATS'))['hashrate_h'])")
  UPTIME=$(python3   -c "import json; print(json.load(open('$STATS'))['uptime_s'])")
  WALLET=$(python3   -c "import json; print(json.load(open('$WALLET_FILE'))['address'])" 2>/dev/null || echo "UNKNOWN")

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] DGB sync: worker=$WORKER accepted=$ACCEPTED hashrate=$HASHRATE H/s"

  # 1. Upsert DGB mining node entity in dir
  curl -fsSL -X POST "$DIR_API/dir_entities:upsert" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"DGB Mining Node: $WORKER\",
      \"slug\": \"dgb-mining-node-$WORKER\",
      \"entity_type\": \"mining_node\",
      \"status\": \"published\",
      \"summary\": \"DigiByte Skein pool miner. Wallet: ${WALLET:0:12}... Accepted: $ACCEPTED shares. Hashrate: $HASHRATE H/s. Uptime: ${UPTIME}s.\"
    }" > /dev/null

  # 2. Reputation event: +1 per accepted share delta
  curl -fsSL -X POST "$DIR_API/dir_reputation_scores:create" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"worker\": \"$WORKER\",
      \"event_type\": \"dgb_skein_share_accepted\",
      \"delta\": 1,
      \"metadata\": {
        \"coin\": \"DGB\",
        \"algorithm\": \"skein\",
        \"wallet\": \"$WALLET\",
        \"accepted_total\": $ACCEPTED,
        \"hashrate_h\": $HASHRATE,
        \"uptime_s\": $UPTIME
      }
    }" > /dev/null

  echo "  DGB sync OK"
}

if [[ "$INTERVAL" == "0" ]]; then
  sync_once
else
  echo "DGB reward sync daemon started — interval=${INTERVAL}s"
  while true; do
    sync_once || echo "  Sync failed (will retry)"
    sleep "$INTERVAL"
  done
fi
