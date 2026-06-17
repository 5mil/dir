# mining-wallet Design

> `@dir/mining-wallet` — v0.3.1
> Branch: `mining-wallet-v031`

---

## Overview

`mining-wallet` is the unified mining wallet, payout, and pool management module for `dir`.

Features:
- **DGB HD wallet** (BIP39/BIP44, PIN-protected, offline)
- **Payout modes**: DGB integrated, DGB external, Solana, ETH (EIP-55), Custom coin
- **Pool selector**: Fennac (primary) + 6 backup DGB pools + custom
- **Payout/pool restart hook**: auto-restarts miners on config change
- **USB ASIC plug-and-play**: udev hotplug, usb npm
- **Mining Tab**: 5-tab UI (Overview / Wallet / Payout / Pools / ASICs)

---

## Architecture

```
mining-api.js  (Express router)
  ├─ dgb-wallet.js          BIP39/BIP44 HD wallet — DGB
  ├─ solana-payout.js       Payout mode manager
  │    └─ eth-validator.js  EIP-55 ETH address validation
  ├─ pool-config.js         Pool registry + active pool R/W
  ├─ payout-restart-hook.js fs.watch + 1.5s debounce + miner restart
  └─ usb-asic.js            USB ASIC detection (usb npm)

ui/
  MiningTab.tsx    5-tab Mining Tab
  MiningTab.css    Pool cards, modal, payout form, ETH validation states
```

---

## Payout Modes

| Mode | Coin | Validation | Notes |
|---|---|---|---|
| `dgb_integrated` | DGB | wallet-cache.json | Auto — no user input |
| `dgb_external` | DGB | `^D[A-Za-z0-9]{33}$` | User provides D... address |
| `solana` | SOL | base58, 32–44 chars | User provides SOL address |
| `custom` (ETH) | ETH | EIP-55 keccak256 checksum | Full checksum + format validation |
| `custom` (other) | Any | Non-empty string | BTC, LTC, etc. |

### ETH Validation (EIP-55)

```
1. Format: /^0x[0-9a-fA-F]{40}$/
2. Checksum: keccak256(lowercase_hex) → verify upper/lower per char
3. Non-checksummed (all-lower/all-upper) → accepted
4. Error: HTTP 400 + { error: "Invalid ETH address..." }
Fallback: if keccak unavailable → format-only validation
```

---

## Pre-configured Pools

| ID | Pool | Algo | TLS | Fee |
|---|---|---|---|---|
| `fennac-skein` ⭐ | Fennac (dir native) | Skein | ✅ | 1% |
| `dgb-skein-zergpool` | Zergpool | Skein | ✅ | 0.5% |
| `dgb-skein-unmineable` | unMineable (3 regions) | Skein | — | 1% |
| `dgb-skein-aikapool` | Aikapool | Skein | — | 1% |
| `dgb-skein-miningpoolhub` | MiningPoolHub | Skein | — | 0.9% |
| `dgb-odo-digipool` | DigiPool (Odocrypt) | Odocrypt | — | 1% |
| `custom` | Custom | — | — | — |

Active pool: `/etc/dir/active-pool.json` (mode 600)

---

## Restart Hook

```
fs.watch /etc/dir/payout-config.json
fs.watch /etc/dir/active-pool.json
         │ (1.5s debounce)
         ▼
  write /etc/dir/cpuminer.conf
  write /etc/cgminer.conf
         │
         ├── systemctl restart dir-dgb-skein dir-dgb-skein-gpu dir-fennac
         └── fallback: pkill cpuminer-multi + pkill skein-miner.py
```

---

## API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/mining/status` | Full mining status |
| GET | `/api/mining/stats` | Share tracker stats |
| GET | `/api/mining/wallet` | Wallet address + balance |
| POST | `/api/mining/wallet/create` | Create HD wallet (PIN) |
| POST | `/api/mining/wallet/unlock` | Unlock wallet (PIN) |
| POST | `/api/mining/wallet/export` | Export wallet (PIN) |
| GET | `/api/mining/payout` | Get payout config |
| POST | `/api/mining/payout` | Set payout mode |
| GET | `/api/mining/pools` | List all pools |
| GET | `/api/mining/pools/active` | Get active pool |
| POST | `/api/mining/pools/select` | Select pool |
| GET | `/api/mining/asics` | List USB ASICs |
| POST | `/api/mining/asics/scan` | Re-scan USB |
| POST | `/api/mining/asics/configure` | Auto-configure cgminer |

---

*mining-wallet v0.3.1 — dir | Stardate 2026.169*
