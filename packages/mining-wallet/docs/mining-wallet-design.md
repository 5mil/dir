# mining-wallet Design

> `@dir/mining-wallet` — v0.3.1
> Branch: `mining-dgb-skein`

---

## Overview

`mining-wallet` is the unified mining wallet, payout, and pool management module for `dir`.

Features:
- **DGB HD wallet** (BIP39/BIP44, PIN-protected, offline)
- **Payout modes**: DGB integrated, DGB external, Solana, ETH, Custom coin
- **Pool selector**: Fennac (primary) + 6 backup DGB pools + custom
- **Payout/pool restart hook**: auto-restarts miners on config change
- **USB ASIC plug-and-play**: udev hotplug, usb npm package
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
  MiningTab.tsx    5-tab Mining Tab (Overview/Wallet/Payout/Pools/ASICs)
  MiningTab.css    Pool cards, modal, payout form styling
```

---

## Payout Modes

| Mode | Coin | Validation | Notes |
|---|---|---|---|
| `dgb_integrated` | DGB | Reads wallet-cache.json | Auto — no user input |
| `dgb_external` | DGB | `^D[A-Za-z0-9]{33}$` | User provides D... address |
| `solana` | SOL | base58, 32–44 chars | User provides SOL address |
| `custom` (ETH) | ETH | EIP-55 checksum (keccak256) | Full checksum + format validation |
| `custom` (other) | Any | Non-empty string | BTC, LTC, etc. — format not validated |

### ETH Validation (EIP-55)

```
1. Format check:  /^0x[0-9a-fA-F]{40}$/
2. Checksum:      keccak256(lowercase_hex)
                  → each char must match expected upper/lower
3. Non-checksummed (all-lower or all-upper) → accepted as-is
4. Error response: HTTP 400 + { error: "Invalid ETH address..." }
```

Dependency: `keccak` npm package (`npm install keccak`).
Fallback: if `keccak` unavailable, format-only validation.

---

## Pre-configured Pools

| ID | Pool | Algo | TLS | Fee |
|---|---|---|---|---|
| `fennac-skein` ⭐ | Fennac (dir native) | Skein | ✅ | 1% |
| `dgb-skein-zergpool` | Zergpool | Skein | ✅ | 0.5% |
| `dgb-skein-unmineable` | unMineable | Skein | — | 1% |
| `dgb-skein-aikapool` | Aikapool | Skein | — | 1% |
| `dgb-skein-miningpoolhub` | MiningPoolHub | Skein | — | 0.9% |
| `dgb-odo-digipool` | DigiPool (Odocrypt) | Odocrypt | — | 1% |
| `custom` | Custom | — | — | — |

Active pool stored at `/etc/dir/active-pool.json` (mode 600).

---

## Payout/Pool Restart Hook

```
fs.watch /etc/dir/payout-config.json
fs.watch /etc/dir/active-pool.json
         │ (1.5s debounce)
         ▼
  read active-pool.json + payout-config.json
  write /etc/dir/cpuminer.conf
  write /etc/cgminer.conf
         │
         ├── systemctl restart dir-dgb-skein dir-dgb-skein-gpu dir-fennac
         └── fallback: pkill cpuminer-multi + pkill skein-miner.py
```

---

## Mining Tab — 5 Tabs

| Tab | Contents |
|---|---|
| Overview | Live miner cards (Fennac + DGB Skein hashrate, accepted, uptime) |
| Wallet | HD wallet create / balance / PIN unlock modal |
| Payout | Mode dropdown (DGB integrated / external / SOL / ETH / Custom) + address input + ETH live validation |
| Pools | Pool card grid, stratum URL dropdown, worker name input, Apply Pool button |
| ASICs | USB device list + re-scan button |

---

## API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/mining/wallet/create` | Create HD wallet (PIN required) |
| GET | `/api/mining/wallet/balance` | Get wallet balance |
| POST | `/api/mining/wallet/unlock` | Unlock wallet (PIN required) |
| POST | `/api/mining/wallet/export` | Export sensitive wallet data |
| GET | `/api/mining/payout` | Get current payout config |
| POST | `/api/mining/payout` | Set payout mode |
| GET | `/api/mining/pools` | List all pools |
| GET | `/api/mining/pools/active` | Get active pool |
| POST | `/api/mining/pools/select` | Select active pool |
| GET | `/api/mining/asics` | List USB ASIC devices |
| POST | `/api/mining/asics/scan` | Re-scan USB devices |

---

*mining-wallet v0.3.1 — dir | Stardate 2026.169*
