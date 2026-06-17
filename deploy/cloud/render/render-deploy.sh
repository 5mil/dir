#!/usr/bin/env bash
# =============================================================
# dir Render Deploy Helper
# Triggers a manual deploy of dir-app on Render via API
#
# Requires: RENDER_API_KEY + RENDER_SERVICE_ID
# Get API key: render.com/dashboard → Account Settings → API Keys
# Get service ID: render.com/dashboard → dir-app → Settings → Service ID
#
# Usage:
#   RENDER_API_KEY=rnd_xxx RENDER_SERVICE_ID=srv_xxx ./render-deploy.sh
# =============================================================
set -euo pipefail

API_KEY="${RENDER_API_KEY:-}"
SERVICE_ID="${RENDER_SERVICE_ID:-}"

[[ -z "$API_KEY" ]]     && echo "ERROR: RENDER_API_KEY not set"     && exit 1
[[ -z "$SERVICE_ID" ]]  && echo "ERROR: RENDER_SERVICE_ID not set"  && exit 1

echo "Triggering Render deploy for service: $SERVICE_ID"

RESPONSE=$(curl -fsSL -X POST \
  "https://api.render.com/v1/services/$SERVICE_ID/deploys" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": false}')

DEPLOY_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['deploy']['id'])" 2>/dev/null || echo "unknown")
echo "Deploy triggered: $DEPLOY_ID"
echo "Track at: https://dashboard.render.com/web/$SERVICE_ID/deploys/$DEPLOY_ID"
