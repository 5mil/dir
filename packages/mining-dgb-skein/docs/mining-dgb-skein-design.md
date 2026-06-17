# mining-dgb-skein Design

> `plugin-mining-dgb-skein` — Phase 5c
> Branch: `mining-dgb-skein`

---

## Overview

`mining-dgb-skein` deep-integrates DigiByte (DGB) Skein algorithm pool mining
into `dir`. It mirrors the `mining-fennac` architecture (Steps 48–50) and adds:

- **DGB-specific Stratum V1** protocol (Skein-512 PoW)
- **Full wallet setup wizard** (import, digibyte-cli, offline Python keygen)
- **Pool selection** (Zpool, MiningPoolHub, Unmineable, custom)
- **cpuminer-multi** integration (best CPU Skein performance)
- **dir reputation sync** — DGB accepted shares → `+1` reputation event

---

## DigiByte Skein Algorithm

DigiByte uses 5 alternating mining algorithms (MultiAlgo):

| # | Algorithm | Miner |
|---|---|---|
| 1 | SHA-256 | ASICs |
| 2 | Scrypt | ASICs/GPUs |
| **3** | **Skein** | **CPU/GPU** |
| 4 | Qubit | GPUs |
| 5 | Odocrypt | FPGAs |

Skein (algo #3) is the most accessible for CPU mining — **this package targets Skein only**.

### Skein PoW

```
Skein-512(80-byte block header) < target

Header = version(4) + prevhash(32) + merkle_root(32) + ntime(4) + nbits(4) + nonce(4)
```

Python implementation: `pyskein` library (`pip3 install pyskein`).
Fallback: SHA-512 stub (for testing without pyskein).

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  mining-dgb-skein stack                              │
│                                                      │
│  dgb-wallet-setup.sh  ← wallet wizard               │
│    ├─ import existing DGB address                    │
│    ├─ digibyte-cli getnewaddress                     │
│    └─ offline Python keygen (bit + base58)           │
│         └─ /etc/dgb-skein/config.json               │
│              └─ /etc/dgb-skein/wallet.json           │
│                                                      │
│  dgb-daemon.sh  ← cpuminer-multi lifecycle          │
│    └─ cpuminer-multi --algo skein                    │
│         └─ stratum+tcp://pool:3369                   │
│                                                      │
│  skein-stack.py  ← native Python Stratum client     │
│    └─ Skein-512 PoW + mining.notify/submit           │
│                                                      │
│  share-tracker.py  ← log parser                     │
│    └─ /var/lib/dgb-skein/stats.json                 │
│         └─ dir-reward-sync.sh  ← dir API POST       │
│              ├─ dir_entities (dgb mining_node)       │
│              └─ dir_reputation_scores (+1/share)     │
└──────────────────────────────────────────────────────┘
```

---

## Wallet Setup

Three options in `dgb-wallet-setup.sh`:

| Option | Method | Requirements |
|---|---|---|
| 1 | Import existing DGB address | None — paste your address |
| 2 | `digibyte-cli getnewaddress` | DigiByte Core node installed |
| 3 | Offline Python keygen | `pip3 install bit base58` |

DGB address format: starts with `D`, 34 chars, Base58Check (version byte `0x1E`).

Wallet stored at `/etc/dgb-skein/wallet.json` (chmod 600).

---

## Pool Compatibility

| Pool | URL | Port | Notes |
|---|---|---|---|
| Zpool | stratum.zpool.ca | 3369 | Auto-exchange to BTC |
| MiningPoolHub | digibyte-skein.usa.mine.zpool.ca | 3369 | DGB direct payout |
| Unmineable | rx.unmineable.com | 3333 | Any-coin payout |
| Custom | user-defined | user-defined | Any Stratum V1 pool |

---

## Systemd Boot Order

```
dgb-skein.service              ← cpuminer-multi daemon
  → dgb-skein-tracker.service  ← share/hashrate logger
    → dgb-skein-reward-sync.service  ← dir reputation sync
```

---

## dir Integration

Every accepted DGB Skein share:
1. Logged by `share-tracker.py` → `/var/lib/dgb-skein/stats.json`
2. `dir-reward-sync.sh` upserts `dgb_mining_node` entity in `dir_entities`
3. Posts `+1` `dgb_skein_share_accepted` event to `dir_reputation_scores`
4. Node appears in dir knowledge graph alongside Fennac nodes

Both `mining-fennac` and `mining-dgb-skein` reputation events accumulate
into the same `dir_reputation_scores` table — multi-coin contributors
get combined reputation scores.

---

## Files

```
packages/mining-dgb-skein/
  package.json
  dgb-daemon.sh              # cpuminer-multi lifecycle
  skein-stack.py             # native Python Stratum + Skein PoW
  dgb-wallet-setup.sh        # wallet wizard (3 options)
  share-tracker.py           # log parser → stats.json
  dgb-dashboard.sh           # live terminal dashboard
  dir-reward-sync.sh         # dir API reputation sync
  install-dgb-mining.sh      # full stack installer
  services/
    dgb-skein.service
    dgb-skein-tracker.service
    dgb-skein-reward-sync.service
  etc/dgb-skein/
    dir-sync.env.example
  docs/
    mining-dgb-skein-design.md
```

---

## Quick Start

```bash
# 1. Install stack (builds cpuminer-multi from source)
sudo ./install-dgb-mining.sh

# 2. Configure wallet + pool
./dgb-wallet-setup.sh

# 3. Start miner
./dgb-daemon.sh start

# 4. View live dashboard
./dgb-dashboard.sh

# 5. Connect to dir instance
sudo nano /etc/dgb-skein/dir-sync.env
sudo systemctl start dgb-skein-reward-sync.service
```

---

*mining-dgb-skein v0.1.0 — Phase 5c complete*
