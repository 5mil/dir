#!/usr/bin/env bash
# =============================================================
# Install mining-dgb-skein full stack
# =============================================================
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="/opt/dir/packages/mining-dgb-skein"

echo "=== mining-dgb-skein installer ==="

# Install cpuminer-multi (DGB Skein CPU miner)
if ! command -v cpuminer-multi &>/dev/null; then
  echo "Installing cpuminer-multi..."
  if command -v apt-get &>/dev/null; then
    sudo apt-get install -y -q libcurl4-openssl-dev libssl-dev libjansson-dev \
      automake autoconf pkg-config build-essential git
  fi
  git clone https://github.com/tpruvot/cpuminer-multi /tmp/cpuminer-multi --depth 1 2>/dev/null
  cd /tmp/cpuminer-multi && ./build.sh && sudo cp cpuminer /usr/local/bin/cpuminer-multi
  echo "cpuminer-multi installed"
fi

# Install pyskein for native Skein PoW
pip3 install pyskein bit base58 --quiet || echo "Warning: some Python deps failed (non-fatal)"

# Copy package
sudo mkdir -p "$INSTALL_DIR"
sudo cp -r "$PACKAGE_DIR"/* "$INSTALL_DIR/"
sudo chmod +x "$INSTALL_DIR"/*.sh "$INSTALL_DIR"/*.py

# Create directories
sudo mkdir -p /var/lib/dgb-skein /etc/dgb-skein

# Copy env example
if [[ ! -f /etc/dgb-skein/dir-sync.env ]]; then
  sudo cp "$PACKAGE_DIR/etc/dgb-skein/dir-sync.env.example" /etc/dgb-skein/dir-sync.env
  echo "⚠  Edit /etc/dgb-skein/dir-sync.env with your dir API URL and key"
fi

# Install systemd services
sudo cp "$PACKAGE_DIR/services/dgb-skein-tracker.service"     /etc/systemd/system/
sudo cp "$PACKAGE_DIR/services/dgb-skein-reward-sync.service" /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable dgb-skein-tracker.service

echo ""
echo "=== Installation Complete ==="
echo "  Next: ./dgb-wallet-setup.sh"
echo "  Then: ./dgb-daemon.sh start"
echo "        ./dgb-dashboard.sh"
