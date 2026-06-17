# Mining Wallet + Payout + USB ASIC Design

> `mining-wallet` — integrated DGB wallet, Solana payout bridge, USB ASIC plug-and-play
> Branch: `mining-dgb-skein`

---

## Overview

The dir Mining Tab exposes a full wallet + payout + hardware management interface directly in the dir UI. No external wallet app required for DGB payouts.

---

## Architecture

```
MiningTab.tsx (UI)
  ├─ Overview   → /api/mining/status      (Fennac + DGB stats)
  ├─ Wallet     → /api/mining/wallet       (DGB address + balance)
  ├─ Payout     → /api/mining/payout       (address config)
  └─ ASICs      → /api/mining/asics        (USB device list + configure)

mining-api.js (Express router)
  ├─ dgb-wallet.js       → BIP39/BIP44 HD wallet, AES-256-GCM encrypted
  ├─ solana-payout.js    → payout mode config (DGB / SOL / custom)
  └─ usb-asic.js         → lsusb + serial scan + cgminer API probe
```

---

## DGB Wallet

| Property | Value |
|---|---|
| Standard | BIP39 (24-word mnemonic) + BIP44 HD |
| Derivation | `m/44'/20'/0'/0/0` (DGB coin type 20) |
| Address prefix | `D` (P2PKH, version byte `0x1E`) |
| Encryption | AES-256-GCM, scrypt key derivation |
| Storage | `/etc/dir/mining-wallet.enc` (mode 600) |
| Balance API | DigiExplorer (`digiexplorer.info/api`) |
| Mnemonic | Shown ONCE on create, never stored in API log |

---

## Payout Modes

| Mode | Description |
|---|---|
| `dgb_integrated` | Auto-uses integrated DGB wallet address |
| `dgb_external` | User provides external DGB address |
| `solana` | User provides Solana (SOL) base58 address |
| `custom` | Any address + coin ticker (ETH, BTC, etc.) |

Config stored at `/etc/dir/payout-config.json` (mode 600).

---

## USB ASIC Detection

Three detection layers:

1. **lsusb scan** — matches VID:PID against known ASIC table
2. **Serial scan** — `/dev/ttyUSB*` and `/dev/ttyACM*`
3. **cgminer API probe** — TCP `127.0.0.1:4028` for USB-bridged ASICs

### Known VID:PID Table

| Device | VID | PID | Algo |
|---|---|---|---|
| GekkoScience Compac | 0483 | 5740 | SHA256d |
| Antminer U1/U2/U3 | 10C4 | EA60 | SHA256d |
| Block Erupter USB | 067B | 2303 | SHA256d |
| Goldshell Mini | 1FC9 | 0083 | Scrypt |
| FTDI Serial ASIC | 0403 | 6001 | Unknown |
| Custom Skein USB | 1D50 | 6018 | Skein |

Auto-configure writes `/etc/cgminer.conf` with pool URL + worker.

---

## Mining Tab UI Tabs

| Tab | What |
|---|---|
| Overview | Live Fennac + DGB Skein miner cards (hashrate, accepted, rejected, uptime) |
| Wallet | Integrated DGB wallet — create (PIN + mnemonic), view address, live balance |
| Payout | Mode selector (DGB integrated / external / Solana / custom) + address input |
| ASICs | USB device list, rescan, auto-configure cgminer for pool |

---

## Security Notes

- Private key encrypted AES-256-GCM with scrypt-derived key from user PIN
- Mnemonic shown exactly once on wallet creation, never logged or stored in plaintext
- Payout config file: mode 600 (owner read/write only)
- Wallet file: mode 600
- Public address cached separately (mode 644) for balance queries without PIN

---

*mining-wallet v0.1.0 — Stardate 2026.169*
