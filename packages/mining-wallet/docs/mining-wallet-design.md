# Mining Wallet + Payout + USB ASIC + Pool Selector — Design

## Pool Selector

### Pre-Configured Pools (preset registry in `pool-config.js`)

| ID | Name | URL | Fee | Region |
|---|---|---|---|---|
| `fennac-primary` | Fennac (Primary) | `stratum+tcp://pool.fennac.com:3333` | 0% | Global |
| `fennac-backup` | Fennac (Backup) | `stratum+tcp://backup.fennac.com:3333` | 0% | Global |
| `dgb-skein-dgbpool` | DGBPool.com — Skein | `stratum+tcp://skein.dgbpool.com:3056` | 0.9% | Global |
| `dgb-skein-zpool` | Zpool — Skein | `stratum+tcp://skein.mine.zpool.ca:8533` | 0.5% | US/EU |
| `dgb-skein-prohashing` | ProHashing — Skein | `stratum+tcp://prohashing.com:3333` | 4.99% | US |
| `dgb-skein-unmineable` | unMineable — DGB | `stratum+tcp://rx.unmineable.com:3333` | 1% | Global |

TLS URLs are available for: Fennac (3443), ProHashing (3334), unMineable (443).

### Config File

`/etc/dir/pool-config.json` (mode 600):
- `active_pool_id` — which pool is currently active
- `failover_order` — ordered list of pool IDs for failover
- `use_tls` — whether to prefer TLS URL
- `custom_pools` — user-added pools

### API Routes (`/api/mining/pools`)

| Method | Path | Description |
|---|---|---|
| GET | `/` | List all pools with active + failover flags |
| GET | `/active` | Get active pool |
| POST | `/active` | Set active pool `{ pool_id }` |
| POST | `/failover` | Set failover order `{ order: [id, ...] }` |
| POST | `/custom` | Add custom pool |
| DELETE | `/custom/:id` | Remove custom pool |
| POST | `/test` | Test pool reachability (TCP connect) `{ pool_id }` or `{ url }` |

### Reachability Test

TCP connect with 5s timeout — returns `{ reachable, latency_ms, error }`.

### UI (PoolSelector.tsx)

- Active pool banner
- Preset pools table: name, URL, fee, region, latency badge, Set Active / Test buttons
- Custom pools table with Remove button
- Test All Pools button
- Add Custom Pool form (id, name, url, algo, coin, fee, region, notes)

## PIN Unlock Modal

- `POST /api/mining/wallet/unlock` — validates PIN, returns masked sensitive metadata
- `POST /api/mining/wallet/export` — validates PIN, returns full wallet material
- Modal prompts PIN, shows public key + masked private key + derivation + creation time
- PIN cleared from state on modal close

## DGB Wallet

- BIP39 24-word mnemonic + BIP44 `m/44'/20'/0'/0/0`
- AES-256-GCM + scrypt PIN derivation
- `/etc/dir/mining-wallet.enc` (mode 600)
- Balance: DigiExplorer API

## Payout Modes

| Mode | Description |
|---|---|
| `dgb_integrated` | Integrated HD wallet |
| `dgb_external` | User-supplied DGB address |
| `solana` | SOL base58 address |
| `custom` | Any coin + address |

## USB ASIC Detection

1. `lsusb` VID:PID match
2. `/dev/ttyUSB*` serial scan
3. cgminer API TCP probe `127.0.0.1:4028`
4. Auto-writes `/etc/cgminer.conf`
5. Polls every 10s, emits `asic:detected` event
