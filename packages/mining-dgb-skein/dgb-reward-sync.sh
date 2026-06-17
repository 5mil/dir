#!/usr/bin/env bash
# =============================================================
# dir Reward Sync — DigiByte Skein
# POSTs /var/lib/dgb-skein/stats.json to dir instance.
# Each accepted DGB-Skein share → +1 reputation in dir.
#
# Usage: ./dgb-reward-sync.sh [dir_api] [api_key] [interval]
# =============================================================
set -euo pipefail

DIR_API="${1:-http://localhost:13000/api}"
API_KEY="${2:-}"
INTERVAL="${3:-0}"
STATS_FILE="/var/lib/dgb-skein/stats.json"

if [[ -z "$API_KEY" ]]; then
  echo "Usage: $0 [dir_api] [api_key] [interval_s]"; exit 1
fi
if [[ ! -f "$STATS_FILE" ]]; then
  echo "ERROR: $STATS_FILE not found. Is dgb-share-tracker.py running?"; exit 1
fi

sync_once() {
  WORKER=$(python3 -c "import json; print(json.load(open('$STATS_FILE'))['worker'])")
  ACCEPTED=$(python3 -c "import json; print(json.load(open('$STATS_FILE'))['accepted'])")
  HASHRATE=$(python3 -c "import json; print(json.load(open('$STATS_FILE'))['hashrate_h'])")
  UPTIME=$(python3 -c "import json; print(json.load(open('$STATS_FILE'))['uptime_s'])")

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] DGB sync: worker=$WORKER accepted=$ACCEPTED hashrate=$HASHRATE H/s"

  curl -fsSL -X POST "$DIR_API/dir_entities:upsert" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"DGB Skein Node: $WORKER\",
      \"slug\": \"dgb-skein-node-$WORKER\",
      \"entity_type\": \"mining_node\",
      \"status\": \"published\",
      \"summary\": \"DigiByte Skein miner. Accepted: $ACCEPTED shares. Hashrate: $HASHRATE H/s. Uptime: ${UPTIME}s.\"
    }" > /dev/null

  curl -fsSL -X POST "$DIR_API/dir_reputation_scores:create" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"worker\": \"$WORKER\",
      \"event_type\": \"dgb_skein_share_accepted\",
      \"delta\": 1,
      \"metadata\": {\"accepted\": $ACCEPTED, \"hashrate_h\": $HASHRATE, \"uptime_s\": $UPTIME, \"coin\": \"DGB-SKEIN\"}
    }" > /dev/null

  echo "  OK"
}

if [[ "$INTERVAL" == "0" ]]; then
  sync_once
else
  echo "DGB reward sync daemon — interval=${INTERVAL}s"
  while true; do sync_once || echo "  Sync failed (will retry)"; sleep "$INTERVAL"; done
fi
