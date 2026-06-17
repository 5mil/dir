#!/usr/bin/env bash
# =============================================================
# dir GCloud VM Status
# Shows VM state, external IP, disk, and dir health
# =============================================================
set -euo pipefail

PROJECT="${GCLOUD_PROJECT:-}"
ZONE="${GCLOUD_ZONE:-us-central1-a}"
VM_NAME="${GCLOUD_VM:-dir-vm}"

[[ -z "$PROJECT" ]] && { echo "ERROR: GCLOUD_PROJECT not set"; exit 1; }

EXT_IP=$(gcloud compute instances describe "$VM_NAME" \
  --zone="$ZONE" --project="$PROJECT" \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "unknown")

STATUS=$(gcloud compute instances describe "$VM_NAME" \
  --zone="$ZONE" --project="$PROJECT" \
  --format='get(status)' 2>/dev/null || echo "unknown")

HTTP=$(curl -so /dev/null -w "%{http_code}" "http://$EXT_IP/api/health" --max-time 5 2>/dev/null || echo "000")

echo "╔══════════════════════════════════════════╗"
echo "║       dir GCloud Status                  ║"
echo "╠══════════════════════════════════════════╣"
printf "║  VM:       %-31s║\n" "$VM_NAME"
printf "║  Zone:     %-31s║\n" "$ZONE"
printf "║  State:    %-31s║\n" "$STATUS"
printf "║  Ext IP:   %-31s║\n" "$EXT_IP"
printf "║  API:      HTTP %-27s║\n" "$HTTP"
echo "╚══════════════════════════════════════════╝"
