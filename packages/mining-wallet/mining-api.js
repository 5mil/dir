'use strict';
/**
 * mining-api.js
 * =============
 * Express router — dir mining-wallet API
 *
 * Routes:
 *   Wallet:
 *     POST /api/mining/wallet/create
 *     GET  /api/mining/wallet/balance
 *     POST /api/mining/wallet/unlock
 *     POST /api/mining/wallet/export
 *
 *   Payout:
 *     GET  /api/mining/payout
 *     POST /api/mining/payout
 *
 *   Pools:
 *     GET  /api/mining/pools
 *     GET  /api/mining/pools/active
 *     POST /api/mining/pools/select
 *
 *   USB ASICs:
 *     GET  /api/mining/asics
 *     POST /api/mining/asics/scan
 */

const express      = require('express');
const dgbWallet    = require('./dgb-wallet');
const solPayout    = require('./solana-payout');
const ethValidator = require('./eth-validator');
const poolConfig   = require('./pool-config');
const usbAsic      = require('./usb-asic');
const restartHook  = require('./payout-restart-hook');

const router = express.Router();

// Start restart hook (watches payout-config.json + active-pool.json)
restartHook.start();

// ── Wallet ────────────────────────────────────────────────────────────────── //

router.post('/wallet/create', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length < 4) return res.status(400).json({ error: 'PIN must be at least 4 digits.' });
    const wallet = await dgbWallet.createWallet(pin);
    res.json({ ok: true, address: wallet.address, created: wallet.created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/wallet/balance', async (req, res) => {
  try {
    const balance = await dgbWallet.getBalance();
    res.json(balance);
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
  if (!cfg) return res.json({ mode: null, message: 'No payout config set.' });
  res.json(cfg);
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
        // ETH address: validate before writing
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

module.exports = router;
