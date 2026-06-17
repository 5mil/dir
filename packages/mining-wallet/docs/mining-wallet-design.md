# Mining Wallet, Payout, Pool Selector & USB ASIC Design

## Architecture Overview

```
[MiningTab UI]
      │
      ▼  /api/mining/*
[mining-api.js]  ←→  dgb-wallet.js
                 ←→  solana-payout.js
                 ←→  pool-config.js
                 ←→  payout-restart-hook.js
                 ←→  usb-asic.js
      │
      ▼
/etc/dir/
  mining-wallet.enc   (AES-256-GCM, mode 600)
  mining-wallet.enc.addr  (plaintext DGB address, mode 644)
  payout-config.json  (payout mode + address, mode 600)
  active-pool.json    (selected pool URL + worker, mode 600)
  cpuminer.conf       (written by restart hook)
/etc/cgminer.conf     (written by restart hook)
```

---

## DGB Wallet

- Standard: BIP39 24-word mnemonic + BIP44 HD
- Derivation: `m/44'/20'/0'/0/0` (DGB coin type 20)
- Address: P2PKH `0x1E` prefix (`D...`)
- Encryption: AES-256-GCM, scrypt PIN derivation
- Storage: `/etc/dir/mining-wallet.enc` (mode 600)
- Balance: DigiExplorer API `https://digiexplorer.info/api/addr/{address}/balance`
- Mnemonic: shown once on creation, never logged

### API Routes
- `GET  /api/mining/wallet` — address + balance
- `POST /api/mining/wallet/create` — create new wallet (`{ pin }`)
- `POST /api/mining/wallet/unlock` — validate PIN, return masked metadata
- `POST /api/mining/wallet/export` — validate PIN, return full sensitive material (backend only)

### PIN Unlock Modal
- Modal prompts for PIN, never stores it after close
- On success: reveals public key, masked private key, derivation path, creation time
- Full export route exists on backend for future CLI/export tool

---

## Payout Modes

| Mode | Description |
|---|---|
| `dgb_integrated` | Auto-uses integrated HD wallet address |
| `dgb_external` | User provides any DGB `D…` address |
| `solana` | User provides SOL base58 address |
| `custom` | Any address + coin ticker |

Changing payout config triggers `payout-restart-hook.js` automatically via `fs.watch`.

---

## Pool Selector

### Pre-configured Pools

| ID | Name | Algo | Primary |
|---|---|---|---|
| `fennac-skein` | Fennac (dir native) | Skein | ✅ |
| `dgb-skein-zergpool` | Zergpool — DGB Skein | Skein | — |
| `dgb-skein-unmineable` | unMineable — DGB Skein | Skein | — |
| `dgb-skein-aikapool` | Aikapool — DGB Skein | Skein | — |
| `dgb-skein-miningpoolhub` | MiningPoolHub — DGB Skein | Skein | — |
| `dgb-odo-digipool` | DigiPool — DGB Odocrypt | Odocrypt | — |
| `custom` | Custom Pool | custom | — |

### API Routes
- `GET  /api/mining/pools` — all pools + active pool
- `GET  /api/mining/pools/active` — current active pool
- `POST /api/mining/pools/select` — set active pool (`{ pool_id, url, worker, password }`)

Changing active pool triggers `payout-restart-hook.js` automatically via `fs.watch`.

---

## Payout Restart Hook

`payout-restart-hook.js` watches:
- `/etc/dir/payout-config.json`
- `/etc/dir/active-pool.json`

On change (1.5s debounce):
1. Reads `active-pool.json` + `payout-config.json`
2. Writes `/etc/dir/cpuminer.conf` + `/etc/cgminer.conf`
3. Attempts `systemctl restart dir-dgb-skein dir-dgb-skein-gpu dir-fennac`
4. Falls back to `pkill cpuminer-multi && pkill skein-miner.py` if no systemd services found

---

## USB ASIC Detection

1. `lsusb` VID:PID match (GekkoScience, Antminer U-series, Block Erupter, Goldshell Mini, FTDI, custom Skein)
2. `/dev/ttyUSB*` + `/dev/ttyACM*` serial scan
3. cgminer API `127.0.0.1:4028` TCP probe
4. Polls every 10s, emits `asic:detected` on new plug-in

---

## Security Notes

- Private key: AES-256-GCM, scrypt PIN derivation, mode 600
- Mnemonic: shown once on create, never logged
- Payout config: mode 600
- Active pool config: mode 600
- Cpuminer/cgminer conf: mode 640
- Public address cache: mode 644 (balance-only queries)
- PIN never persisted in UI state after modal closes
