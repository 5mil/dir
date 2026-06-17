#!/usr/bin/env bash
# =============================================================
# DGB Wallet Setup — DigiByte Skein mining wallet configuration
#
# Options:
#   1. Import existing DGB wallet address
#   2. Generate new DGB address via digibyte-cli (if node installed)
#   3. Use DigiByte Core RPC to create wallet + get address
#
# Writes to: /etc/dgb-skein/config.json
# =============================================================
set -euo pipefail

CONFIG_DIR="/etc/dgb-skein"
CONFIG="$CONFIG_DIR/config.json"
WALLET_FILE="$CONFIG_DIR/wallet.json"

echo ""
echo "=== DigiByte Skein Wallet Setup ==="
echo ""

sudo mkdir -p "$CONFIG_DIR"

# ---- Option selector ----------------------------------------- #
echo "Choose wallet option:"
echo "  1. I have a DGB address (import existing)"
echo "  2. Generate new address via digibyte-cli"
echo "  3. Generate new address via Python (offline, no node)"
read -rp "Option [1-3]: " OPT

case "$OPT" in

  1)
    read -rp "Enter your DGB wallet address: " DGB_ADDR
    if [[ ! "$DGB_ADDR" =~ ^D[A-Za-z0-9]{33}$ ]]; then
      echo "WARNING: Address format looks non-standard (DGB addresses start with 'D' and are 34 chars)"
      read -rp "Continue anyway? [y/N]: " CONT
      [[ "$CONT" =~ ^[Yy]$ ]] || exit 1
    fi
    echo "Wallet address set: $DGB_ADDR"
    ;;

  2)
    if ! command -v digibyte-cli &>/dev/null; then
      echo "ERROR: digibyte-cli not found. Install DigiByte Core first."
      echo "  https://github.com/digibyte-core/digibyte/releases"
      exit 1
    fi
    echo "Generating new DGB address via digibyte-cli..."
    DGB_ADDR=$(digibyte-cli getnewaddress "dir-mining" "legacy")
    echo "New address: $DGB_ADDR"
    ;;

  3)
    echo "Generating offline DGB address (requires: pip3 install bit)"
    pip3 install bit --quiet
    DGB_ADDR=$(python3 -c "
try:
    # bit library supports DGB-compatible key generation
    from bit import Key
    key = Key()
    # DGB mainnet uses version byte 0x1E (decimal 30) -> 'D' prefix
    import hashlib, base58
    pub = key.public_key
    h160 = hashlib.new('ripemd160', hashlib.sha256(pub).digest()).digest()
    payload = bytes([0x1E]) + h160
    checksum = hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4]
    addr = base58.b58encode(payload + checksum).decode()
    print(addr)
except Exception as e:
    print(f'ERROR: {e}')
    print('Install: pip3 install bit base58')
")
    echo "Generated address: $DGB_ADDR"
    ;;

  *)
    echo "Invalid option"
    exit 1
    ;;
esac

# ---- Pool selection ------------------------------------------ #
echo ""
echo "Choose DGB Skein pool:"
echo "  1. Zpool          (zpool.ca:3369)"
echo "  2. MiningPoolHub  (digibyte-skein.usa.mine.zpool.ca:3369)"
echo "  3. Unmineable     (rx.unmineable.com:3333)"
echo "  4. Custom"
read -rp "Pool [1-4]: " POOL_OPT

case "$POOL_OPT" in
  1) POOL_URL="stratum+tcp://stratum.zpool.ca:3369" ;;
  2) POOL_URL="stratum+tcp://digibyte-skein.usa.mine.zpool.ca:3369" ;;
  3) POOL_URL="stratum+tcp://rx.unmineable.com:3333" ;;
  4)
    read -rp "Enter pool URL (stratum+tcp://host:port): " POOL_URL
    ;;
  *) POOL_URL="stratum+tcp://stratum.zpool.ca:3369" ;;
esac

# ---- Thread count -------------------------------------------- #
THREADS=$(nproc)
read -rp "Mining threads [default: $THREADS]: " USER_THREADS
THREADS="${USER_THREADS:-$THREADS}"

# ---- Miner binary -------------------------------------------- #
if command -v cpuminer-multi &>/dev/null; then
  MINER_BIN="cpuminer-multi"
elif command -v cgminer &>/dev/null; then
  MINER_BIN="cgminer"
elif command -v minerd &>/dev/null; then
  MINER_BIN="minerd"
else
  MINER_BIN="cpuminer-multi"
  echo "WARNING: No miner binary found. Install cpuminer-multi:"
  echo "  https://github.com/tpruvot/cpuminer-multi/releases"
fi

# ---- Write config -------------------------------------------- #
echo ""
echo "Writing config to $CONFIG..."

sudo tee "$CONFIG" > /dev/null << CFGEOF
{
  "coin":           "DGB",
  "algorithm":      "skein",
  "wallet_address": "$DGB_ADDR",
  "pool_url":       "$POOL_URL",
  "threads":        $THREADS,
  "miner_bin":      "$MINER_BIN",
  "log_level":      "info",
  "reconnect_delay": 5,
  "share_timeout":   30
}
CFGEOF

# ---- Save wallet record -------------------------------------- #
sudo tee "$WALLET_FILE" > /dev/null << WEOF
{
  "coin":    "DGB",
  "address": "$DGB_ADDR",
  "pool":    "$POOL_URL",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
WEOF
sudo chmod 600 "$WALLET_FILE"

echo ""
echo "=== Wallet Setup Complete ==="
echo "  Coin:    DGB (DigiByte)"
echo "  Algo:    Skein"
echo "  Address: $DGB_ADDR"
echo "  Pool:    $POOL_URL"
echo "  Threads: $THREADS"
echo "  Miner:   $MINER_BIN"
echo ""
echo "  Run: ./dgb-daemon.sh start"
echo "  Run: ./dgb-dashboard.sh"
