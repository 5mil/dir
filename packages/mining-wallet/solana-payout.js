/**
 * Solana Payout Bridge
 * ====================
 * Allows mining rewards to be forwarded to a Solana wallet address.
 * Uses wDGB (wrapped DGB) on Solana via bridge, or direct SOL address
 * for pools that support multi-coin payout routing.
 *
 * Modes:
 *   1. STORE_ADDRESS  — user provides Solana address; pool pays direct
 *   2. BRIDGE         — DGB → wDGB bridge (Solana)
 *
 * Stores payout config in /etc/dir/payout-config.json
 */

const fs   = require('fs');
const path = require('path');

const CONFIG_PATH  = '/etc/dir/payout-config.json';
const SOL_REGEX    = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DGB_REGEX    = /^D[a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const ETH_REGEX    = /^0x[a-fA-F0-9]{40}$/;

// ---- Config helpers --------------------------------------- //

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return defaultConfig();
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return defaultConfig(); }
}

function defaultConfig() {
  return {
    mode:            'dgb_integrated', // 'dgb_integrated' | 'dgb_external' | 'solana' | 'custom'
    dgb_address:     null,             // integrated wallet address
    solana_address:  null,             // SOL payout address
    custom_address:  null,             // any other coin address
    custom_coin:     null,
    updated:         null
  };
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  cfg.updated = new Date().toISOString();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

// ---- Payout address setters ------------------------------- //

function setDGBIntegrated(dgbAddress) {
  if (!DGB_REGEX.test(dgbAddress)) throw new Error('Invalid DGB address');
  const cfg = loadConfig();
  cfg.mode        = 'dgb_integrated';
  cfg.dgb_address = dgbAddress;
  saveConfig(cfg);
  return cfg;
}

function setDGBExternal(dgbAddress) {
  if (!DGB_REGEX.test(dgbAddress)) throw new Error('Invalid DGB address');
  const cfg = loadConfig();
  cfg.mode        = 'dgb_external';
  cfg.dgb_address = dgbAddress;
  saveConfig(cfg);
  return cfg;
}

function setSolanaAddress(solAddress) {
  if (!SOL_REGEX.test(solAddress)) throw new Error('Invalid Solana address');
  const cfg = loadConfig();
  cfg.mode           = 'solana';
  cfg.solana_address = solAddress;
  saveConfig(cfg);
  return cfg;
}

function setCustomAddress(address, coin) {
  const cfg = loadConfig();
  cfg.mode           = 'custom';
  cfg.custom_address = address;
  cfg.custom_coin    = coin.toUpperCase();
  saveConfig(cfg);
  return cfg;
}

function getPayoutAddress() {
  const cfg = loadConfig();
  switch (cfg.mode) {
    case 'dgb_integrated': return { coin: 'DGB', address: cfg.dgb_address, source: 'integrated_wallet' };
    case 'dgb_external':   return { coin: 'DGB', address: cfg.dgb_address, source: 'external' };
    case 'solana':         return { coin: 'SOL', address: cfg.solana_address, source: 'solana_wallet' };
    case 'custom':         return { coin: cfg.custom_coin, address: cfg.custom_address, source: 'custom' };
    default:               return null;
  }
}

module.exports = {
  loadConfig,
  setDGBIntegrated,
  setDGBExternal,
  setSolanaAddress,
  setCustomAddress,
  getPayoutAddress,
};
