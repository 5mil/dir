# DigiByte Skein Miner Design

> `mining-dgb-skein` — DigiByte (DGB) Skein algorithm miner for `dir`
> Branch: `mining-dgb-skein`

---

## Overview

`mining-dgb-skein` is the DigiByte Skein mining integration for `dir`.
DigiByte uses 5 mining algorithms; this package targets **Skein** (algo 4 of 5).

Features:
- Native Python Stratum v1 client (Skein-512/256 PoW)
- CPU miner (`skein-miner.py`) + GPU launcher (`dgb-gpu-launch.sh`: ccminer/sgminer)
- stunnel TLS wrapper on local port `14433`
- Share tracker + live dashboard
- dir reputation sync (+1 per accepted DGB share)

---

## Architecture

```
skein-miner.py / dgb-gpu-launch.sh
  → 127.0.0.1:14433  (stunnel-dgb-skein.service)
  → pool.dgb-skein.io:5000  (TLS 1.3)
  → DigiByte Skein pool

dgb-share-tracker.py  →  /var/lib/dgb-skein/stats.json
  → dgb-reward-sync.sh  →  dir API
       ├─ dir_entities (dgb-skein-node upsert)
       └─ dir_reputation_scores (+1 per DGB share)
```

---

## DigiByte Skein Algorithm

| Property | Value |
|---|---|
| Coin | DigiByte (DGB) |
| Algorithm | Skein (algo 4/5) |
| PoW | Skein-512/256 double hash |
| Block time | ~15s |
| Default pool port | 5000 |
| stunnel listen port | 14433 (local) |
| Block reward | ~625 DGB (halving every 1M blocks) |

---

## Port Map

| Port | Service | Direction |
|---|---|---|
| 14433 | stunnel local listener | Local loopback |
| 5000 | DigiByte Skein pool | Remote (TLS) |

---

## GPU Support

`dgb-gpu-launch.sh` auto-detects GPU miners in priority order:

1. **ccminer** (NVIDIA CUDA) — `ccminer -a skein`
2. **sgminer** (AMD OpenCL) — `sgminer --algorithm skein`
3. **CPU fallback** — `skein-miner.py`

All route through stunnel on `127.0.0.1:14433`.

---

## Systemd Boot Order

```
stunnel-dgb-skein.service
  → dgb-skein-miner.service
  → dgb-skein-tracker.service
    → dgb-skein-reward-sync.service
```

---

## Suggested Pools

| Pool | URL | Port |
|---|---|---|
| Mining Dutch | dgb-skein.mining-dutch.nl | 5000 |
| Zergpool | stratum.zergpool.com | 4568 |
| Prohashing | stratum.prohashing.com | 3339 |

---

## Quick Start

```bash
# 1. Install
sudo ./install-dgb.sh

# 2. Configure
./dgb-config.sh YOUR_DGB_WALLET dgb-skein.mining-dutch.nl 5000

# 3. Start TLS wrapper
sudo ./dgb-stunnel.sh

# 4a. CPU mine
python3 skein-miner.py

# 4b. GPU mine (ccminer/sgminer)
sudo ./dgb-gpu-launch.sh

# 5. Dashboard
./dgb-dashboard.sh

# 6. dir sync
./dgb-reward-sync.sh http://my-dir.com/api MY_API_KEY 300
```

---

*mining-dgb-skein v0.1.0 — DigiByte Skein miner for dir*
