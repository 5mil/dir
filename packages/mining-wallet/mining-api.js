'use strict';
/**
 * mining-api.js  v0.3.1
 * =====================
 * Express router — dir mining-wallet API
 *
 * Mount at: app.use('/api/mining', require('./mining-api'))
 *
 * Routes:
 *   Wallet:
 *     GET  /api/mining/wallet
 *     POST /api/mining/wallet/create
 *     POST /api/mining/wallet/unlock
 *     POST /api/mining/wallet/export
 *
 *   Payout:
 *     GET  /api/mining/payout
 *     POST /api/mining/payout          (supports ETH EIP-55 validation)
 *
 *   Pools:
 *     GET  /api/mining/pools
 *     GET  /api/mining/pools/active
 *     POST /api/mining/pools/select
 *
 *   Stats + ASICs:
 *     GET  /api/mining/status
 *     GET  /api/mining/stats
 *     GET  /api/mining/asics
 *     POST /api/mining/asics/scan
 *     POST /api/mining/asics/configure
 */

const express      = require('express');
const fs           = require('fs');
const dgbWallet    = require('./dgb-wallet');
const solPayout    = require('./solana-payout');
const ethValidator = require('./eth-validator');
const poolConfig   = require('./pool-config');
const usbAsic      = require('./usb-asic');
const restartHook  = require('./payout-restart-hook');

const router = express.Router();

// Start restart hook on boot (watches payout-config.json + active-pool.json)
restartHook.start();

const STATS_FILES = {
  fennac:    '/var/lib/fennac/stats.json',
  dgb_skein: '/var/lib/dgb-skein/stats.json',
};

function loadStats(coin) {
  try { return JSON.parse(fs.readFileSync(STATS_FILES[coin], 'utf8')); }
  catch { return null; }
}

// ── Status ───────────────────────────────────────────────────────────────── //

router.get('/status', async (req, res) => {
  try {
    const fennac   = loadStats('fennac');
    const dgb      = loadStats('dgb_skein');
    const payout   = solPayout.readPayoutConfig();
    const devices  = await usbAsic.listDevices();
    const pool     = poolConfig.getActivePool();
    res.json({
      miners: {
        fennac:    fennac ? { accepted: fennac.accepted,    hashrate_h: fennac.hashrate_h,    uptime_s: fennac.uptime_s    } : null,
        dgb_skein: dgb    ? { accepted: dgb.accepted,       hashrate_h: dgb.hashrate_h,       uptime_s: dgb.uptime_s       } : null,
      },
      payout,
      active_pool: pool,
      asics: devices.length,
      wallet: dgbWallet.getAddress ? dgbWallet.getAddress() : null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', (req, res) => {
  res.json({ fennac: loadStats('fennac'), dgb_skein: loadStats('dgb_skein') });
});

// ── Wallet ────────────────────────────────────────────────────────────────── //

router.get('/wallet', async (req, res) => {
  try {
    const address = dgbWallet.getAddress ? dgbWallet.getAddress() : null;
    if (!address) return res.json({ exists: false });
    const balance = await dgbWallet.getBalance(address).catch(() => null);
    res.json({ exists: true, address, balance_dgb: balance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/wallet/create', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length < 4) return res.status(400).json({ error: 'PIN must be at least 4 digits.' });
    const wallet = await dgbWallet.createWallet(pin);
    res.json({ ok: true, address: wallet.address, created: wallet.created, warning: 'Save your mnemonic securely. It will not be shown again.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/wallet/unlock', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN required.' });
    const data = dgbWallet.unlockWallet(pin);
    res.json({ ok: true, wallet: data });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

router.post('/wallet/export', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN required.' });
    const data = dgbWallet.exportSensitiveWallet(pin);
    res.json({ ok: true, wallet: data });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

// ── Payout ────────────────────────────────────────────────────────────────── //

router.get('/payout', (req, res) => {
  const cfg = solPayout.readPayoutConfig();
  res.json(cfg || { mode: null, message: 'No payout config set.' });
});

router.post('/payout', (req, res) => {
  const { mode, address, coin } = req.body;
  try {
    let cfg;
    switch (mode) {
      case 'dgb_integrated': cfg = solPayout.setDGBIntegrated(); break;
      case 'dgb_external':   cfg = solPayout.setDGBExternal(address); break;
      case 'solana':         cfg = solPayout.setSolanaAddress(address); break;
      case 'custom': {
        if (coin && coin.toUpperCase() === 'ETH') {
          const result = ethValidator.validateETHAddress(address);
          if (!result.valid) return res.status(400).json({ error: result.error });
        }
        cfg = solPayout.setCustomAddress(address, coin);
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown payout mode: ${mode}` });
    }
    res.json({ ok: true, config: cfg });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Pools ─────────────────────────────────────────────────────────────────── //

router.get('/pools', (req, res) => {
  res.json({ pools: poolConfig.listPools() });
});

router.get('/pools/active', (req, res) => {
  const active = poolConfig.getActivePool();
  res.json(active || { message: 'No active pool set.' });
});

router.post('/pools/select', (req, res) => {
  try {
    const { poolId, customUrl, worker } = req.body;
    if (!poolId) return res.status(400).json({ error: 'poolId required.' });
    const result = poolConfig.setActivePool(poolId, { customUrl, worker });
    res.json({ ok: true, pool: result });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── USB ASICs ─────────────────────────────────────────────────────────────── //

router.get('/asics', async (req, res) => {
  try { res.json({ devices: await usbAsic.listDevices() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/asics/scan', async (req, res) => {
  try { res.json({ devices: await usbAsic.scan() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/asics/configure', (req, res) => {
  try {
    const { pool_url, worker, password } = req.body;
    if (!pool_url || !worker) return res.status(400).json({ error: 'pool_url and worker required.' });
    const conf = usbAsic.autoConfigureCgminer
      ? usbAsic.autoConfigureCgminer(pool_url, worker, password || 'x')
      : { pool_url, worker };
    res.json({ ok: true, config: conf });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
