'use strict';
/**
 * solana-payout.js v0.3.1
 * Payout mode manager: DGB integrated/external, SOL, ETH, custom
 * Config: /etc/dir/payout-config.json (mode 600)
 */
const fs           = require('fs');
const path         = require('path');
const ethValidator = require('./eth-validator');

const PAYOUT_CONFIG = process.env.PAYOUT_CONFIG || '/etc/dir/payout-config.json';
const WALLET_CACHE  = process.env.WALLET_CACHE  || '/etc/dir/wallet-cache.json';

function _write(cfg) {
  const dir = path.dirname(PAYOUT_CONFIG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const data = { ...cfg, updated: new Date().toISOString() };
  fs.writeFileSync(PAYOUT_CONFIG, JSON.stringify(data, null, 2), { mode: 0o600 });
  return data;
}
function _readWalletAddress() {
  try { return JSON.parse(fs.readFileSync(WALLET_CACHE, 'utf8')).address; } catch { return null; }
}

function setDGBIntegrated() {
  const address = _readWalletAddress();
  if (!address) throw new Error('No integrated wallet. Create a wallet first.');
  return _write({ mode: 'dgb_integrated', address, coin: 'DGB' });
}
function setDGBExternal(address) {
  if (!/^D[A-Za-z0-9]{33}$/.test(address)) throw new Error('Invalid DGB address.');
  return _write({ mode: 'dgb_external', address, coin: 'DGB' });
}
function setSolanaAddress(address) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) throw new Error('Invalid Solana address.');
  return _write({ mode: 'solana', address, coin: 'SOL' });
}
function setCustomAddress(address, coin) {
  if (!address) throw new Error('Address required.');
  if (!coin)    throw new Error('Coin ticker required.');
  if (coin.toUpperCase() === 'ETH') {
    const r = ethValidator.validateETHAddress(address);
    if (!r.valid) throw new Error(r.error);
    address = r.address;
  }
  return _write({ mode: 'custom', address, coin: coin.toUpperCase() });
}
function readPayoutConfig() {
  try { return JSON.parse(fs.readFileSync(PAYOUT_CONFIG, 'utf8')); } catch { return null; }
}
const loadConfig = readPayoutConfig;
const getPayoutAddress = readPayoutConfig;

module.exports = { setDGBIntegrated, setDGBExternal, setSolanaAddress, setCustomAddress, readPayoutConfig, loadConfig, getPayoutAddress };
