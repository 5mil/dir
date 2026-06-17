/**
 * Mining Tab Backend API
 */

const express = require('express');
const fs      = require('fs');
const router  = express.Router();

const dgbWallet     = require('./dgb-wallet');
const solPayout     = require('./solana-payout');
const poolConfig    = require('./pool-config');
const restartHook   = require('./payout-restart-hook');
const { USBAsicManager } = require('./usb-asic');

const asicManager = new USBAsicManager();
asicManager.startPolling(10000);
restartHook.start();

const STATS_FILES = {
  fennac:    '/var/lib/fennac/stats.json',
  dgb_skein: '/var/lib/dgb-skein/stats.json',
};

function loadStats(coin) {
  try { return JSON.parse(fs.readFileSync(STATS_FILES[coin], 'utf8')); }
  catch { return null; }
}

// ── Status ──────────────────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const fennac = loadStats('fennac');
  const dgb    = loadStats('dgb_skein');
  const payout = solPayout.getPayoutAddress();
  const asics  = await asicManager.scan();
  const pool   = poolConfig.getActivePool();

  res.json({
    miners: {
      fennac:    fennac    ? { accepted: fennac.accepted,    rejected: fennac.rejected,    hashrate_h: fennac.hashrate_h,    uptime_s: fennac.uptime_s    } : null,
      dgb_skein: dgb       ? { accepted: dgb.accepted,       rejected: dgb.rejected,       hashrate_h: dgb.hashrate_h,       uptime_s: dgb.uptime_s       } : null,
    },
    payout,
    asics:  asics.length,
    wallet: dgbWallet.getAddress(),
    pool:   { id: pool.pool_id, url: pool.url },
  });
});

// ── Wallet ───────────────────────────────────────────────────────────────────
router.get('/wallet', async (req, res) => {
  const address = dgbWallet.getAddress();
  if (!address) return res.json({ exists: false });
  try {
    const balance = await dgbWallet.getBalance(address);
    res.json({ exists: true, address, balance_dgb: balance });
  } catch {
    res.json({ exists: true, address, balance_dgb: null });
  }
});

router.post('/wallet/create', (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 6) return res.status(400).json({ error: 'PIN must be 6+ characters' });
  try {
    const { address, mnemonic } = dgbWallet.createWallet(pin);
    solPayout.setDGBIntegrated(address);
    res.json({ address, mnemonic, warning: 'Save this mnemonic securely. It will not be shown again.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/wallet/unlock', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });
  try {
    const wallet = dgbWallet.unlockWallet(pin);
    res.json(wallet);
  } catch {
    res.status(401).json({ error: 'Invalid PIN' });
  }
});

router.post('/wallet/export', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });
  try {
    const wallet = dgbWallet.exportSensitiveWallet(pin);
    res.json(wallet);
  } catch {
    res.status(401).json({ error: 'Invalid PIN' });
  }
});

// ── Payout ───────────────────────────────────────────────────────────────────
router.get('/payout', (req, res) => {
  res.json(solPayout.loadConfig());
});

router.post('/payout', (req, res) => {
  const { mode, address, coin } = req.body;
  try {
    let cfg;
    switch (mode) {
      case 'dgb_integrated': cfg = solPayout.setDGBIntegrated(address); break;
      case 'dgb_external':   cfg = solPayout.setDGBExternal(address);   break;
      case 'solana':         cfg = solPayout.setSolanaAddress(address);  break;
      case 'custom':         cfg = solPayout.setCustomAddress(address, coin); break;
      default: return res.status(400).json({ error: 'Invalid mode' });
    }
    // payout-restart-hook fs.watch fires automatically via /etc/dir/payout-config.json
    res.json({ ok: true, config: cfg });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Pools ────────────────────────────────────────────────────────────────────
router.get('/pools', (req, res) => {
  res.json({ pools: poolConfig.getPools(), active: poolConfig.getActivePool() });
});

router.post('/pools/select', (req, res) => {
  const { pool_id, url, worker, password } = req.body;
  if (!pool_id) return res.status(400).json({ error: 'pool_id required' });
  try {
    const pool   = poolConfig.getPoolById(pool_id);
    const useUrl = url || (pool && poolConfig.getDefaultUrl(pool)?.url);
    if (!useUrl) return res.status(400).json({ error: 'url required for custom pool' });
    const cfg = poolConfig.setActivePool(pool_id, useUrl, worker || 'dir_worker', password || 'x');
    // payout-restart-hook fs.watch fires automatically via /etc/dir/active-pool.json
    res.json({ ok: true, config: cfg });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/pools/active', (req, res) => {
  res.json(poolConfig.getActivePool());
});

// ── ASICs ─────────────────────────────────────────────────────────────────────
router.get('/asics', async (req, res) => {
  const devices = await asicManager.scan();
  res.json({ count: devices.length, devices });
});

router.post('/asics/configure', (req, res) => {
  const { pool_url, worker, password } = req.body;
  if (!pool_url || !worker) return res.status(400).json({ error: 'pool_url and worker required' });
  const conf = asicManager.autoConfigureCgminer(pool_url, worker, password || 'x');
  res.json({ ok: true, config: conf });
});

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  res.json({ fennac: loadStats('fennac'), dgb_skein: loadStats('dgb_skein') });
});

module.exports = router;
