#!/usr/bin/env bash
# =============================================================
# stunnel TLS wrapper for DigiByte Skein pool
# Routes skein-miner.py → 127.0.0.1:14433 → pool TLS
# =============================================================
set -euo pipefail

CERT_DIR="/etc/stunnel/certs"
CONF="/etc/stunnel/dgb-skein.conf"

POOL_HOST=$(python3 -c "import json; print(json.load(open('/etc/dgb-skein/config.json'))['pool_host'])" 2>/dev/null || echo "dgb-skein.mining-dutch.nl")
POOL_PORT=$(python3 -c "import json; print(json.load(open('/etc/dgb-skein/config.json'))['pool_port'])" 2>/dev/null || echo "5000")

# Reuse certs from student-os if available; otherwise generate
if [[ ! -f "$CERT_DIR/client.pem" ]]; then
  echo "Generating TLS certificate..."
  sudo mkdir -p "$CERT_DIR"
  sudo openssl req -x509 -newkey rsa:2048 -days 365 -nodes \
    -out    "$CERT_DIR/client.pem" \
    -keyout "$CERT_DIR/client.key" \
    -subj   "/CN=dgb-skein-worker"
  sudo cp "$CERT_DIR/client.pem" "$CERT_DIR/ca.pem"
  sudo chmod 600 "$CERT_DIR/client.key"
fi

sudo tee "$CONF" > /dev/null << SSLEOF
; DigiByte Skein pool TLS wrapper
pid    = /var/run/stunnel-dgb-skein.pid
output = /var/log/stunnel-dgb-skein.log

[dgb-skein]
client     = yes
accept     = 127.0.0.1:14433
connect    = $POOL_HOST:$POOL_PORT
sslVersion = TLSv1.3
verify     = 0
cert       = $CERT_DIR/client.pem
key        = $CERT_DIR/client.key
SSLEOF

if pgrep -f "stunnel.*dgb-skein.conf" > /dev/null 2>&1; then
  echo "stunnel dgb-skein already running — reloading"
  sudo pkill -HUP -f "stunnel.*dgb-skein.conf" || true
else
  sudo stunnel "$CONF"
  echo "stunnel dgb-skein started: 127.0.0.1:14433 → $POOL_HOST:$POOL_PORT"
fi
