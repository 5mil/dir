'use strict';
/**
 * solana-payout.js
 * ================
 * Payout mode manager for dir mining-wallet.
 *
 * Modes:
 *   dgb_integrated  — use integrated HD wallet DGB address
 *   dgb_external    — user-supplied DGB D... address
 *   solana          — user-supplied SOL base58 address
 *   custom          — any address + coin ticker (ETH validated via eth-validator)
 *
 * Config written to: /etc/dir/payout-config.json  (mode 600)
 */

const fs   = require('fs');
const path = require('path');
const ethValidator = require('./eth-validator');

const PAYOUT_CONFIG = process.env.PAYOUT_CONFIG || '/etc/dir/payout-config.json';
const WALLET_CACHE  = process.env.WALLET_CACHE  || '/etc/dir/wallet-cache.json';

function _write(cfg) {
  const dir = path.dirname(PAYOUT_CONFIG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(PAYOUT_CONFIG, JSON.stringify({ ...cfg, updated: new Date().toISOString() }, null, 2), { mode: 0o600 });
  return cfg;
}

function _readWalletAddress() {
  try { return JSON.parse(fs.readFileSync(WALLET_CACHE, 'utf8')).address; }
  catch (_) { return null; }
}

// ── Public API ────────────────────────────────────────────────────────────── //

function setDGBIntegrated() {
  const address = _readWalletAddress();
  if (!address) throw new Error('No integrated wallet found. Create a wallet first.');
  return _write({ mode: 'dgb_integrated', address, coin: 'DGB' });
}

function setDGBExternal(address) {
  if (!/^D[A-Za-z0-9]{33}$/.test(address)) throw new Error('Invalid DGB address (must start with D, 34 chars).');
  return _write({ mode: 'dgb_external', address, coin: 'DGB' });
}

function setSolanaAddress(address) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) throw new Error('Invalid Solana address (base58, 32–44 chars).');
  return _write({ mode: 'solana', address, coin: 'SOL' });
}

function setCustomAddress(address, coin) {
  if (!address) throw new Error('Address required.');
  if (!coin)    throw new Error('Coin ticker required.');

  // ETH gets full EIP-55 checksum validation
  if (coin.toUpperCase() === 'ETH') {
    const result = ethValidator.validateETHAddress(address);
    if (!result.valid) throw new Error(result.error);
    address = result.address;
  }

  return _write({ mode: 'custom', address, coin: coin.toUpperCase() });
}

function readPayoutConfig() {
  try { return JSON.parse(fs.readFileSync(PAYOUT_CONFIG, 'utf8')); }
  catch (_) { return null; }
}

module.exports = { setDGBIntegrated, setDGBExternal, setSolanaAddress, setCustomAddress, readPayoutConfig };
