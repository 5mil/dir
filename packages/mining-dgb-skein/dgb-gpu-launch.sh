#!/usr/bin/env bash
# =============================================================
# DigiByte Skein GPU Miner Launcher
# Attempts ccminer (CUDA) → sgminer (OpenCL) → CPU fallback
# =============================================================
set -euo pipefail

POOL_HOST=$(python3 -c "import json; print(json.load(open('/etc/dgb-skein/config.json'))['pool_host'])" 2>/dev/null || echo "dgb-skein.mining-dutch.nl")
POOL_PORT=$(python3 -c "import json; print(json.load(open('/etc/dgb-skein/config.json'))['pool_port'])" 2>/dev/null || echo "5000")
WALLET=$(python3 -c "import json; print(json.load(open('/etc/dgb-skein/config.json'))['wallet'])" 2>/dev/null || echo "DGBWallet")
WORKER=$(hostname -s)

STRATUM="stratum+tcp://127.0.0.1:14433"  # via stunnel

if command -v ccminer &>/dev/null; then
  echo "GPU: ccminer (CUDA) — Skein algorithm"
  exec ccminer -a skein \
    -o "$STRATUM" \
    -u "$WALLET.$WORKER" \
    -p x \
    --no-longpoll

elif command -v sgminer &>/dev/null; then
  echo "GPU: sgminer (OpenCL) — Skein algorithm"
  exec sgminer \
    --algorithm skein \
    --url "$STRATUM" \
    --user "$WALLET.$WORKER" \
    --pass x

else
  echo "No GPU miner found (ccminer/sgminer). Falling back to CPU miner."
  exec python3 "$(dirname "$0")/skein-miner.py"
fi
