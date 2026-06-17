#!/usr/bin/env bash
# =============================================================
# Install mining-fennac services
# Step 50 — full stack install
# =============================================================
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="/opt/dir/packages/mining-fennac"

echo "=== mining-fennac installer ==="

# Copy package to install dir
sudo mkdir -p "$INSTALL_DIR"
sudo cp -r "$PACKAGE_DIR"/* "$INSTALL_DIR/"
sudo chmod +x "$INSTALL_DIR"/*.sh "$INSTALL_DIR"/*.py

# Create stats dir
sudo mkdir -p /var/lib/fennac

# Copy env example
if [[ ! -f /etc/fennac/dir-sync.env ]]; then
  sudo cp "$PACKAGE_DIR/etc/fennac/dir-sync.env.example" /etc/fennac/dir-sync.env
  echo "⚠  Edit /etc/fennac/dir-sync.env with your dir API URL and key"
fi

# Install systemd services
sudo cp "$PACKAGE_DIR/services/fennac-tracker.service"      /etc/systemd/system/
sudo cp "$PACKAGE_DIR/services/fennac-reward-sync.service"  /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable fennac-tracker.service fennac-reward-sync.service
sudo systemctl start  fennac-tracker.service

echo ""
echo "=== Installation Complete ==="
echo ""
echo "  Services:"
echo "    fennac-tracker.service      — share/hashrate stats logger"
echo "    fennac-reward-sync.service  — posts stats to dir (needs dir-sync.env)"
echo ""
echo "  Commands:"
echo "    ./fennac-daemon.sh start|stop|restart|status|logs"
echo "    ./fennac-dashboard.sh"
echo "    ./dir-reward-sync.sh <api_url> <api_key>"
echo ""
