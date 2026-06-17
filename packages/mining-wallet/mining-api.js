/**
 * Mining Tab Backend API
 * ======================
 * Express router exposing wallet, payout, ASIC, and stats
 * endpoints consumed by the dir Mining Tab UI.
 *
 * Mount at: app.use('/api/mining', require('./mining-api'))
 *
 * Routes:
 *   GET  /api/mining/status          — full mining status
 *   GET  /api/mining/wallet          — wallet address + balance
 *   POST /api/mining/wallet/create   — create new integrated wallet
 *   GET  /api/mining/payout          — current payout config
 *   POST /api/mining/payout          — set payout address
 *   GET  /api/mining/asics           — detected USB ASICs
 *   POST /api/mining/asics/configure — auto-configure cgminer
 *   GET  /api/mining/stats           — share tracker stats (all coins)
 */

const express = require('express');
const fs      = require('fs');
const router  = express.Router();

const dgbWallet  = require('./dgb-wallet');
const solPayout  = require('./solana-payout');
const { USBAsicManager } = require('./usb-asic');

const asicManager = new USBAsicManager();
asicManager.startPolling(10000);

const STATS_FILES = {
  fennac:    '/var/lib/fennac/stats.json',
  dgb_skein: '/var/lib/dgb-skein/stats.json',
};

function loadStats(coin) {
  try { return JSON.parse(fs.readFileSync(STATS_FILES[coin], 'utf8')); }
  catch { return null; }
}

// GET /api/mining/status
router.get('/status', async (req, res) => {
  const fennac = loadStats('fennac');
  const dgb    = loadStats('dgb_skein');
  const payout = solPayout.getPayoutAddress();
  const asics  = await asicManager.scan();

  res.json({
    miners: {
      fennac:    fennac ? { accepted: fennac.accepted, rejected: fennac.rejected, hashrate_h: fennac.hashrate_h, uptime_s: fennac.uptime_s } : null,
      dgb_skein: dgb    ? { accepted: dgb.accepted,    rejected: dgb.rejected,    hashrate_h: dgb.hashrate_h,    uptime_s: dgb.uptime_s    } : null,
    },
    payout,
    asics:  asics.length,
    wallet: dgbWallet.getAddress(),
  });
});

// GET /api/mining/wallet
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

// POST /api/mining/wallet/create
router.post('/wallet/create', (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 6) return res.status(400).json({ error: 'PIN must be 6+ characters' });
  try {
    const { address, mnemonic } = dgbWallet.createWallet(pin);
    dgbWallet.savePublicAddress(address);
    solPayout.setDGBIntegrated(address);
    // Mnemonic shown ONCE — never stored in API response logs
    res.json({ address, mnemonic, warning: 'Save this mnemonic securely. It will not be shown again.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/mining/payout
router.get('/payout', (req, res) => {
  res.json(solPayout.loadConfig());
});

// POST /api/mining/payout
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
    res.json({ ok: true, config: cfg });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/mining/asics
router.get('/asics', async (req, res) => {
  const devices = await asicManager.scan();
  res.json({ count: devices.length, devices });
});

// POST /api/mining/asics/configure
router.post('/asics/configure', (req, res) => {
  const { pool_url, worker, password } = req.body;
  if (!pool_url || !worker) return res.status(400).json({ error: 'pool_url and worker required' });
  const conf = asicManager.autoConfigureCgminer(pool_url, worker, password || 'x');
  res.json({ ok: true, config: conf });
});

// GET /api/mining/stats
router.get('/stats', (req, res) => {
  res.json({
    fennac:    loadStats('fennac'),
    dgb_skein: loadStats('dgb_skein'),
  });
});

module.exports = router;
