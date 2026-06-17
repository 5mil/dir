'use strict';
/**
 * mining-api.js v0.3.1
 * Express router — dir mining-wallet API
 * Mount: app.use('/api/mining', require('./mining-api'))
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
restartHook.start();

const STATS = { fennac: '/var/lib/fennac/stats.json', dgb_skein: '/var/lib/dgb-skein/stats.json' };
const loadStats = c => { try { return JSON.parse(fs.readFileSync(STATS[c], 'utf8')); } catch { return null; } };

// Status
router.get('/status', async (req, res) => {
  try {
    res.json({
      miners: {
        fennac:    loadStats('fennac')    ? { accepted: loadStats('fennac').accepted,    hashrate_h: loadStats('fennac').hashrate_h,    uptime_s: loadStats('fennac').uptime_s    } : null,
        dgb_skein: loadStats('dgb_skein') ? { accepted: loadStats('dgb_skein').accepted, hashrate_h: loadStats('dgb_skein').hashrate_h, uptime_s: loadStats('dgb_skein').uptime_s } : null,
      },
      payout: solPayout.readPayoutConfig(),
      active_pool: poolConfig.getActivePool(),
      asics: (await usbAsic.listDevices()).length,
      wallet: dgbWallet.getAddress ? dgbWallet.getAddress() : null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/stats', (req, res) => res.json({ fennac: loadStats('fennac'), dgb_skein: loadStats('dgb_skein') }));

// Wallet
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
    res.json({ ok: true, address: wallet.address, created: wallet.created, warning: 'Save your mnemonic securely.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/wallet/unlock', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN required.' });
    res.json({ ok: true, wallet: dgbWallet.unlockWallet(pin) });
  } catch (e) { res.status(401).json({ error: e.message }); }
});
router.post('/wallet/export', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN required.' });
    res.json({ ok: true, wallet: dgbWallet.exportSensitiveWallet(pin) });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

// Payout
router.get('/payout', (req, res) => res.json(solPayout.readPayoutConfig() || { mode: null }));
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
          const r = ethValidator.validateETHAddress(address);
          if (!r.valid) return res.status(400).json({ error: r.error });
        }
        cfg = solPayout.setCustomAddress(address, coin); break;
      }
      default: return res.status(400).json({ error: `Unknown mode: ${mode}` });
    }
    res.json({ ok: true, config: cfg });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Pools
router.get('/pools',        (req, res) => res.json({ pools: poolConfig.listPools() }));
router.get('/pools/active', (req, res) => res.json(poolConfig.getActivePool() || { message: 'No active pool.' }));
router.post('/pools/select', (req, res) => {
  try {
    const { poolId, customUrl, worker } = req.body;
    if (!poolId) return res.status(400).json({ error: 'poolId required.' });
    res.json({ ok: true, pool: poolConfig.setActivePool(poolId, { customUrl, worker }) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ASICs
router.get('/asics', async (req, res) => {
  try { res.json({ devices: await usbAsic.listDevices() }); } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/asics/scan', async (req, res) => {
  try { res.json({ devices: await usbAsic.scan() }); } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/asics/configure', (req, res) => {
  try {
    const { pool_url, worker, password } = req.body;
    if (!pool_url || !worker) return res.status(400).json({ error: 'pool_url and worker required.' });
    const conf = usbAsic.autoConfigureCgminer ? usbAsic.autoConfigureCgminer(pool_url, worker, password || 'x') : { pool_url, worker };
    res.json({ ok: true, config: conf });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
