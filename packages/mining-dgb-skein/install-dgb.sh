#!/usr/bin/env bash
# =============================================================
# Install DigiByte Skein mining stack
# =============================================================
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="/opt/dir/packages/mining-dgb-skein"

echo "=== mining-dgb-skein installer ==="

# Install Python dependencies
echo "Installing pyskein..."
pip3 install pyskein --quiet || echo "pyskein not available — SHA-256 fallback active"

# Copy package
sudo mkdir -p "$INSTALL_DIR"
sudo cp -r "$PACKAGE_DIR"/* "$INSTALL_DIR/"
sudo chmod +x "$INSTALL_DIR"/*.sh "$INSTALL_DIR"/*.py

# Create dirs
sudo mkdir -p /etc/dgb-skein /var/lib/dgb-skein

# Copy env example
if [[ ! -f /etc/dgb-skein/dir-sync.env ]]; then
  sudo cp "$PACKAGE_DIR/etc/dgb-skein/dir-sync.env.example" /etc/dgb-skein/ 2>/dev/null || true
fi

# Install systemd services
sudo cp "$PACKAGE_DIR/services"/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dgb-skein-tracker.service
sudo systemctl start  dgb-skein-tracker.service

echo ""
echo "=== DGB Skein Install Complete ==="
echo ""
echo "  1. Configure:  ./dgb-config.sh [wallet] [pool_host] [port]"
echo "  2. Start TLS:  sudo ./dgb-stunnel.sh"
echo "  3. Mine:       python3 skein-miner.py"
echo "     or GPU:     sudo ./dgb-gpu-launch.sh"
echo "  4. Dashboard:  ./dgb-dashboard.sh"
echo "  5. dir sync:   ./dgb-reward-sync.sh <api_url> <api_key> 300"
echo ""
