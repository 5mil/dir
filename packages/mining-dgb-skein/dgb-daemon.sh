#!/usr/bin/env bash
# =============================================================
# DigiByte Skein Miner Daemon
# Manages full lifecycle of the DGB Skein miner process.
# Supports: start | stop | restart | status | logs
#
# Compatible miners: cgminer, bfgminer, cpuminer-multi
# Algorithm: Skein (DigiByte algo #3)
#
# Depends on:
#   - /etc/dgb-skein/config.json
#   - stunnel-dgb.service  (TLS pool connection)
# =============================================================
set -euo pipefail

PID_FILE="/var/run/dgb-skein-miner.pid"
LOG_FILE="/var/log/dgb-skein-miner.log"
CONFIG="/etc/dgb-skein/config.json"

# Read miner binary from config (default: cpuminer-multi)
MINER_BIN=$(python3 -c "import json; print(json.load(open('$CONFIG')).get('miner_bin','cpuminer-multi'))" 2>/dev/null || echo "cpuminer-multi")
POOL_URL=$(python3  -c "import json; print(json.load(open('$CONFIG'))['pool_url'])" 2>/dev/null || echo "stratum+tcp://dgb-skein.pool.example.com:3369")
WALLET=$(python3    -c "import json; print(json.load(open('$CONFIG'))['wallet_address'])" 2>/dev/null || echo "CONFIGURE_WALLET")
THREADS=$(python3   -c "import json; print(json.load(open('$CONFIG')).get('threads', 4))" 2>/dev/null || echo "4")

case "${1:-status}" in

  start)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
      echo "DGB Skein miner already running (PID $(cat $PID_FILE))"
      exit 0
    fi
    if [[ "$WALLET" == "CONFIGURE_WALLET" ]]; then
      echo "ERROR: Wallet not configured. Run: ./dgb-wallet-setup.sh"
      exit 1
    fi
    echo "Starting DGB Skein miner..."
    echo "  Pool:    $POOL_URL"
    echo "  Wallet:  $WALLET"
    echo "  Threads: $THREADS"
    nohup "$MINER_BIN" \
      --algo skein \
      --url  "$POOL_URL" \
      --user "$WALLET" \
      --pass  x \
      --threads "$THREADS" \
      >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "DGB Skein miner started (PID $(cat $PID_FILE))"
    ;;

  stop)
    if [[ -f "$PID_FILE" ]]; then
      kill "$(cat $PID_FILE)" && rm -f "$PID_FILE"
      echo "DGB Skein miner stopped"
    else
      echo "DGB Skein miner not running"
    fi
    ;;

  restart)
    "$0" stop
    sleep 2
    "$0" start
    ;;

  status)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
      echo "DGB Skein miner RUNNING (PID $(cat $PID_FILE))"
    else
      echo "DGB Skein miner STOPPED"
    fi
    ;;

  logs)
    tail -f "$LOG_FILE"
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
