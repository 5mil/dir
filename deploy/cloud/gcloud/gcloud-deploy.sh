#!/usr/bin/env bash
# =============================================================
# dir — Google Cloud Always Free Deployment
# Targets: e2-micro (us-central1 / us-west1 / us-east1)
#          Free tier: 1 e2-micro, 30GB HDD, 1GB egress/mo
#
# What it does:
#   1. Creates e2-micro VM in us-central1
#   2. Installs Docker on the VM
#   3. Copies self-hosted stack to VM
#   4. Runs install.sh on VM
#   5. Opens firewall port 80
#
# Prerequisites:
#   gcloud CLI installed + authenticated
#   gcloud auth login && gcloud config set project YOUR_PROJECT
#
# Usage:
#   ./gcloud-deploy.sh [--project my-project] [--zone us-central1-a] \
#                      [--vm dir-vm] [--domain your-domain.com]
# =============================================================
set -euo pipefail

PROJECT="${GCLOUD_PROJECT:-}"
ZONE="${GCLOUD_ZONE:-us-central1-a}"
VM_NAME="${GCLOUD_VM:-dir-vm}"
DOMAIN=""
MACHINE_TYPE="e2-micro"
DISK_SIZE="30GB"
IMAGE_FAMILY="ubuntu-2404-lts-amd64"
IMAGE_PROJECT="ubuntu-os-cloud"

while [[ $# -gt 0 ]]; do
  case $1 in
    --project) PROJECT="$2";  shift 2 ;;
    --zone)    ZONE="$2";     shift 2 ;;
    --vm)      VM_NAME="$2";  shift 2 ;;
    --domain)  DOMAIN="$2";   shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

[[ -z "$PROJECT" ]] && { echo "ERROR: --project or GCLOUD_PROJECT required"; exit 1; }

info()  { echo -e "\033[0;34m[gcloud]\033[0m $*"; }
ok()    { echo -e "\033[0;32m[ OK]\033[0m $*"; }

# ---- 1. Create VM ------------------------------------------ #
info "Creating VM $VM_NAME ($MACHINE_TYPE) in $ZONE..."
if gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT" &>/dev/null; then
  ok "VM $VM_NAME already exists — skipping create"
else
  gcloud compute instances create "$VM_NAME" \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --machine-type="$MACHINE_TYPE" \
    --image-family="$IMAGE_FAMILY" \
    --image-project="$IMAGE_PROJECT" \
    --boot-disk-size="$DISK_SIZE" \
    --boot-disk-type="pd-standard" \
    --tags="dir-server" \
    --metadata="enable-oslogin=TRUE"
  ok "VM created"
fi

# ---- 2. Firewall ------------------------------------------- #
info "Opening firewall ports 80 and 22..."
gcloud compute firewall-rules create dir-allow-http \
  --project="$PROJECT" \
  --allow=tcp:80,tcp:22 \
  --target-tags=dir-server \
  --description="dir HTTP + SSH" 2>/dev/null || ok "Firewall rule already exists"

# ---- 3. Copy self-hosted stack to VM ----------------------- #
info "Copying deploy files to VM..."
SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
gcloud compute scp --recurse \
  "$SCRIPT_ROOT/self-hosted" \
  "$VM_NAME:/tmp/dir-self-hosted" \
  --zone="$ZONE" --project="$PROJECT"

# ---- 4. Install on VM -------------------------------------- #
info "Running installer on VM..."
DOMAIN_FLAG=""
[[ -n "$DOMAIN" ]] && DOMAIN_FLAG="--domain $DOMAIN"

gcloud compute ssh "$VM_NAME" \
  --zone="$ZONE" --project="$PROJECT" \
  --command="sudo bash /tmp/dir-self-hosted/install.sh $DOMAIN_FLAG"

# ---- 5. Get external IP ------------------------------------ #
EXT_IP=$(gcloud compute instances describe "$VM_NAME" \
  --zone="$ZONE" --project="$PROJECT" \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

ok "=== GCloud Deployment Complete ==="
echo "  VM:       $VM_NAME ($ZONE)"
echo "  IP:       $EXT_IP"
echo "  URL:      http://$EXT_IP"
[[ -n "$DOMAIN" ]] && echo "  Domain:   http://$DOMAIN (point DNS A record → $EXT_IP)"
echo ""
echo "  SSH:      gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT"
echo "  Logs:     ssh into VM → docker compose logs -f"
echo ""
