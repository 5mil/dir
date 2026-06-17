# mining-fennac Design

> `plugin-mining-fennac` — Phase 5b, Steps 48–50
> Branch: `mining-fennac`

---

## Overview

`mining-fennac` is the deep Fennac pool mining integration for `dir`.
It extends the `student-os` mining stack (Steps 44–47) with:

1. **Daemon management** — full lifecycle control of Fennacminer process
2. **FWSMP protocol stack** — native Python FWSMP client with job loop + share submission
3. **Share tracker** — log parser that tracks accepted/rejected shares + hashrate
4. **Reward sync** — POSTs mining stats to dir instance as reputation events
5. **Dashboard** — live terminal display of mining stats

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  mining-fennac stack                            │
│                                                 │
│  fennac-daemon.sh      ← lifecycle manager      │
│    └─ fennacminer process                       │
│         └─ fwsmp-stack.py  ← FWSMP client       │
│              └─ 127.0.0.1:4435 (WireBruce)      │
│                   └─ pool.fennac.io:4434 (TLS)  │
│                                                 │
│  share-tracker.py      ← log parser             │
│    └─ /var/lib/fennac/stats.json                │
│         └─ dir-reward-sync.sh  ← dir POST       │
│              └─ dir instance API                │
│                   ├─ dir_entities (node record) │
│                   └─ dir_reputation_scores (+1) │
└─────────────────────────────────────────────────┘
```

---

## Steps

| Step | Files | What |
|---|---|---|
| 48 | `fennac-daemon.sh`, `fwsmp-stack.py` | Daemon lifecycle (start/stop/restart/status/logs), native FWSMP Python client (handshake, job loop, SHA-256 PoW, share submission, exponential backoff reconnect) |
| 49 | `share-tracker.py`, `fennac-dashboard.sh`, `services/fennac-tracker.service` | Log-based share/hashrate tracker → `/var/lib/fennac/stats.json`, live terminal dashboard |
| 50 | `dir-reward-sync.sh`, `install-mining.sh`, `services/fennac-reward-sync.service` | POST stats to dir API: upsert `mining_node` entity + reputation event (+1 per share), systemd reward sync daemon (5 min interval) |

---

## Network Flow

```
fwsmp-stack.py
  → 127.0.0.1:4435  (WireBruce tunnel)
  → pool.fennac.io:4434  (stunnel TLS 1.3)
  → Fennac pool server
    → job dispatch
    → share submission
    → reward notification
```

---

## Port Map

| Port | Service | Direction |
|---|---|---|
| 4433 | Fennacminer local API | Internal |
| 4435 | WireBruce listener | Local loopback |
| 4434 | Fennac pool (TLS) | Remote |

---

## FWSMP Protocol

`fwsmp-stack.py` implements the Stratum-derived FWSMP protocol:

```json
// Subscribe
{"id":1, "method":"mining.subscribe", "params":["fennacminer/0.1.0", null]}

// Authorize  
{"id":2, "method":"mining.authorize", "params":["worker-name", "x"]}

// Job notification (server → client)
{"method":"job", "params":{"job_id":"abc", "blob":"deadbeef...", "target":"00000fff..."}}

// Submit share
{"id":4, "method":"mining.submit", "params":["worker-name", "job_id", "nonce"]}
```

Proof-of-work: SHA-256 double hash (Bitcoin-style, Fennac variant).

---

## Reward Integration

Every accepted share:
1. Updates `/var/lib/fennac/stats.json`
2. `dir-reward-sync.sh` upserts `mining_node` entity in `dir_entities`
3. Posts `+1` reputation event to `dir_reputation_scores`
4. Node appears in dir knowledge graph as a verified contributor

---

## Systemd Boot Order (full stack)

```
stunnel-fennac.service       (student-os, Step 46)
  → wirebruce.service        (student-os, Step 45)
    → fennac.service         (student-os, Step 47)
      → fennac-tracker.service      (mining-fennac, Step 49)
        → fennac-reward-sync.service  (mining-fennac, Step 50)
```

---

## Quick Start

```bash
# Assumes student-os already installed (Steps 44–47)

# 1. Install mining stack
sudo ./install-mining.sh

# 2. Configure dir sync
sudo nano /etc/fennac/dir-sync.env
# Set DIR_API_URL and DIR_API_KEY

# 3. Start reward sync
sudo systemctl start fennac-reward-sync.service

# 4. View live dashboard
./fennac-dashboard.sh

# 5. Manual daemon control
./fennac-daemon.sh start
./fennac-daemon.sh status
./fennac-daemon.sh logs
```

---

*mining-fennac v0.1.0 — Phase 5b complete (Steps 48–50)*
