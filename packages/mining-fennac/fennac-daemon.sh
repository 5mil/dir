#!/usr/bin/env bash
# =============================================================
# Fennac Pool Miner Daemon — Step 48
# Manages the full lifecycle of the Fennacminer process:
#   start | stop | restart | status | logs
#
# Depends on:
#   - stunnel-fennac.service (TLS wrapper)
#   - wirebruce.service      (tunnel driver)
#   - /etc/fennac/config.json
# =============================================================
set -euo pipefail

PID_FILE="/var/run/fennac-miner.pid"
LOG_FILE="/var/log/fennac-miner.log"
CONFIG="/etc/fennac/config.json"

case "${1:-status}" in

  start)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
      echo "Fennacminer already running (PID $(cat $PID_FILE))"
      exit 0
    fi
    echo "Starting Fennacminer..."
    nohup fennacminer --config "$CONFIG" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Fennacminer started (PID $(cat $PID_FILE))"
    ;;

  stop)
    if [[ -f "$PID_FILE" ]]; then
      kill "$(cat $PID_FILE)" && rm -f "$PID_FILE"
      echo "Fennacminer stopped"
    else
      echo "Fennacminer not running"
    fi
    ;;

  restart)
    "$0" stop
    sleep 2
    "$0" start
    ;;

  status)
    if [[ -f "$PID_FILE" ]] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
      echo "Fennacminer RUNNING (PID $(cat $PID_FILE))"
    else
      echo "Fennacminer STOPPED"
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
