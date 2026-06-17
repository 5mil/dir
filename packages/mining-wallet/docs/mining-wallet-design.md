# Mining Wallet + Payout + USB ASIC Design

## Update: PIN Unlock Modal

The Wallet tab now includes a PIN unlock modal for sensitive wallet actions.

### New API Routes
- `POST /api/mining/wallet/unlock` — validates PIN and returns masked sensitive wallet metadata
- `POST /api/mining/wallet/export` — validates PIN and returns full sensitive wallet material for future export flows

### UI Behavior
- `Unlock Wallet` button shown when integrated wallet exists
- Modal prompts for PIN
- Successful unlock reveals:
  - public key
  - masked private key
  - derivation path
  - creation timestamp
- Full export route exists in backend but is not yet exposed in UI

### Security Notes
- PIN never persisted in UI state after unlock modal closes
- Masked private key displayed by default
- Full mnemonic/private key export remains backend-only for now
