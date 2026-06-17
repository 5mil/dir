#!/usr/bin/env bash
# =============================================================
# Configure WireBruce tunnel driver (Step 45)
# Routes Fennacminer traffic through encrypted tunnel to pool
# Usage: ./wirebruce-setup.sh [tunnel_host] [tunnel_port]
#
# Network flow:
#   Fennacminer (4433) → WireBruce (127.0.0.1:4435) → Pool
# =============================================================
set -euo pipefail

TUNNEL_HOST="${1:-fennac-pool.fennac.io}"
TUNNEL_PORT="${2:-4434}"
LISTEN_PORT="${3:-4435}"

echo "Configuring WireBruce tunnel:"
echo "  Listen:  127.0.0.1:$LISTEN_PORT"
echo "  Remote:  $TUNNEL_HOST:$TUNNEL_PORT"
echo "  Protocol: fennac"

sudo tee /etc/wirebruce/config.toml > /dev/null << TOMLEOF
[tunnel]
listen    = "127.0.0.1:$LISTEN_PORT"
remote    = "$TUNNEL_HOST:$TUNNEL_PORT"
protocol  = "fennac"
keepalive = 30
retry     = true
max_retry = 10

[tls]
enabled  = true
ca_file  = "/etc/stunnel/certs/ca.pem"
cert     = "/etc/stunnel/certs/client.pem"
key      = "/etc/stunnel/certs/client.key"
TOMLEOF

echo "Written: /etc/wirebruce/config.toml"
echo "Run: wirebruce start"
