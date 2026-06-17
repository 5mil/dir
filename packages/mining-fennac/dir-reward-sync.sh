#!/usr/bin/env bash
# =============================================================
# dir Reward Sync — Step 50
# Reads /var/lib/fennac/stats.json and POSTs mining stats
# to the connected dir instance as a reputation event.
#
# Each accepted share grants +1 reputation in dir (via
# the plugin-dir-governance reputation scoring system).
#
# Usage:
#   ./dir-reward-sync.sh [dir_api_url] [api_key] [loop_interval_s]
#
# Example (one-shot):
#   ./dir-reward-sync.sh http://localhost:13000/api MY_KEY
#
# Example (daemon loop every 5 min):
#   ./dir-reward-sync.sh http://localhost:13000/api MY_KEY 300
# =============================================================
set -euo pipefail

DIR_API="${1:-http://localhost:13000/api}"
API_KEY="${2:-}"
INTERVAL="${3:-0}"   # 0 = one-shot
STATS_FILE="/var/lib/fennac/stats.json"

if [[ -z "$API_KEY" ]]; then
  echo "Usage: $0 [dir_api_url] [api_key] [interval_s]"
  exit 1
fi

if [[ ! -f "$STATS_FILE" ]]; then
  echo "ERROR: $STATS_FILE not found. Is share-tracker.py running?"
  exit 1
fi

# ---- sync function --------------------------------------------------- #
sync_once() {
  WORKER=$(python3 -c "import json; d=json.load(open('$STATS_FILE')); print(d['worker'])")
  ACCEPTED=$(python3 -c "import json; d=json.load(open('$STATS_FILE')); print(d['accepted'])")
  HASHRATE=$(python3 -c "import json; d=json.load(open('$STATS_FILE')); print(d['hashrate_h'])")
  UPTIME=$(python3 -c "import json; d=json.load(open('$STATS_FILE')); print(d['uptime_s'])")
  UPDATED=$(python3 -c "import json; d=json.load(open('$STATS_FILE')); print(d['last_updated'])")

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Syncing: worker=$WORKER accepted=$ACCEPTED hashrate=$HASHRATE H/s"

  # 1. Upsert mining stats record in dir_entities (as a mining-node entity)
  curl -fsSL -X POST "$DIR_API/dir_entities:upsert" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"Mining Node: $WORKER\",
      \"slug\": \"mining-node-$WORKER\",
      \"entity_type\": \"mining_node\",
      \"status\": \"published\",
      \"summary\": \"Fennac pool miner node. Accepted shares: $ACCEPTED. Hashrate: $HASHRATE H/s. Uptime: ${UPTIME}s.\"
    }" > /dev/null

  # 2. Post reputation event: +1 per accepted share delta
  curl -fsSL -X POST "$DIR_API/dir_reputation_scores:create" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"worker\": \"$WORKER\",
      \"event_type\": \"mining_share_accepted\",
      \"delta\": 1,
      \"metadata\": {
        \"accepted_total\": $ACCEPTED,
        \"hashrate_h\": $HASHRATE,
        \"uptime_s\": $UPTIME,
        \"synced_at\": \"$UPDATED\"
      }
    }" > /dev/null

  echo "  Synced OK"
}

# ---- main ------------------------------------------------------------ #
if [[ "$INTERVAL" == "0" ]]; then
  sync_once
else
  echo "Reward sync daemon started — interval=${INTERVAL}s"
  while true; do
    sync_once || echo "  Sync failed (will retry)"
    sleep "$INTERVAL"
  done
fi
