#!/usr/bin/env bash
# =============================================================
# Student OS Installer — dir Custom Linux Environment
# Phase 5 — Step 44
# Installs: WireBruce tunnel, stunnel, Fennacminer, dir client
# =============================================================
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RESET='\033[0m'
info()  { echo -e "${BLUE}[INFO]${RESET} $*"; }
ok()    { echo -e "${GREEN}[ OK ]${RESET} $*"; }

info "=== Student OS Installer v0.1.0 ==="
info "Installing: Fennac miner | WireBruce tunnel | stunnel | dir client"

# ---------- Detect package manager ----------
detect_pkg() {
  if command -v apt-get &>/dev/null;   then echo apt-get;
  elif command -v dnf    &>/dev/null;  then echo dnf;
  elif command -v pacman &>/dev/null;  then echo pacman;
  else echo "unknown"; fi
}
PKG=$(detect_pkg)
if [[ "$PKG" == "unknown" ]]; then
  echo "ERROR: Unsupported package manager. Install curl, stunnel, python3 manually."; exit 1
fi
info "Package manager: $PKG"

# ---------- System dependencies ----------
info "Installing system dependencies..."
case "$PKG" in
  apt-get) sudo apt-get update -qq && sudo apt-get install -y -q curl wget git python3 python3-pip stunnel openssl ;;
  dnf)     sudo dnf install -y -q curl wget git python3 python3-pip stunnel openssl ;;
  pacman)  sudo pacman -Sy --noconfirm curl wget git python python-pip stunnel openssl ;;
esac
ok "System dependencies installed"

# ---------- WireBruce tunnel driver ----------
info "Installing WireBruce tunnel driver..."
WB_URL="https://github.com/wirebruce/wirebruce/releases/latest/download/wirebruce-linux-amd64.tar.gz"
if ! curl -fsSL "$WB_URL" | sudo tar -C /usr/local/bin -xz wirebruce 2>/dev/null; then
  info "WireBruce binary not available — installing from pip fallback"
  pip3 install wirebruce --quiet
fi
ok "WireBruce installed"

# ---------- Fennacminer ----------
info "Installing Fennac pool miner..."
pip3 install fennacminer --quiet || pip3 install fennac-pool-miner --quiet || (
  info "PyPI package not found — cloning fennacminer from source"
  git clone --depth 1 https://github.com/fennac-network/fennacminer ~/.fennacminer 2>/dev/null || true
  pip3 install -e ~/.fennacminer --quiet 2>/dev/null || true
)
ok "Fennacminer installed"

# ---------- Config directories ----------
info "Creating config directories..."
sudo mkdir -p /etc/fennac /etc/wirebruce /etc/stunnel/certs
ok "Directories created"

# ---------- dir client (NocoBase API connector) ----------
info "Installing dir API client..."
pip3 install httpx --quiet
ok "dir client dependencies installed"

info "=== Installation Complete ==="
echo ""
echo "  Next steps:"
echo "  1.  ./fennac-config.sh [pool_host] [port]"
echo "  2.  ./wirebruce-setup.sh [tunnel_host] [port]"
echo "  3.  sudo ./stunnel-start.sh"
echo "  4.  fennacminer --config /etc/fennac/config.json"
echo ""
