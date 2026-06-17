# Student OS Design

> `plugin-student-os` — Phase 5, Steps 44–47
> Branch: `student-os`

---

## Overview

Student OS is the custom Linux installer that bundles the full dir contributor
environment alongside a Fennac pool mining stack. It turns any Debian/Ubuntu/Fedora/Arch
box into a dir node that also mines Fennac in the background.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Student OS Node                                 │
│                                                  │
│  ┌────────────┐   ┌──────────────┐               │
│  │ Fennacminer│   │ dir Client   │               │
│  │  port 4433 │   │ NocoBase API │               │
│  └─────┬──────┘   └──────────────┘               │
│        │                                         │
│  ┌─────▼──────────────────────────────────────┐  │
│  │  WireBruce Tunnel Driver (127.0.0.1:4435)  │  │
│  └─────┬──────────────────────────────────────┘  │
│        │                                         │
│  ┌─────▼──────────────────────────────────────┐  │
│  │  stunnel TLS Wrapper (TLS 1.3)             │  │
│  └─────┬──────────────────────────────────────┘  │
│        │                                         │
└────────┼─────────────────────────────────────────┘
         │
         ▼  pool.fennac.io:4434
```

---

## Steps

| Step | File | What |
|---|---|---|
| 44 | `install.sh`, `fennac-config.sh` | OS detector, dependency installer, Fennacminer config |
| 45 | `wirebruce-setup.sh`, `wirebruce.toml` | WireBruce tunnel driver — routes mining traffic |
| 46 | `stunnel-start.sh`, `stunnel/fennac.conf` | TLS 1.3 wrapper, cert generation, FWSMP protocol |
| 47 | `install-services.sh`, `dir-student-sync.sh` | systemd service management, dir contributor registration |

---

## Network Flow

```
Fennacminer (port 4433)
  → WireBruce tunnel listener (127.0.0.1:4435)
  → stunnel TLS 1.3 (pool.fennac.io:4434)
  → Fennac pool server
```

### Port Map
| Port | Service | Direction |
|---|---|---|
| 4433 | Fennacminer local | Outbound from miner |
| 4435 | WireBruce listener | Local loopback |
| 4434 | Fennac pool | Remote (TLS) |

---

## Systemd Services

| Service | File | Depends On |
|---|---|---|
| `stunnel-fennac` | `stunnel/fennac.conf` | network.target |
| `wirebruce` | `wirebruce.toml` | network.target |
| `fennac` | `/etc/fennac/config.json` | stunnel-fennac, wirebruce |

Boot order: `stunnel-fennac` → `wirebruce` → `fennac`

---

## Quick Start

```bash
# 1. Install all dependencies
sudo ./install.sh

# 2. Configure pool
./fennac-config.sh pool.fennac.io 4433

# 3. Configure WireBruce tunnel
./wirebruce-setup.sh fennac-pool.fennac.io 4434

# 4. Start stunnel wrapper (generates certs)
sudo ./stunnel-start.sh

# 5. Install + enable systemd services
sudo ./install-services.sh

# 6. Register with dir instance
./dir-student-sync.sh http://my-dir-instance.com/api MY_API_KEY
```

---

## Security Notes

- TLS 1.3 enforced (`sslVersion = TLSv1.3`) — no downgrade to 1.2
- Ciphers: `TLS_AES_256_GCM_SHA384` + `TLS_CHACHA20_POLY1305_SHA256`
- Self-signed cert auto-generated on first run — replace with pool CA cert for production
- `verify = 0` in default config (trust-on-first-use) — set `verify = 2` with `CAfile` for strict validation

---

*student-os v0.1.0 — Phase 5 complete (Steps 44–47)*
