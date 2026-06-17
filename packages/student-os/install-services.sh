#!/usr/bin/env bash
# Install and enable all systemd services
# Phase 5 — Step 47
set -euo pipefail

SVC_DIR="$(dirname "$0")/services"

echo "Installing systemd services..."
sudo cp "$SVC_DIR/stunnel-fennac.service" /etc/systemd/system/
sudo cp "$SVC_DIR/wirebruce.service"      /etc/systemd/system/
sudo cp "$SVC_DIR/fennac.service"         /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable stunnel-fennac.service wirebruce.service fennac.service
sudo systemctl start  stunnel-fennac.service wirebruce.service fennac.service

echo ""
echo "Services installed and started:"
sudo systemctl status stunnel-fennac.service wirebruce.service fennac.service --no-pager
