#!/usr/bin/env bash
# =============================================================
# dir Student Sync — connects student-os to a dir instance
# Registers this machine as a contributor node in dir.
# Phase 5 — Step 47
#
# Usage: ./dir-student-sync.sh [dir_api_url] [api_key]
# =============================================================
set -euo pipefail

DIR_API="${1:-http://localhost:13000/api}"
API_KEY="${2:-}"
HOSTNAME=$(hostname -s)

if [[ -z "$API_KEY" ]]; then
  echo "Usage: ./dir-student-sync.sh [dir_api_url] [api_key]"
  exit 1
fi

echo "Registering student node with dir..."
echo "  API:  $DIR_API"
echo "  Host: $HOSTNAME"

# Create contributor author record in dir
curl -fsSL -X POST "$DIR_API/dir_authors:create" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"display_name\": \"$HOSTNAME\",
    \"bio\": \"Student OS node — auto-registered\",
    \"is_verified\": false
  }" | python3 -m json.tool

echo ""
echo "Student node registered in dir."
echo "Login at: $DIR_API/../admin"
