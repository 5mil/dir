#!/usr/bin/env bash
# =============================================================
# Start stunnel TLS wrapper — Step 46
# Wraps FWSMP traffic in TLS 1.3 before sending to pool.
#
# Port layout:
#   Fennacminer → 4433 (local mine)
#   WireBruce   → 4435 (local tunnel)
#   stunnel     → 4434 (remote pool, TLS)
# =============================================================
set -euo pipefail

CERT_DIR="/etc/stunnel/certs"
CONF="/etc/stunnel/fennac.conf"

# ---------- Generate certs if missing ----------
if [[ ! -f "$CERT_DIR/client.pem" ]]; then
  echo "Generating TLS certificates..."
  sudo mkdir -p "$CERT_DIR"
  sudo openssl req -x509 \
    -newkey rsa:2048 \
    -days 365 \
    -nodes \
    -out    "$CERT_DIR/client.pem" \
    -keyout "$CERT_DIR/client.key" \
    -subj   "/CN=student-os-worker/O=dir/C=US" \
    -addext "subjectAltName=DNS:localhost"
  # Create CA bundle (self-signed = cert is its own CA)
  sudo cp "$CERT_DIR/client.pem" "$CERT_DIR/ca.pem"
  sudo chmod 600 "$CERT_DIR/client.key"
  echo "Certificates written to $CERT_DIR"
fi

# ---------- Write stunnel config ----------
sudo tee "$CONF" > /dev/null << SSLEOF
; Fennac FWSMP TLS wrapper (Step 46)
pid    = /var/run/stunnel-fennac.pid
output = /var/log/stunnel-fennac.log

[smp]
client     = yes
accept     = 127.0.0.1:4435
connect    = pool.fennac.io:4434
sslVersion = TLSv1.3
ciphers    = TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
verify     = 0
cert       = $CERT_DIR/client.pem
key        = $CERT_DIR/client.key
SSLEOF

# ---------- Start stunnel ----------
if pgrep -f "stunnel.*fennac.conf" > /dev/null 2>&1; then
  echo "stunnel already running — reloading config"
  sudo pkill -HUP -f "stunnel.*fennac.conf" || true
else
  sudo stunnel "$CONF"
  echo "stunnel started on 127.0.0.1:4435 → pool.fennac.io:4434"
fi
